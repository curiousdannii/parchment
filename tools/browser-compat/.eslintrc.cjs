module.exports = {
    extends: 'plugin:compat/recommended',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    root: true,
    settings: {
        polyfills: [
            "WebAssembly.instantiateStreaming",
        ]
    }
}