/*

iplayif.com Koa app
===================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import Koa from 'koa'

import * as templates from './templates.js'

export class BaseApp {
    constructor(options) {
        this.options = options

        this.app = new Koa()

        // Add the layers

        // Catch errors
        this.app.use(async (ctx, next) => {
            try {
                await next()
            }
            catch (err) {
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

        // And the main handler
        this.app.use(this.handler.bind(this))
    }

    listen(port) {
        console.log(`Starting iplayif.com server on port ${port}`)
        this.app.listen(port)
    }

    async handler(ctx) {
        const request_path = ctx.path

        // Solve CORS issues
        ctx.set('Access-Control-Allow-Origin', '*')

        // Cache this please
        ctx.set('Cache-Control', `max-age=${this.options['cache_control_age']}`)

        if (request_path === '/') {
            return this.front_page(ctx)
        }

        if (request_path.startsWith('/proxy')) {
            return this.proxy(ctx)
        }

        // Unexpected path
        ctx.throw(400, 'Unexpected path')
    }
}