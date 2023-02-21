/*

Format specifications
=====================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Glk from '../upstream/glkote/glkapi.js'

//import {AsyncGlk} from '../upstream/asyncglk/src/index-browser.js'
//const Glk = new AsyncGlk()

async function generic_emglken_vm(options, requires)
{
    const [file_data, engine, wasmBinary] = requires

    const vm_options = Object.assign({}, options, {
        wasmBinary,
    })

    const vm = new engine.default()
    vm.init(file_data, vm_options)
    await vm.start()
}

export const formats = [
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
                load: ['./scare.js', './scare-core.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'hugo',
        extensions: /\.hex/i,
        engines: [
            {
                id: 'hugo',
                load: ['./hugo.js', './hugo-core.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'glulx',
        extensions: /\.(gblorb|glb|ulx)/i,
        engines: [
            {
                id: 'quixe',
                load: ['./quixe.js'],
                start: (options, requires) =>
                {
                    const [file_data, quixe] = requires
                    const data_array = file_data

                    const vm_options = Object.assign({}, options, {
                        blorb_gamechunk_type: 'GLUL',
                        GiDispa: new quixe.GiDispa(),
                        GiLoad: quixe.GiLoad,
                        image_info_map: 'StaticImageInfo',
                        io: Glk,
                        set_page_title: 0,
                        spacing: 0,
                        use_query_story: 0,
                        vm: quixe.Quixe,
                    })

                    quixe.GiLoad.load_run(vm_options, data_array, 'array')
                },
            },

            {
                id: 'glulxe',
                load: ['./glulxe.js', './glulxe-core.wasm'],
                start: generic_emglken_vm,
            },

            {
                id: 'git',
                load: ['./git.js', './git-core.wasm'],
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
                load: ['./tads.js', './tads-core.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },

    {
        id: 'zcode',
        extensions: /\.(zblorb|zlb|z3|z4|z5|z8)/i,
        engines: [
            {
                id: 'zvm',
                load: ['./zvm.js'],
                start: (options, requires) =>
                {
                    const [file_data, zvm] = requires

                    const vm = new zvm.ZVM()
                    const vm_options = Object.assign({}, options, {
                        vm,
                        GiDispa: new zvm.ZVMDispatch(),
                        Glk,
                    })

                    vm.prepare(file_data, vm_options)
                    Glk.init(vm_options)
                },
            },

            {
                id: 'bocfel',
                load: ['./bocfel.js', './bocfel-core.wasm'],
                start: generic_emglken_vm,
            },
        ],
    },
]

// Search within a Blorb to find what format is inside
// Must be passed a Blorb instance
export function identify_blorb_storyfile_format(blorb) {
    const blorb_chunks = {
        GLUL: 'glulx',
        ZCOD: 'zcode',
    }
    const chunktype = blorb.get_chunk('exec', 0)?.blorbtype
    if (blorb_chunks[chunktype]) {
        return blorb_chunks[chunktype]
    }
    throw new Error('Unknown storyfile format in Blorb')
}
