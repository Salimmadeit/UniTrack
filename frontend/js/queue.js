/**
 * queue.js - Dispatcher console: one-tap queue reporting.
 *
 * Design decisions:
 * - Optimistic UI: the selected button highlights immediately and rolls back if
 *   the POST fails. A dispatcher standing at a stop should not wait on a
 *   round-trip to see that their tap registered.
 * - Anti-spam: after a successful publish, the buttons lock for
 *   QUEUE_DEBOUNCE_MS with a visible countdown, so the spec's "cannot spam"
 *   requirement is enforced and explained rather than silently ignored.
 * - The current level is fetched on load, so a dispatcher who reloads the page
 *   sees the live state instead of a blank console.
 */
(function () {
  'use strict';

  var buttons = Array.prototype.slice.call(document.querySelectorAll('.queue-button'));
  var stateChip = document.getElementById('queue-state');
  var feedback = document.getElementById('queue-feedback');

  var LABELS = { LOW: 'Low', MODERATE: 'Moderate', PACKED: 'Packed' };
  var currentLevel = null;
  var lockTimer = null;
  var countdownTimer = null;

  function setChip(text, variant) {
    if (!stateChip) return;
    stateChip.textContent = text;
    stateChip.className = 'status-chip' + (variant ? ' ' + variant : '');
  }

  function setFeedback(text, isError) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.className = isError ? 'helper-text error-text' : 'helper-text';
  }

  /** Reflects the selected level on the buttons (and to screen readers). */
  function paintSelection(level) {
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.level === level));
    });
  }

  function setLocked(isLocked) {
    buttons.forEach(function (button) {
      button.disabled = isLocked;
    });
  }

  /** Locks the controls and counts down so the wait is explained, not mysterious. */
  function lockWithCountdown() {
    var remaining = Math.round(CONFIG.QUEUE_DEBOUNCE_MS / 1000);
    setLocked(true);

    var tick = function () {
      if (remaining <= 0) return;
      setFeedback('Published. You can update again in ' + remaining + 's.');
      remaining -= 1;
    };

    tick();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);

    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () {
      clearInterval(countdownTimer);
      setLocked(false);
      setFeedback('Ready. Tap a level to publish an update.');
    }, CONFIG.QUEUE_DEBOUNCE_MS);
  }

  function publish(level) {
    var previousLevel = currentLevel;

    // Optimistic: show the new state now.
    currentLevel = level;
    paintSelection(level);
    setChip(LABELS[level] || level, 'active');
    setFeedback('Publishing ' + (LABELS[level] || level) + '…');

    ApiService.postQueueStatus(level)
      .then(function () {
        lockWithCountdown();
      })
      .catch(function (error) {
        // Roll back so the console never shows a level the students cannot see.
        currentLevel = previousLevel;
        paintSelection(previousLevel);
        setChip(previousLevel ? LABELS[previousLevel] : 'Not set', 'error');
        setFeedback(error.message + '. Nothing was published — please try again.', true);
        setLocked(false);
      });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      publish(button.dataset.level);
    });
  });

  // Load the live level so a reload does not look like a fresh, unset console.
  ApiService.fetchQueueStatus()
    .then(function (status) {
      if (!status || !status.level) {
        setChip('Not set');
        setFeedback('No queue level published yet. Tap a level to set one.');
        return;
      }
      currentLevel = String(status.level).toUpperCase();
      paintSelection(currentLevel);
      setChip(LABELS[currentLevel] || currentLevel, 'active');

      var updatedAt = Utils.parseDate(status.updatedAt);
      setFeedback(
        updatedAt
          ? 'Current level published ' + Utils.timeAgo(updatedAt) + '.'
          : 'Current level loaded.'
      );
    })
    .catch(function (error) {
      setChip('Offline', 'error');
      setFeedback(error.message + '. You can still publish once the connection returns.', true);
    });
})();
