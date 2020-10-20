/*

Format specifications
=====================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Dialog from '../upstream/glkote/dialog.js'
import Glk from '../upstream/glkote/glkapi.js'
import GlkOte from '../upstream/glkote/glkote.js'

async function generic_emglken_vm(options, requires)
{
    const [file_data, engine, wasmBinary] = requires

    const vm_options = Object.assign({}, options, {
        Dialog,
        do_vm_autosave: 1,
        Glk: {},
        GlkOte,
        wasmBinary,
    })

    const vm = new engine.default()
    vm.prepare(file_data, vm_options)
    await vm.start()
}

const formats = [
    {
        id: 'hugo',
        extensions: /\.hex/,
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
        extensions: /\.(gblorb|ulx)/,
        engines: [
            {
                id: 'quixe',
                load: ['./quixe.js'],
                start: (options, requires) =>
                {
                    const [file_data, quixe] = requires
                    const data_array = Array.from(file_data)

                    // Quixe still expects many things to be global variables
                    window.Dialog = Dialog
                    window.GiDispa = quixe.GiDispa
                    window.GiLoad = quixe.GiLoad
                    window.Glk = Glk
                    window.GlkOte = GlkOte

                    const vm_options = Object.assign({}, options, {
                        blorb_gamechunk_type: 'GLUL',
                        Dialog,
                        do_vm_autosave: 1,
                        GiDispa: quixe.GiDispa,
                        GiLoad: quixe.GiLoad,
                        GlkOte,
                        image_info_map: 'StaticImageInfo',
                        io: Glk,
                        set_page_title: false,
                        spacing: 0,
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
        ],
    },

    {
        id: 'tads',
        extensions: /\.(gam|t3)/,
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
        extensions: /\.(zblorb|z3|z4|z5|z8)/,
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
                        Dialog,
                        do_vm_autosave: 1,
                        GiDispa: new zvm.ZVMDispatch(),
                        Glk,
                        GlkOte,
                    })

                    vm.prepare(file_data, vm_options)
                    Glk.init(vm_options)
                },
            },
        ],
    },
]

export default formats