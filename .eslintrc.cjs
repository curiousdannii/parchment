module.exports = {
    env: {
        browser: true,
        es2021: true,
        jquery: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
    ],
    root: true,
    rules: {
        eqeqeq: ['error', 'always', {'null': 'ignore'}],
        indent: ['error', 4, {MemberExpression: 'off', SwitchCase: 1}],
        'linebreak-style': ['error', 'unix'],
        'no-empty': ['off'],
        'no-trailing-spaces': ['error'],
        'no-var': ['error'],
        'prefer-const': ['error', {'destructuring': 'all'}],
        quotes: ['error', 'single', {allowTemplateLiterals: true, avoidEscape: true}],
        semi: ['error', 'never'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-non-null-assertion': ['off'],
    },
}