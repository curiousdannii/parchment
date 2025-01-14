/*

File loader
===========

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

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