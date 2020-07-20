const CopyPlugin = require('copy-webpack-plugin')

const webconfig = {
    name: 'web',
    entry: {
        main: './src/inform7/index.js',
        quixe: './src/inform7/quixe.js',
        zvm: './src/inform7/zvm.js',
    },
    mode: 'production',
    optimization: {
        //minimize: false
    },
    output: {
        filename: 'web/[name].js',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/upstream/glkote/dialog.css', to: 'web' },
                { from: 'src/upstream/glkote/jquery.min.js', to: 'web' },
                { from: 'src/upstream/glkote/waiting.gif', to: 'web' },
            ],
        })
    ],
}

const inform7config = {
    name: 'inform7',
    entry: {
        main: './src/inform7/index.js',
        quixe: './src/inform7/quixe.js',
        zvm: './src/inform7/zvm.js',
    },
    mode: 'production',
    output: {
        filename: 'inform7/Parchment/[name].js',
    },
}

module.exports = [webconfig, inform7config]