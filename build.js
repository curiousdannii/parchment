#!/usr/bin/env node
/*

Parchment build script
======================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import esbuild, { serve } from 'esbuild'
import fs from 'fs/promises'
import path from 'path'
import {HttpServer} from 'http-server'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))
const servemode = argv.serve

async function readdir(path) {
    return (await fs.readdir(path)).map(file => `${path}/${file}`)
}

const projects = []

if (argv._.includes('inform7')) {
    projects.push({
        copy: [
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
            'src/upstream/quixe/media/resourcemap.js',
        ],
        entryPoints: {
            ie: 'src/common/ie.js',
            main: 'src/inform7/index.js',
            parchment: 'src/inform7/inform7.css',
            quixe: 'src/inform7/quixe.js',
            zvm: 'src/inform7/zvm.js',
        },
        format: 'iife',
        outdir: 'dist/inform7/Parchment',
    })
}

if (argv._.includes('web') || argv._.length === 0) {
    projects.push({
        copy: await readdir('src/fonts/iosevka'),
        outdir: 'dist/fonts/iosevka',
    }, {
        copy: [
            ...(await readdir('node_modules/emglken/build'))
                .filter(file => file.endsWith('.wasm') && !file.endsWith('bocfel-core.wasm')),
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
        ],
        entryPoints: {
            git: 'node_modules/emglken/src/git.js',
            glulxe: 'node_modules/emglken/src/glulxe.js',
            hugo: 'node_modules/emglken/src/hugo.js',
            ie: 'src/common/ie.js',
            main: 'src/common/launcher.js',
            quixe: 'src/common/quixe.js',
            tads: 'node_modules/emglken/src/tads.js',
            web: 'src/web/web.css',
            zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/web',
    })
}

const common_options = {
    bundle: true,
    external: ['*.woff2'],
    format: 'esm',
    minify: true,
    watch: servemode,
}

for (const project of projects) {
    await fs.mkdir(project.outdir, {recursive: true})

    if (project.copy) {
        for (const file of project.copy) {
            await fs.copyFile(file, `${project.outdir}/${path.basename(file)}`)
        }
        delete project.copy
    }

    if (project.entryPoints) {
        const options = Object.assign({}, common_options, project)
        await esbuild.build(options)
    }
}

if (servemode) {
    new HttpServer({ cache: -1 }).listen(8080)
}