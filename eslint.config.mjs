import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['built/**', 'bundle.js'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['lib/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            'no-case-declarations': 'off',
            'no-prototype-builtins': 'warn',
            'no-inner-declarations': 'warn',
            'prefer-const': 'warn',
            'prefer-spread': 'warn',
        },
    },
    {
        files: ['bin/**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
);
