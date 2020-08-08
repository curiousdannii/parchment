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

const formats = [
    {
        id: 'glulx',
        extensions: /gblorb|ulx/,
        engines: [
            {
                id: 'quixe',
                load: ['./quixe.js'],
                start: (options, requires) =>
                {
                    const [file_data, quixe] = requires
                    const data_array = Array.from(file_data)

                    window.GiDispa = quixe.GiDispa
                    window.GiLoad = quixe.GiLoad
                    window.Glk = Glk
                    window.GlkOte = GlkOte
        
                    const vm_options = Object.assign({}, options, {
                        blorb_gamechunk_type: 'GLUL',
                        Dialog,
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
                start: async (options, requires) =>
                {
                    const [file_data, glulxe, wasmBinary] = requires
        
                    const vm_options = Object.assign({}, options, {
                        Dialog,
                        Glk: {},
                        GlkOte,
                        wasmBinary,
                    })

                    const vm = new glulxe.default()
                    vm.prepare(file_data, vm_options)
                    await vm.start()
                },
            },
        ],
    },

    {
        id: 'zcode',
        extensions: /zblorb|z3|z4|z5|z8/,
        engines: [
            {
                id: 'zvm',
                load: ['./zvm.js'],
                start: (options, requires) =>
                {
                    const [file_data, zvm] = requires

                    const vm_options = Object.assign({}, options, {
                        vm,
                        Dialog,
                        GiDispa: new zvm.ZVMDispatch(),
                        Glk,
                        GlkOte,
                    })

                    const vm = new zvm.ZVM()
                    vm.prepare(file_data, vm_options)
                    Glk.init(vm_options)
                },
            },
        ],
    },
]

export default formats