/*

Parchment site generator
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import fs from 'fs/promises'
import child_process from 'child_process'
import path from 'path'
import util from 'util'

import Koa from 'koa'

import {process_index_html, SingleFileOptions} from '../../../tools/index-processing.js'

import FrontPage from './front-page.js'
import {flatten_query, SiteOptions} from './common.js'

const execFile = util.promisify(child_process.execFile)

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
        const story_file = flatten_query(ctx.request.files!.story_file)!
        const filename = story_file.originalFilename!
        const identify_results = await execFile('babel', ['-identify', story_file.filepath])
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

        const paths = [
            '../../index.html',
            'jquery.min.js',
            'main.js',
            'waiting.gif',
            'web.css',
            '../fonts/iosevka/iosevka-extended.woff2',
            ...terp_files,
        ]

        // Get all the files
        const files: Map<string, Uint8Array> = new Map()
        for (const file of paths) {
            files.set(path.basename(file), await fetch(`https://${this.options.cdn_domain}/dist/web/${file}`).then(r => r.arrayBuffer()).then(b => new Uint8Array(b)))
        }

        const options: SingleFileOptions = {
            font: true,
            single_file: true,
            story: {
                data: await fs.readFile(story_file.filepath),
                filename,
                format: parchment_format,
                ifid,
                title: bibliographic,
            },
        }

        ctx.type = 'text/html; charset=UTF-8'
        ctx.set('Content-Disposition', `attachment; filename="${filename}.html"`)
        ctx.body = await process_index_html(options, files)
    }
}