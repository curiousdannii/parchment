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

import IplayifApp from './converter.js'

const default_options = {
    cache_control_age: 604800, // 1 week
    cdn_domain: 'cdn.iplayif.com',
    domain: '127.0.0.1',
    front_page: {
        index_update_time: 10,
    },
    https: false,
    metadata: {
        max_age: 24, // 24 hours
        max_size: 200000000, // 200 MB
    },
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