/**
 * api.js - Thin REST client for the UniTrack backend.
 *
 * Design decisions:
 * - Every request has a hard timeout via AbortController. On campus Wi-Fi a
 *   socket can stay open indefinitely; without this the UI would sit on stale
 *   data with no error state.
 * - GET helpers resolve to null instead of throwing. Callers poll on an
 *   interval, and a missing reading is an expected condition (driver offline),
 *   not an exception. POST helpers do throw, because the caller acted
 *   deliberately and needs to know it failed.
 * - 404 is distinguished from a transport failure so the UI can say
 *   "no shuttle yet" rather than "network problem".
 */
var ApiService = (function () {
  'use strict';

  /** Thrown for transport/timeout failures so the UI can show an error banner. */
  function ApiError(message, status) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status || 0;
  }
  ApiError.prototype = Object.create(Error.prototype);

  /** fetch + timeout + JSON parsing in one place. */
  function request(path, options) {
    var opts = options || {};
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, CONFIG.REQUEST_TIMEOUT_MS)
      : null;

    var headers = { 'Content-Type': 'application/json' };
    var token = sessionStorage.getItem('unitrack_driver_token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    var init = {
      method: opts.method || 'GET',
      headers: opts.body ? headers : (token ? { 'Authorization': 'Bearer ' + token } : undefined),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store' // polled endpoints must never be served from cache
    };
    if (controller) init.signal = controller.signal;

    return fetch(CONFIG.API_BASE_URL + path, init)
      .then(function (response) {
        if (timer) clearTimeout(timer);

        if (response.status === 204) return null;

        if (!response.ok) {
          // Try to surface the backend's error message when it sends one.
          return response
            .json()
            .catch(function () { return null; })
            .then(function (payload) {
              var detail =
                payload && payload.error
                  ? payload.error
                  : 'Request failed with status ' + response.status;
              throw new ApiError(detail, response.status);
            });
        }

        return response.json().catch(function () {
          throw new ApiError('Server returned invalid JSON', response.status);
        });
      })
      .catch(function (error) {
        if (timer) clearTimeout(timer);
        if (error instanceof ApiError) throw error;
        if (error && error.name === 'AbortError') {
          throw new ApiError('Request timed out', 0);
        }
        throw new ApiError('Cannot reach the server', 0);
      });
  }

  /**
   * Wraps a GET so an absent resource (404) resolves to null while transport
   * failures still reject - the two need different UI treatment.
   */
  function optionalGet(path) {
    return request(path).catch(function (error) {
      if (error.status === 404) return null;
      throw error;
    });
  }

  return {
    ApiError: ApiError,

    health: function () {
      return request('/health');
    },

    fetchEta: function (lat, lng) {
      return optionalGet(
        '/eta?lat=' + encodeURIComponent(lat) + '&lng=' + encodeURIComponent(lng)
      );
    },

    fetchDriverLocation: function () {
      return optionalGet('/location');
    },

    fetchQueueStatus: function () {
      return optionalGet('/queue');
    },

    fetchRoutes: function () {
      return request('/routes').catch(function () {
        // Routes are static decoration; an empty map is better than no page.
        return [];
      });
    },

    postLocation: function (payload) {
      return request('/location', { method: 'POST', body: payload });
    },

    /**
     * Reports a crowd level.
     *
     * @param {string} level  LOW | MODERATE | PACKED
     * @param {string} [source] STUDENT | DISPATCHER. Omitted means DISPATCHER,
     *        matching the backend default, so the dispatcher console needs no
     *        change.
     *
     * Rejects with an ApiError of status 429 when the server's debounce window
     * has not elapsed. Callers should treat that as "too soon", not as a
     * failure - the report was well-formed, just early.
     */
    fetchActiveShuttles: function () {
      return optionalGet('/location/all').then(function (res) {
        return Array.isArray(res) ? res : [];
      });
    },

    requestBus: function (stationName, count, note) {
      return request('/dispatch/request', {
        method: 'POST',
        body: { stationName: stationName, passengerCount: count || 1, note: note }
      });
    },

    fetchDispatchAlerts: function () {
      return optionalGet('/dispatch/alerts').then(function (res) {
        return Array.isArray(res) ? res : [];
      });
    },

    acknowledgeDispatchAlert: function (id, shuttleId) {
      return request('/dispatch/acknowledge/' + encodeURIComponent(id), {
        method: 'POST',
        body: { shuttleId: shuttleId }
      });
    },

    driverLogin: function (shuttleId, pin, googleToken) {
      return request('/auth/driver/login', {
        method: 'POST',
        body: { shuttleId: shuttleId, pin: pin, googleToken: googleToken }
      });
    },

    checkAuthStatus: function () {
      return optionalGet('/auth/status');
    },

    postQueueStatus: function (level, source) {
      var body = { level: level };
      if (source) body.source = source;
      return request('/queue', { method: 'POST', body: body });
    }
  };
})();
