/*

File loader
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

// Domains to access directly: should always have both Access-Control-Allow-Origin and compression headers
const DIRECT_DOMAINS = [
    'unbox.ifarchive.org',
]

// Fetch a storyfile, using the proxy if necessary, and handling JSified stories
export async function fetch_storyfile(options, url)
{
    const proxy_url = `${options.proxy_url}?url=${url}`
    const story_domain = (new URL(url)).hostname
    let response

    // Only directly access files from the list of reliable domains
    for (const domain of DIRECT_DOMAINS) {
        if (story_domain.endsWith(domain)) {
            response = await fetch(url)
            // We can't specifically detect CORS errors, so just try the proxy for all errors
            .catch(() => {
                return fetch(proxy_url)
            })
            break
        }
    }

    // Otherwise use the proxy
    if (!response) {
        response = await fetch(proxy_url)
    }

    if (!response.ok)
    {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
    }

    // Handle JSified stories
    if (url.endsWith('.js')) {
        const text = await response.text()
        const matched = /processBase64Zcode\(['"]([a-zA-Z0-9+/=]+)['"]\)/.exec(text)
        if (!matched) {
            throw new Error('Abnormal JSified story')
        }

        // Parse the base64 using a trick from https://stackoverflow.com/a/54123275/2854284
        response = await fetch(`data:application/octet-binary;base64,${matched[1]}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
}

export async function fetch_vm_resource(options, path)
{
    // Handle embedded resources in single file mode
    if (options.single_file) {
        const data = document.getElementById(path).text
        if (path.endsWith('.js')) {
            return import(`data:text/javascript,${encodeURIComponent(data)}`)
        }
        if (!path.endsWith('.wasm')) {
            throw new Error(`Can't load ${path} in single file mode`)
        }
        const response = await fetch(`data:application/wasm;base64,${data}`)
        if (!response.ok)
        {
            throw new Error(`Could not fetch ${path}, got ${response.status}`)
        }
        return response.arrayBuffer()
    }

    if (path.endsWith('.js'))
    {
        return import(path)
    }

    // Something else, like a .wasm
    const response = await fetch(options.lib_path + path)
    if (!response.ok)
    {
        throw new Error(`Could not fetch ${path}, got ${response.status}`)
    }
    return response.arrayBuffer()
}

// Read an uploaded file and return it as a Uint8Array
export function read_uploaded_file(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = event => resolve(new Uint8Array(event.target.result))
        reader.readAsArrayBuffer(file)
    })
}