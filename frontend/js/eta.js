/**
 * eta.js - Polling engine + network state machine for the student view.
 *
 * Network state machine (seconds since the driver's last position):
 *   NORMAL        0-15   live, trust the ETA
 *   WARNING      16-30   "Updating…", the next packet is overdue
 *   STALE        31-60   "Delayed", show the age of the reading
 *   DISCONNECTED   60+   "Offline", fade the marker to 50%
 *
 * Where the age comes from: the backend reports `ageSeconds` alongside every
 * reading, and that is what drives the state machine. This used to be computed
 * here as (Date.now() - updatedAt), which was wrong in two ways at once. The
 * backend serialised a LocalDateTime with no timezone offset, and a browser
 * parses an offset-less datetime as *local* time - so with the server in UTC and
 * phones on campus in UTC+1, every fresh reading looked exactly one hour old and
 * the view latched to DISCONNECTED while the marker was visibly moving. Even
 * with that fixed, subtracting a server timestamp from a client clock trusts the
 * client clock, and a laptop with a wrong clock would reproduce the same bug.
 * The server measures the age against its own clock, where both timestamps agree
 * by construction.
 *
 * The client still ticks that age forward between polls, so the badge decays
 * naturally rather than freezing until the next response.
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
  this.selectedStop = null;
  this.activeShuttles = [];
  this.timerId = null;
  this.isPolling = false;
  this.inFlight = false;
  this.consecutiveFailures = 0;
  this.hasFittedBounds = false;
  this.tickerId = null;

  this.lastAgeSeconds = null;
  this.lastAgeReceivedAt = null;
}

EtaController.prototype.init = function () {
  var self = this;

  // Routes first: static context makes the map readable before any live data.
  // The same payload feeds the map and the stop strip, so the two cannot
  // disagree about which stops exist.
  ApiService.fetchRoutes().then(function (routes) {
    self.mapManager.drawRoutes(routes);
    self.uiManager.renderStopChips(routes);
  });

  this.locateStudent();
  this.startPolling();
  this.startAgeTicker();

  // Stop polling while the tab is hidden. This is the single biggest battery
  // and mobile-data saving in the app for a phone left in a pocket.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      self.stopPolling();
      self.stopAgeTicker();
    } else {
      self.startPolling();
      self.startAgeTicker();
    }
  });
};

/**
 * Ages the current reading forward once a second, independently of polling.
 *
 * Without this the badge freezes whenever polling stops producing data. A failed
 * poll deliberately keeps the last good reading on screen (a stale number beats a
 * blank card at a bus stop), but it returns before touching the badge - so if the
 * backend went down while the shuttle was live, the card would keep claiming
 * "Live" indefinitely. Ticking locally means the state decays NORMAL -> WARNING
 * -> STALE -> DISCONNECTED on its own, which is what "the state machine must be
 * automatic" requires.
 *
 * One timer for the whole page, and it only writes to the DOM when a value
 * actually changed (UIManager compares before writing), so the cost is
 * negligible.
 */
EtaController.prototype.startAgeTicker = function () {
  var self = this;
  if (this.tickerId) return;

  this.tickerId = setInterval(function () {
    if (self.lastAgeSeconds === null || self.lastAgeReceivedAt === null) return;

    var elapsed = (Date.now() - self.lastAgeReceivedAt) / 1000;
    var age = self.lastAgeSeconds + elapsed;
    var state = self.resolveState(age);

    self.uiManager.updateBadge(state, age);

    // Keep the marker's opacity honest about the state too.
    if (state === 'DISCONNECTED') {
      self.mapManager.setShuttleStale(true);
    }
  }, 1000);
};

EtaController.prototype.stopAgeTicker = function () {
  if (this.tickerId) {
    clearInterval(this.tickerId);
    this.tickerId = null;
  }
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
    ApiService.fetchQueueStatus().catch(function (error) { return { __error: error }; }),
    ApiService.fetchActiveShuttles().catch(function () { return []; })
  ])
    .then(function (results) {
      var driverLoc = results[0];
      var etaData = results[1];
      var queueData = results[2];
      self.activeShuttles = results[3] || [];

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
    this.lastAgeSeconds = null;
    this.lastAgeReceivedAt = null;
    this.uiManager.showOfflineState();
    this.mapManager.removeShuttle();
    return;
  }

  var ageSeconds = this.resolveAgeSeconds(driverLoc);
  var state = this.resolveState(ageSeconds);
  var isDisconnected = state === 'DISCONNECTED';

  this.mapManager.updateShuttleLocation(
    driverLoc.latitude,
    driverLoc.longitude,
    isDisconnected
  );

  if (isDisconnected) {
    this.uiManager.showOfflineState();
    this.uiManager.updateBadge(state, ageSeconds);
    return;
  }

  this.uiManager.updateEtaDisplay(etaData);
  this.uiManager.updateQueueDisplay(queueData, etaData);
  this.uiManager.updateBadge(state, ageSeconds);

  // Frame both markers once, on the first live reading only, so the map never
  // yanks itself away from a student who has panned it deliberately.
  if (!this.hasFittedBounds) {
    this.mapManager.fitToMarkers();
    this.hasFittedBounds = true;
  }
};

/**
 * Determines how old a reading is, in seconds.
 *
 * Prefers the server-computed `ageSeconds`, which is immune to timezone and
 * clock-skew problems because the server measured it against a single clock.
 * Falls back to the timestamp difference only if an older backend omits the
 * field, so the page still works against a server that has not been redeployed.
 *
 * @returns {number|null} age in seconds, or null when it cannot be determined.
 */
EtaController.prototype.resolveAgeSeconds = function (driverLoc) {
  if (driverLoc && typeof driverLoc.ageSeconds === 'number' && isFinite(driverLoc.ageSeconds)) {
    this.lastAgeSeconds = Math.max(0, driverLoc.ageSeconds);
    this.lastAgeReceivedAt = Date.now();
    return this.lastAgeSeconds;
  }

  var updatedAt = Utils.parseDate(driverLoc && driverLoc.updatedAt);
  if (!updatedAt) return null;

  var age = Math.max(0, (Date.now() - updatedAt.getTime()) / 1000);
  this.lastAgeSeconds = age;
  this.lastAgeReceivedAt = Date.now();
  return age;
};

/**
 * Maps data age to a network state.
 * A missing age is treated as DISCONNECTED: we cannot vouch for how old the
 * reading is, so we must not present it as live.
 */
EtaController.prototype.resolveState = function (ageSeconds) {
  if (typeof ageSeconds !== 'number' || isNaN(ageSeconds)) return 'DISCONNECTED';

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

/** Re-requests the student's GPS position and pans the map to it. */
EtaController.prototype.recentreOnStudent = function () {
  var self = this;
  this.locateStudent(function (success) {
    if (self.studentLocation) {
      self.mapManager.panTo(self.studentLocation.lat, self.studentLocation.lng);
    }
    if (!success) {
      self.uiManager.showToast('📍 Could not get your location. Check GPS permissions.');
    }
  });
};

/** Selects a stop and focuses incoming buses heading there. */
EtaController.prototype.selectStop = function (stopName, lat, lng) {
  this.selectedStop = { name: stopName, lat: lat, lng: lng };
  this.uiManager.setSelectedStop(stopName);

  var incoming = this.activeShuttles.filter(function (s) {
    return s.state === 'NORMAL' || s.state === 'WARNING';
  });

  this.mapManager.focusStopAndIncomingBuses(stopName, lat, lng, incoming);
};

/** Requests a shuttle at the currently selected stop. */
EtaController.prototype.requestBusForSelectedStop = function (passengerCount) {
  var self = this;
  var stop = this.selectedStop;
  var stopName = stop ? stop.name : (this.uiManager.getCurrentStopName ? this.uiManager.getCurrentStopName() : 'Main Gate');

  return ApiService.requestBus(stopName, passengerCount || 1)
    .then(function (res) {
      self.uiManager.showToast('⚡ Bus requested for ' + stopName + '! Live drivers have been notified.');
      return res;
    })
    .catch(function (err) {
      self.uiManager.showError('Could not send request: ' + (err.message || 'Please try again.'));
    });
};

