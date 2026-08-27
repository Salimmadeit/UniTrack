/**
 * queue.js - Crowd reporting, shared by the dispatcher console and students.
 *
 * Both audiences answer the same question ("how busy is the stop?") and hit the
 * same endpoint, so the publish path, the debounce and the 429 handling live here
 * once rather than being written twice. What differs is only the reported
 * `source` and the markup each one drives.
 *
 * Design decisions:
 * - Optimistic UI: the selection highlights immediately and rolls back if the
 *   POST fails. Someone standing at a stop should not wait on a round-trip to
 *   see that their tap registered.
 * - Anti-spam: after a successful publish the controls lock for
 *   QUEUE_DEBOUNCE_MS with a visible countdown, so the spec's "cannot spam"
 *   requirement is enforced and explained rather than silently ignored. The
 *   server enforces the same window independently - a guard that lives in the
 *   page is advice, not enforcement.
 * - Both initialisers are no-ops when their markup is absent, so this one file
 *   can be included on every page without a guard at each call site.
 */
var QueueModule = (function () {
  'use strict';

  var LABELS = { LOW: 'Low', MODERATE: 'Moderate', PACKED: 'Packed' };

  // Key for the cross-reload student lock. A student who taps and then refreshes
  // should not get a fresh allowance; the timestamp has to outlive the page.
  var STUDENT_LOCK_KEY = 'unitrack.lastStudentReport';

  /**
   * POSTs a level.
   *
   * Resolves with {accepted:boolean, response:Object} - a 429 resolves rather
   * than rejects, because being early is not an error the caller should surface
   * as a failure. The report was well-formed and the state it describes is
   * already live; only a genuine transport or validation problem rejects.
   */
  function publish(level, source) {
    return ApiService.postQueueStatus(level, source)
      .then(function (response) {
        return { accepted: true, response: response };
      })
      .catch(function (error) {
        if (error && error.status === 429) {
          return { accepted: false, response: null, debounced: true };
        }
        throw error;
      });
  }

  /** Reads the persisted student lock, in ms remaining (0 when clear). */
  function studentLockRemainingMs() {
    try {
      var last = window.localStorage.getItem(STUDENT_LOCK_KEY);
      if (!last) return 0;
      var elapsed = Date.now() - parseInt(last, 10);
      if (isNaN(elapsed) || elapsed < 0) return 0;
      return Math.max(0, CONFIG.QUEUE_DEBOUNCE_MS - elapsed);
    } catch (error) {
      // Private browsing can throw on localStorage access. The in-page lock
      // still applies, so degrade quietly rather than breaking the button.
      return 0;
    }
  }

  function recordStudentReport() {
    try {
      window.localStorage.setItem(STUDENT_LOCK_KEY, String(Date.now()));
    } catch (error) {
      /* see studentLockRemainingMs */
    }
  }

  // ---------------------------------------------------------------------------
  // Dispatcher console (dispatcher.html)
  // ---------------------------------------------------------------------------
  function initDispatcherConsole() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.queue-button'));
    if (!buttons.length) return; // not the dispatcher page

    var stateChip = document.getElementById('queue-state');
    var feedback = document.getElementById('queue-feedback');

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

    /** Locks the controls and counts down so the wait is explained. */
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

    function send(level) {
      var previousLevel = currentLevel;

      // Optimistic: show the new state now.
      currentLevel = level;
      paintSelection(level);
      setChip(LABELS[level] || level, 'active');
      setFeedback('Publishing ' + (LABELS[level] || level) + '…');

      publish(level, 'DISPATCHER')
        .then(function (result) {
          if (!result.accepted) {
            // Already the live value; nothing to roll back.
            setFeedback('That level is already published. Try again in a moment.');
          }
          lockWithCountdown();
        })
        .catch(function (error) {
          // Roll back so the console never shows a level students cannot see.
          currentLevel = previousLevel;
          paintSelection(previousLevel);
          setChip(previousLevel ? LABELS[previousLevel] : 'Not set', 'error');
          setFeedback(error.message + '. Nothing was published — please try again.', true);
          setLocked(false);
        });
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        send(button.dataset.level);
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

        // Server-reported age: see the note at the top of eta.js for why this is
        // not computed from the client clock.
        setFeedback(
          typeof status.ageSeconds === 'number'
            ? 'Current level published ' + Utils.timeAgoFromSeconds(status.ageSeconds) + '.'
            : 'Current level loaded.'
        );
      })
      .catch(function (error) {
        setChip('Offline', 'error');
        setFeedback(error.message + '. You can still publish once the connection returns.', true);
      });
  }

  // ---------------------------------------------------------------------------
  // Student report sheet (index.html)
  // ---------------------------------------------------------------------------
  function initStudentReporter() {
    var trigger = document.getElementById('report-queue-btn');
    var sheet = document.getElementById('report-sheet');
    if (!trigger || !sheet) return; // not the student page

    var buttons = Array.prototype.slice.call(sheet.querySelectorAll('.report-option'));
    var feedback = document.getElementById('report-feedback');
    var closeButton = document.getElementById('report-close');
    var isOpen = false;

    function setFeedback(text, isError) {
      if (!feedback) return;
      feedback.textContent = text;
      feedback.className = isError ? 'helper-text error-text' : 'helper-text';
    }

    function setLocked(isLocked) {
      buttons.forEach(function (button) {
        button.disabled = isLocked;
      });
    }

    function refreshLockState() {
      var remaining = studentLockRemainingMs();
      if (remaining > 0) {
        setLocked(true);
        setFeedback(
          'Thanks — you just reported. You can report again in ' +
            Math.ceil(remaining / 1000) + 's.'
        );
        setTimeout(refreshLockState, Math.min(remaining, 1000));
      } else {
        setLocked(false);
        setFeedback('Tap the level that matches what you can see.');
      }
    }

    function open() {
      isOpen = true;
      sheet.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      refreshLockState();

      // Move focus into the dialog so keyboard and screen-reader users are not
      // left behind on the trigger.
      var first = buttons.find(function (b) { return !b.disabled; }) || closeButton;
      if (first) first.focus();
    }

    function close() {
      isOpen = false;
      sheet.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus(); // return focus where the user left it
    }

    function send(level) {
      setFeedback('Reporting ' + (LABELS[level] || level) + '…');
      setLocked(true);

      publish(level, 'STUDENT')
        .then(function (result) {
          // Both outcomes are a success from the student's point of view: either
          // their report landed, or someone just reported the same thing.
          recordStudentReport();
          setFeedback(
            result.accepted
              ? 'Thanks — reported as ' + (LABELS[level] || level) + '.'
              : 'Thanks — that was already reported just now.'
          );
          setTimeout(function () {
            if (isOpen) close();
          }, 1200);
        })
        .catch(function (error) {
          setLocked(false);
          setFeedback(error.message + '. Your report was not sent.', true);
        });
    }

    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', function () {
      if (isOpen) close();
      else open();
    });

    if (closeButton) closeButton.addEventListener('click', close);

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        send(button.dataset.level);
      });
    });

    // Escape closes, matching what any dialog is expected to do.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen) close();
    });

    // A tap on the backdrop closes too, but a tap inside must not.
    sheet.addEventListener('click', function (event) {
      if (event.target === sheet) close();
    });
  }

  // Both are safe on any page: each returns immediately if its markup is absent.
  function init() {
    initDispatcherConsole();
    initStudentReporter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    LABELS: LABELS,
    publish: publish
  };
})();
