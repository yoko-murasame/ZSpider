module.exports = {
  root: true,

  env: {
    node: true,
    browser: true,
  },

  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],

  parserOptions: {
    parser: '@babel/eslint-parser',
  },

  rules: {
    'no-console': 'off', // process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': 'off', // process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'prettier/prettier': [
      'error',
      {
        tabWidth: 2,
        singleQuote: true,
        semi: false,
        endOfLine: 'auto',
      },
    ],
  },
}
