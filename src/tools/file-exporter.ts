/*

Parchment file exporter
=======================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {decode as base32768_decode} from 'base32768'
import filesaver from 'file-saver'
import JSZip from 'jszip'

declare global {
    interface Window {run: () => void}
}

const record_parts = /content:(\w+):\w*:(.+)/
const extension_map: Record<string, string> = {
    command: '.txt',
    data: '.glkdata',
    save: '.glksave',
    transcript: '.txt',
}

window.run = async function() {
    // Check we have the correct Dialog storage version
    const version = parseInt(localStorage.getItem('dialog_storage_version') || '', 10)
    if (version !== 1) {
        alert(`This tool doesn't support dialog_storage_version=${version}`)
        return
    }

    // Create a zip file
    const zip = new JSZip()

    // Loop through localStorage to find the files
    const files: Record<string, number> = {}
    for (const [key, value] of Object.entries(localStorage)) {
        if (!key.startsWith('content:')) {
            continue
        }

        const match = record_parts.exec(key)
        if (!match) {
            console.log(`Unparsable content record: ${key}`)
            continue
        }

        const file = base32768_decode(value)
        const files_key = `${match[1]}:${match[2]}`
        if (!files[files_key]) {
            files[files_key] = 0
        }
        files[files_key]++
        const duplicate_counter = files[files_key] > 1 ? `-${files[files_key]}` : ''

        // Add the file
        zip.file('parchment-files/' + match[2] + duplicate_counter + extension_map[match[1]], file)
    }

    const zip_file = await zip.generateAsync({type: 'blob'})
    filesaver.saveAs(zip_file, 'parchment-files.zip')
}