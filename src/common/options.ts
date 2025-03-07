/*

Common Parchment Options
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {ProviderBasedBrowserDialog, WebGlkOte} from '../upstream/asyncglk/src/index-browser.js'
//import GlkOte_GlkApi from '../upstream/glkote/glkapi.js'

import type {ParchmentOptions} from './interface.js'

export function get_default_options(): ParchmentOptions {
    return {
        auto_launch: 1,
        // Autoplay by default, unless we're loaded inside an iframe
        autoplay: window.self === window.top,
        Dialog: new ProviderBasedBrowserDialog(),
        direct_domains: [
            'ifarchive.org',
            'mirror.ifarchive.org',
            'unbox.ifarchive.org',
            'www.ifarchive.org',
        ],
        do_vm_autosave: 1,
        //Glk: GlkOte_GlkApi,
        GlkOte: new WebGlkOte(),
        // This only makes sense after the source files are built
        lib_path: import.meta.url,
        proxy_url: 'https://iplayif.com/proxy/',
        set_body_to_page_bg: 1,
        theme_cookie: 'parchment_theme',
        use_proxy: 1,
    }
}

/** Get options specified in the URL query */
export function get_query_options(possible_query_options: Array<keyof ParchmentOptions>): Partial<ParchmentOptions> {
    const query = new URLSearchParams(document.location.search)
    const options: Partial<ParchmentOptions> = {}
    for (const option of possible_query_options) {
        if (query.has(option)) {
            // I couldn't work out how to apply proper types here, so tell TS to ignore it
            const value = query.get(option)
            try {
                options[option] = JSON.parse(value!)
            }
            catch {
                options[option] = value as any
            }
        }
    }
    return options
}
