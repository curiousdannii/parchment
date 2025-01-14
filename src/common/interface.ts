/*

Common Parchment Interfaces
===========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import type {BrowserDialog, /*GlkApi,*/ GlkOte, GlkOteOptions, TruthyOption} from '../upstream/asyncglk/src/index-common.js'

/** The size and gzipped size of a file */
export interface FileSize {
    /** Size of file in bytes, gzip compressed (doesn't need to be exact) */
    gz: number
    /** Size of file in bytes, uncompressed */
    size: number
}

export interface StoryOptions {
    /** Size of storyfile */
    filesize?: FileSize
    /** Format ID, matching formats.js */
    format?: string
    /** Dialog file path */
    path?: string
    /** Sound formats this game uses */
    sounds?: ['aiff' | 'mod' | 'ogg']
    /** Story title (can include author name too) */
    title?: string
    /** Actual URL to the storyfile */
    url?: string
}

export interface ParchmentOptions extends Omit<GlkOteOptions, 'accept'> {
    // Parchment options

    /** Whether or not to automatically launch Parchment */
    auto_launch?: TruthyOption,
    /** Whether or not to autoplay, if not a Play button will be shown (useful for games that play sounds on startup) */
    autoplay?: TruthyOption,
    /** Story path in the array format traditionally used by Parchment for Inform 7 */
    default_story?: [string],
    /** Storyfile path or metadata */
    story?: string | StoryOptions,
    /** Theme name, can be set to 'dark */
    theme?: string,
    /** Name of theme cookie to check */
    theme_cookie: string,
    /** Whether to test the AsyncGlk GlkApi library */
    use_asyncglk?: TruthyOption,

    // Modules to pass to other modules

    /** Dialog instance to use */
    Dialog: BrowserDialog,
    /** GlkApi instance to use */
    //Glk: GlkApi,
    /** GlkOte instance to use */
    GlkOte: GlkOte,

    // Common options for VMs

    /** Whether or not to load an autosave */
    do_vm_autosave?: TruthyOption,
}