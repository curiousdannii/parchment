#!/usr/bin/env node
/*

Parchment Inform 7 template WASM processor
==========================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import fs from 'fs/promises'
import path from 'path'
import {fileURLToPath} from 'url'
import {gzipSync} from 'zlib'

import {Uint8Array_to_base64} from '../common/file.js'

const rootpath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Compress and base64 encode the wasm files
for (const vm of ['bocfel', 'glulxe']) {
    const wasm = await fs.readFile(path.join(rootpath, `src/upstream/emglken/build/${vm}.wasm`))
    const wasm_gz = gzipSync(wasm, {level: 9})
    const base64 = await Uint8Array_to_base64(wasm_gz)
    await fs.writeFile(path.join(rootpath, `dist/inform7/Parchment/${vm}.js`), `processBase64Zcode('${base64}')`)
}