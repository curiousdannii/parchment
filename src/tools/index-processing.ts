/*

Common index.html processing
============================

Copyright (c) 2025 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {gzipSync} from 'zlib'

import {escape, truncate} from 'lodash-es'

import type {TruthyOption} from '../upstream/asyncglk/src/index-common.js'
import {Uint8Array_to_base64} from '../common/file.js'
import type {FileSize, ParchmentOptions} from '../common/interface.js'

// Is ASCII really okay here?
const utf8decoder = new TextDecoder('ascii', {fatal: true})

export interface Story {
    author?: string
    cover?: Uint8Array | boolean
    data?: Uint8Array
    description?: string
    filename?: string
    filesize?: FileSize
    format?: string
    ifid?: string
    title?: string
    url?: string
}

export interface SingleFileOptions {
    date?: TruthyOption
    domain?: string
    font?: TruthyOption
    gzip?: TruthyOption
    single_file?: TruthyOption
    story?: Story
}

export async function process_index_html(options: SingleFileOptions, files: Map<string, Uint8Array>): Promise<string> {
    const story = options.story
    let cover_image: string | undefined
    const inclusions: string[] = []
    const parchment_options: Partial<ParchmentOptions> = {}

    if (options.single_file) {
        parchment_options.single_file = 1
    }

    // Add inclusions based on the story options we were given
    if (story) {
        parchment_options.story = {}
        if (story.ifid) {
            inclusions.push(`<meta prefix="ifiction: http://babel.ifarchive.org/protocol/iFiction/" property="ifiction:ifid" content="${story.ifid}">`)
        }
        if (story.title) {
            parchment_options.story.title = story.title
            if (story.author) {
                inclusions.push(
                    `<meta property="og:site_name" content="Parchment"/>`,
                    `<meta property="og:title" content="${escape(story.title)} by ${escape(story.author)}"/>`,
                    `<meta property="og:type" content="website"/>`,
                )
                parchment_options.story.title += ' by ' + story.author
            }
        }
        if (story.description) {
            inclusions.push(`<meta property="og:description" content="${escape(truncate(story.description, {
                length: 1000,
                separator: /[,.]? +/,
            }))}"/>`)
        }
        if (story.url) {
            if (!options.domain) {
                throw new Error('The domain option is required when passing a story URL')
            }
            parchment_options.story.url = story.url
            const encoded_url = encodeURIComponent(story.url)
            inclusions.push(`<meta property="og:url" content="${options.domain}/?story=${encoded_url}"/>`)
            if (story.cover) {
                cover_image = `/metadata/cover/?url=${encoded_url}&maxh=250`
                inclusions.push(`<meta property="og:image" content="${options.domain}/metadata/cover/?url=${encoded_url}&maxh=630"/>`)
            }
        }
        if (story.data) {
            if (options.gzip) {
                story.data = gzipSync(story.data, {level: 9})
            }
            parchment_options.story.url = 'embedded:' + story.filename!
            inclusions.push(`<script type="text/plain${options.gzip ? ';gzip' : ''}" id="${story.filename!}">${await Uint8Array_to_base64(story.data)}</script>`)
        }
        else if (story.filesize) {
            parchment_options.story.filesize = story.filesize
        }
        if (story.format) {
            parchment_options.story.format = story.format
        }
    }

    // Parchment options
    if (Object.keys(parchment_options).length) {
        inclusions.push(`<script>parchment_options = ${JSON.stringify(parchment_options, null, 2)}</script>`)
    }

    // Process the files
    let indexhtml = ''
    for (let [filename, data] of files) {
        if (filename.endsWith('.wasm')) {
            if (options.gzip) {
                data = gzipSync(data, {level: 9})
            }
            inclusions.push(`<script type="text/plain${options.gzip ? ';gzip' : ''}" id="${filename}">${await Uint8Array_to_base64(data)}</script>`)
            continue
        }
        else if (filename.endsWith('.gif')) {
            cover_image = 'data:image/gif;base64,' + await Uint8Array_to_base64(data)
            continue
        }

        let data_as_string = utf8decoder.decode(data)
            .replace(/(\/\/|\/\*)# sourceMappingURL.+/, '')
            .trim()

        if (filename === 'ie.js') {
            inclusions.push(`<script nomodule>${data_as_string}</script>`)
        }
        else if (filename === 'index.html') {
            indexhtml = data_as_string
        }
        else if (filename === 'jquery.min.js') {
            inclusions.push(`<script>${data_as_string}</script>`)
        }
        else if (filename === 'web.js') {
            inclusions.push(`<script type="module">${data_as_string}</script>`)
        }
        else if (filename.endsWith('.css')) {
            // Only include a single font, the browser can fake bold and italics
            let fontfile: string | undefined
            if (options.font) {
                fontfile = await Uint8Array_to_base64(files.get('iosevka-extended.woff2')!)
            }
            data_as_string = data_as_string.replace(/@font-face{font-family:([' \w]+);font-style:(\w+);font-weight:(\d+);src:url\([^)]+\) format\(['"]woff2['"]\)}/g, (_, font, style, weight) => {
                if (font === 'Iosevka' && style === 'normal' && weight === '400' && options.font) {
                    return `@font-face{font-family:Iosevka;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${fontfile}) format('woff2')}`
                }
                return ''
            })
                .replace(/Iosevka Narrow/g, 'Iosevka')
            if (!options.font) {
                data_as_string = data_as_string.replace(/--glkote(-grid)?-mono-family: "Iosevka", monospace;?/g, '')
            }
            inclusions.push(`<style>${data_as_string}</style>`)
        }
        else if (filename.endsWith('.js')) {
            inclusions.push(`<script type="text/plain" id="${filename}">${data_as_string}</script>`)
        }
    }

    // Inject into index.html

    // Remove existing resources in single file mode
    // TODO: fix for Frankendrift, as it wants a semi-single-file mode
    if (options.single_file) {
        indexhtml = indexhtml
            .replace(/<script.+?\/script>/g, '')
            .replace(/<link rel="stylesheet".+?>/g, '')
            .replace(/^\s+$/gm, '')
    }

    // Embed the metadata into the page title
    if (story?.title || options.date) {
        let title = ''
        if (story?.title) {
            title = escape(story.title) + ' - '
        }
        title += 'Parchment'
        if (options.date) {
            const today = new Date()
            title += ` ${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`
        }
        indexhtml = indexhtml.replace(/<title.+?\/title>/, `<title>${title}</title>`)
        // Add a date at the bottom too
        if (options.date) {
            indexhtml = indexhtml.replace(/<\/noscript>/, `</noscript>\n<p id="footer-date">${title}</p>`)
        }
    }

    if (story) {
        // And simplify the HTML a little
        indexhtml = indexhtml.replace(/<div id="about">.+<\/noscript>\s+<\/div>/s, `<noscript>
            <h1>Parchment</h1>
            <p>is an interpreter for Interactive Fiction. <a href="https://github.com/curiousdannii/parchment">Find out more.</a></p>
            <p>Parchment requires Javascript. Please enable it in your browser.</p>
        </noscript>`)
            .replace('<div id="loadingpane" style="display:none;">', '<div id="loadingpane">')
    }

    // Replace the cover image
    if (cover_image) {
        indexhtml = indexhtml.replace(/<img src="dist\/web\/waiting\.gif".+?>/, `<img src="${cover_image}" alt="Cover art">`)
    }

    // Add the inclusions
    const parts = indexhtml.split(/\s*<\/head>/)
    indexhtml = `${parts[0]}
    ${inclusions.join('\n')}
    </head>${parts[1]}`

    return indexhtml
}