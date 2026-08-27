/**
 * driver.js - Driver console: continuous GPS broadcast.
 *
 * Design decisions:
 * - watchPosition() rather than a setInterval + getCurrentPosition loop. The
 *   OS pushes a fix only when the device actually moves, which is both fresher
 *   and cheaper on battery.
 * - POSTs are rate-limited (DRIVER_MIN_POST_INTERVAL_MS). A phone on a bumpy
 *   road can emit fixes several times a second; the students' UI polls every
 *   6s, so anything faster is wasted mobile data.
 * - Screen Wake Lock keeps the console alive on a dashboard mount. It is
 *   feature-detected, since Safari does not support it.
 */
(function () {
  'use strict';

  var toggleButton = document.getElementById('broadcast-toggle');
  var stateChip = document.getElementById('driver-state');
  var message = document.getElementById('driver-message');
  var errorBanner = document.getElementById('driver-error');
  var errorMessage = document.getElementById('driver-error-message');
  var gpsStatus = document.getElementById('gps-status');
  var lastSignal = document.getElementById('last-signal');
  var counterEl = document.getElementById('broadcast-counter');
  var lastSentEl = document.getElementById('last-sent');

  var watchId = null;
  var isBroadcasting = false;
  var sentCount = 0;
  var lastPostAt = 0;
  var wakeLock = null;

  function setChip(text, variant) {
    if (!stateChip) return;
    stateChip.textContent = text;
    stateChip.className = 'status-chip' + (variant ? ' ' + variant : '');
  }

  function showError(text) {
    if (!errorBanner || !errorMessage) return;
    errorMessage.textContent = text;
    errorBanner.classList.remove('hidden');
  }

  function clearError() {
    if (errorBanner) errorBanner.classList.add('hidden');
  }

  /** Translates a GeolocationPositionError into an instruction, not a code. */
  function describeGeoError(error) {
    switch (error && error.code) {
      case 1:
        return 'Location access is blocked. Enable location permission for this site, then tap Start again.';
      case 2:
        return 'GPS signal unavailable. Move to an open area and try again.';
      case 3:
        return 'Getting a GPS fix took too long. Retrying automatically…';
      default:
        return 'Location Access Required. Please enable GPS.';
    }
  }

  function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock
      .request('screen')
      .then(function (lock) {
        wakeLock = lock;
        lock.addEventListener('release', function () { wakeLock = null; });
      })
      .catch(function () {
        /* Non-fatal: broadcasting continues, the screen may just sleep. */
      });
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  function onPosition(position) {
    clearError();

    var coords = position.coords;
    if (gpsStatus) {
      gpsStatus.textContent = coords.accuracy
        ? 'Locked (±' + Math.round(coords.accuracy) + ' m)'
        : 'Locked';
    }
    if (lastSignal) {
      lastSignal.textContent = coords.latitude.toFixed(5) + ', ' + coords.longitude.toFixed(5);
    }

    // Rate limit: skip this fix if the previous POST was too recent.
    var now = Date.now();
    if (now - lastPostAt < CONFIG.DRIVER_MIN_POST_INTERVAL_MS) return;
    lastPostAt = now;

    // The API rejects out-of-range values, so normalise before sending.
    // GPS reports speed in m/s; the backend and UI work in km/h.
    var payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: typeof coords.speed === 'number' && coords.speed >= 0
        ? Number((coords.speed * 3.6).toFixed(2))
        : 0,
      heading: typeof coords.heading === 'number' && !isNaN(coords.heading)
        ? Utils.clamp(coords.heading, 0, 360)
        : 0
    };

    ApiService.postLocation(payload)
      .then(function () {
        sentCount += 1;
        if (counterEl) counterEl.textContent = String(sentCount);
        if (lastSentEl) lastSentEl.textContent = Utils.timeAgo(new Date());
        setChip('Broadcasting', 'active');
        clearError();
      })
      .catch(function (error) {
        setChip('Send failed', 'error');
        showError(error.message + '. We will retry on the next GPS update.');
      });
  }

  function onPositionError(error) {
    setChip('GPS error', 'error');
    if (gpsStatus) gpsStatus.textContent = 'Unavailable';
    showError(describeGeoError(error));

    // A hard permission denial cannot recover on its own, so stop cleanly
    // rather than leaving the button in a broadcasting state that does nothing.
    if (error && error.code === 1) stop();
  }

  function start() {
    if (!navigator.geolocation) {
      showError('This browser does not support GPS location.');
      return;
    }

    isBroadcasting = true;
    toggleButton.textContent = 'Stop Broadcasting';
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-danger');
    setChip('Starting…');
    if (message) {
      message.textContent = 'Broadcasting this shuttle\'s location. Keep this screen open.';
    }
    if (gpsStatus) gpsStatus.textContent = 'Acquiring signal…';

    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0 // never reuse a cached fix; position must be current
    });

    requestWakeLock();
  }

  function stop() {
    isBroadcasting = false;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    releaseWakeLock();

    toggleButton.textContent = 'Start Broadcasting';
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-primary');
    setChip('Stopped');
    if (message) {
      message.textContent = 'Broadcast stopped. Students no longer see this shuttle moving.';
    }
    if (gpsStatus) gpsStatus.textContent = 'Off';
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      if (isBroadcasting) {
        stop();
      } else {
        start();
      }
    });
  }

  // Re-acquire the wake lock after the driver switches apps and comes back.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && isBroadcasting && !wakeLock) requestWakeLock();
  });

  // Releasing the watch on unload avoids a lingering GPS handle on some Androids.
  window.addEventListener('pagehide', function () {
    if (isBroadcasting) {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      releaseWakeLock();
    }
  });
})();
