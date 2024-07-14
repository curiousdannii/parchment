#!/usr/bin/env node
/*

Parchment build script
======================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import esbuild from 'esbuild'
import fs from 'fs/promises'
import path from 'path'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))
const projects = argv._
if (projects.length === 0) {
    projects.push('tools', 'web')
}
console.log(`Building project${projects.length > 1 ? 's' : ''}: ${projects.join(', ')}`)
const analyse = argv.analyse
const servemode = argv.serve

async function readdir(path) {
    return (await fs.readdir(path)).map(file => `${path}/${file}`)
}

const projects_to_build = []

if (projects.includes('ifcomp')) {
    projects_to_build.push({
        entryPoints: {
            ie: 'src/common/ie.js',
            'jquery.min': 'node_modules/jquery/dist/jquery.min.js',
            main: 'src/common/launcher.ts',
            quixe: 'src/common/quixe.js',
            tads: 'node_modules/emglken/build/tads.*',
            waiting: 'src/upstream/glkote/waiting.gif',
            web: 'src/web/web.css',
            zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/ifcomp/interpreter',
        sourcemap: true,
    }, {
        entryPoints: ['src/fonts/iosevka/*.woff2'],
        outdir: 'dist/fonts/iosevka',
    })
}

if (projects.includes('inform7')) {
    projects_to_build.push({
        entryPoints: {
            ie: 'src/common/ie.js',
            'jquery.min': 'node_modules/jquery/dist/jquery.min.js',
            main: 'src/inform7/index.js',
            parchment: 'src/inform7/inform7.css',
            quixe: 'src/inform7/quixe.js',
            waiting: 'src/upstream/glkote/waiting.gif',
            zvm: 'src/inform7/zvm.js',
        },
        format: 'iife',
        logOverride: {'empty-import-meta': 'silent'},
        outdir: 'dist/inform7/Parchment',
    }, {
        entryPoints: ['src/upstream/quixe/media/resourcemap.js'],
        loader: {'.js': 'copy'},
        outdir: 'dist/inform7/Parchment',
    })
}

if (projects.includes('lectrote')) {
    projects_to_build.push({
        entryPoints: {
            git: 'node_modules/emglken/build/git.*',
            glulxe: 'node_modules/emglken/build/glulxe.*',
            hugo: 'node_modules/emglken/build/hugo.*',
            scare: 'node_modules/emglken/build/scare.*',
            tads: 'node_modules/emglken/build/tads.*',
        },
        format: 'cjs',
        outdir: 'dist/lectrote',
    })
}

if (projects.includes('tools')) {
    projects_to_build.push({
        entryPoints: {
            'make-single-file': 'src/tools/single-file-cli.ts',
        },
        minify: false,
        outdir: 'tools',
        platform: 'node',
        treeShaking: true,
    }, {
        entryPoints: {
            'file-exporter': 'src/tools/file-exporter.*',
        },
        outdir: 'dist/tools',
        sourcemap: true,
    })
}

if (projects.includes('web')) {
    projects_to_build.push({
        entryPoints: {
            //bocfel: 'node_modules/emglken/build/bocfel.*',
            git: 'node_modules/emglken/build/git.*',
            glulxe: 'node_modules/emglken/build/glulxe.*',
            hugo: 'node_modules/emglken/build/hugo.*',
            ie: 'src/common/ie.js',
            'jquery.min': 'node_modules/jquery/dist/jquery.min.js',
            main: 'src/common/launcher.ts',
            quixe: 'src/common/quixe.js',
            scare: 'node_modules/emglken/build/scare.*',
            tads: 'node_modules/emglken/build/tads.*',
            waiting: 'src/upstream/glkote/waiting.gif',
            web: 'src/web/web.css',
            zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/web',
        sourcemap: true,
    }, {
        entryPoints: ['src/fonts/iosevka/*.woff2'],
        outdir: 'dist/fonts/iosevka',
    })
}

const common_options = {
    bundle: true,
    external: ['*.woff2'],
    format: 'esm',
    loader: {
        '.gif': 'copy',
        '.html': 'copy',
        '.min.js': 'copy',
        '.wasm': 'copy',
        '.woff2': 'copy',
    },
    minify: true,
    metafile: analyse,
}

let have_given_emglken_warning

for (const project of projects_to_build) {
    await fs.mkdir(project.outdir, {recursive: true})

    if (project.entryPoints) {
        // Warn if not using upstream Emglken
        if (!have_given_emglken_warning && Object.values(project.entryPoints).filter(file => file.startsWith('node_modules/emglken')).length > 0) {
            have_given_emglken_warning = 1
            if (!(await fs.lstat('node_modules/emglken')).isSymbolicLink()) {
                console.warn('⚠ Warning: Using npm rather than upstream version of Emglken')
            }
        }

        const options = Object.assign({}, common_options, project)
        if (servemode) {
            const context = await esbuild.context(options)
            await context.watch()
        }
        else {
            const result = await esbuild.build(options)
            if (analyse) {
                console.log(await esbuild.analyzeMetafile(result.metafile))
            }
        }
    }
}

if (servemode) {
    const context = await esbuild.context({})
    let {host, port} = await context.serve({
        port: 8080,
        servedir: '.',
    })
    console.log(`Serving on http://${host}:${port}`)
}