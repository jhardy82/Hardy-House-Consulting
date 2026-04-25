/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: { es2022: true, node: true, browser: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  globals: { THREE: 'readonly', gsap: 'readonly' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
  },
};
