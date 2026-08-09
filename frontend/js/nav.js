/**
 * nav.js — mobile navigation menu.
 *
 * The nav links collapse behind a toggle below 720px. This script only manages
 * the open/closed state; all presentation lives in CSS so the two cannot drift.
 *
 * Progressive enhancement: with JS disabled the links stay in the DOM and remain
 * reachable, they are simply always visible in the collapsed sheet.
 */
(function () {
  'use strict';

  function init() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var menu = document.getElementById('nav-menu');

    if (!toggle || !menu) return;

    function setOpen(isOpen) {
      menu.classList.toggle('is-open', isOpen);
      // aria-expanded is what a screen reader announces, so it must track the
      // visual state exactly rather than being set once at load.
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation menu' : 'Open navigation menu'
      );
    }

    toggle.addEventListener('click', function () {
      setOpen(!menu.classList.contains('is-open'));
    });

    // Escape closes the menu and returns focus to the toggle, otherwise focus
    // would be stranded on a hidden element.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // A click anywhere outside dismisses the menu, matching the expectation set
    // by native mobile UI.
    document.addEventListener('click', function (event) {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    // Returning to desktop width must clear the open state, or the menu would
    // reappear as a stray floating sheet.
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 721px)');
      var onChange = function (event) {
        if (event.matches) setOpen(false);
      };
      if (wide.addEventListener) {
        wide.addEventListener('change', onChange);
      } else if (wide.addListener) {
        wide.addListener(onChange); // Safari < 14
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
