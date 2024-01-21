/*

Parchment site generator
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import fs from 'fs/promises'
import child_process from 'child_process'
import util from 'util'

import Koa from 'koa'
import {escape} from 'lodash-es'

import {ParchmentOptions} from '../../../common/options.js'

import FrontPage from './front-page.js'
import {flatten_query, SiteOptions} from './common.js'

const execFile = util.promisify(child_process.execFile)

const utf8decoder = new TextDecoder()

const parchment_formats: Record<string, string> = {
    adrift: 'adrift4',
    'blorbed glulx': 'glulx',
    'blorbed zcode': 'zcode',
    glulx: 'glulx',
    hugo: 'hugo',
    tads2: 'tads',
    tads3: 'tads',
    zcode: 'zcode',
}

const format_terp_files: Record<string, string[]> = {
    adrift4: ['scare-core.wasm', 'scare.js'],
    glulx: ['quixe.js'],
    hugo: ['hugo-core.wasm', 'hugo.js'],
    tads: ['tads-core.wasm', 'tads.js'],
    zcode: ['zvm.js'],
}

interface SiteGenOptions {
    cdn_domain: string
    font?: boolean
    format?: string
    ifid?: string
    remote?: boolean
    single_file?: boolean
    story_file?: Buffer
    title: string
}

// taken from https://github.com/curiousdannii/parchment/blob/master/src/tools/single-file.js
async function generate(options: SiteGenOptions, indexhtml: string, files: Record<string, Buffer>) {
    const inclusions: string[] = []
    if (options.ifid) {
        inclusions.push(`<meta prefix="ifiction: http://babel.ifarchive.org/protocol/iFiction/" property="ifiction:ifid" content="${options.ifid}">`)
    }
    if (options.single_file) {
        const parchment_options: Partial<ParchmentOptions> = { single_file: 1 }
        if (options.format) {
            parchment_options.format = options.format
        }
        if (options.story_file) {
            parchment_options.story = `data:application/octet-stream;base64,` + options.story_file.toString('base64')
        }
        inclusions.push(`<script>parchment_options = ${JSON.stringify(parchment_options, null, 2)}</script>`)
    }

    // Process the files
    for (const [filename, raw_data] of Object.entries(files)) {
        let data: Buffer | string = raw_data
        if (/\.(css|js|html)$/.test(filename)) {
            data = utf8decoder.decode(raw_data)
                .replace(/(\/\/|\/\*)# sourceMappingURL.+/, '')
                .trim()
        }
        if (filename === 'ie.js') {
            inclusions.push(`<script nomodule>${data}</script>`)
        }
        else if (filename === 'jquery.min.js') {
            if (options.remote) {
                inclusions.push(`<script src="https://${options.cdn_domain}/dist/web/${filename}"></script>`)
            } else {
                inclusions.push(`<script>${data}</script>`)
            }
        }
        else if (filename === 'main.js') {
            if (options.remote) {
                inclusions.push(`<script src="https://${options.cdn_domain}/dist/web/${filename}" type="module"></script>`)
            } else {
                inclusions.push(`<script type="module">${data}</script>`)
            }
        }
        else if (filename.endsWith('.css')) {
            // Only include a single font, the browser can fake bold and italics
            const fontfile = files['../fonts/iosevka/iosevka-extended.woff2'].toString('base64')
            data = (data as string).replace(/@font-face{font-family:([' \w]+);font-style:(\w+);font-weight:(\d+);src:url\([^)]+\) format\(['"]woff2['"]\)}/g, (_, font: string, style: string, weight: string) => {
                if (font === 'Iosevka' && style === 'normal' && weight === '400' && options.font) {
                    return `@font-face{font-family:Iosevka;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${fontfile}) format('woff2')}`
                }
                return ''
            })
                .replace(/Iosevka Narrow/g, 'Iosevka')
            if (!options.font) {
                data = data.replace(/--glkote(-grid)?-mono-family: "Iosevka", monospace;?/g, '')
            }
            inclusions.push(`<style>${data}</style>`)
        }
        else if (filename.endsWith('.js')) {
            inclusions.push(`<script type="text/plain" id="./${filename}">${data}</script>`)
        }
        else if (filename.endsWith('.wasm')) {
            inclusions.push(`<script type="text/plain" id="./${filename}">${data.toString('base64')}</script>`)
        }
    }

    // Inject into index.html
    const gif = files['waiting.gif'].toString('base64')
    indexhtml = indexhtml
        .replace(/<script.+?\/script>/g, '')
        .replace(/<link rel="stylesheet".+?>/g, '')
        .replace(/<img src="dist\/web\/waiting.gif"/, `<img src="data:image/gif;base64,${gif}"`)
        .replace(/<title>.+?\/title>/, `<title>${escape(options.title)}</title>`)
        .replace(/^\s+$/gm, '')

    // Add the inclusions
    const parts = indexhtml.split(/\s*<\/head>/)
    indexhtml = `${parts[0]}
    ${inclusions.join('\n')}
    </head>${parts[1]}`

    return indexhtml
}

export default class SiteGenerator {
    // TODO: replace with a proper CDN cache thingy
    front_page: FrontPage
    options: SiteOptions

    constructor(options: SiteOptions, front_page: FrontPage) {
        this.options = options
        this.front_page = front_page
    }

    async sitegen(ctx: Koa.Context) {
        if (ctx.request.method === 'GET') {
            ctx.type = 'text/html; charset=UTF-8'
            ctx.body = `<!DOCTYPE html><html><head><title>Parchment HTML Converter</title></head>
            <body>
            <h1>Parchment HTML Converter</h1>
            <p>Upload a Zcode, Glulx, TADS, Hugo, or ADRIFT 4 file to convert it to a self-contained HTML file, suitable for distribution or offline play.</p>
            <form method=post enctype="multipart/form-data">
                <input type=file name=story_file>
                <button>submit</button>
            </form>`
            return
        }
        const story_file_path = flatten_query(ctx.request.files!.story_file)!.filepath
        const identify_results = await execFile('babel', ['-identify', story_file_path])
        if (identify_results.stderr) {
            ctx.throw(400, 'Unsupported file type')
        }

        const lines = identify_results.stdout.split('\n')
        if (lines[0].startsWith('Warning:')) lines.shift()

        let bibliographic = lines[0]
        if (bibliographic === 'No bibliographic data') bibliographic = 'Parchment'
        const ifid = lines[1].substring(6)
        const [babel_format] = lines[2].split(',')

        const parchment_format = parchment_formats[babel_format]

        if (!parchment_format) {
            ctx.throw(400, 'Unsupported file type')
        }

        if (parchment_format === 'adrift4') {
            const adrift_version = Number(ifid.split('-')[1])
            if (adrift_version > 400) {
                ctx.throw(400, 'This is an Adrift 5 game file. This converter only supports Adrift 4 and earlier.')
            }
        }

        const terp_files = format_terp_files[parchment_format]

        const urls = [
            'jquery.min.js',
            'main.js',
            'waiting.gif',
            'web.css',
            '../fonts/iosevka/iosevka-extended.woff2',
            ...terp_files,
        ]

        const files = Object.fromEntries(await Promise.all(urls.map(async url =>
            [url, await fetch(`https://${this.options.cdn_domain}/dist/web/${url}`).then(r => r.arrayBuffer()).then(b => Buffer.from(b))]
        )))

        const options: SiteGenOptions = {
            cdn_domain: this.options.cdn_domain,
            font: true,
            format: parchment_format,
            ifid,
            remote: false,
            single_file: true,
            story_file: await fs.readFile(story_file_path),
            title: bibliographic,
        }

        const html = await generate(options, this.front_page.index_html, files)
        const outfileName = bibliographic.replace(/"/g, '').replace(/[^"\\A-Za-z0-9'-]+/g, '-')
        ctx.type = 'text/html; charset=UTF-8'
        ctx.set('Content-Disposition', `attachment; filename="${outfileName}.html"`)
        ctx.body = html
    }
}