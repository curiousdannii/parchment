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
        /** Domains to access directly: should always have both Access-Control-Allow-Origin and compression headers */
        direct_domains: [
            'unbox.ifarchive.org',
        ],
        do_vm_autosave: 1,
        GlkOte: new GlkOte(),
        lib_path: 'dist/web/',
        proxy_url: 'https://proxy.iplayif.com/proxy/',
        //single_file: 0
        //story: PATH_TO_STORY
        //theme: can be set to 'dark'
        theme_cookie: 'parchment_theme',
        /** Disable the file proxy, which may mean that some files can't be loaded */
        use_proxy: 1,
    }
}