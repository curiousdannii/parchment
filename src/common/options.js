/*

Common Parchment Options
========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Dialog from '../upstream/glkote/dialog.js'
import GlkOte from '../upstream/asyncglk/src/glkote/web/web.ts'

export default function get_default_options() {
    return {
        auto_launch: 1,
        //default_story: [PATH_TO_JSIFIED_STORY]
        Dialog,
        do_vm_autosave: 1,
        GlkOte: new GlkOte(),
        lib_path: 'dist/web/',
        proxy_url: 'https://proxy.iplayif.com/proxy/',
        //single_file: 0
        //story: PATH_TO_STORY
    }
}