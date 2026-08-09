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
 */
UIManager.prototype.updateBadge = function (state, lastUpdated) {
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

  var updated = lastUpdated ? 'Updated ' + Utils.timeAgo(lastUpdated) : '—';
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

/** Momentary affordance so a manual refresh feels acknowledged. */
UIManager.prototype.setRefreshing = function (isRefreshing) {
  var button = document.getElementById('refresh-btn');
  if (!button) return;
  button.disabled = isRefreshing;
  button.textContent = isRefreshing ? 'Refreshing…' : 'Refresh';
};
