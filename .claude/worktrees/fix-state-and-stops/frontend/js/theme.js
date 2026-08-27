/**
 * theme.js - Theme resolution and persistence.
 *
 * Three-state model: "system" (default) | "light" | "dark".
 * WHY three states instead of a boolean: a boolean forces every visitor into an
 * explicit choice on first load, which then ignores their OS setting forever.
 * "system" lets the OS drive, and only diverges once the user actually asks.
 *
 * The resolved theme is written to <html data-theme="..."> and read by CSS.
 * The token layer only defines "light" and "dark", so "system" is stored in
 * localStorage but never written to the attribute - absence of the attribute
 * means "follow prefers-color-scheme".
 *
 * This file is loaded in <head> (before CSS paints content) so the correct
 * palette is applied on the first frame. That avoids the white flash that
 * happens when theme JS runs at the end of <body>.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'unitrack.theme';
  var DARK = 'dark';
  var LIGHT = 'light';
  var SYSTEM = 'system';

  /** Reads the stored preference, tolerating disabled/blocked storage. */
  function readPreference() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === DARK || stored === LIGHT ? stored : SYSTEM;
    } catch (error) {
      // Private browsing or storage disabled - fall back to system.
      return SYSTEM;
    }
  }

  function writePreference(value) {
    try {
      if (value === SYSTEM) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, value);
      }
    } catch (error) {
      /* Non-fatal: the theme still applies for this session. */
    }
  }

  function systemPrefersDark() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  /** The theme actually being displayed right now. */
  function resolve(preference) {
    if (preference === DARK || preference === LIGHT) return preference;
    return systemPrefersDark() ? DARK : LIGHT;
  }

  /**
   * Applies the preference to the document.
   * Removing the attribute (rather than setting "system") is what re-enables
   * the CSS `@media (prefers-color-scheme: dark)` branch.
   */
  function apply(preference) {
    var root = document.documentElement;
    if (preference === SYSTEM) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }

    // Colour the mobile browser chrome to match the app surface.
    var resolved = resolve(preference);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolved === DARK ? '#16161a' : '#ffffff');
    }

    root.dispatchEvent(
      new CustomEvent('themechange', { detail: { preference: preference, resolved: resolved } })
    );
  }

  var preference = readPreference();
  apply(preference);

  // Follow the OS live, but only while the user has not made an explicit choice.
  if (typeof window.matchMedia === 'function') {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () {
      if (readPreference() === SYSTEM) apply(SYSTEM);
    };
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onSystemChange);
    } else if (typeof query.addListener === 'function') {
      query.addListener(onSystemChange); // Safari < 14
    }
  }

  var Theme = {
    SYSTEM: SYSTEM,
    LIGHT: LIGHT,
    DARK: DARK,

    getPreference: readPreference,
    getResolved: function () {
      return resolve(readPreference());
    },

    set: function (value) {
      var next = value === DARK || value === LIGHT ? value : SYSTEM;
      writePreference(next);
      apply(next);
      return next;
    },

    /** Flips to the opposite of what is currently on screen. */
    toggle: function () {
      return Theme.set(Theme.getResolved() === DARK ? LIGHT : DARK);
    },

    /**
     * Wires up every [data-theme-toggle] button on the page and keeps their
     * aria-pressed state in sync with the resolved theme (screen readers
     * announce "pressed" for dark).
     */
    bindToggles: function (scope) {
      var root = scope || document;
      var buttons = root.querySelectorAll('[data-theme-toggle]');
      if (!buttons.length) return;

      var sync = function () {
        var isDark = Theme.getResolved() === DARK;
        Array.prototype.forEach.call(buttons, function (button) {
          button.setAttribute('aria-pressed', String(isDark));
          button.setAttribute(
            'aria-label',
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
          );
          button.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
        });
      };

      Array.prototype.forEach.call(buttons, function (button) {
        button.addEventListener('click', function () {
          Theme.toggle();
        });
      });

      document.documentElement.addEventListener('themechange', sync);
      sync();
    }
  };

  window.Theme = Theme;

  // Buttons do not exist yet when this runs from <head>; bind once they do.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      Theme.bindToggles();
    });
  } else {
    Theme.bindToggles();
  }
})();
