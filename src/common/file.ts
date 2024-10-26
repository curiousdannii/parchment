/*

File loader
===========

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {parse_base64, type ProgressCallback, read_response} from '../upstream/asyncglk/src/index-common.js'
import type {ParchmentOptions} from './interface.js'

/** Fetch a VM resource */
export async function fetch_vm_resource(options: ParchmentOptions, path: string, progress_callback?: ProgressCallback) {
    // Handle embedded resources in single file mode
    if (options.single_file) {
        const data = (document.getElementById(path) as HTMLScriptElement).text
        if (path.endsWith('.js')) {
            return import(`data:text/javascript,${encodeURIComponent(data)}`)
        }
        if (!path.endsWith('.wasm')) {
            throw new Error(`Can't load ${path} in single file mode`)
        }
        return parse_base64(data)
    }

    if (path.endsWith('.js')) {
        return import(path)
    }

    // Something else, like a .wasm
    // Handle when lib_path is a proper URL (such as import.meta.url), as well as the old style path fragment
    let url
    try {
        url = new URL(path, options.lib_path)
    }
    catch (_) {
        url = options.lib_path + path
    }
    const response = await fetch(url)
    return read_response(response, progress_callback)
}

export async function Uint8Array_to_base64(data: Uint8Array): Promise<string> {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(data.buffer).toString('base64')
    }
    // From https://stackoverflow.com/a/66046176/2854284
    else if (typeof FileReader !== 'undefined') {
        const data_url: string = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(new Blob([data]))
        })
        return data_url.split(',', 2)[1]
    }
    throw new Error('Cannot encode base64')
}