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

import minimist from 'minimist'

import {identify_blorb_storyfile_format} from '../common/formats.js'
import {Blorb} from '../upstream/asyncglk/src/index-common.js'

import {generate} from './single-file.js'

interface BasicFormat {
    extensions: RegExp
    engine?: string
}

interface Options {
    date?: boolean | number
    font?: boolean | number
    format?: string
    single_file?: boolean | number
    story_file?: Uint8Array
    terps: string[]
}

const execFile = util.promisify(child_process.execFile)

const rootpath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const webpath = path.join(rootpath, 'dist/web')

// Presets and options
const base_options: Options = {
    date: 1,
    font: 1,
    single_file: 1,
    terps: [],
}
const presets: Record<string, Options> = {
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

// this is a stripped-down version of src/common/formats.js, so we don't have to import the world
const formats: Record<string, BasicFormat> = {
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

const argv = minimist(process.argv.slice(2))
const outdir = (argv.out as string) || path.join(webpath, '../single-file')
const preset = (argv.preset as string) || 'dist'
const story_file_path: string | undefined = argv.story_file

if (!presets[preset]) {
    throw new Error(`Unknown preset: ${preset}`)
}
const options = Object.assign({}, base_options, presets[preset])

if (story_file_path) {
    try {
        options.story_file = await fs.readFile(story_file_path)
    } catch (cause: any) {
        throw new Error(`Couldn't read story_file_path ${story_file_path}`, {cause})
    }

    let format = Object.keys(formats).find(format => formats[format].extensions.test(story_file_path))
    if (!format) {
        throw new Error(`Unknown storyfile format ${story_file_path}`)
    }
    if (format === 'blorb') {
        const blorb = new Blorb(options.story_file)
        format = identify_blorb_storyfile_format(blorb)
    }
    options.format = format
    options.terps = [formats[format!].engine!]
}

// Load files
const common_files = [
    'jquery.min.js',
    'ie.js',
    'main.js',
    'waiting.gif',
    'web.css',
    '../fonts/iosevka/iosevka-extended.woff2',
    '../../index.html',
]
const interpreter_files: Record<string, string[]> = {
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
const files: Map<string, Uint8Array> = new Map()
for (const file of common_files.concat(options.terps.map(terp => interpreter_files[terp]).flat())) {
    files.set(path.basename(file), await fs.readFile(path.join(webpath, file)))
}

const indexhtml = await generate(options, files)

await fs.mkdir(outdir, {recursive: true})
const outpath = path.join(outdir, 'parchment.html')

// Write it out
console.log('Creating', outpath)
await fs.writeFile(outpath, indexhtml)

// Zip it
let zipname = 'parchment-single-file.zip'
if (options.date) {
    const today = new Date()
    zipname = `parchment-single-file-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.zip`
}
console.log(`Zipping ${outdir}/${zipname}`)
const result = await execFile('zip', ['-j', '-r', path.join(outdir, zipname), outpath])
console.log(result.stdout.trim())
