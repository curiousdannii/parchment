/*

File loader
===========

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {parse_base64, type ProgressCallback, read_response} from '../upstream/asyncglk/src/index-browser.js'
import type {ParchmentOptions} from './options.js'

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
        return parse_base64(data, 'wasm')
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

/** Read an uploaded file and return it as a Uint8Array */
export function read_uploaded_file(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
        reader.readAsArrayBuffer(file)
    })
}