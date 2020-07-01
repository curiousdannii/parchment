const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    mode: 'production',
    optimization: {
        minimize: false
    },
    output: {
        filename: 'main.js',
    },
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/upstream/glkote/dialog.css', to: '' },
                { from: 'src/upstream/glkote/jquery.min.js', to: '' },
                { from: 'src/upstream/glkote/waiting.gif', to: '' },
                { from: 'src/upstream/quixe/media/i7-glkote.css', to: '' },
                { from: 'tests/troll.zblorb.js', to: '' },
            ],
        })
    ],
}