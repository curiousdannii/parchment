/*

Dynamic iplayid.com front page
==============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import {escape} from 'lodash-es'
import path from 'path'

import {SUPPORTED_TYPES} from './common.js'
import ProxyApp from './proxy.js'

export default class FrontPageApp extends ProxyApp {
    template = 'ERROR: front page template not yet loaded'

    constructor(options) {
        super(options)

        this.update_template()
        setInterval(() => this.update_template(), this.options.front_page.index_update_time * 60000)
    }

    async front_page(ctx) {
        ctx.type = 'text/html; charset=UTF-8'

        const story_url = ctx.query.story
        if (!story_url || !SUPPORTED_TYPES.test(story_url)) {
            ctx.body = this.template
            return
        }

        // Check it's actually a URL
        try {
            new URL(story_url)
        }
        catch (_) {
            ctx.body = this.template
            return
        }

        // Embed the file name into the page title
        ctx.body = this.template.replace('<title>Parchment</title>', `<title>${escape(path.basename(story_url))} - Parchment</title>`)
    }

    async update_template() {
        const url = `https://${this.options.cdn_domain}/`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Cannot access ${url}: ${response.status}, ${response.statusText}`)
        }
        this.template = await response.text()
    }
}