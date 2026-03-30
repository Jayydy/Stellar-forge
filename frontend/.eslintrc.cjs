module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'jsx-a11y'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Enforce labels on all interactive elements
    'jsx-a11y/label-has-associated-control': 'error',
    // Require alt text on images
    'jsx-a11y/alt-text': 'error',
    // Require aria-label or aria-labelledby on interactive elements without visible text
    'jsx-a11y/interactive-supports-focus': 'error',
  },
}
