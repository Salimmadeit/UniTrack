/**
 * dispatcher.js - UniTrack Modern Dispatcher Console Logic
 * 
 * Interacts with:
 * - POST /api/v1/queue & GET /api/v1/queue: Station crowd updates with debounce
 * - GET /api/v1/dispatch/alerts: Live relocation requests from campus stops
 * - POST /api/v1/dispatch/acknowledge/{id}: Acknowledge & dispatch shuttles
 * - GET /api/v1/location/all: Fleet telemetry, battery status & active drivers
 */
(function () {
  'use strict';

  var STATIONS = [
    { id: 'main-gate', name: 'Main Gate', defaultWait: '3m' },
    { id: 'sports-centre', name: 'Sports Centre', defaultWait: '6m' },
    { id: 'sci-fac', name: 'Faculty of Science', defaultWait: '10m' },
    { id: 'new-hall', name: 'New Hall', defaultWait: '4m' },
    { id: 'dli', name: 'DLI', defaultWait: '12m' }
  ];

  var stationStates = {};
  var isUpdatingQueue = false;

  function init() {
    renderStationCards();
    fetchCurrentQueue();
    fetchActiveAlerts();
    fetchFleetStatus();

    // Setup periodic polling
    setInterval(fetchActiveAlerts, 3500);
    setInterval(fetchFleetStatus, 4000);

    // Wire manual dispatch alert modal/form if present
    var manualBtn = document.getElementById('manual-dispatch-btn');
    if (manualBtn) {
      manualBtn.addEventListener('click', handleManualDispatch);
    }
  }

  function renderStationCards() {
    var container = document.getElementById('stations-container');
    if (!container) return;

    container.innerHTML = '';

    STATIONS.forEach(function (station) {
      var state = stationStates[station.name] || { level: 'LOW', updatedAt: 'Just now' };
      var badgeClass = state.level === 'PACKED'
        ? 'bg-status-danger/10 text-status-danger border-status-danger/20'
        : (state.level === 'MODERATE'
            ? 'bg-status-warning/10 text-status-warning border-status-warning/20'
            : 'bg-status-success/10 text-status-success border-status-success/20');

      var card = document.createElement('div');
      card.className = 'bg-surface dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md';
      card.setAttribute('data-station', station.name);

      card.innerHTML =
        '<div class="flex justify-between items-start">' +
          '<div>' +
            '<h4 class="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">' +
              '<span class="material-symbols-outlined text-[18px] text-primary dark:text-rose-400">location_on</span>' +
              station.name +
            '</h4>' +
            '<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" id="wait-' + station.id + '">Est. Wait: ' + station.defaultWait + '</p>' +
          '</div>' +
          '<span id="badge-' + station.id + '" class="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ' + badgeClass + '">' +
            '<span class="w-1.5 h-1.5 rounded-full bg-current"></span>' +
            state.level +
          '</span>' +
        '</div>' +
        '<div class="grid grid-cols-3 gap-1.5 pt-1">' +
          '<button type="button" data-action="set-level" data-station="' + station.name + '" data-level="LOW" ' +
            'class="lvl-btn px-2 py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center transition-all ' +
            (state.level === 'LOW' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-surface-border dark:border-slate-700') + '">' +
            '<span class="material-symbols-outlined text-[16px] mb-0.5">check_circle</span>' +
            '<span>Low</span>' +
          '</button>' +
          '<button type="button" data-action="set-level" data-station="' + station.name + '" data-level="MODERATE" ' +
            'class="lvl-btn px-2 py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center transition-all ' +
            (state.level === 'MODERATE' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-surface-border dark:border-slate-700') + '">' +
            '<span class="material-symbols-outlined text-[16px] mb-0.5">warning</span>' +
            '<span>Moderate</span>' +
          '</button>' +
          '<button type="button" data-action="set-level" data-station="' + station.name + '" data-level="PACKED" ' +
            'class="lvl-btn px-2 py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center transition-all ' +
            (state.level === 'PACKED' ? 'bg-rose-600 text-white border-rose-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-surface-border dark:border-slate-700') + '">' +
            '<span class="material-symbols-outlined text-[16px] mb-0.5">error</span>' +
            '<span>Packed</span>' +
          '</button>' +
        '</div>';

      container.appendChild(card);
    });

    // Bind station level click handlers
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action="set-level"]');
      if (!btn) return;
      var stationName = btn.getAttribute('data-station');
      var level = btn.getAttribute('data-level');
      updateStationLevel(stationName, level);
    });
  }

  function updateStationLevel(stationName, level) {
    if (isUpdatingQueue) return;
    isUpdatingQueue = true;

    // Optimistically update card UI
    stationStates[stationName] = { level: level, updatedAt: 'Just now' };
    renderStationCards();

    var feedback = document.getElementById('dispatcher-feedback');
    if (feedback) {
      feedback.textContent = 'Updating ' + stationName + ' to ' + level + '…';
      feedback.className = 'text-xs text-amber-600 dark:text-amber-400 font-semibold';
    }

    ApiService.postQueueStatus(level, 'DISPATCHER')
      .then(function () {
        if (feedback) {
          feedback.textContent = '✓ ' + stationName + ' queue updated to ' + level;
          feedback.className = 'text-xs text-emerald-600 dark:text-emerald-400 font-semibold';
        }
      })
      .catch(function (err) {
        if (err && err.status === 429) {
          if (feedback) {
            feedback.textContent = 'Notice: Rate limit active. Updated locally.';
            feedback.className = 'text-xs text-slate-500 font-semibold';
          }
        } else {
          if (feedback) {
            feedback.textContent = 'Error updating queue status. Please try again.';
            feedback.className = 'text-xs text-rose-600 font-semibold';
          }
        }
      })
      .finally(function () {
        setTimeout(function () {
          isUpdatingQueue = false;
        }, 1000);
      });
  }

  function fetchCurrentQueue() {
    ApiService.fetchQueueStatus()
      .then(function (res) {
        if (res && res.level) {
          var mainState = stationStates['Main Gate'] || {};
          mainState.level = res.level;
          stationStates['Main Gate'] = mainState;
          renderStationCards();
        }
      })
      .catch(function () {});
  }

  function fetchActiveAlerts() {
    var alertsList = document.getElementById('alerts-container');
    var badge = document.getElementById('alerts-count-badge');
    if (!alertsList) return;

    fetch(CONFIG.API_BASE_URL + '/dispatch/alerts')
      .then(function (res) { return res.json(); })
      .then(function (alerts) {
        if (!Array.isArray(alerts)) return;

        if (badge) {
          badge.textContent = alerts.length + ' active';
          badge.className = alerts.length > 0
            ? 'text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse'
            : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600';
        }

        if (alerts.length === 0) {
          alertsList.innerHTML =
            '<div class="p-6 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-surface-border dark:border-slate-800 rounded-xl">' +
              '<span class="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600 mb-1">done_all</span>' +
              '<p class="font-semibold">No pending demand alerts</p>' +
              '<p class="text-[10px] mt-0.5">All station queues are currently within standard capacity.</p>' +
            '</div>';
          return;
        }

        alertsList.innerHTML = '';
        alerts.forEach(function (alert) {
          var item = document.createElement('div');
          item.className = 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 shadow-sm space-y-2';
          
          item.innerHTML =
            '<div class="flex items-start justify-between">' +
              '<div class="flex items-center gap-2">' +
                '<div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">' +
                  '<span class="material-symbols-outlined text-[18px]">campaign</span>' +
                '</div>' +
                '<div>' +
                  '<h5 class="text-xs font-bold text-slate-900 dark:text-slate-100">' + alert.stationName + '</h5>' +
                  '<span class="text-[10px] font-semibold text-amber-700 dark:text-amber-300">' +
                    (alert.passengerCount || 1) + ' passenger(s) waiting' +
                  '</span>' +
                '</div>' +
              '</div>' +
              '<span class="text-[9px] font-bold text-slate-400">' +
                (alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now') +
              '</span>' +
            '</div>' +
            (alert.note ? '<p class="text-[11px] text-slate-600 dark:text-slate-300 italic pl-1">“' + alert.note + '”</p>' : '') +
            '<div class="pt-1 flex gap-2">' +
              '<button type="button" data-ack-id="' + alert.id + '" class="ack-btn flex-1 py-1.5 px-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5">' +
                '<span class="material-symbols-outlined text-[15px]">electric_bolt</span>' +
                '<span>Dispatch Shuttle</span>' +
              '</button>' +
            '</div>';

          alertsList.appendChild(item);
        });

        // Bind acknowledge clicks
        alertsList.querySelectorAll('.ack-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var alertId = this.getAttribute('data-ack-id');
            acknowledgeAlert(alertId, this);
          });
        });
      })
      .catch(function () {});
  }

  function acknowledgeAlert(alertId, btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Dispatching…';
    }

    fetch(CONFIG.API_BASE_URL + '/dispatch/acknowledge/' + alertId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shuttleId: 'BUS-01' })
    })
      .then(function () {
        fetchActiveAlerts();
      })
      .catch(function () {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Retry Dispatch';
        }
      });
  }

  function handleManualDispatch() {
    var select = document.getElementById('manual-station-select');
    var count = document.getElementById('manual-pax-count');
    var station = select ? select.value : 'Main Gate';
    var pax = count ? parseInt(count.value, 10) : 15;

    fetch(CONFIG.API_BASE_URL + '/dispatch/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationName: station, passengerCount: pax, note: 'Manual dispatch call from Operations Console' })
    })
      .then(function () {
        fetchActiveAlerts();
      })
      .catch(function () {});
  }

  function fetchFleetStatus() {
    var fleetList = document.getElementById('fleet-container');
    var activeStat = document.getElementById('active-shuttles-stat');
    if (!fleetList) return;

    fetch(CONFIG.API_BASE_URL + '/location/all')
      .then(function (res) { return res.json(); })
      .then(function (locations) {
        if (!Array.isArray(locations) || locations.length === 0) {
          // Fall back to latest single location
          return fetch(CONFIG.API_BASE_URL + '/location')
            .then(function (res) { return res.json(); })
            .then(function (loc) { return loc ? [loc] : []; });
        }
        return locations;
      })
      .then(function (shuttles) {
        if (!shuttles || !shuttles.length) {
          if (activeStat) activeStat.textContent = '0 Online';
          return;
        }

        var liveCount = shuttles.filter(function (s) { return s.ageSeconds <= 20; }).length;
        if (activeStat) activeStat.textContent = (liveCount > 0 ? liveCount : 1) + ' Online';

        fleetList.innerHTML = '';
        shuttles.forEach(function (shuttle, idx) {
          var isLive = shuttle.ageSeconds <= 20;
          var item = document.createElement('div');
          item.className = 'bg-surface dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3';
          
          item.innerHTML =
            '<div class="flex items-center justify-between">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl ' + (isLive ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500') + ' flex items-center justify-center font-black text-sm">' +
                  (shuttle.shuttleId ? shuttle.shuttleId.replace('BUS-', '') : '0' + (idx + 1)) +
                '</div>' +
                '<div>' +
                  '<h5 class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">' +
                    (shuttle.shuttleId || 'BUS-01') +
                    '<span class="text-[10px] font-semibold text-slate-500">· Electric</span>' +
                  '</h5>' +
                  '<p class="text-[11px] text-slate-500 dark:text-slate-400">Speed: ' + (shuttle.speed ? Math.round(shuttle.speed) : 18) + ' km/h</p>' +
                '</div>' +
              '</div>' +
              '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ' +
                (isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400') + '">' +
                (isLive ? '● Live (' + shuttle.ageSeconds + 's)' : '○ Standby') +
              '</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2 text-center text-xs pt-1 border-t border-surface-border dark:border-slate-800">' +
              '<div class="bg-slate-50 dark:bg-slate-800/50 py-1.5 rounded-lg">' +
                '<span class="block text-[10px] text-slate-400 font-semibold uppercase">Battery</span>' +
                '<span class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">' +
                  '<span class="material-symbols-outlined text-[14px]">battery_charging_full</span>' +
                  (shuttle.batteryLevel || 88) + '%' +
                '</span>' +
              '</div>' +
              '<div class="bg-slate-50 dark:bg-slate-800/50 py-1.5 rounded-lg">' +
                '<span class="block text-[10px] text-slate-400 font-semibold uppercase">Route</span>' +
                '<span class="font-bold text-slate-700 dark:text-slate-300">Campus Loop</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex gap-2 pt-1">' +
              '<button type="button" class="ping-btn flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1">' +
                '<span class="material-symbols-outlined text-[14px]">sensors</span> Ping' +
              '</button>' +
              '<button type="button" class="relocate-btn flex-1 py-1.5 border border-primary text-primary dark:text-rose-400 dark:border-rose-400/50 hover:bg-primary/5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1">' +
                '<span class="material-symbols-outlined text-[14px]">compare_arrows</span> Priority Call' +
              '</button>' +
            '</div>';

          fleetList.appendChild(item);
        });

        fleetList.querySelectorAll('.ping-btn').forEach(function (b) {
          b.addEventListener('click', function () {
            this.innerHTML = '<span class="material-symbols-outlined text-[14px] text-emerald-600">check</span> Pinged!';
            var self = this;
            setTimeout(function () {
              self.innerHTML = '<span class="material-symbols-outlined text-[14px]">sensors</span> Ping';
            }, 1500);
          });
        });
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
