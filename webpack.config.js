// Webpack config

module.exports = {
    entry: {
        launcher: './src/js/launcher.js',
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/www/js',
    },
}