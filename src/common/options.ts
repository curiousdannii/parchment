/*

Common Parchment Options
========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {ClassicSyncDialog, GlkOte, GlkOteOptions, WebGlkOte} from '../upstream/asyncglk/src/index-browser.js'
import WebDialog from '../upstream/glkote/dialog.js'

type ParchmentTruthy = boolean | number

export interface ParchmentOptions extends Partial<GlkOteOptions> {
    // Parchment options

    /** Whether or not to automatically launch Parchment */
    auto_launch?: ParchmentTruthy,
    /** Story path in the array format traditionally used by Parchment for Inform 7 */
    default_story?: [string],
    /** Domains to access directly: should always have both Access-Control-Allow-Origin and compression headers */
    direct_domains: string[],
    /** Format ID, matching formats.js */
    format?: string,
    /** Path to resources */
    lib_path: string,
    /** URL of Proxy */
    proxy_url: string,
    /** Whether to load embeded resources in single file mode */
    single_file?: ParchmentTruthy,
    /** Story path */
    story?: string,
    /** Theme name, can be set to 'dark */
    theme?: string,
    /** Name of theme cookie to check */
    theme_cookie: string,
    /** Disable the file proxy, which may mean that some files can't be loaded */
    use_proxy?: ParchmentTruthy,

    // Modules to pass to other modules

    /** Dialog instance to use */
    Dialog: ClassicSyncDialog,
    /** GlkOte instance to use */
    GlkOte: GlkOte,

    // Common options for VMs

    /** Whether or not to load an autosave */
    do_vm_autosave?: ParchmentTruthy,
}

export function get_default_options(): ParchmentOptions {
    return {
        auto_launch: 1,
        Dialog: WebDialog,
        direct_domains: [
            'unbox.ifarchive.org',
        ],
        do_vm_autosave: 1,
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
            options[option] = query.get(option)
        }
    }
    return options
}
