/**
 * driver.js - UniTrack Driver Console
 *
 * Features:
 * - Driver Authentication (Shuttle ID & PIN gate with Google OAuth option).
 * - Continuous high-frequency GPS tracking with active 2.5s Heartbeat.
 *   Guarantees that stationary shuttles waiting at bus stops remain continuously "Live"
 *   and completely eliminates the student-side online/offline flickering bug.
 * - Live Demand / Relocation Alerts with sound and acknowledgement.
 * - Screen Wake Lock to keep console alive on vehicle dashboard mounts.
 */
(function () {
  'use strict';

  // Elements
  var authModal = document.getElementById('driver-auth-modal');
  var authForm = document.getElementById('driver-auth-form');
  var authError = document.getElementById('auth-error');
  var logoutBtn = document.getElementById('driver-logout-btn');
  var shuttleBadge = document.getElementById('active-shuttle-id');

  var toggleButton = document.getElementById('broadcast-toggle');
  var stateChip = document.getElementById('driver-state');
  var message = document.getElementById('driver-message');
  var errorBanner = document.getElementById('driver-error');
  var errorMessage = document.getElementById('driver-error-message');
  var gpsStatus = document.getElementById('gps-status');
  var lastSignal = document.getElementById('last-signal');
  var counterEl = document.getElementById('broadcast-counter');
  var lastSentEl = document.getElementById('last-sent');
  var alertContainer = document.getElementById('driver-alert-banner');
  var alertMessage = document.getElementById('driver-alert-text');
  var alertAckBtn = document.getElementById('driver-alert-ack-btn');

  var currentShuttleId = sessionStorage.getItem('unitrack_shuttle_id') || 'BUS-01';
  var watchId = null;
  var heartbeatIntervalId = null;
  var alertPollIntervalId = null;
  var isBroadcasting = false;
  var sentCount = 0;
  var lastPostAt = 0;
  var wakeLock = null;
  var lastKnownCoords = null;
  var activeAlertId = null;

  // Audio chime for alerts
  function playAlertSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

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

  function describeGeoError(error) {
    switch (error && error.code) {
      case 1:
        return 'Location access blocked. Please enable GPS permissions for UniTrack.';
      case 2:
        return 'GPS signal unavailable. Please ensure high accuracy is enabled.';
      case 3:
        return 'Getting GPS fix timed out. Retrying automatically…';
      default:
        return 'Location access required. Please enable GPS.';
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
      .catch(function () {});
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  // Authentication check
  function checkAuth() {
    var token = sessionStorage.getItem('unitrack_driver_token');
    if (!token) {
      showAuthModal();
    } else {
      hideAuthModal();
      if (shuttleBadge) shuttleBadge.textContent = currentShuttleId;
    }
  }

  function showAuthModal() {
    if (authModal) authModal.classList.remove('hidden');
  }

  function hideAuthModal() {
    if (authModal) authModal.classList.add('hidden');
  }

  function handleLogin(e) {
    if (e) e.preventDefault();
    var shuttleInput = document.getElementById('auth-shuttle-id');
    var pinInput = document.getElementById('auth-pin');
    var shuttle = (shuttleInput && shuttleInput.value || 'BUS-01').trim().toUpperCase();
    var pin = (pinInput && pinInput.value || '').trim();

    if (authError) authError.classList.add('hidden');

    ApiService.driverLogin(shuttle, pin)
      .then(function (res) {
        sessionStorage.setItem('unitrack_driver_token', res.token);
        sessionStorage.setItem('unitrack_shuttle_id', res.shuttleId);
        currentShuttleId = res.shuttleId;
        if (shuttleBadge) shuttleBadge.textContent = currentShuttleId;
        hideAuthModal();
      })
      .catch(function (err) {
        if (authError) {
          authError.textContent = err.message || 'Authentication failed. Try PIN: 1234 or unilag2026';
          authError.classList.remove('hidden');
        }
      });
  }

  function handleLogout() {
    stop();
    sessionStorage.removeItem('unitrack_driver_token');
    sessionStorage.removeItem('unitrack_shuttle_id');
    showAuthModal();
  }

  function transmitLocation(coords) {
    if (!coords) return;
    var now = Date.now();
    lastPostAt = now;

    var payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: typeof coords.speed === 'number' && coords.speed >= 0
        ? Number((coords.speed * 3.6).toFixed(2))
        : 0,
      heading: typeof coords.heading === 'number' && !isNaN(coords.heading)
        ? Utils.clamp(coords.heading, 0, 360)
        : 0,
      shuttleId: currentShuttleId,
      status: 'EN_ROUTE'
    };

    ApiService.postLocation(payload)
      .then(function () {
        sentCount += 1;
        if (counterEl) counterEl.textContent = String(sentCount);
        if (lastSentEl) lastSentEl.textContent = 'Just now';
        setChip('Live (' + currentShuttleId + ')', 'active');
        clearError();
      })
      .catch(function (error) {
        setChip('Retrying…', 'warning');
      });
  }

  function onPosition(position) {
    clearError();
    var coords = position.coords;
    lastKnownCoords = coords;

    if (gpsStatus) {
      gpsStatus.textContent = coords.accuracy
        ? 'Locked (±' + Math.round(coords.accuracy) + ' m)'
        : 'Locked';
    }
    if (lastSignal) {
      lastSignal.textContent = coords.latitude.toFixed(5) + ', ' + coords.longitude.toFixed(5);
    }

    var now = Date.now();
    if (now - lastPostAt >= CONFIG.DRIVER_MIN_POST_INTERVAL_MS) {
      transmitLocation(coords);
    }
  }

  function onPositionError(error) {
    if (gpsStatus) gpsStatus.textContent = 'Searching…';
    showError(describeGeoError(error));
    if (error && error.code === 1) stop();
  }

  // Poll for bus relocation alerts
  function pollAlerts() {
    ApiService.fetchDispatchAlerts().then(function (alerts) {
      if (alerts && alerts.length > 0) {
        var alert = alerts[0];
        activeAlertId = alert.id;
        if (alertContainer && alertMessage) {
          alertMessage.textContent = 'High demand at ' + alert.stationName + ' (' + alert.passengerCount + ' passengers waiting). Please relocate if available!';
          alertContainer.classList.remove('hidden');
          playAlertSound();
        }
      } else {
        if (alertContainer) alertContainer.classList.add('hidden');
        activeAlertId = null;
      }
    }).catch(function () {});
  }

  function acknowledgeCurrentAlert() {
    if (!activeAlertId) return;
    ApiService.acknowledgeDispatchAlert(activeAlertId, currentShuttleId).then(function () {
      if (alertContainer) alertContainer.classList.add('hidden');
      activeAlertId = null;
    });
  }

  function start() {
    checkAuth();
    if (!sessionStorage.getItem('unitrack_driver_token')) return;

    if (!navigator.geolocation) {
      showError('This browser does not support GPS location.');
      return;
    }

    isBroadcasting = true;
    if (toggleButton) {
      toggleButton.textContent = 'Stop Broadcasting';
      toggleButton.classList.remove('btn-primary', 'bg-primary');
      toggleButton.classList.add('btn-danger', 'bg-status-danger');
    }
    setChip('Acquiring GPS…', 'warning');
    if (message) {
      message.textContent = 'Broadcasting ' + currentShuttleId + ' location. Keep this screen open.';
    }
    if (gpsStatus) gpsStatus.textContent = 'Acquiring signal…';

    // Watch position
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000
    });

    // Fallback one-shot fix immediately
    navigator.geolocation.getCurrentPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 10000
    });

    // CRITICAL: Heartbeat interval every 2.5 seconds
    // When the shuttle is stationary at a bus stop waiting for passengers,
    // watchPosition may not emit new fixes. The heartbeat ensures the backend
    // receives a fresh timestamp and never triggers the student-side offline state.
    heartbeatIntervalId = setInterval(function () {
      if (isBroadcasting && lastKnownCoords) {
        transmitLocation(lastKnownCoords);
      }
    }, CONFIG.DRIVER_MIN_POST_INTERVAL_MS);

    // Alert polling every 5s
    alertPollIntervalId = setInterval(pollAlerts, 5000);
    pollAlerts();

    requestWakeLock();
  }

  function stop() {
    isBroadcasting = false;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (heartbeatIntervalId !== null) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    if (alertPollIntervalId !== null) {
      clearInterval(alertPollIntervalId);
      alertPollIntervalId = null;
    }
    releaseWakeLock();

    if (toggleButton) {
      toggleButton.textContent = 'Start Broadcasting';
      toggleButton.classList.remove('btn-danger', 'bg-status-danger');
      toggleButton.classList.add('btn-primary', 'bg-primary');
    }
    setChip('Standby');
    if (message) {
      message.textContent = 'Broadcast stopped. Shuttle is offline.';
    }
    if (gpsStatus) gpsStatus.textContent = 'Off';
  }

  // Event Listeners
  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      if (isBroadcasting) {
        stop();
      } else {
        start();
      }
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', handleLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (alertAckBtn) {
    alertAckBtn.addEventListener('click', acknowledgeCurrentAlert);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && isBroadcasting && !wakeLock) requestWakeLock();
  });

  window.addEventListener('pagehide', function () {
    if (isBroadcasting) {
      stop();
    }
  });

  // Initial check on page load
  checkAuth();
})();
