/*

File loader
===========

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

async function fetch_file(url)
{
    const response = await fetch(url)
    if (!response.ok)
    {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
}

export {fetch_file}