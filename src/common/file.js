/*

File loader
===========

Copyright (c) 2021 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

async function fetch_storyfile(options, url)
{
    let response = await fetch(url)
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