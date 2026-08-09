/**
 * eta.js - Polling engine + network state machine for the student view.
 *
 * Network state machine (seconds since the driver's last position):
 *   NORMAL        0-15   live, trust the ETA
 *   WARNING      16-30   "Updating…", the next packet is overdue
 *   STALE        31-60   "Delayed", show the age of the reading
 *   DISCONNECTED   60+   "Offline", fade the marker to 50%
 *
 * Why derive state on the client from updatedAt rather than trusting a server
 * flag: the age that matters to the student includes the network delay in
 * getting the reading to their phone, and it keeps ticking between polls.
 *
 * Polling uses setTimeout chaining, not setInterval. setInterval queues a new
 * request even when the previous one is still in flight, which on a slow
 * connection stacks up overlapping requests. Chaining guarantees exactly one
 * request at a time.
 */
function EtaController(mapManager, uiManager) {
  'use strict';

  this.mapManager = mapManager;
  this.uiManager = uiManager;
  this.studentLocation = null;
  this.timerId = null;
  this.isPolling = false;
  this.inFlight = false;
  this.consecutiveFailures = 0;
  this.hasFittedBounds = false;
}

EtaController.prototype.init = function () {
  var self = this;

  // Routes first: static context makes the map readable before any live data.
  ApiService.fetchRoutes().then(function (routes) {
    self.mapManager.drawRoutes(routes);
  });

  this.locateStudent();
  this.startPolling();

  // Stop polling while the tab is hidden. This is the single biggest battery
  // and mobile-data saving in the app for a phone left in a pocket.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      self.stopPolling();
    } else {
      self.startPolling();
    }
  });
};

/**
 * Requests the student's position. Failure is non-fatal: the campus centre is
 * a usable fallback, so the app still answers "where is the shuttle?".
 */
EtaController.prototype.locateStudent = function (onDone) {
  var self = this;

  if (!navigator.geolocation) {
    this.studentLocation = { lat: CONFIG.MAP_CENTER_LAT, lng: CONFIG.MAP_CENTER_LNG };
    if (onDone) onDone(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      self.studentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      self.mapManager.updateStudentLocation(self.studentLocation.lat, self.studentLocation.lng);
      self.poll();
      if (onDone) onDone(true);
    },
    function () {
      // Denied or unavailable: fall back silently rather than blocking with an alert.
      if (!self.studentLocation) {
        self.studentLocation = { lat: CONFIG.MAP_CENTER_LAT, lng: CONFIG.MAP_CENTER_LNG };
      }
      if (onDone) onDone(false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
};

EtaController.prototype.startPolling = function () {
  if (this.isPolling) return;
  this.isPolling = true;
  this.poll();
};

EtaController.prototype.stopPolling = function () {
  this.isPolling = false;
  if (this.timerId) {
    clearTimeout(this.timerId);
    this.timerId = null;
  }
};

EtaController.prototype._scheduleNext = function () {
  var self = this;
  if (!this.isPolling) return;
  if (this.timerId) clearTimeout(this.timerId);

  // Exponential-ish backoff while the backend is unreachable so a dead server
  // is not hammered every 6 seconds by every student on campus.
  var delay = CONFIG.POLL_INTERVAL_MS;
  if (this.consecutiveFailures > 2) {
    delay = Math.min(delay * this.consecutiveFailures, 30000);
  }

  this.timerId = setTimeout(function () {
    self.poll();
  }, delay);
};

/** One polling cycle: location + ETA + queue, then render. */
EtaController.prototype.poll = function () {
  var self = this;

  // Guard against overlap (manual refresh landing on top of a scheduled poll).
  if (this.inFlight) return Promise.resolve();
  this.inFlight = true;

  var location = this.studentLocation || {
    lat: CONFIG.MAP_CENTER_LAT,
    lng: CONFIG.MAP_CENTER_LNG
  };

  // Promise.all with per-request recovery: one failing endpoint must not blank
  // the whole screen.
  return Promise.all([
    ApiService.fetchDriverLocation().catch(function (error) { return { __error: error }; }),
    ApiService.fetchEta(location.lat, location.lng).catch(function (error) { return { __error: error }; }),
    ApiService.fetchQueueStatus().catch(function (error) { return { __error: error }; })
  ])
    .then(function (results) {
      var driverLoc = results[0];
      var etaData = results[1];
      var queueData = results[2];

      var transportError =
        (driverLoc && driverLoc.__error) ||
        (etaData && etaData.__error) ||
        (queueData && queueData.__error);

      if (transportError) {
        self.consecutiveFailures += 1;
        self.uiManager.showError(
          transportError.message + '. Retrying automatically…'
        );
        // Keep the last good reading on screen; a stale number with a warning
        // is more useful to someone at a bus stop than a blank card.
        return;
      }

      self.consecutiveFailures = 0;
      self.uiManager.clearError();

      self.render(
        driverLoc && !driverLoc.__error ? driverLoc : null,
        etaData && !etaData.__error ? etaData : null,
        queueData && !queueData.__error ? queueData : null
      );
    })
    .then(function () {
      self.inFlight = false;
      self._scheduleNext();
    })
    .catch(function () {
      self.inFlight = false;
      self._scheduleNext();
    });
};

/** Applies one poll's worth of data to the map and the answer card. */
EtaController.prototype.render = function (driverLoc, etaData, queueData) {
  // No driver record at all -> explain the empty map, do not just leave it blank.
  if (!driverLoc || !Utils.isValidCoordinate(driverLoc.latitude, driverLoc.longitude)) {
    this.uiManager.showOfflineState();
    this.mapManager.removeShuttle();
    return;
  }

  var updatedAt = Utils.parseDate(driverLoc.updatedAt);
  var state = this.resolveState(updatedAt);
  var isDisconnected = state === 'DISCONNECTED';

  this.mapManager.updateShuttleLocation(
    driverLoc.latitude,
    driverLoc.longitude,
    isDisconnected
  );

  if (isDisconnected) {
    this.uiManager.showOfflineState();
    this.uiManager.updateBadge(state, updatedAt);
    return;
  }

  this.uiManager.updateEtaDisplay(etaData);
  this.uiManager.updateQueueDisplay(queueData, etaData);
  this.uiManager.updateBadge(state, updatedAt);

  // Frame both markers once, on the first live reading only, so the map never
  // yanks itself away from a student who has panned it deliberately.
  if (!this.hasFittedBounds) {
    this.mapManager.fitToMarkers();
    this.hasFittedBounds = true;
  }
};

/**
 * Maps data age to a network state.
 * A missing timestamp is treated as DISCONNECTED: we cannot vouch for the age
 * of the reading, so we must not present it as live.
 */
EtaController.prototype.resolveState = function (updatedAt) {
  if (!updatedAt) return 'DISCONNECTED';

  var ageSeconds = (Date.now() - updatedAt.getTime()) / 1000;

  if (ageSeconds > CONFIG.STATUS_DISCONNECTED_THRESHOLD) return 'DISCONNECTED';
  if (ageSeconds > CONFIG.STATUS_STALE_THRESHOLD) return 'STALE';
  if (ageSeconds > CONFIG.STATUS_WARNING_THRESHOLD) return 'WARNING';
  return 'NORMAL';
};

/** Manual refresh from the hero panel. */
EtaController.prototype.refresh = function () {
  var self = this;
  this.uiManager.setRefreshing(true);
  this.inFlight = false; // allow the manual request to pre-empt the schedule
  return this.poll().then(function () {
    self.uiManager.setRefreshing(false);
  });
};

/** Re-acquires GPS and recentres the map on the student. */
EtaController.prototype.recentreOnStudent = function () {
  var self = this;
  this.locateStudent(function (granted) {
    if (granted && self.studentLocation) {
      self.mapManager.panTo(self.studentLocation.lat, self.studentLocation.lng);
    } else {
      self.uiManager.showError(
        'Location access is off, so we are using the campus centre instead.'
      );
    }
  });
};
