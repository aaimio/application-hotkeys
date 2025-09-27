import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['dist/**/*.js'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/lines-between-class-members': [
        'error',
        {
          enforce: [{ blankLine: 'always', prev: '*', next: 'method' }],
        },
      ],
      '@stylistic/indent': ['error', 2],
      '@stylistic/space-before-blocks': ['error'],
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: [
            'block-like',
            'block',
            'case',
            'class',
            'const',
            'default',
            'export',
            'for',
            'function',
            'if',
            'multiline-const',
            'multiline-expression',
            'return',
            'switch',
            'try',
          ],
        },
        {
          blankLine: 'always',
          prev: [
            'block-like',
            'block',
            'case',
            'class',
            'const',
            'default',
            'export',
            'for',
            'function',
            'if',
            'multiline-const',
            'multiline-expression',
            'return',
            'switch',
            'try',
          ],
          next: '*',
        },
        { blankLine: 'never', prev: 'singleline-const', next: 'singleline-const' },
        { blankLine: 'never', prev: 'singleline-expression', next: 'singleline-expression' },
      ],
    },
  },
]);
