/*

iplayif.com Koa app
===================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Koa from 'koa'
import {koaBody} from 'koa-body'

import type {SiteOptions} from './common.js'
import FrontPage from './front-page.js'
import {MetadataCache, metadata_cover} from './metadata.js'
import proxy from './proxy.js'
import SiteGenerator from './sitegen.js'
import * as templates from './templates.js'

export default class IplayifApp {
    app: Koa
    front_page: FrontPage
    metadata: MetadataCache
    options: SiteOptions
    sitegen: SiteGenerator

    constructor(options: SiteOptions) {
        this.options = options

        this.app = new Koa()
        this.metadata = new MetadataCache(options)
        this.front_page = new FrontPage(options, this.metadata)
        this.sitegen = new SiteGenerator(options, this.front_page)

        // Add the layers

        // Catch errors
        this.app.use(async (ctx: Koa.Context, next) => {
            try {
                await next()
            }
            catch (err: any) {
                ctx.status = err.statusCode || err.status || 500
                if ('json' in ctx.query) {
                    ctx.body = {
                        error: err,
                    }
                }
                else {
                    ctx.type = 'text/html'
                    ctx.body = templates.wrapper({
                        content: templates.error(err),
                        title: ctx?.component_name,
                    })
                }
                if (ctx.status < 400 || ctx.status > 404) {
                    const errdate = new Date()
                    console.log(`Internal error: (${errdate.toISOString()}): ${ctx.url}`)
                    ctx.app.emit('error', err, ctx)
                }
            }
        })

        this.app.use(koaBody({ multipart: true }))

        // And the main handler
        this.app.use(this.handler.bind(this))
    }

    listen(port: number | string) {
        console.log(`Starting iplayif.com server on port ${port}`)
        this.app.listen(port)
    }

    async handler(ctx: Koa.Context) {
        const request_path = ctx.path

        // Solve CORS issues
        ctx.set('Access-Control-Allow-Origin', '*')

        // Cache this please
        ctx.set('Cache-Control', `max-age=${this.options['cache_control_age']}`)

        if (request_path === '/') {
            return this.front_page.front_page(ctx)
        }

        if (request_path.startsWith('/api/sitegen')) {
            return this.sitegen.sitegen(ctx)
        }

        if (request_path.startsWith('/proxy')) {
            return proxy(this, ctx)
        }

        if (request_path.startsWith('/metadata/cover')) {
            return metadata_cover(this.metadata, ctx)
        }

        // Unexpected path
        ctx.throw(400, 'Unexpected path')
    }
}