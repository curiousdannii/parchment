/*

Templates
=========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import {escape} from 'lodash-es'

export function wrapper(opts) {
    if (!opts.title) {
        opts.title = 'Parchment'
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escape(opts.title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${opts.canonical ? `<link rel="canonical" href="${opts.canonical}">` : ''}
    <style>
        body {
            margin: 0;
        }
        .page {
            margin: 0 auto;
            max-width: 960px;
        }
        .header {
            text-align: center;
        }
        ul.list {
            margin: 1em 0;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>${escape(opts.title)}</h1>
        </div>

        ${opts.content}

    </div>
</body>
</html>`
}

export function error(msg) {
    return `
        <div class="Description">
            <p><b>Error:</b></p>
            <p class="Error">${escape(msg)}</p>
        </div>`
}

export function proxyhome() {
    return `
        <div>
            <p>This is a simple proxy for use with Interfactive Fiction web interpreters.
            <h2>How to use</h2>
            <p>Examples:
            <ul>
                <li>/proxy/?url=https://ifarchive.org/if-archive/games/springthing/2007/Fate.z8
                <li>/proxy/?url=https://ifarchive.org/if-archive/games/springthing/2007/Fate.z8&callback=processBase64Zcode&encode=base64
            </ul>
            <p>Parameters:
            <ul>
                <li><p><tt>url</tt>: required, the URL of the story to access.
                    <p>Supported file types are
                    <ul class="list">
                        <li>Generic blorbs: .blorb, .blb
                        <li>Glulx: .gblorb, .ulx
                        <li>Hugo: .hex
                        <li>TADS: .gam, .t3
                        <li>Z-Code: .zblorb, .z3, .z4, .z5, .z8
                    </ul>
                <li><tt>encode</tt>: set <tt>encode=base64</tt> to base64 encode the story file
                <li><p><tt>callback</tt>: a callback function for JSONP
                    <p>If you're using jQuery and you set the dataType to <tt>'jsonp'</tt>, it will automatically create the callback function and add this parameter for you. Other libraries may do the same. However, as the parameter jQuery choses for you will be unique, the results won't be cached, and so it's recommended that you manually specify the callback function. See <a href="https://api.jquery.com/jQuery.ajax/">the jQuery docs</a> for more information.
                    <p>If you use a callback, also set <tt>encode=base64</tt>.
            </ul>
            <p>Parchment-proxy will send the data with a <tt>Content-Type</tt> header of <tt>text/plain; charset=ISO-8859-1</tt> and an <tt>Access-Control-Allow-Origin</tt> header of <tt>*</tt> for cross-site AJAX requests.
        </div>`
}