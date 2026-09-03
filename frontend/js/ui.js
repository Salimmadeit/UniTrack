/**
 * ui.js - Owns every DOM write on the student view.
 *
 * Design decisions:
 * - All element lookups happen once in the constructor. Querying the DOM on
 *   every poll (every 6s, forever) is wasted work on a low-end phone.
 * - Every setter compares against the last written value and returns early if
 *   nothing changed. Re-assigning identical text still invalidates style and
 *   can interrupt screen-reader announcements on aria-live regions.
 * - The class knows nothing about fetching; the controller passes plain data.
 */
function UIManager() {
  'use strict';

  this.etaTime = document.getElementById('eta-time');
  this.etaCaption = document.getElementById('eta-caption');
  this.nearestStop = document.getElementById('nearest-stop');
  this.queueStatus = document.getElementById('queue-status');
  this.distanceValue = document.getElementById('distance-value');
  this.freshnessBadge = document.getElementById('freshness-badge');
  this.freshnessTime = document.getElementById('freshness-time');
  this.confidenceText = document.getElementById('confidence-text');
  this.walkingBanner = document.getElementById('walking-suggestion');
  this.walkTime = document.getElementById('walk-time');
  this.offlineBanner = document.getElementById('offline-banner');
  this.errorBanner = document.getElementById('error-banner');
  this.errorMessage = document.getElementById('error-message');

  // Cache of the last rendered values (see "no unnecessary DOM updates").
  this._last = {};
}

/** Writes textContent only when it actually changed. */
UIManager.prototype._setText = function (element, key, value) {
  if (!element || this._last[key] === value) return;
  this._last[key] = value;
  element.textContent = value;
};

/** Writes className only when it actually changed. */
UIManager.prototype._setClass = function (element, key, value) {
  if (!element || this._last[key] === value) return;
  this._last[key] = value;
  element.className = value;
};

UIManager.prototype._toggle = function (element, key, shouldShow) {
  if (!element || this._last[key] === shouldShow) return;
  this._last[key] = shouldShow;
  element.classList.toggle('hidden', !shouldShow);
};

/**
 * Renders the ETA answer card.
 * @param {Object|null} eta - EtaResponse from the backend, or null when absent.
 */
UIManager.prototype.updateEtaDisplay = function (eta) {
  if (!eta) {
    this._setText(this.etaTime, 'eta', '-- min');
    this._setText(this.etaCaption, 'etaCaption', 'Waiting for live shuttle data…');
    this._setText(this.nearestStop, 'stop', '—');
    this._setText(this.distanceValue, 'distance', '—');
    this._toggle(this.walkingBanner, 'walking', false);
    return;
  }

  this._setText(this.etaTime, 'eta', Utils.formatEta(eta.etaMinutes));
  this._setText(this.nearestStop, 'stop', eta.nearestStop || 'Unknown');
  this._setText(this.distanceValue, 'distance', Utils.formatDistance(eta.distanceKm));

  this._setText(
    this.etaCaption,
    'etaCaption',
    'Shuttle is ' + Utils.formatDistance(eta.distanceKm) + ' from ' +
      (eta.nearestStop || 'your stop') + '.'
  );

  // Walking suggestion only appears when it is genuinely the better choice,
  // so it stays meaningful instead of becoming visual noise.
  if (eta.walkingFaster) {
    this._setText(this.walkTime, 'walkTime', String(Math.round(eta.walkingMinutes)));
    this._toggle(this.walkingBanner, 'walking', true);
  } else {
    this._toggle(this.walkingBanner, 'walking', false);
  }
};

/**
 * Renders the queue pill. Falls back to deriving a level from the ETA payload
 * when the dedicated queue endpoint has not answered yet.
 */
UIManager.prototype.updateQueueDisplay = function (queue, etaFallback) {
  var level = null;

  if (queue && queue.level) {
    level = String(queue.level).toUpperCase();
  } else if (etaFallback && typeof etaFallback.queueWaitMinutes === 'number') {
    var wait = etaFallback.queueWaitMinutes;
    level = wait >= 15 ? 'PACKED' : wait >= 8 ? 'MODERATE' : 'LOW';
  }

  if (!level) {
    this._setText(this.queueStatus, 'queue', '—');
    this._setClass(this.queueStatus, 'queueClass', 'detail-value');
    return;
  }

  var classNames = {
    LOW: 'detail-value queue-low',
    MODERATE: 'detail-value queue-mod',
    PACKED: 'detail-value queue-packed'
  };

  var labels = { LOW: 'Low', MODERATE: 'Moderate', PACKED: 'Packed' };

  this._setText(this.queueStatus, 'queue', labels[level] || level);
  this._setClass(this.queueStatus, 'queueClass', classNames[level] || 'detail-value');
};

/**
 * Renders the network state machine.
 * NORMAL (0-15s) | WARNING (16-30s) | STALE (31-60s) | DISCONNECTED (60s+)
 *
 * @param {string} state
 * @param {number|null} ageSeconds age of the reading, as reported by the server
 *        and aged forward locally. Not a Date: see the comment at the top of
 *        eta.js for why the client must not subtract clocks.
 */
UIManager.prototype.updateBadge = function (state, ageSeconds) {
  var presets = {
    NORMAL: { label: 'Live', cls: 'badge badge-normal', help: 'Live tracking. ETA is current.' },
    WARNING: { label: 'Updating…', cls: 'badge badge-warning', help: 'Waiting for the next position update.' },
    STALE: { label: 'Delayed', cls: 'badge badge-stale', help: 'The shuttle has not reported recently. Treat this ETA with caution.' },
    DISCONNECTED: { label: 'Offline', cls: 'badge badge-disconnected', help: 'Location unavailable. The driver may have stopped broadcasting.' }
  };

  var preset = presets[state] || presets.DISCONNECTED;

  this._setText(this.freshnessBadge, 'badge', preset.label);
  this._setClass(this.freshnessBadge, 'badgeClass', preset.cls);
  this._setText(this.confidenceText, 'confidence', preset.help);

  var updated = typeof ageSeconds === 'number' && !isNaN(ageSeconds)
    ? 'Updated ' + Utils.timeAgoFromSeconds(ageSeconds)
    : '—';
  this._setText(this.freshnessTime, 'freshness', updated);

  // Only the DISCONNECTED state explains the empty map (spec requirement).
  this._toggle(this.offlineBanner, 'offline', state === 'DISCONNECTED');
};

/** Shown when no driver has ever broadcast, or the last one went silent. */
UIManager.prototype.showOfflineState = function () {
  this._setText(this.etaTime, 'eta', 'No shuttle');
  this._setText(this.etaCaption, 'etaCaption', 'No shuttle is broadcasting at the moment.');
  this._setText(this.nearestStop, 'stop', '—');
  this._setText(this.distanceValue, 'distance', '—');
  this._setText(this.freshnessBadge, 'badge', 'Offline');
  this._setClass(this.freshnessBadge, 'badgeClass', 'badge badge-disconnected');
  this._setText(this.freshnessTime, 'freshness', '—');
  this._setText(this.confidenceText, 'confidence', 'We will update automatically when a shuttle starts moving.');
  this._toggle(this.walkingBanner, 'walking', false);
  this._toggle(this.offlineBanner, 'offline', true);
};

/** Transport-level failure banner - distinct from "no shuttle". */
UIManager.prototype.showError = function (message) {
  this._setText(this.errorMessage, 'errorMessage', message);
  this._toggle(this.errorBanner, 'error', true);
};

UIManager.prototype.clearError = function () {
  this._toggle(this.errorBanner, 'error', false);
};

UIManager.prototype.setRefreshing = function (isRefreshing) {
  var button = document.getElementById('refresh-btn');
  if (!button) return;
  button.disabled = isRefreshing;
  button.textContent = isRefreshing ? 'Refreshing…' : 'Refresh';
};

/** Momentary affordance so a manual refresh feels acknowledged. */
UIManager.prototype.setSelectedStop = function (name) {
  this._selectedStopName = name;
  this._setText(this.nearestStop, 'stop', name);
};

UIManager.prototype.getCurrentStopName = function () {
  return this._selectedStopName || (this.nearestStop ? this.nearestStop.textContent : 'Main Gate');
};

UIManager.prototype.showToast = function (message) {
  var toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-4 py-2.5 rounded-full shadow-lg text-sm z-50 transition-all duration-300 pointer-events-none flex items-center gap-2';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translate(-50%, 0)';
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 10px)';
  }, 3500);
};


/**
 * Renders the "stops on the campus loop" strip, and the route/stop counts, from
 * the routes payload.
 *
 * Driven by the API rather than hardcoded in the HTML: the previous static list
 * had drifted, naming stops that no route served, which is worse than showing
 * nothing because a student could go and wait at one. Deriving both the strip
 * and the counts from the same response the map draws keeps them honest.
 *
 * @param {Array} routes - GET /routes payload.
 */
UIManager.prototype.renderStopChips = function (routes) {
  var strip = document.getElementById('stops-strip');
  var routeStat = document.getElementById('stat-routes');
  var stopStat = document.getElementById('stat-stops');

  if (!Array.isArray(routes) || !routes.length) {
    // Leave the placeholder in place but make it honest rather than a
    // permanent "Loading…" that never resolves.
    var placeholder = document.getElementById('stops-placeholder');
    if (placeholder) placeholder.textContent = 'Stop list unavailable';
    return;
  }

  // A stop served by two routes (Main Gate, typically) should appear once.
  var seen = {};
  var names = [];
  routes.forEach(function (route) {
    (route.stops || []).forEach(function (stop) {
      if (!stop || !stop.name || seen[stop.name]) return;
      seen[stop.name] = true;
      names.push(stop.name);
    });
  });

  if (routeStat) routeStat.textContent = String(routes.length);
  if (stopStat) stopStat.textContent = String(names.length);

  if (!strip) return;

  // One fragment, one reflow, and textContent rather than innerHTML so a stop
  // name from the database can never inject markup.
  var fragment = document.createDocumentFragment();
  names.forEach(function (name) {
    var chip = document.createElement('span');
    chip.className = 'stop-chip';
    chip.textContent = name;
    fragment.appendChild(chip);
  });

  strip.textContent = '';
  strip.appendChild(fragment);
};
