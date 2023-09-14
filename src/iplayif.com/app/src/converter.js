import { MetaDataApp } from './metadata.js'
import fs from 'fs/promises'
import child_process from 'child_process'
import util from 'util'

const execFile = util.promisify(child_process.execFile)

const parchment_formats = {
    'zcode': 'zcode',
    'blorbed zcode': 'zcode',
    'glulx': 'glulx',
    'blorbed glulx': 'glulx',
    'tads': 'tads',
    'hugo': 'hugo',
    'adrift': 'adrift4',
}

const format_terp_files = {
    zcode: ['zvm.js'],
    glulx: ['quixe.js'],
    tads: ['tads-core.wasm', 'tads.js'],
    hugo: ['hugo-core.wasm', 'hugo.js'],
    adrift4: ['scare-core.wasm', 'scare.js'],
}

const utf8decoder = new TextDecoder()

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]))
}

// taken from https://github.com/curiousdannii/parchment/blob/master/src/tools/single-file.js
async function generate(options, indexhtml, files) {
    const inclusions = []
    if (options.ifid) {
        inclusions.push(`<meta prefix="ifiction: http://babel.ifarchive.org/protocol/iFiction/" property="ifiction:ifid" content="${options.ifid}">`)
    }
    if (options.single_file) {
        const parchment_options = { single_file: 1 }
        if (options.format) {
            parchment_options.format = options.format
        }
        if (options.story_file) {
            parchment_options.story = `data:application/octet-stream;base64,` + options.story_file.toString('base64')
        }
        inclusions.push(`<script>parchment_options = ${JSON.stringify(parchment_options, null, 2)}</script>`)
    }

    // Process the files
    for (const filename of Object.keys(files)) {
        if (/\.(css|js|html)$/.test(filename)) {
            files[filename] = utf8decoder.decode(files[filename])
                .replace(/(\/\/|\/\*)# sourceMappingURL.+/, '')
                .trim()
        }
        let data = files[filename]
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
            data = data.replace(/@font-face{font-family:([' \w]+);font-style:(\w+);font-weight:(\d+);src:url\([^)]+\) format\(['"]woff2['"]\)}/g, (_, font, style, weight) => {
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
        .replace(/<title>.+?\/title>/, `<title>${escapeHTML(options.title)}</title>`)
        .replace(/^\s+$/gm, '')

    // Add the inclusions
    const parts = indexhtml.split(/\s*<\/head>/)
    indexhtml = `${parts[0]}
    ${inclusions.join('\n')}
    </head>${parts[1]}`

    return indexhtml
}

export default class ConverterApp extends MetaDataApp {
    async converter(ctx) {
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
        const story_file_path = ctx.request.files.story_file.filepath
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

        const options = {
            single_file: 1,
            remote: 0,
            font: 1,
            format: parchment_format,
            story_file: await fs.readFile(story_file_path),
            title: bibliographic,
            ifid,
            cdn_domain: this.options.cdn_domain
        }

        const html = await generate(options, this.index_html, files)
        const outfileName = bibliographic.replace(/"/g, '').replace(/[^"\\A-Za-z0-9'-]+/g, '-')
        ctx.type = 'text/html; charset=UTF-8'
        ctx.set('Content-Disposition', `attachment; filename="${outfileName}.html"`)
        ctx.body = html
    }
}