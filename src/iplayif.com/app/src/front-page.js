/*

Dynamic iplayid.com front page
==============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import {escape} from 'lodash-es'

import {SUPPORTED_TYPES} from './common.js'
import ProxyApp from './proxy.js'

export default class FrontPageApp extends ProxyApp {
    index_html = 'ERROR: front page index.html not yet loaded'

    constructor(options) {
        super(options)

        this.update_index_html()
        setInterval(() => this.update_index_html(), this.options.front_page.index_update_time * 60000)
    }

    async front_page(ctx) {
        ctx.type = 'text/html; charset=UTF-8'

        const story_url = ctx.query.story
        if (!story_url || !SUPPORTED_TYPES.test(story_url)) {
            ctx.body = this.index_html
            return
        }

        // Check it's actually a URL
        try {
            new URL(story_url)
        }
        catch (_) {
            ctx.body = this.index_html
            return
        }


        const data = await this.metadata.get(story_url)
        //console.log(data)

        // Embed the metadata into the page title
        let body = this.index_html
            .replace('<title>Parchment</title>', `<title>${escape(data.title)} - Parchment</title>`)

        // And simplify the HTML a little
        body = body.replace(/<div id="about">.+<\/noscript>\s+<\/div>/s, `<noscript>
            <h1>Parchment</h1>
            <p>is an interpreter for Interactive Fiction. <a href="https://github.com/curiousdannii/parchment">Find out more.</a></p>
            <p>Parchment requires Javascript. Please enable it in your browser.</p>
        </noscript>`)
            .replace('<div id="loadingpane" style="display:none;">', '<div id="loadingpane">')

        ctx.body = body
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