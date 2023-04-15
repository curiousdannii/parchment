/*

Common single-file processing
=============================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

const utf8decoder = new TextDecoder()

async function Uint8Array_to_base64(data) {
    if (typeof Buffer !== 'undefined') {
        return data.toString('base64')
    }
    // From https://stackoverflow.com/a/66046176/2854284
    else if (typeof FileReader !== 'undefined') {
        return (await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(new Blob([data]))
        })).split(',', 2)[1]
    }
}

export async function generate(options, files) {
    const inclusions = []
    if (options.single_file) {
        inclusions.push('<script>parchment_options = {single_file: 1}</script>')
    }

    // Process the files
    for (const filename of Object.keys(files)) {
        if (/\.(css|js|html)$/.test(filename)) {
            files[filename] = utf8decoder.decode(files[filename])
                .replace(/(\/\/|\/\*)# sourceMappingURL.+/, '')
                .trim()
        }
        let data = files[filename]
        if (filename === 'ie.js') {
            inclusions.push(`<script nomodule>${data}</script>`)
        }
        else if (filename === 'jquery.min.js') {
            inclusions.push(`<script>${data}</script>`)
        }
        else if (filename === 'main.js') {
            inclusions.push(`<script type="module">${data}</script>`)
        }
        else if (filename.endsWith('.css')) {
            // Only include a single font, the browser can fake bold and italics
            const fontfile = await Uint8Array_to_base64(files['iosevka-extended.woff2'])
            data = data.replace(/@font-face{font-family:([' \w]+);font-style:(\w+);font-weight:(\d+);src:url\([^)]+\) format\(['"]woff2['"]\)}/g, (_, font, style, weight) => {
                if (font === 'Iosevka' && style === 'normal' && weight === '400' && options.font) {
                    return `@font-face{font-family:Iosevka;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${fontfile}) format('woff2')}`
                }
                return ''
            })
                .replace(/Iosevka Narrow/g, 'Iosevka')
            if (!options.font) {
                data = data.replace(/--glkote(-grid)?-mono-family: "Iosevka", monospace;?/g, '')
            }
            inclusions.push(`<style>${data}</style>`)
        }
        else if (filename.endsWith('.js')) {
            inclusions.push(`<script type="text/plain" id="./${filename}">${data}</script>`)
        }
        else if (filename.endsWith('.wasm')) {
            inclusions.push(`<script type="text/plain" id="./${filename}">${data.toString('base64')}</script>`)
        }
    }

    // Inject into index.html
    let indexhtml = files['index.html']
    const gif = await Uint8Array_to_base64(files['waiting.gif'])
    indexhtml = indexhtml
        .replace(/<script.+?\/script>/g, '')
        .replace(/<link rel="stylesheet".+?>/g, '')
        .replace(/<img src="dist\/web\/waiting.gif"/, `<img src="data:image/gif;base64,${gif}"`)
        .replace(/^\s+$/gm, '')

    // Add a date if requested
    if (options.date) {
        const today = new Date()
        const title = `Parchment ${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`
        indexhtml = indexhtml
            .replace(/<title.+?\/title>/, `<title>${title}</title>`)
            .replace(/<\/noscript>/, `</noscript>\n<p id="footer-date">${title}</p>`)
    }

    // Add the inclusions
    const parts = indexhtml.split(/\s*<\/head>/)
    indexhtml = `${parts[0]}
    ${inclusions.join('\n')}
    </head>${parts[1]}`

    return indexhtml
}