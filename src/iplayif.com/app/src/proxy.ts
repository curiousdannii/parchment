/*

The Parchment proxy
===================

Copyright (c) 2025 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import crypto from 'crypto'

import Koa from 'koa'

import IplayifApp from './app.js'
import {flatten_query, SUPPORTED_TYPES} from './common.js'
import * as templates from './templates.js'

export default async function proxy(app: IplayifApp, ctx: Koa.Context) {
    ctx.component_name = 'Parchment Proxy'
    const query = ctx.query
    const url = flatten_query(query.url)

    if (!url) {
        ctx.body = templates.wrapper({
            content: templates.proxyhome(),
            title: 'Parchment Proxy',
        })
        return
    }

    ctx.type = 'text/plain; charset=ISO-8859-1'

    if (!SUPPORTED_TYPES.test(url)) {
        ctx.throw(400, 'Unsupported file type')
    }

    // Request the URL
    const response = await fetch(url, {redirect: 'follow'})
    if (!response.ok) {
        throw new Error(`Cannot access ${url}: ${response.status}, ${response.statusText}`)
    }

    // Send the final URL if it was redirected
    const decoded_final_url = decodeURI(response.url)
    if (decoded_final_url !== url) {
        ctx.set('Final-Url', decoded_final_url)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > app.options.proxy.max_size) {
        ctx.throw(400, 'Requested file too large')
    }

    if (query.encode === 'base64') {
        const data = buffer.toString(query.encode === 'base64' ? 'base64' : 'latin1')
        if (query.callback) {
            ctx.type = 'text/javascript'
            ctx.body = `${query.callback}("${data}")`
        }
        else {
            ctx.body = data
        }
    }
    else {
        ctx.body = buffer
    }

    // Set and check ETag
    // TODO: fix type
    ctx.response.etag = crypto.createHash('md5').update(ctx.body as any).digest('hex')
    if (ctx.fresh) {
        ctx.status = 304
        return
    }
}