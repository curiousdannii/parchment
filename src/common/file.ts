/*

File loader
===========

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import type {ParchmentOptions} from './options.js'

export type ProgressCallback = (bytes: number) => void

const utf8decoder = new TextDecoder()

/** Fetch a storyfile, using the proxy if necessary, and handling JSified stories */
export async function fetch_storyfile(options: ParchmentOptions, url: string, progress_callback?: ProgressCallback): Promise<Uint8Array> {
    // Handle a relative URL
    const story_url = new URL(url, document.URL)
    const story_domain = story_url.hostname
    const same_protocol = story_url.protocol === document.location.protocol
    const same_domain = story_domain === document.location.hostname
    const proxy_url = `${options.proxy_url}?url=${story_url}`
    let response: Response

    // Load an embedded storyfile
    if (story_url.protocol === 'embedded:') {
        const data = (document.getElementById(story_url.pathname) as HTMLScriptElement).text
        return parse_base64(data)
    }

    // Only directly access files same origin files or those from the list of reliable domains
    let direct_access = (same_protocol && same_domain) || story_url.protocol === 'data:'
    if (!direct_access) {
        for (const domain of options.direct_domains) {
            if (story_domain.endsWith(domain)) {
                // all direct domains require HTTPS
                story_url.protocol = 'https:'
                direct_access = true
                break
            }
        }
    }

    if (direct_access) {
        try {
            response = await fetch('' + story_url)
        }
        // We can't specifically detect CORS errors but that's probably what happened
        catch (_) {
            throw new Error('Failed to fetch storyfile (possible CORS error)')
        }
    }

    // Otherwise use the proxy
    else {
        if (options.use_proxy) {
            response = await fetch(proxy_url)
        }
        else {
            throw new Error('Storyfile not in list of direct domains and proxy disabled')
        }
    }

    if (!response.ok) {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
    }

    // It would be nice to check here if the file was compressed, but we can only read the Content-Encoding header for same domain files

    const data = await read_response(response, progress_callback)

    // Handle JSified stories
    if (url.endsWith('.js')) {
        const text = utf8decoder.decode(data)
        const matched = /processBase64Zcode\(['"]([a-zA-Z0-9+/=]+)['"]\)/.exec(text)
        if (!matched) {
            throw new Error('Abnormal JSified story')
        }

        return parse_base64(matched[1])
    }

    return data
}

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

/** Parse Base 64 into a Uint8Array */
export async function parse_base64(data: string): Promise<Uint8Array> {
    // Firefox has a data URL limit of 32MB, so we have to chunk large data
    const chunk_length = 30_000_000
    if (data.length < chunk_length) {
        return parse_base64_with_data_url(data)
    }
    const chunks: Uint8Array[] = []
    let i = 0
    while (i < data.length) {
        chunks.push(await parse_base64_with_data_url(data.substring(i, i += chunk_length)))
    }
    const blob = new Blob(chunks)
    return new Uint8Array(await blob.arrayBuffer())
}

async function parse_base64_with_data_url(data: string) {
    // Parse base64 using a trick from https://stackoverflow.com/a/54123275/2854284
    const response = await fetch(`data:application/octet-stream;base64,${data}`)
    if (!response.ok) {
        throw new Error(`Could not parse base64: ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
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

/** Read a response, with optional progress notifications */
async function read_response(response: Response, progress_callback?: ProgressCallback): Promise<Uint8Array> {
    if (!response.ok) {
        throw new Error(`Could not fetch ${response.url}, got ${response.status}`)
    }

    if (!progress_callback) {
        return new Uint8Array(await response.arrayBuffer())
    }

    // Read the response, calling the callback with each chunk
    const chunks: Array<[number, Uint8Array]> = []
    let length = 0
    const reader = response.body!.getReader()
    for (;;) {
        const {done, value} = await reader.read()
        if (done) {
            break
        }
        chunks.push([length, value])
        progress_callback(value.length)
        length += value.length
    }

    // Join the chunks together
    const result = new Uint8Array(length)
    for (const [offset, chunk] of chunks) {
        result.set(chunk, offset)
    }
    return result
}
