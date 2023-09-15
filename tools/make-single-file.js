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
import Blorb from '../src/upstream/asyncglk/dist/blorb/blorb.js'

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

const {values: {preset, out: outdir, story_file: story_file_path}} = util.parseArgs({options: {
    "preset": {type: "string", default: "dist"},
    "story_file": { type: "string" },
    "out": { type: "string", default: path.join(webpath, '../single-file') },
}})

if (!presets[preset]) {
    throw new Error(`Unknown preset: ${preset}`)
}
const options = Object.assign({}, base_options, presets[preset])

if (story_file_path) {
    try {
        options.story_file = await fs.readFile(story_file_path)
    } catch (cause) {
        throw new Error(`Couldn't read story_file_path ${story_file_path}`, {cause})
    }
    // this is a stripped-down version of src/common/formats.js, so we don't have to import the world
    const formats = {
        blorb: {
            extensions: /\.(blb|blorb)/i,
        },
        adrift4: {
            extensions: /\.taf/i,
            engine: 'scare',
        },
        hugo: {
            extensions: /\.hex/i,
            engine: 'hugo',
        },
        glulx: {
            extensions: /\.(gblorb|glb|ulx)/i,
            engine: 'quixe',
        },
        tads: {
            extensions: /\.(gam|t3)/i,
            engine: 'tads',
        },
        zcode: {
            extensions: /\.(zblorb|zlb|z3|z4|z5|z8)/i,
            engine: 'zvm',
        }
    }

    let format = Object.keys(formats).find(format => formats[format].extensions.test(story_file_path))
    if (!format) {
        throw new Error(`Unknown storyfile format ${story_file_path}`)
    }
    if (format === 'blorb') {
        // fake jQuery, just enough to get the Blorb constructor to run
        globalThis.$ = () => ({
            html: () => ({
                find: () => ({
                    children: () => []
                })
            })
        })
        const blorb = new Blorb(options.story_file)
        const blorb_chunks = {
            GLUL: 'glulx',
            ZCOD: 'zcode',
        }
        const chunktype = blorb.get_chunk('exec', 0)?.blorbtype
        format = blorb_chunks[chunktype]
        if (!format) throw new Error('Unknown storyfile format in Blorb')
    }
    options.terps = [formats[format].engine]
    options.format = format
}

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

await fs.mkdir(outdir, {recursive: true})
const outpath = path.join(outdir, 'parchment.html')

// Write it out
console.log('Creating', outpath)
await fs.writeFile(outpath, indexhtml)

// Zip it
let zipname = `parchment-single-file.zip`
if (options.date) {
    const today = new Date()
    zipname = `parchment-single-file-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.zip`
}
console.log(`Zipping ${outdir}/${zipname}`)
const result = await execFile('zip', ['-j', '-r', path.join(outdir, zipname), outpath])
console.log(result.stdout.trim())
