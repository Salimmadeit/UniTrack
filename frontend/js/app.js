/**
 * app.js - Student view entry point. Wires modules together and owns nothing else.
 */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var mapManager = new MapManager('map');
  var uiManager = new UIManager();
  var etaController = new EtaController(mapManager, uiManager);

  // The map container is sized by flexbox, so Leaflet's first measurement can
  // be taken before the layout settles.
  mapManager.invalidate();

  etaController.init();

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

  // Student crowd reporting is a documented Phase 2 feature. Until the backend
  // accepts student-sourced reports, point users at the dispatcher console
  // instead of showing a dead-end alert.
  var reportBtn = document.getElementById('report-queue-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', function () {
      uiManager.showError(
        'Student queue reporting is coming next. Dispatchers can update the queue from the Dispatcher view.'
      );
    });
  }

  // Recalculate the map size on rotation / browser-chrome resize.
  window.addEventListener('resize', Utils.throttle(function () {
    mapManager.invalidate();
  }, 250));
});
