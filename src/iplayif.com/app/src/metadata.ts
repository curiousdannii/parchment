/*

Metadata cache
==============

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

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
import Koa from 'koa'
import {LRUCache} from 'lru-cache'
import sharp from 'sharp'

import type {FileSize} from '../../../common/interface.js'

import {flatten_query, type SiteOptions} from './common.js'
import {SUPPORTED_TYPES} from './common.js'

const exec = util.promisify(child_process.exec)
const execFile = util.promisify(child_process.execFile)

export class FileMetadata {
    author?: string
    cover?: null | {
        data: Uint8Array
        type: string
    }
    description?: string
    filesize?: FileSize
    format: string
    ifid: string
    title: string

    constructor(title: string, format: string, ifid: string) {
        this.title = title
        this.format = format
        this.ifid = ifid
    }
}

export class MetadataCache {
    lru: LRUCache<string, FileMetadata>
    temp: string

    constructor(options: SiteOptions) {
        this.lru = new LRUCache({
            fetchMethod: (url) => this.fetch(url),
            max: 1000,
            maxSize: options.metadata.max_size,
            sizeCalculation: (value) => value.cover?.data.byteLength || 1,
            ttl: options.metadata.max_age * 1000 * 60 * 60,
        })
        this.temp = fs_sync.mkdtempSync(`${os.tmpdir()}/`)
        process.chdir(this.temp)
    }

    async fetch(url: string) {
        const file_name = /([^/=]+)$/.exec(url)![1]
        const file_path = `${this.temp}/${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}${path.extname(file_name)}`

        // Absorb all errors here
        try {
            console.log(`Metadata server fetching ${url}`)
            const response = await fetch(url)
            if (!response.ok) {
                return
            }

            // Write the file stream to temp
            // TODO: fix type
            await pipeline(response.body as any, fs_sync.createWriteStream(file_path))

            return await get_metadata(file_name, file_path)
        }
        finally {
            // Clean up
            await fs.rm(file_path, {force: true})
        }
    }

    get(url: string) {
        return this.lru.fetch(url)
    }
}

export const parchment_formats: Record<string, string> = {
    adrift: 'adrift4',
    'blorbed glulx': 'glulx',
    'blorbed zcode': 'zcode',
    glulx: 'glulx',
    hugo: 'hugo',
    tads2: 'tads',
    tads3: 'tads',
    zcode: 'zcode',
}

export async function get_metadata(file_name: string, file_path: string) {
    // Get filesize
    const stats = await fs.stat(file_path)

    // Run babel -identify
    const identify_results = await execFile('babel', ['-identify', file_path])
    //console.log(identify_results.stdout)

    if (identify_results.stderr.length) {
        // If there was an error we can't really do anything
        return
    }

    const identify_data = identify_results.stdout.split('\n')
    if (identify_data[0].startsWith('Warning: Story format could not be positively identified. Guessing')) {
        identify_data.shift()
    }

    const bibliographic_data = identify_data.shift()!

    let ifid = ''
    while (true) {
        const match = /IFID: ([-\w]+)/i.exec(identify_data[0])
        if (match) {
            ifid = match[1]
            identify_data.shift()
        }
        else {
            break
        }
    }

    const [format_data] = identify_data

    const [babel_format] = format_data.split(',')
    const result = new FileMetadata(file_name, parchment_formats[babel_format], ifid)

    if (bibliographic_data !== 'No bibliographic data') {
        const author_data = bibliographic_data.split(' by ')
        result.author = author_data[1].trim()
        result.title = author_data[0].replace(/^[\s"]+|[\s"]+$/g, '')
    }

    // Estimate the gzipped size
    const gzip_results = await exec(`gzip -c ${file_path} | wc -c`)
    if (!gzip_results.stderr.length) {
        result.filesize = {
            gz: parseInt(gzip_results.stdout, 10),
            size: stats.size,
        }
    }

    // Extract a cover
    let cover: Uint8Array | undefined
    if (!format_data.includes('no cover')) {
        const extract_cover_results = await execFile('babel', ['-cover', file_path])
        if (!extract_cover_results.stderr.length) {
            const cover_path = /Extracted ([-\w.]+)/.exec(extract_cover_results.stdout)![1]
            cover = await fs.readFile(cover_path)
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
        const ifdb_response = await fetch(`https://ifdb.org/viewgame?ifiction&ifid=${result.ifid}`)
        if (ifdb_response.ok) {
            const ifdb_xml = await ifdb_response.text()
            if (!result.author) {
                result.author = he.decode(/<author>(.+?)<\/author>/.exec(ifdb_xml)![1])
            }
            if (result.title === file_name) {
                result.title = he.decode(/<title>(.+?)<\/title>/.exec(ifdb_xml)![1])
            }
            if (!result.cover) {
                const cover_url = /<coverart><url>(.+?)<\/url><\/coverart>/.exec(ifdb_xml)?.[1]
                if (cover_url) {
                    const cover_response = await fetch(he.decode(cover_url))
                    if (cover_response.ok) {
                        cover = Buffer.from(await cover_response.arrayBuffer())
                    }
                }
            }
            if (!result.description) {
                result.description = extract_description(ifdb_xml)
            }
        }
    }

    if (cover) {
        result.cover = {
            data: cover,
            type: (await sharp(cover).metadata())!.format!,
        }
    }

    return result
}

export async function metadata_cover(cache: MetadataCache, ctx: Koa.Context) {
    ctx.component_name = 'Parchment Metadata server'
    const query = ctx.query
    const url = flatten_query(query.url)

    if (!url) {
        ctx.throw(400, 'No requested URL')
    }

    if (!SUPPORTED_TYPES.test(url)) {
        ctx.throw(400, 'Unsupported file type')
    }

    const data = await cache.get(url)
    if (!data?.cover) {
        ctx.throw(400, 'Cover image not found')
    }

    ctx.type = data.cover.type

    const maxh = flatten_query(query.maxh)
    if (!maxh) {
        ctx.throw(400, 'maxh must be specified')
    }
    const max_height = parseInt(maxh, 10)

    if (!max_height) {
        ctx.body = data.cover
    }
    else {
        ctx.body = await sharp(data.cover.data)
            .resize({
                fit: 'inside',
                height: max_height,
                withoutEnlargement: true,
            })
            .toBuffer()
    }

    // Set and check ETag
    // TODO: fix type
    ctx.response.etag = crypto.createHash('md5').update(ctx.body as any).digest('hex')
    if (ctx.fresh) {
        ctx.status = 304
        return
    }
}

function extract_description(ifction: string) {
    const description = /<description>(.+?)<\/description>/.exec(ifction)
    if (description) {
        return he.decode(description[1]).replace(/<br\s*\/>/g, '\n')
    }
}