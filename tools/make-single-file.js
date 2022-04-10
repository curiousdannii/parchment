#!/usr/bin/env node
/*

Parchment single-file converter
===============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import child_process from 'child_process'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import {fileURLToPath} from 'url'
import util from 'util'

const execFile = util.promisify(child_process.execFile)

const datemode = process.argv.includes('--date')

const rootpath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const webpath = path.join(rootpath, 'dist/web')

// Get all the files
const filenames = await fs.readdir(webpath)

async function file_to_base64(path) {
    return (await fs.readFile(path)).toString('base64')
}

// Turn the filenames into embeddable resources
const files = await Promise.all(filenames.map(async filename => {
    // Skip Git and Glulxe while they can't even be used
    if (/(git|glulx)/.test(filename)) {
        return
    }
    let data = await fs.readFile(path.join(webpath, filename), {encoding: filename.endsWith('.wasm') ? null : 'utf8'})
    if (!filename.endsWith('.wasm')) {
        data = data.trim()
    }
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
        // Only include a single font, the browser can fake bold and italics
        const fontfile = await file_to_base64(path.join(webpath, '../fonts/iosevka/iosevka-extended.woff2'))
        data = data.replace(/@font-face{font-family:([' \w]+);font-style:(\w+);font-weight:(\d+);src:url\([^)]+\) format\('woff2'\)}/g, (_, font, style, weight) => {
            if (font === 'Iosevka' && style === 'normal' && weight === '400') {
                return `@font-face{font-family:Iosevka;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${fontfile}) format('woff2')}`
            }
            return ''
        })
            .replace(/Iosevka Narrow/g, 'Iosevka')
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
    .replace(/<img src="dist\/web\/waiting.gif"/, `<img src="data:image/gif;base64,${await file_to_base64(path.join(webpath, 'waiting.gif'))}"`)
    .replace(/^\s+$/gm, '')

// Add a date if requested
if (datemode) {
    const today = new Date()
    const title = `Parchment ${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`
    indexhtml = indexhtml
        .replace(/<title.+?\/title>/, `<title>${title}</title>`)
        .replace(/<\/noscript>/, `</noscript>\n<p id="footer-date">${title}</p>`)
}

const parts = indexhtml.split(/\s*<\/head>/)
indexhtml = `${parts[0]}
<script>parchment_options = {single_file: 1}</script>
${files.filter(file => file).join('\n')}
</head>${parts[1]}`

const outdir = path.join(webpath, '../single-file')
await fs.mkdir(outdir, {recursive: true})
const outpath = path.join(outdir, 'parchment.html')

// Check if the file has changed
const oldhash = crypto.createHash('sha1').setEncoding('hex')
try {
    oldhash.write(await fs.readFile(outpath))
}
catch (_) {}
oldhash.end()
const newhash = crypto.createHash('sha1').setEncoding('hex')
newhash.write(indexhtml)
newhash.end()

if (oldhash.read() !== newhash.read()) {
    // Write it out
    console.log('Creating dist/single-file/parchment.html')
    await fs.writeFile(outpath, indexhtml)

    // Zip it
    let zipname = `parchment-single-file.zip`
    if (datemode) {
        const today = new Date()
        zipname = `parchment-single-file-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.zip`
    }
    console.log(`Zipping dist/single-file/${zipname}`)
    const result = await execFile('zip', ['-j', '-r', path.join(outdir, zipname), outpath])
    console.log(result.stdout.trim())
}
else {
    console.log('Single file parchment.html is unchanged')
}