// Webpack config

module.exports = {
    entry: {
        'launcher/launcher': './src/launcher/launcher.mjs',
        'game/iframe': './src/game/iframe.mjs',
        'game/worker': './src/game/worker.mjs',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/www/',
    },
}