module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    "no-warning-comments": ["warn", {terms: ["xxx"]}],
    "@typescript-eslint/ban-ts-comment": "off",
  },
};
