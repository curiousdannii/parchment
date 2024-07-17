/*

Parchment site generator
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import fs from 'fs/promises'
import path from 'path'

import Koa from 'koa'

import {process_index_html, type SingleFileOptions} from '../../../tools/index-processing.js'

import FrontPage from './front-page.js'
import {flatten_query, type SiteOptions} from './common.js'
import {get_metadata} from './metadata.js'

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
            ctx.body = `<!DOCTYPE html>
<html>
    <head>
        <title>Parchment Site Generator</title>
        <link rel="stylesheet" href="/dist/web/web.css">
    </head>
    <body>
        <h1>Parchment Site Generator</h1>
        <p>Upload a Z-Code, Glulx, TADS, Hugo, or ADRIFT 4 file to generator a self-contained HTML file, suitable for distribution or offline play.</p>
        <form method=post enctype="multipart/form-data">
            <input type=file name=story_file>
            <button>submit</button>
        </form>`
            return
        }
        const story_file = flatten_query(ctx.request.files!.story_file)!
        const filename = story_file.originalFilename!

        const metadata = await get_metadata(filename, story_file.filepath)

        if (!metadata?.format) {
            ctx.throw(400, 'Unsupported file type')
        }

        if (metadata.format === 'adrift4') {
            const adrift_version = Number(metadata.ifid.split('-')[1])
            if (adrift_version > 400) {
                ctx.throw(400, 'This is an Adrift 5 game file. This converter only supports Adrift 4 and earlier.')
            }
        }

        const terp_files = format_terp_files[metadata.format]

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
            domain: `http${this.options.https ? 's' : ''}://${this.options.domain}`,
            font: true,
            single_file: true,
            story: {
                author: metadata.author,
                data: await fs.readFile(story_file.filepath),
                description: metadata.description,
                filename,
                format: metadata.format,
                ifid: metadata.ifid,
                title: metadata.title,
            },
        }

        ctx.type = 'text/html; charset=UTF-8'
        ctx.set('Content-Disposition', `attachment; filename="${filename}.html"`)
        ctx.body = await process_index_html(options, files)
    }
}