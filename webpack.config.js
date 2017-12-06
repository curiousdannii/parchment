// Webpack config

module.exports = {
    entry: {
        launcher: './src/launcher/launcher.js',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/www/launcher',
    },
}