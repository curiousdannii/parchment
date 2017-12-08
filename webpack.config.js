// Webpack config

module.exports = {
    entry: {
        'launcher/launcher': './src/launcher/launcher.mjs',
        'glkote/handler': './src/glkote/handler.mjs',
        'glkote/worker': './src/glkote/worker.mjs',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/www/',
    },
}