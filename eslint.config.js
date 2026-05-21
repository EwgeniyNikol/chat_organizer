const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['client/js/**/*.js'],
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        WebSocket: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        BroadcastChannel: 'readonly',
        Notification: 'readonly',
        navigator: 'readonly',
        MediaRecorder: 'readonly',
        CryptoJS: 'readonly',
        alert: 'readonly',
        prompt: 'readonly',
      },
    },
  },
];