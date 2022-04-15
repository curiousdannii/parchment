/*

iplayif.com server
==================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import fs from 'fs/promises'
import {merge} from 'lodash-es'
import path from 'path'

import IplayifApp from './proxy.js'

const default_options = {
    cache_control_age: 604800, // 1 week
    proxy: {
        max_size: 100000000, // 100 MB
    },
}

// Process ENV
const data_dir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const port = process.env.PORT || 8080

// Make the data directory
await fs.mkdir(data_dir, {recursive: true})

// Load options
const options_path = path.join(data_dir, 'options.json')
let options_json = '{}'
try {
    options_json = await fs.readFile(options_path, {encoding: 'utf8'})
}
catch (_) {}
const options = merge({}, default_options, JSON.parse(options_json))

// Start the server
const app = new IplayifApp(options)
app.listen(port)