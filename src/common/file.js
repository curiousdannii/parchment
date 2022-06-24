/*

File loader
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

// Fetch a storyfile, using the proxy if necessary, and handling JSified stories
export async function fetch_storyfile(options, url)
{
    // Handle a relative URL
    url = new URL(url, document.URL)
    const story_domain = url.hostname
    const same_domain = story_domain === document.location.hostname
    url = '' + url
    const proxy_url = `${options.proxy_url}?url=${url}`
    let response

    // Only directly access files same origin files or those from the list of reliable domains
    let direct_access = same_domain
    if (!direct_access) {
        for (const domain of options.direct_domains) {
            if (story_domain.endsWith(domain)) {
                direct_access = true
                break
            }
        }
    }

    if (direct_access) {
        try {
            response = await fetch(url)
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

    if (!response.ok)
    {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
    }

    // It would be nice to check here if the file was compressed, but we can only read the Content-Encoding header for same domain files

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