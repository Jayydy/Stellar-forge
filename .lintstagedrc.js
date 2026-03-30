export default {
  '**/*.{js,jsx,ts,tsx,json,css,md}': [
    'eslint --fix',
    'prettier --write',
  ],
}
