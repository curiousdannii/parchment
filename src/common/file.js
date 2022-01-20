/*

File loader
===========

Copyright (c) 2021 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

async function fetch_storyfile(options, url)
{
    let response = await fetch(url, {redirect: 'follow'})
    // We can't specifically detect CORS errors, so just try the proxy for all errors
    .catch(() => {
        return fetch(`${options.proxy_url}?url=${url}`)
    })

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

async function fetch_vm_resource(options, path)
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

export {fetch_storyfile, fetch_vm_resource}