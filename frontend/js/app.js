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

  // Crowd reporting (the #report-queue-btn FAB and its sheet) is owned by
  // QueueModule in queue.js, so that the dispatcher console and the student
  // sheet share one publish path and one debounce. Nothing to wire here.

  // Recalculate the map size on rotation / browser-chrome resize.
  window.addEventListener('resize', Utils.throttle(function () {
    mapManager.invalidate();
  }, 250));
});
