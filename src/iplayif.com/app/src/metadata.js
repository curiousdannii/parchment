/*

Metadata cache
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import child_process from 'child_process'
import fs from 'fs/promises'
import fs_sync from 'fs'
import os from 'os'
import path from 'path'
import {pipeline} from 'stream/promises'
import util from 'util'

import LRU from 'lru-cache'

const execFile = util.promisify(child_process.execFile)

class File {
    constructor(title, author, cover, description) {
        this.title = title
        this.author = author
        this.cover = cover
        this.description = description
    }
}

export class Metadata {
    constructor(options) {
        this.lru = new LRU({
            fetchMethod: (url) => this.fetch(url),
            max: 1000,
            maxSize: options.metadata.max_size,
            sizeCalculation: (value) => value.cover?.byteLength || 1,
            ttl: options.metadata.max_age * 1000 * 60 * 60,
        })
        this.temp = fs_sync.mkdtempSync(`${os.tmpdir()}/`)
        process.chdir(this.temp)
    }

    async fetch(url) {
        const file_name = /([^/=]+)$/.exec(url)[1]
        const result = new File(file_name, null, null, null)

        // Absorb all errors here
        try {
            console.log(`Metadata server fetching ${url}`)
            const response = await fetch(url)
            if (!response.ok) {
                return result
            }

            // Write the file stream to temp
            const file_path = `${this.temp}/${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}${path.extname(file_name)}`
            await pipeline(response.body, fs_sync.createWriteStream(file_path))

            // Run babel -identify
            const identify_results = await execFile('babel', ['-identify', file_path])
            if (identify_results.stderr.length) {
                // If there was an error do nothing for now
            }
            else {
                const identify_data = identify_results.stdout.split('\n')
                if (identify_data[0] !== 'No bibliographic data') {
                    const author_data = identify_data[0].split(' by ')
                    result.author = author_data[1].trim()
                    result.title = author_data[0].replace(/^[\s"]+|[\s"]+$/g, '')
                }

                // Check the IFDB for details
                if (!result.author) {
                    const ifid = /IFID: ([-\w]+)/i.exec(identify_data[1])[1]
                    const ifdb_response = await fetch(`https://ifdb.org/viewgame?ifiction&ifid=${ifid}`)
                    if (ifdb_response.ok) {
                        const ifdb_xml = await ifdb_response.text()
                        if (!result.author) {
                            result.author = /<author>(.+)<\/author>/.exec(ifdb_xml)[1]
                        }
                        if (result.title === file_name) {
                            result.title = /<title>(.+)<\/title>/.exec(ifdb_xml)[1]
                        }
                    }
                }
            }

            // Clean up and return
            await fs.rm(file_path)
        }
        catch (_) {}

        return result
    }

    get(url) {
        return this.lru.fetch(url)
    }
}