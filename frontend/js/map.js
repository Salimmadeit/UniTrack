/**
 * map.js - Leaflet/OpenStreetMap rendering.
 *
 * Performance rules enforced here:
 * - Markers are created once and moved with setLatLng() afterwards. Removing
 *   and re-adding a marker every 6 seconds would thrash the DOM and reset any
 *   open popup.
 * - Route polylines are drawn once into a dedicated LayerGroup, since routes
 *   are static for the lifetime of the page.
 * - The shuttle icon is a DivIcon styled with CSS, so it inherits theme tokens
 *   and costs no extra network request (the old code pulled a PNG from a
 *   third-party GitHub raw URL, which is both slow and unreliable).
 */
function MapManager(containerId) {
  'use strict';

  this.map = L.map(containerId, {
    zoomControl: false,
    attributionControl: true,
    // Leaflet's default tap handler blocks double-tap zoom on some Androids.
    tap: false
  }).setView([CONFIG.MAP_CENTER_LAT, CONFIG.MAP_CENTER_LNG], CONFIG.MAP_DEFAULT_ZOOM);

  // Top-right: the immersive layout puts the status panel bottom-left and the
  // queue FAB bottom-right, so both bottom corners are already occupied. CSS
  // adds a top margin here so the control clears the freshness badge.
  L.control.zoom({ position: 'topright' }).addTo(this.map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: CONFIG.MAP_MAX_ZOOM,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(this.map);

  this.routeLayer = L.layerGroup().addTo(this.map);
  this.shuttleMarker = null;
  this.studentMarker = null;
  this.routesDrawn = false;

  this.shuttleIcon = L.divIcon({
    className: '', // suppress Leaflet's default white square
    html:
      '<div class="shuttle-marker" id="shuttle-marker-inner">' +
      '<span class="shuttle-pulse" aria-hidden="true"></span>🚌</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

/**
 * Moves (or creates) the shuttle marker.
 * @param {boolean} isStale - fades the marker to 50% for the DISCONNECTED state.
 */
MapManager.prototype.updateShuttleLocation = function (lat, lng, isStale) {
  if (!Utils.isValidCoordinate(lat, lng)) return;

  if (!this.shuttleMarker) {
    this.shuttleMarker = L.marker([lat, lng], {
      icon: this.shuttleIcon,
      keyboard: false,
      alt: 'Current shuttle position'
    })
      .addTo(this.map)
      .bindPopup('<strong>Campus shuttle</strong><br>Live position');
  } else {
    this.shuttleMarker.setLatLng([lat, lng]); // reuse, never recreate
  }

  this.setShuttleStale(isStale);
};

/**
 * Fades the shuttle marker for the DISCONNECTED state, without moving it.
 *
 * Separate from updateShuttleLocation because the state machine can decay to
 * DISCONNECTED with no new coordinates to apply - that is precisely the case
 * where the driver stopped reporting. Keeping the class toggle in one place
 * means the two callers cannot drift apart.
 */
MapManager.prototype.setShuttleStale = function (isStale) {
  if (!this.shuttleMarker) return;

  var element = this.shuttleMarker.getElement();
  if (!element) return;

  var node = element.querySelector('.shuttle-marker');
  if (node) node.classList.toggle('is-stale', !!isStale);
};

MapManager.prototype.hasShuttle = function () {
  return this.shuttleMarker !== null;
};

/** Removes the shuttle marker when the driver goes offline entirely. */
MapManager.prototype.removeShuttle = function () {
  if (this.shuttleMarker) {
    this.map.removeLayer(this.shuttleMarker);
    this.shuttleMarker = null;
  }
};

MapManager.prototype.updateStudentLocation = function (lat, lng) {
  if (!Utils.isValidCoordinate(lat, lng)) return;

  if (!this.studentMarker) {
    this.studentMarker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#1a73e8',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1
    })
      .addTo(this.map)
      .bindPopup('<strong>You are here</strong>');
  } else {
    this.studentMarker.setLatLng([lat, lng]);
  }
};

/** Draws route polylines and stop markers once. */
MapManager.prototype.drawRoutes = function (routes) {
  if (this.routesDrawn || !routes || !routes.length) return;

  var self = this;
  // Route colours are deliberately independent of the brand azure. The "you are
  // here" dot is blue, so a blue route line would compete with it, and on a
  // subway-map basis routes read best as distinct saturated hues that are not
  // reused anywhere else in the UI. Orange and violet stay legible over OSM
  // tiles in both themes and avoid the green/red reserved for status.
  var colors = ['#e8710a', '#8e24aa'];

  routes.forEach(function (route, index) {
    if (!route.stops || !route.stops.length) return;

    var latlngs = route.stops
      .filter(function (stop) {
        return Utils.isValidCoordinate(stop.latitude, stop.longitude);
      })
      .map(function (stop) {
        return [stop.latitude, stop.longitude];
      });

    if (latlngs.length < 2) return;

    L.polyline(latlngs, {
      color: colors[index % colors.length],
      weight: 4,
      opacity: 0.75,
      lineJoin: 'round'
    })
      .bindTooltip(route.name || 'Route', { sticky: true })
      .addTo(self.routeLayer);

    route.stops.forEach(function (stop) {
      if (!Utils.isValidCoordinate(stop.latitude, stop.longitude)) return;
      L.circleMarker([stop.latitude, stop.longitude], {
        radius: 6,
        fillColor: '#ffffff',
        color: colors[index % colors.length],
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      })
        .bindTooltip(stop.name, { direction: 'top' })
        .bindPopup('<strong>' + stop.name + '</strong><br>' + (route.name || ''))
        .addTo(self.routeLayer);
    });
  });

  this.routesDrawn = true;
};

/** Centres the map without changing zoom (used by the "My location" button). */
MapManager.prototype.panTo = function (lat, lng) {
  if (!Utils.isValidCoordinate(lat, lng)) return;
  this.map.panTo([lat, lng], { animate: true, duration: 0.4 });
};

/** Fits shuttle + student in view so the relationship is obvious at a glance. */
MapManager.prototype.fitToMarkers = function () {
  var points = [];
  if (this.shuttleMarker) points.push(this.shuttleMarker.getLatLng());
  if (this.studentMarker) points.push(this.studentMarker.getLatLng());
  if (points.length < 2) return;
  this.map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 17 });
};

/** Leaflet needs a nudge when its container is resized by CSS. */
MapManager.prototype.invalidate = function () {
  var self = this;
  setTimeout(function () {
    self.map.invalidateSize();
  }, 100);
};
