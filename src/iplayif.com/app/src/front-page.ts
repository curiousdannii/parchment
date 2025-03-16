/*

Dynamic iplayif.com front page
==============================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Koa from 'koa'

import {process_index_html, type SingleFileOptions} from '../../../tools/index-processing.js'

import {flatten_query, type SiteOptions, SUPPORTED_TYPES, utf8encoder} from './common.js'
import {FileMetadata, MetadataCache} from './metadata.js'

export default class FrontPage {
    index_html: string = 'ERROR: front page index.html not yet loaded'
    metadata: MetadataCache
    options: SiteOptions

    constructor(options: SiteOptions, cache: MetadataCache) {
        this.options = options
        this.metadata = cache
        this.update_index_html()
        setInterval(() => this.update_index_html(), options.front_page.index_update_time * 60000)
    }

    async front_page(ctx: Koa.Context) {
        ctx.type = 'text/html; charset=UTF-8'

        const story_url = flatten_query(ctx.query.story)
        if (!story_url || !SUPPORTED_TYPES.test(story_url)) {
            ctx.body = this.index_html
            return
        }

        // Check it's actually a URL and that we have data
        let data: FileMetadata
        try {
            new URL(story_url)
            data = (await this.metadata.get(story_url))!
            //console.log(data)
            if (!data) {
                throw null
            }
        }
        catch {
            ctx.body = this.index_html
            return
        }

        const options: SingleFileOptions = {
            domain: `http${this.options.https ? 's' : ''}://${this.options.domain}`,
            cdn_domain: this.options.cdn_domain,
            story: {
                author: data.author,
                cover: !!data.cover,
                description: data.description,
                filesize: data.filesize,
                format: data.format,
                ifid: data.ifid,
                title: data.title,
                url: story_url,
            },
        }

        const files: Map<string, Uint8Array> = new Map()
        files.set('index.html', utf8encoder.encode(this.index_html))

        ctx.body = await process_index_html(options, files)
    }

    async update_index_html() {
        const url = `https://${this.options.cdn_domain}/`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Cannot access ${url}: ${response.status}, ${response.statusText}`)
        }
        this.index_html = await response.text()
    }
}