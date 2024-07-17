/*

Common Parchment Options
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import type {DownloadOptions, /*GlkApi,*/ GlkOte, GlkOteOptions} from '../upstream/asyncglk/src/index-browser.js'
import {BrowserDialog, WebGlkOte} from '../upstream/asyncglk/src/index-browser.js'
//import GlkOte_GlkApi from '../upstream/glkote/glkapi.js'

export type ParchmentTruthy = boolean | number

export interface StoryOptions {
    /** Size of storyfile in bytes, uncompressed */
    filesize?: number
    /** Size of storyfile in bytes, gzip compressed (doesn't need to be exact) */
    filesize_gz?: number
    /** Format ID, matching formats.js */
    format?: string
    /** Dialog file path */
    path?: string
    /** Actual URL to the storyfile */
    url?: string
}

export interface ParchmentOptions extends DownloadOptions, Partial<GlkOteOptions> {
    // Parchment options

    /** Whether or not to automatically launch Parchment */
    auto_launch?: ParchmentTruthy,
    /** Story path in the array format traditionally used by Parchment for Inform 7 */
    default_story?: [string],
    /** Path to resources */
    lib_path: string,
    /** Whether to load embedded resources in single file mode */
    single_file?: ParchmentTruthy,
    /** Storyfile path or metadata */
    story?: string | StoryOptions,
    /** Theme name, can be set to 'dark */
    theme?: string,
    /** Name of theme cookie to check */
    theme_cookie: string,
    /** Whether to test the AsyncGlk GlkApi library */
    use_asyncglk?: ParchmentTruthy,

    // Modules to pass to other modules

    /** Dialog instance to use */
    Dialog: BrowserDialog,
    /** GlkApi instance to use */
    //Glk: GlkApi,
    /** GlkOte instance to use */
    GlkOte: GlkOte,

    // Common options for VMs

    /** Whether or not to load an autosave */
    do_vm_autosave?: ParchmentTruthy,
}

export function get_default_options(): ParchmentOptions {
    return {
        auto_launch: 1,
        Dialog: new BrowserDialog(),
        direct_domains: [
            'unbox.ifarchive.org',
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
            // I couldn't work out how to apply proper filtering here, so tell TS to ignore it
            options[option] = query.get(option) as any
        }
    }
    return options
}
