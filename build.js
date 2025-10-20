#!/usr/bin/env node
/*

Parchment build script
======================

Copyright (c) 2025 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import esbuild from 'esbuild'
import esbuildSvelte from 'esbuild-svelte'
import fs from 'fs/promises'
import minimist from 'minimist'
import {sveltePreprocess} from 'svelte-preprocess'

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

// To avoid breaking .min.js files, we'll copy jQuery by itself
function jquery_copier(outdir) {
    return {
        entryPoints: {
            'jquery.min': 'node_modules/jquery/dist/jquery.min.js',
        },
        loader: {
            '.min.js': 'copy',
        },
        outdir,
    }
}

const projects_to_build = []

if (projects.includes('ifcomp')) {
    projects_to_build.push({
        entryPoints: {
            bocfel: 'node_modules/emglken/build/bocfel.*',
            glkaudio_bg: 'node_modules/glkaudio/glkaudio_bg.wasm',
            glulxe: 'node_modules/emglken/build/glulxe.*',
            ie: 'src/common/ie.js',
            tads: 'node_modules/emglken/build/tads.*',
            waiting: 'src/common/waiting.gif',
            web: 'src/common/launcher.ts',
        },
        outdir: 'dist/ifcomp/interpreter',
        sourcemap: true,
    },
    jquery_copier('dist/ifcomp/interpreter'),
    {
        entryPoints: ['src/fonts/iosevka/*.woff2'],
        outdir: 'dist/fonts/iosevka',
    })
}

if (projects.includes('inform7')) {
    projects_to_build.push({
        entryPoints: {
            ie: 'src/common/ie.js',
            parchment: 'src/inform7/index.ts',
            waiting: 'src/common/waiting.gif',
        },
        format: 'iife',
        logOverride: {'empty-import-meta': 'silent'},
        outdir: 'dist/inform7/Parchment',
    },
    jquery_copier('dist/inform7/Parchment'),
    {
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
            'inform7-wasm': 'src/tools/inform7-wasm-cli.ts',
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
            bocfel: 'node_modules/emglken/build/bocfel.*',
            git: 'node_modules/emglken/build/git.*',
            glkaudio_bg: 'node_modules/glkaudio/glkaudio_bg.wasm',
            glulxe: 'node_modules/emglken/build/glulxe.*',
            hugo: 'node_modules/emglken/build/hugo.*',
            ie: 'src/common/ie.js',
            //quixe: 'src/common/quixe.js',
            scare: 'node_modules/emglken/build/scare.*',
            tads: 'node_modules/emglken/build/tads.*',
            waiting: 'src/common/waiting.gif',
            web: 'src/common/launcher.ts',
            //zvm: 'src/common/zvm.js',
        },
        outdir: 'dist/web',
        sourcemap: true,
    },
    jquery_copier('dist/web'),
    {
        entryPoints: ['src/fonts/iosevka/*.woff2'],
        outdir: 'dist/fonts/iosevka',
    })
}

const common_options = {
    bundle: true,
    define: {
        ENVIRONMENT_IS_NODE: 'false',
        ENVIRONMENT_IS_WEB: 'true',
        ENVIRONMENT_IS_WORKER: 'false',
    },
    external: [
        '*.woff2',
    ],
    format: 'esm',
    loader: {
        '.gif': 'copy',
        '.html': 'copy',
        '.wasm': 'copy',
        '.woff2': 'copy',
    },
    minify: true,
    metafile: analyse,
    plugins: [
        esbuildSvelte({
            preprocess: sveltePreprocess(),
        }),
        {
            // Removing the Emscripten ENVIRONMENT_IS_ variables so that the globals defined above will be used instead. Most Node code will be excluded, except that some variables will still be defined
            name: 'EmglkenEnvironmentRemover',
            setup(build) {
                build.onLoad({filter: /emglken\/build\/\w+.js$/}, async (args) => {
                    let code = await fs.readFile(args.path, 'utf8')
                    const env_lines = [
                        // Emscripten 3.1.74
                        'var ENVIRONMENT_IS_WEB = typeof window == "object"',
                        'var ENVIRONMENT_IS_WORKER = typeof importScripts == "function"',
                        'var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer"',
                        // Emscripten 4.0.16
                        'var ENVIRONMENT_IS_WEB = !!globalThis.window',
                        'var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope',
                        'var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer"',
                    ]
                    for (const line of env_lines) {
                        code = code.replace(line, '')
                    }
                    return {
                        contents: code,
                    }
                })
            },
        },
    ],
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
                console.log(await esbuild.analyzeMetafile(result.metafile, {verbose: true}))
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