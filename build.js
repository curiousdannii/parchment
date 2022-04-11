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

const servemode = process.argv.includes('--serve')

async function readdir(path) {
    return (await fs.readdir(path)).map(file => `${path}/${file}`)
}

const projects = [
    // Fonts
    {
        copy: await readdir('src/fonts/iosevka'),
        dest: 'dist/fonts/iosevka',
    },
    // Inform 7
    {
        copy: [
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
            'src/upstream/quixe/media/resourcemap.js',
        ],
        dest: 'dist/inform7/Parchment',
        entryPoints: [
            'src/common/ie.js',
            ['src/inform7/index.js', 'main.js'],
            ['src/inform7/inform7.css', 'parchment.css'],
            'src/inform7/quixe.js',
            'src/inform7/zvm.js',
        ],
        options: {
            format: 'iife',
        },
    },
    // Web
    {
        copy: [
            ...(await readdir('node_modules/emglken/build'))
                .filter(file => file.endsWith('.wasm') && !file.endsWith('bocfel-core.wasm')),
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
        ],
        dest: 'dist/web',
        entryPoints: [
            'node_modules/emglken/src/git.js',
            'node_modules/emglken/src/glulxe.js',
            'node_modules/emglken/src/hugo.js',
            'node_modules/emglken/src/tads.js',
            'src/common/ie.js',
            ['src/common/launcher.js', 'main.js'],
            'src/common/quixe.js',
            'src/common/zvm.js',
            'src/web/web.css',
        ],
    },
]

const common_options = {
    bundle: true,
    external: ['*.woff2'],
    format: 'esm',
    minify: true,
    watch: servemode,
}

for (const project of projects) {
    await fs.mkdir(project.dest, {recursive: true})

    if (project.copy) {
        for (const file of project.copy) {
            await fs.copyFile(file, `${project.dest}/${path.basename(file)}`)
        }
        delete project.copy
    }

    if (project.entryPoints) {
        // Build each entry point by itself
        for (const entrypoint_name of project.entryPoints) {
            const entrypoint = Array.isArray(entrypoint_name)
                ? {
                    entryPoints: [entrypoint_name[0]],
                    outfile: `${project.dest}/${entrypoint_name[1]}`,
                }
                : {
                    entryPoints: [entrypoint_name],
                    outdir: project.dest,
                }
            const options = Object.assign({}, common_options, project.options, entrypoint)
            await esbuild.build(options)
        }
    }
}

if (servemode) {
    new HttpServer({ cache: -1 }).listen(8080)
}