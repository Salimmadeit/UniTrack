/**
 * config.js - Single source of truth for client configuration.
 *
 * API_BASE_URL resolution, in priority order:
 *
 *   1. window.UNITRACK_API_BASE, if a page sets it before loading this file.
 *      This is the escape hatch for hosting the frontend on one origin and the
 *      backend on another without a proxy in front of them.
 *   2. Relative "/api/v1" when the page is not on localhost. This covers both
 *      the frontend being served by Spring Boot itself and the frontend being
 *      served by a static host that proxies /api to the backend (see the
 *      redirect rule in netlify.toml). Keeping it relative means no backend
 *      hostname is baked into the deployed JavaScript.
 *   3. http://localhost:8080/api/v1 for local development, where the pages are
 *      usually served from a static server on a different port.
 */
var CONFIG = (function () {
  'use strict';

  var LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', ''];
  var isLocalHost = LOCAL_HOSTS.indexOf(window.location.hostname) !== -1;
  var isBackendOrigin = window.location.port === '8080';

  var override = typeof window.UNITRACK_API_BASE === 'string' && window.UNITRACK_API_BASE
    ? window.UNITRACK_API_BASE.replace(/\/+$/, '') // tolerate a trailing slash
    : null;

  // Served by Spring Boot or proxied -> same-origin relative path.
  // Otherwise -> localhost:8080.
  var apiBase = isBackendOrigin || !isLocalHost
    ? '/api/v1'
    : 'http://localhost:8080/api/v1';

  return {
    API_BASE_URL: override || apiBase,

    // Request timeout
    REQUEST_TIMEOUT_MS: 8000,

    // UNILAG Akoka campus centre.
    MAP_CENTER_LAT: 6.5168,
    MAP_CENTER_LNG: 3.3910,
    MAP_DEFAULT_ZOOM: 16,
    MAP_MAX_ZOOM: 19,

    // Polling cadence: 3s gives fluid updates and snappy responsive status
    POLL_INTERVAL_MS: 3000,

    // Network state thresholds (seconds since last driver update)
    STATUS_WARNING_THRESHOLD: 25,
    STATUS_STALE_THRESHOLD: 50,
    STATUS_DISCONNECTED_THRESHOLD: 90,

    // Driver broadcast interval: 2.5s continuous heartbeat
    DRIVER_MIN_POST_INTERVAL_MS: 2500,

    // Dispatcher: anti-spam debounce
    QUEUE_DEBOUNCE_MS: 5000,

    // Google Maps API Key: can be provided globally or falls back to OpenStreetMap Leaflet
    GOOGLE_MAPS_API_KEY: window.GOOGLE_MAPS_API_KEY || '',

    // Google OAuth Client ID for sign-in
    GOOGLE_CLIENT_ID: window.GOOGLE_CLIENT_ID || '1047530665225-sample.apps.googleusercontent.com'
  };
})();
