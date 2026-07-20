// config.js
// Centralized API base URL — auto-detects local vs production

(function () {
  var isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';

  var BACKEND = isLocal
    ? 'http://localhost:5000'
    : 'https://meetspace-o0dj.onrender.com';

  window.API_CONFIG = {
    BACKEND: BACKEND,
    AUTH_BASE: BACKEND + '/api/auth',
    API_BASE: BACKEND + '/api'
  };
})();
