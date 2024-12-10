/*

Format specifications
=====================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {Blorb} from '../upstream/asyncglk/src/index-common.js'

import type {ParchmentOptions, StoryOptions} from './interface.js'

export interface Engine {
    id: string
    load: string[]
    start: (story: StoryOptions, options: ParchmentOptions, requires: any) => void
}

export interface Format {
    blorbable?: boolean
    engines?: Engine[]
    extensions: RegExp
    id: string
}

async function generic_emglken_vm(story: StoryOptions, options: ParchmentOptions, requires: [any, Uint8Array])
{
    const [engine, wasmBinary] = requires

    const vm_options = Object.assign({}, options, {
        arguments: [story.path],
    })

    const vm = await engine.default({wasmBinary})
    vm.start(vm_options)
}

export const formats: Format[] = [
    {
        id: 'blorb',
        extensions: /\.(blb|blorb)/i,
    },

    {
        id: 'adrift4',
        extensions: /\.taf/i,
        engines: [
            {
                id: 'scare',
                load: ['scare.js', 'scare.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    /*{
        id: 'adrift5',
        blorbable: true,
        extensions: /\.(blb|blorb)/i,
        engines: [
            {
                id: 'frankendrift',
                load: ['frankendrift.js'],
                start: (options, requires) => {
                    const [file_data, FrankenDrift] = requires

                    const vm = new FrankenDrift.FrankenDrift()
                    const vm_options = Object.assign({}, options, {
                        vm,
                        Glk,
                    })

                    vm.init(file_data, vm_options)
                    Glk.init(vm_options)
                },
            },
        ],
    },*/

    {
        id: 'hugo',
        extensions: /\.hex/i,
        engines: [
            {
                id: 'hugo',
                load: ['hugo.js', 'hugo.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'glulx',
        blorbable: true,
        extensions: /\.(gblorb|glb|ulx)/i,
        engines: [
            /*{
                id: 'quixe',
                load: ['quixe.js'],
                start: (_story: StoryOptions, options, requires) =>
                {
                    const [file_data, quixe] = requires
                    const data_array = file_data

                    const vm_options = Object.assign({}, options, {
                        blorb_gamechunk_type: 'GLUL',
                        GiDispa: new quixe.GiDispa(),
                        GiLoad: quixe.GiLoad,
                        image_info_map: 'StaticImageInfo',
                        io: options.Glk,
                        set_page_title: 0,
                        spacing: 0,
                        use_query_story: 0,
                        vm: quixe.Quixe,
                    })

                    quixe.GiLoad.load_run(vm_options, data_array, 'array')
                },
            },*/

            {
                id: 'glulxe',
                load: ['glulxe.js', 'glulxe.wasm'],
                start: generic_emglken_vm,
            },

            {
                id: 'git',
                load: ['git.js', 'git.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'tads',
        extensions: /\.(gam|t3)/i,
        engines: [
            {
                id: 'tads',
                load: ['tads.js', 'tads.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'zcode',
        blorbable: true,
        extensions: /\.(zblorb|zlb|z3|z4|z5|z8)/i,
        engines: [
            /*{
                id: 'zvm',
                load: ['zvm.js'],
                start: (_story: StoryOptions, options, requires) =>
                {
                    const [file_data, zvm] = requires

                    const vm = new zvm.ZVM()
                    const vm_options = Object.assign({}, options, {
                        vm,
                        GiDispa: new zvm.ZVMDispatch(),
                    })

                    vm.prepare(file_data, vm_options)
                    vm_options.Glk.init(vm_options)
                },
            },*/

            {
                id: 'bocfel',
                load: ['bocfel.js', 'bocfel.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },
]

/** Match a format by format ID or file extension */
export function find_format(format?: string | null, path?: string) {
    for (const formatspec of formats) {
        if (formatspec.id === format || (path && formatspec.extensions.test(path))) {
            return formatspec
        }
    }
    throw new Error('Unknown storyfile format')
}

/** Search within a Blorb to find what format is inside
 * Must be passed a Blorb instance */
export function identify_blorb_storyfile_format(blorb: Blorb) {
    const blorb_chunks: Record<string, string> = {
        GLUL: 'glulx',
        ZCOD: 'zcode',
    }
    const chunktype = blorb.get_chunk('exec', 0)?.blorbtype
    if (chunktype && blorb_chunks[chunktype]) {
        return find_format(blorb_chunks[chunktype])
    }
    throw new Error('Unknown storyfile format in Blorb')
}