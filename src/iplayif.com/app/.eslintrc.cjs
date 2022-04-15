module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    root: true,
    rules: {
        eqeqeq: ['error', 'always', {null: 'ignore'}],
        indent: ['error', 4, {MemberExpression: 'off', SwitchCase: 1}],
        'linebreak-style': ['error', 'unix'],
        'no-empty': ['off'],
        'no-trailing-spaces': ['error'],
        'no-var': ['error'],
        'prefer-const': ['error', {destructuring: 'all'}],
        quotes: ['error', 'single', {allowTemplateLiterals: true, avoidEscape: true}],
        semi: ['error', 'never'],
    },
}