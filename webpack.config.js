// Webpack config

module.exports = {
    entry: {
        'launcher/launcher': './src/launcher/launcher.mjs',
        'game/glkproxy': './src/upstream/asyncglk/src/glk/glkproxy.mjs',
        'game/iframe': './src/game/iframe.mjs',
        'game/worker': './src/game/worker.mjs',
    },
    output: {
        filename: '[name].js',
        library: '[name]',
        libraryExport: 'default',
        libraryTarget: 'umd',
        path: __dirname + '/www/',
    },
}