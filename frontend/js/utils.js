/**
 * utils.js - Shared utility functions.
 */

var Utils = (function () {
  'use strict';

  /**
   * Formats a relative time string: "just now", "2 min ago", "45 sec ago".
   * Used for network freshness timestamps.
   */
  function timeAgo(date) {
    if (!(date instanceof Date) || isNaN(date)) return '—';
    var seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return seconds + ' sec ago';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.floor(minutes / 60);
    return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
  }

  /**
   * Formats distance: "0.82 km" or "450 m" (the latter when < 1 km).
   */
  function formatDistance(km) {
    if (typeof km !== 'number' || isNaN(km)) return '—';
    if (km < 1) return Math.round(km * 1000) + ' m';
    return km.toFixed(2) + ' km';
  }

  /**
   * Formats ETA: "3 min", "< 1 min", "Arriving now".
   */
  function formatEta(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '-- min';
    if (minutes < 0.2) return 'Arriving now';
    if (minutes < 1) return '< 1 min';
    return Math.round(minutes) + ' min';
  }

  /**
   * Debounces a function: only calls fn after waitMs of no further invocations.
   * Used to rate-limit queue button spam.
   */
  function debounce(fn, waitMs) {
    var timeout;
    return function debounced() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        fn.apply(context, args);
      }, waitMs);
    };
  }

  /**
   * Throttles a function: calls fn at most once per waitMs.
   * Used to rate-limit polling or scroll handlers.
   */
  function throttle(fn, waitMs) {
    var lastCall = 0;
    return function throttled() {
      var now = Date.now();
      if (now - lastCall >= waitMs) {
        lastCall = now;
        fn.apply(this, arguments);
      }
    };
  }

  /**
   * Safely parses a date string or timestamp into a Date object.
   * Returns null if unparseable.
   */
  function parseDate(value) {
    if (value instanceof Date) return value;
    if (!value) return null;
    var parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Clamps a number between min and max.
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Returns true if the value is a valid lat/lng coordinate.
   */
  function isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  return {
    timeAgo: timeAgo,
    formatDistance: formatDistance,
    formatEta: formatEta,
    debounce: debounce,
    throttle: throttle,
    parseDate: parseDate,
    clamp: clamp,
    isValidCoordinate: isValidCoordinate
  };
})();
