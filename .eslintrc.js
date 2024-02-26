module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
    'standard-jsx',
  ],
  env: {
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 8,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  ignorePatterns: [
    'node_modules',
    '**/index.js',
    '**/*.d.ts',
    '**/*.mjs',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-var': 'error',
    'consistent-return': 'off',
    complexity: ['warn', { max: 15 }],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'let', next: '*' },
      { blankLine: 'any', prev: 'let', next: 'let' },
      { blankLine: 'any', prev: 'let', next: 'const' },
      { blankLine: 'always', prev: 'const', next: '*' },
      { blankLine: 'any', prev: 'const', next: 'const' },
      { blankLine: 'any', prev: 'const', next: 'let' },
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'any', prev: 'let', next: 'if' },
      { blankLine: 'any', prev: 'const', next: 'if' },
    ],
    semi: ['error', 'never'],
    'react/prop-types': 'off', // Disable prop-types as we use TypeScript for type checking
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'only-multiline',
    }],
  },
  overrides: [
    {
      files: '**/*.{ts,tsx}',
      extends: [
        'eslint:recommended',
        // 'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'next/core-web-vitals',
        'standard',
        'standard-jsx',
        'standard-with-typescript',
      ],
      env: {
        browser: true,
        es6: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: require.resolve('./tsconfig.json'),
        ecmaVersion: 8,
        ecmaFeatures: {
          experimentalObjectRestSpread: true,
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/comma-dangle': ['error', {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'only-multiline',
        }],
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@next/next/no-html-link-for-pages': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // for jest only
    {
      files: '*.{spec,test}.{ts,tsx,js}',
      extends: [
        'plugin:jest/recommended',
        'plugin:jest/style',
      ],
    },
  ],
}
