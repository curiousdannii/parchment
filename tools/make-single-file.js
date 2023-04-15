#!/usr/bin/env node
/*

Parchment single-file converter
===============================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import child_process from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import {fileURLToPath} from 'url'
import util from 'util'

import {generate} from '../src/tools/single-file.js'

const execFile = util.promisify(child_process.execFile)

const rootpath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const webpath = path.join(rootpath, 'dist/web')

// Presets and options
const base_options = {
    date: 1,
    font: 1,
    single_file: 1,
    terps: [],
}
const presets = {
    dist: {
        terps: ['hugo', 'quixe', 'scare', 'tads', 'zvm'],
    },
    frankendrift: {
        single_file: 0,
        terps: [],
    },
    regtest: {
        font: 0,
        terps: ['quixe', 'zvm'],
    },
}

const preset = process.argv[2] || 'dist'
if (!presets[preset]) {
    throw new Error(`Unknown preset: ${process.argv[2]}`)
}
const options = Object.assign({}, base_options, presets[preset])

// Load files
const common = [
    'ie.js',
    'jquery.min.js',
    'main.js',
    'waiting.gif',
    'web.css',
    '../fonts/iosevka/iosevka-extended.woff2',
    '../../index.html',
]
const terps = {
    bocfel: ['bocfel-core.wasm', 'boxfel.js'],
    git: ['git-core.wasm', 'git.js'],
    glulxe: ['glulxe-core.wasm', 'glulxe.js'],
    hugo: ['hugo-core.wasm', 'hugo.js'],
    quixe: ['quixe.js'],
    scare: ['scare-core.wasm', 'scare.js'],
    tads: ['tads-core.wasm', 'tads.js'],
    zvm: ['zvm.js'],
}

// Get all the files
const files = {}
for (const file of common.concat(options.terps.map(terp => terps[terp]).flat())) {
    files[path.basename(file)] = await fs.readFile(path.join(webpath, file))
}

const indexhtml = await generate(options, files)

const outdir = path.join(webpath, '../single-file')
await fs.mkdir(outdir, {recursive: true})
const outpath = path.join(outdir, 'parchment.html')

// Write it out
console.log('Creating dist/single-file/parchment.html')
await fs.writeFile(outpath, indexhtml)

// Zip it
let zipname = `parchment-single-file.zip`
if (options.date) {
    const today = new Date()
    zipname = `parchment-single-file-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.zip`
}
console.log(`Zipping dist/single-file/${zipname}`)
const result = await execFile('zip', ['-j', '-r', path.join(outdir, zipname), outpath])
console.log(result.stdout.trim())