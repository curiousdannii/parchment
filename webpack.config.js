// Webpack config

module.exports = {
    entry: {
        launcher: './src/launcher/launcher.mjs',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/www/launcher',
    },
}