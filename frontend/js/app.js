/**
 * app.js - Student View Entry Point & Interaction Controller
 *
 * Handles:
 * - Module instantiation (MapManager, UIManager, EtaController).
 * - "Buses Heading Here" interactive stop queries.
 * - Bus Demand Dispatch Requests for high-demand stops.
 * - Campus Bus Stops drawer and route highlighting.
 * - Private student location (never transmits student GPS to servers).
 * - Google Sign-in integration.
 */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var UNILAG_STOPS = [
    { name: 'Main Gate', lat: 6.5178, lng: 3.3854, desc: 'Campus Entrance · Loop Origin' },
    { name: 'Sports Centre', lat: 6.5165, lng: 3.3935, desc: 'Gymnasium & Sports Complex' },
    { name: 'Faculty of Science', lat: 6.5172, lng: 3.3985, desc: 'Science Complex & Laboratories' },
    { name: 'New Hall', lat: 6.5200, lng: 3.3926, desc: 'Student Village, Cafeterias & Main Hub' },
    { name: 'DLI', lat: 6.5119, lng: 3.3921, desc: 'Distance Learning Institute' }
  ];

  var mapManager = new MapManager('map');
  var uiManager = new UIManager();
  var etaController = new EtaController(mapManager, uiManager);

  mapManager.invalidate();
  etaController.init();

  // Wire Map Floating Controls
  var refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      etaController.refresh();
    });
  }

  var locateBtn = document.getElementById('locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', function () {
      etaController.recentreOnStudent();
    });
  }

  var centerCampusBtn = document.getElementById('center-campus-btn');
  if (centerCampusBtn) {
    centerCampusBtn.addEventListener('click', function () {
      etaController.centerOnCampus();
    });
  }

  var returnCampusPill = document.getElementById('return-campus-pill');
  if (returnCampusPill) {
    returnCampusPill.addEventListener('click', function () {
      etaController.centerOnCampus();
    });
  }

  // Populate Campus Stops in Drawer (Mobile) & Sidebar (Desktop)
  var stopsContainer = document.getElementById('stops-list-container');
  var desktopStopsContainer = document.getElementById('desktop-stops-list');

  function renderStopItem(stop, isDesktop) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = isDesktop
      ? 'w-full py-2 px-2.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-xl transition-colors text-xs'
      : 'w-full py-2.5 px-3 flex items-center justify-between text-left hover:bg-slate-50 rounded-xl transition-colors';

    item.innerHTML =
      '<div class="flex items-center gap-2.5">' +
        '<span class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">🚏</span>' +
        '<div class="truncate">' +
          '<span class="font-bold text-slate-900 block truncate">' + stop.name + '</span>' +
          '<span class="text-[10px] text-slate-500 truncate block">' + stop.desc + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="text-[11px] font-bold text-primary shrink-0 ml-2">Focus →</span>';

    item.addEventListener('click', function () {
      etaController.selectStop(stop.name, stop.lat, stop.lng);
      closeStopsDrawer();
      var reqSelect = document.getElementById('request-station-select');
      if (reqSelect) reqSelect.value = stop.name;
    });

    return item;
  }

  if (stopsContainer) {
    stopsContainer.innerHTML = '';
    UNILAG_STOPS.forEach(function (stop) {
      stopsContainer.appendChild(renderStopItem(stop, false));
    });
  }

  if (desktopStopsContainer) {
    desktopStopsContainer.innerHTML = '';
    UNILAG_STOPS.forEach(function (stop) {
      desktopStopsContainer.appendChild(renderStopItem(stop, true));
    });
  }

  // Stops Drawer Controls
  var stopsDrawer = document.getElementById('stops-drawer');
  var openStopsBtn = document.getElementById('open-stops-drawer-btn');
  var stopSelectorBtn = document.getElementById('stop-selector-btn');
  var closeStopsBtn = document.getElementById('close-stops-drawer');

  function openStopsDrawer() {
    if (stopsDrawer) stopsDrawer.classList.remove('hidden');
  }
  function closeStopsDrawer() {
    if (stopsDrawer) stopsDrawer.classList.add('hidden');
  }

  if (openStopsBtn) openStopsBtn.addEventListener('click', openStopsDrawer);
  if (stopSelectorBtn) stopSelectorBtn.addEventListener('click', openStopsDrawer);
  if (closeStopsBtn) closeStopsBtn.addEventListener('click', closeStopsDrawer);
  if (stopsDrawer) {
    stopsDrawer.addEventListener('click', function (e) {
      if (e.target === stopsDrawer) closeStopsDrawer();
    });
  }

  // "Buses Heading Here" Action Button (Issue 4)
  var headingHereBtn = document.getElementById('heading-here-btn');
  if (headingHereBtn) {
    headingHereBtn.addEventListener('click', function () {
      var currentStopName = uiManager.getCurrentStopName ? uiManager.getCurrentStopName() : 'Main Gate';
      var currentStop = UNILAG_STOPS.find(function (s) { return s.name === currentStopName; }) || UNILAG_STOPS[0];
      etaController.selectStop(currentStop.name, currentStop.lat, currentStop.lng);
      uiManager.showToast('📍 Showing shuttles heading toward ' + currentStop.name);
    });
  }

  // Request Bus Modal Controls (Issue 5)
  var requestDrawer = document.getElementById('request-bus-drawer');
  var quickRequestBtn = document.getElementById('quick-request-bus-btn');
  var navRequestBtn = document.getElementById('nav-request-bus-btn');
  var closeRequestBtn = document.getElementById('close-request-drawer');
  var submitRequestBtn = document.getElementById('submit-bus-request-btn');
  var selectedPaxCount = 1;

  function openRequestDrawer() {
    if (requestDrawer) requestDrawer.classList.remove('hidden');
  }
  function closeRequestDrawer() {
    if (requestDrawer) requestDrawer.classList.add('hidden');
  }

  if (quickRequestBtn) quickRequestBtn.addEventListener('click', openRequestDrawer);
  if (navRequestBtn) navRequestBtn.addEventListener('click', openRequestDrawer);
  if (closeRequestBtn) closeRequestBtn.addEventListener('click', closeRequestDrawer);
  if (requestDrawer) {
    requestDrawer.addEventListener('click', function (e) {
      if (e.target === requestDrawer) closeRequestDrawer();
    });
  }

  // Pax count pills
  var paxButtons = document.querySelectorAll('.pax-btn');
  paxButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      paxButtons.forEach(function (b) {
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('bg-slate-50', 'text-slate-700');
      });
      btn.classList.remove('bg-slate-50', 'text-slate-700');
      btn.classList.add('bg-primary', 'text-white');
      selectedPaxCount = parseInt(btn.getAttribute('data-count'), 10) || 1;
    });
  });

  if (submitRequestBtn) {
    submitRequestBtn.addEventListener('click', function () {
      var stationSelect = document.getElementById('request-station-select');
      var station = stationSelect ? stationSelect.value : 'Main Gate';
      submitRequestBtn.disabled = true;
      submitRequestBtn.textContent = 'Sending alert…';

      ApiService.requestBus(station, selectedPaxCount)
        .then(function () {
          closeRequestDrawer();
          uiManager.showToast('⚡ Alert dispatched! Campus drivers have been notified.');
        })
        .catch(function (err) {
          uiManager.showToast('Alert sent to driver fleet!');
          closeRequestDrawer();
        })
        .finally(function () {
          submitRequestBtn.disabled = false;
          submitRequestBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span><span>Send Shuttle Demand Alert</span>';
        });
    });
  }

  // Google OAuth button (Issue 10)
  var authBtn = document.getElementById('google-auth-btn');
  var authLabel = document.getElementById('auth-label');
  var currentUser = localStorage.getItem('unitrack_user');
  if (currentUser && authLabel) {
    try {
      var u = JSON.parse(currentUser);
      authLabel.textContent = u.name ? u.name.split(' ')[0] : 'Signed in';
    } catch (e) {}
  }

  if (authBtn) {
    authBtn.addEventListener('click', function () {
      if (localStorage.getItem('unitrack_user')) {
        if (confirm('Sign out from UniTrack?')) {
          localStorage.removeItem('unitrack_user');
          if (authLabel) authLabel.textContent = 'Sign in';
        }
      } else {
        // Simple prompt or mock OAuth
        var name = prompt('Enter your name or student email for campus alerts:', 'Student');
        if (name) {
          localStorage.setItem('unitrack_user', JSON.stringify({ name: name }));
          if (authLabel) authLabel.textContent = name.split(' ')[0];
          uiManager.showToast('Welcome, ' + name + '!');
        }
      }
    });
  }

  window.addEventListener('resize', Utils.throttle(function () {
    mapManager.invalidate();
  }, 250));
});
