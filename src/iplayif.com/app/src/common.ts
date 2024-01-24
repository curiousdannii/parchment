/*

Common things
=============

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

/** Koa query results can be an array, but we only ever want the first one */
export function flatten_query<T>(query: T | T[] | undefined): T | undefined {
    if (Array.isArray(query)) {
        return query[0]
    }
    return query
}

export const SUPPORTED_TYPES = /\.(blb|blorb|gam|gblorb|glb|hex|taf|t3|ulx|zblorb|zlb|z[3458])$/i

export interface SiteOptions {
    cache_control_age?: number
    cdn_domain: string
    domain?: string
    front_page: {
        index_update_time: number
    }
    https?: boolean
    metadata: {
        max_age: number
        max_size: number
    },
    proxy: {
        max_size: number
    }
}

export const utf8encoder = new TextEncoder()