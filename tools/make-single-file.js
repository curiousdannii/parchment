#!/usr/bin/env node
/*

Parchment single-file converter
===============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import child_process from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import {fileURLToPath} from 'url'
import util from 'util'

const execFile = util.promisify(child_process.execFile)

const rootpath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const webpath = path.join(rootpath, 'dist/web')

// Get all the files
const filenames = await fs.readdir(webpath)

// Turn the filenames into embeddable resources
const files = await Promise.all(filenames.map(async filename => {
    // Skip Git and Glulxe while they can't even be used
    if (/(git|glulx)/.test(filename)) {
        return
    }
    const data = await fs.readFile(path.join(webpath, filename), {encoding: filename.endsWith('.wasm') ? null : 'utf8'})
    if (filename === 'ie.js') {
        return `<script nomodule>${data}</script>`
    }
    if (filename === 'jquery.min.js') {
        return `<script>${data}</script>`
    }
    if (filename === 'main.js') {
        return `<script type="module">${data}</script>`
    }
    if (filename.endsWith('.css')) {
        return `<style>${data}</style>`
    }
    if (filename.endsWith('.js')) {
        return `<script type="text/plain" id="./${filename}">${data}</script>`
    }
    if (filename.endsWith('.wasm')) {
        return `<script type="text/plain" id="./${filename}">${data.toString('base64')}</script>`
    }
    return
}))

// Inject into index.html
let indexhtml = await fs.readFile(path.join(rootpath, 'index.html'), {encoding: 'utf8'})
indexhtml = indexhtml
    .replace(/<script.+?\/script>/g, '')
    .replace(/<link rel="stylesheet".+?>/g, '')
    .replace(/<img src="dist\/web\/waiting.gif"/, `<img src="data:image/gif;base64,${(await fs.readFile(path.join(webpath, 'waiting.gif'))).toString('base64')}"`)
    .replace(/^\s+$/gm, '')

const parts = indexhtml.split(/\s*<\/head>/)
indexhtml = `${parts[0]}
<script>parchment_options = {single_file: 1}</script>
${files.filter(file => file).join('\n')}
</head>${parts[1]}`

// Write out
const outdir = path.join(webpath, '../single-file')
await fs.mkdir(outdir, {recursive: true})
const outpath = path.join(outdir, 'parchment.html')
await fs.writeFile(outpath, indexhtml)

// Zip it
await execFile('zip', ['-j', '-r', path.join(outdir, 'parchment-single-file.zip'), outpath])