/*

Metadata cache
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import child_process from 'child_process'
import crypto from 'crypto'
import fs from 'fs/promises'
import fs_sync from 'fs'
import os from 'os'
import path from 'path'
import {pipeline} from 'stream/promises'
import util from 'util'

import he from 'he'
import LRU from 'lru-cache'
import sharp from 'sharp'

import {SUPPORTED_TYPES} from './common.js'
import FrontPageApp from './front-page.js'

const execFile = util.promisify(child_process.execFile)

class File {
    constructor(title) {
        this.title = title
        this.author = null
        this.cover = null
        this.cover_type = null
        this.description = null
    }
}

export class MetadataCache {
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
        const result = new File(file_name)

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

                // Extract a cover
                if (!identify_data[2].includes('no cover')) {
                    const extract_cover_results = await execFile('babel', ['-cover', file_path])
                    if (!extract_cover_results.stderr.length) {
                        const cover_path = /Extracted ([-\w.]+)/.exec(extract_cover_results.stdout)[1]
                        result.cover = await fs.readFile(cover_path)
                        await fs.rm(cover_path)
                    }
                }

                // See if there's a description
                const description_results = await execFile('babel', ['-meta', file_path])
                if (!description_results.stderr.length) {
                    result.description = extract_description(description_results.stdout)
                }

                // Check the IFDB for details
                if (!result.author || !result.cover || !result.description) {
                    const ifid = /IFID: ([-\w]+)/i.exec(identify_data[1])[1]
                    const ifdb_response = await fetch(`https://ifdb.org/viewgame?ifiction&ifid=${ifid}`)
                    if (ifdb_response.ok) {
                        const ifdb_xml = await ifdb_response.text()
                        if (!result.author) {
                            result.author = he.decode(/<author>(.+?)<\/author>/.exec(ifdb_xml)[1])
                        }
                        if (result.title === file_name) {
                            result.title = he.decode(/<title>(.+?)<\/title>/.exec(ifdb_xml)[1])
                        }
                        if (!result.cover) {
                            const cover_url = /<coverart><url>(.+?)<\/url><\/coverart>/.exec(ifdb_xml)?.[1]
                            if (cover_url) {
                                const cover_response = await fetch(he.decode(cover_url))
                                if (cover_response.ok) {
                                    result.cover = Buffer.from(await cover_response.arrayBuffer())
                                }
                            }
                        }
                        if (!result.description) {
                            result.description = extract_description(ifdb_xml)
                        }
                    }
                }

                if (result.cover) {
                    result.cover_type = (await sharp(result.cover).metadata())?.format
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

export class MetaDataApp extends FrontPageApp {
    async metadata_cover(ctx) {
        ctx.component_name = 'Parchment Metadata server'
        const query = ctx.query
        const url = query.url

        if (!url) {
            ctx.throw(400, 'No requested URL')
        }

        if (!SUPPORTED_TYPES.test(url)) {
            ctx.throw(400, 'Unsupported file type')
        }

        const data = await this.metadata.get(url)
        if (!data.cover) {
            ctx.throw(400, 'Cover image not found')
        }

        ctx.type = data.cover_type

        const max_height = parseInt(query.maxh, 10)

        if (!max_height) {
            ctx.body = data.cover
        }
        else {
            ctx.body = await sharp(data.cover)
                .resize({
                    fit: 'inside',
                    height: max_height,
                    withoutEnlargement: true,
                })
                .toBuffer()
        }

        // Set and check ETag
        ctx.response.etag = crypto.createHash('md5').update(ctx.body).digest('hex')
        if (ctx.fresh) {
            ctx.status = 304
            return
        }
    }
}

function extract_description(ifction) {
    const description = /<description>(.+?)<\/description>/.exec(ifction)
    if (description) {
        return he.decode(description[1]).replace(/<br\s*\/>/g, '\n')
    }
}