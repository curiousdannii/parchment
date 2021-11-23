/*

File loader
===========

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

async function fetch_storyfile(options, url)
{
    const response = await fetch(url)
    .catch(e => {
        return fetch(`${options.proxy_url}?url=${url}`)
    })

    if (!response.ok)
    {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
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