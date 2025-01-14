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

import type {FilesMetadata} from '../upstream/asyncglk/src/index-common.js'

declare global {
    interface Window {run: () => void}
}

window.run = function() {
    // Check we have the correct Dialog storage version
    const version = parseInt(localStorage.getItem('dialog_storage_version') || '0', 10)
    if (version !== 2) {
        alert(`This tool doesn't support dialog_storage_version=${version}`)
        return
    }

    const files: Record<string, ZippableFile> = {}
    const files_metadata: FilesMetadata = JSON.parse(localStorage.getItem('dialog_metadata')!)

    for (const [path, metadata] of Object.entries(files_metadata)) {
        if (path.endsWith('.dir')) {
            continue
        }
        const data = localStorage.getItem(path)!
        const usr_path = path.substring(5)
        files[usr_path] = [base32768_decode(data), {mtime: metadata.mtime}]
    }

    const zip_file = zipSync(files)
    filesaver.saveAs(new Blob([zip_file]), 'parchment-files.zip')
}