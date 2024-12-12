import compat from 'eslint-plugin-compat'

export default [
    compat.configs['flat/recommended'],
    {
        languageOptions: {
            ecmaVersion: 13,
            sourceType: 'module',
        },
    },
    {
        settings: {
            polyfills: [
                // The Eslint compat plugin doesn't support minimised feature detection: https://github.com/amilajack/eslint-plugin-compat/issues/508
                // Adding these here does kind of make the plugin pointless, but at least we'll still see if anything new starts being used
                'AudioContext',
                'navigator.maxTouchPoints',
                'ResizeObserver',
                'WebAssembly.instantiateStreaming',
            ],
        },
    },
]