module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    jsx: true,
  },
  plugins: ['@typescript-eslint', 'import', 'no-relative-import-paths', 'react'],
  settings: {
    'import/resolver': {
      typescript: {
        project: 'packages/*/tsconfig.json',
        alwaysTryTypes: true,
      },
    },
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 1,
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-var-requires': 0,
    'no-relative-import-paths/no-relative-import-paths': [
      'warn',
      { allowSameFolder: true, rootDir: 'src', prefix: 'src' },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['sibling', 'parent'], 'index'],
        alphabetize: {
          order: 'asc',
          orderImportKind: 'asc',
        },
        warnOnUnassignedImports: true,
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: './**/*.css',
            group: 'index',
            position: 'after',
          },
          {
            pattern: 'src/**',
            group: 'internal',
            position: 'before',
          },
        ],
        'newlines-between': 'always-and-inside-groups',
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
    'no-multiple-empty-lines': 1,
    'no-unused-vars': 0,
    '@typescript-eslint/no-explicit-any': 0,
    'react/react-in-jsx-scope': 0,
    'react/jsx-uses-react': 0,
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
  },
  ignorePatterns: ['dist'],
};
