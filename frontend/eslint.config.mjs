/**
 * ESLint configuration for the vanilla-JS frontend.
 *
 * This file is committed (rather than generated inside the CI workflow) so that
 * `npx eslint js` behaves identically on a developer machine and on the runner.
 * A lint rule that only exists in CI is a rule nobody can reproduce locally.
 */
export default [
  {
    files: ['js/**/*.js'],

    languageOptions: {
      ecmaVersion: 2020,
      // These scripts load via <script> tags, not as ES modules, so each file
      // shares one global scope. 'module' would wrongly isolate them.
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        CustomEvent: 'readonly',
        Promise: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        Number: 'readonly',
        String: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        Error: 'readonly',
        isNaN: 'readonly',
        // Leaflet, loaded from a CDN in the HTML.
        L: 'readonly',
        // Cross-file globals defined by this project's own modules.
        CONFIG: 'readonly',
        Utils: 'readonly',
        ApiService: 'readonly',
        MapManager: 'readonly',
        UIManager: 'readonly',
        EtaController: 'readonly',
        ThemeManager: 'readonly',
        QueueModule: 'readonly'
      }
    },

    rules: {
      'no-undef': 'error',

      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          // Ignore the top-level module objects. Each is defined in one file and
          // consumed from another, which ESLint cannot see in script mode, so
          // without this every module reports a false positive.
          varsIgnorePattern:
            '^(CONFIG|Utils|ApiService|UIManager|MapManager|EtaController|ThemeManager|QueueModule)$',
          // `catch (error) {}` with a deliberately ignored error is a valid
          // pattern here: several failures are genuinely non-fatal.
          caughtErrors: 'none'
        }
      ],

      'no-console': 'off',
      eqeqeq: ['warn', 'smart'],
      // ES5-style `var` is intentional: these files target older campus phones
      // without a transpile step.
      'no-var': 'off'
    }
  }
];
