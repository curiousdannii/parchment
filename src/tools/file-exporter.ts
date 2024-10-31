/*

Parchment file exporter
=======================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {decode as base32768_decode} from 'base32768'
import filesaver from 'file-saver'
import {type ZippableFile, zipSync} from 'fflate'

declare global {
    interface Window {run: () => void}
}

const extension_map: Record<string, string> = {
    command: 'txt',
    data: 'glkdata',
    save: 'glksave',
    transcript: 'txt',
}
const metadata_parts = /modified:(\d+)$/
const record_parts = /^content:(\w+):\w*:(.+)$/

window.run = function() {
    // Check we have the correct Dialog storage version
    const version = parseInt(localStorage.getItem('dialog_storage_version') || '', 10)
    if (version !== 1) {
        alert(`This tool doesn't support dialog_storage_version=${version}`)
        return
    }

    // Loop through localStorage to find the files
    const files: Record<string, ZippableFile> = {}
    const filenames: Record<string, number> = {}
    for (const [key, value] of Object.entries(localStorage)) {
        if (!key.startsWith('content:')) {
            continue
        }

        const match = record_parts.exec(key)
        if (!match) {
            console.log(`Unparsable content record: ${key}`)
            continue
        }

        // Work out a unique filename, if there were multiple games with the same savefile names
        const files_key = `${match[1]}:${match[2]}`
        if (!filenames[files_key]) {
            filenames[files_key] = 0
        }
        filenames[files_key]++
        const duplicate_counter = filenames[files_key] > 1 ? `-${filenames[files_key]}` : ''
        const filename = `parchment-files/${match[2]}${duplicate_counter}.${extension_map[match[1]] || match[1] || 'unknown'}`

        // Get the modified date
        const metadata = localStorage.getItem('dirent:' + key.substring(8))
        const modified = metadata ? parseInt(metadata_parts.exec(metadata)![1]) : Date.now()

        // Add the file
        files[filename] = [base32768_decode(value), {mtime: modified}]
    }

    const zip_file = zipSync(files)
    filesaver.saveAs(new Blob([zip_file]), 'parchment-files.zip')
}