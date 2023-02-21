#!/usr/bin/env node
/*

Parchment build script
======================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import esbuild from 'esbuild'
import fs from 'fs/promises'
import path from 'path'
import {HttpServer} from 'http-server'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))
const projects = argv._
if (projects.length === 0) {
    projects.push('web')
}
console.log(`Building project${projects.length > 1 ? 's' : ''}: ${projects.join(', ')}`)
const servemode = argv.serve

async function readdir(path) {
    return (await fs.readdir(path)).map(file => `${path}/${file}`)
}

const projects_to_build = []

if (projects.includes('ifcomp')) {
    projects_to_build.push({
        copy: await readdir('src/fonts/iosevka'),
        outdir: 'dist/ifcomp/fonts/iosevka',
    }, {
        copy: [
            'node_modules/emglken/build/tads-core.wasm',
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
        ],
        entryPoints: {
            ie: 'src/common/ie.js',
            main: 'src/common/launcher.js',
            quixe: 'src/common/quixe.js',
            tads: 'node_modules/emglken/src/tads.js',
            web: 'src/web/web.css',
            zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/ifcomp/interpreter',
        sourcemap: true,
    })
}

if (projects.includes('inform7')) {
    projects_to_build.push({
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

if (projects.includes('lectrote')) {
    projects_to_build.push({
        copy: [
            ...(await readdir('node_modules/emglken/build'))
                .filter(file => file.endsWith('.wasm') && file !== 'bocfel-core.wasm'),
        ],
        entryPoints: {
            git: 'node_modules/emglken/src/git.js',
            glulxe: 'node_modules/emglken/src/glulxe.js',
            hugo: 'node_modules/emglken/src/hugo.js',
            scare: 'node_modules/emglken/src/scare.js',
            tads: 'node_modules/emglken/src/tads.js',
        },
        format: 'cjs',
        outdir: 'dist/lectrote',
    })
}

if (projects.includes('web')) {
    projects_to_build.push({
        copy: await readdir('src/fonts/iosevka'),
        outdir: 'dist/fonts/iosevka',
    }, {
        copy: [
            ...(await readdir('node_modules/emglken/build'))
                .filter(file => file.endsWith('.wasm') || file.endsWith('.wasm.map')),
            'node_modules/jquery/dist/jquery.min.js',
            'src/upstream/glkote/waiting.gif',
        ],
        entryPoints: {
            bocfel: 'node_modules/emglken/src/bocfel.js',
            git: 'node_modules/emglken/src/git.js',
            glulxe: 'node_modules/emglken/src/glulxe.js',
            hugo: 'node_modules/emglken/src/hugo.js',
            ie: 'src/common/ie.js',
            main: 'src/common/launcher.js',
            quixe: 'src/common/quixe.js',
            scare: 'node_modules/emglken/src/scare.js',
            tads: 'node_modules/emglken/src/tads.js',
            web: 'src/web/web.css',
            zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/web',
        sourcemap: true,
    })
}

const common_options = {
    bundle: true,
    external: ['*.woff2'],
    format: 'esm',
    minify: true,
    watch: servemode,
}

let have_given_emglken_warning

for (const project of projects_to_build) {
    await fs.mkdir(project.outdir, {recursive: true})

    if (project.copy) {
        for (const file of project.copy) {
            await fs.copyFile(file, `${project.outdir}/${path.basename(file)}`)
        }
        delete project.copy
    }

    if (project.entryPoints) {
        // Warn if not using upstream Emglken
        if (!have_given_emglken_warning && Object.values(project.entryPoints).filter(file => file.startsWith('node_modules/emglken')).length > 0) {
            have_given_emglken_warning = 1
            if (!(await fs.lstat('node_modules/emglken')).isSymbolicLink()) {
                console.warn('⚠ Warning: Using npm rather than upstream version of Emglken')
            }
        }

        const options = Object.assign({}, common_options, project)
        await esbuild.build(options)
    }
}

if (servemode) {
    new HttpServer({ cache: -1 }).listen(8080)
}