module.exports = {
    env: {
        browser: true,
        es2021: true,
        jquery: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    root: true,
    rules: {
        eqeqeq: ['error', 'always', {'null': 'ignore'}],
        indent: ['error', 4, {'MemberExpression': 'off'}],
        'linebreak-style': ['error', 'unix'],
        'no-empty': ['off'],
        'no-var': ['error'],
        'prefer-const': ['error', {'destructuring': 'all'}],
        quotes: ['error', 'single'],
        semi: ['error', 'never'],
    },
}