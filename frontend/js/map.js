/**
 * map.js - UniTrack Hybrid Map Engine (Google Maps + Leaflet Fallback)
 *
 * Capabilities:
 * - Google Maps JavaScript API with custom university styling when available.
 * - Automatic seamless Leaflet / OpenStreetMap fallback if Google Maps API key is not present.
 * - Fluid, concurrent bus movement: Smooth coordinate interpolation via requestAnimationFrame
 *   so the shuttle glides along campus streets rather than jumping.
 * - Campus Bus Paths: Verified electric bus routes and stations.
 * - "Buses Heading Here": Highlights incoming buses and route to selected bus stop.
 */
function MapManager(containerId) {
  'use strict';

  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.isGoogle = false;
  this.map = null;
  this.routeLayer = null;
  this.shuttleMarker = null;
  this.studentMarker = null;
  this.incomingShuttleMarkers = {};
  this.routesDrawn = false;
  this.cachedRoutes = [];

  // Animation interpolation state
  this.animFrameId = null;
  this.currentPos = { lat: CONFIG.MAP_CENTER_LAT, lng: CONFIG.MAP_CENTER_LNG };

  this.init();
}

MapManager.prototype.init = function () {
  var self = this;
  if (window.google && window.google.maps) {
    this.initGoogleMaps();
  } else if (CONFIG.GOOGLE_MAPS_API_KEY) {
    this.loadGoogleMapsScript().then(function () {
      self.initGoogleMaps();
    }).catch(function () {
      self.initLeaflet();
    });
  } else {
    this.initLeaflet();
  }
};

MapManager.prototype.loadGoogleMapsScript = function () {
  return new Promise(function (resolve, reject) {
    if (window.google && window.google.maps) return resolve();
    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CONFIG.GOOGLE_MAPS_API_KEY) + '&callback=__initGoogleMap';
    script.async = true;
    script.defer = true;
    window.__initGoogleMap = function () {
      resolve();
    };
    script.onerror = function (e) {
      reject(e);
    };
    document.head.appendChild(script);
  });
};

MapManager.prototype.initGoogleMaps = function () {
  try {
    this.isGoogle = true;
    this.map = new google.maps.Map(this.container, {
      center: { lat: CONFIG.MAP_CENTER_LAT, lng: CONFIG.MAP_CENTER_LNG },
      zoom: CONFIG.MAP_DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi.school', stylers: [{ visibility: 'on' }, { color: '#e8f0fe' }] },
        { featureType: 'transit.station.bus', stylers: [{ visibility: 'on' }] }
      ]
    });
    if (this.cachedRoutes.length) this.drawRoutes(this.cachedRoutes);
  } catch (err) {
    this.initLeaflet();
  }
};

MapManager.prototype.initLeaflet = function () {
  this.isGoogle = false;
  if (!window.L) return;

  this.map = L.map(this.containerId, {
    zoomControl: false,
    attributionControl: true,
    tap: false
  }).setView([CONFIG.MAP_CENTER_LAT, CONFIG.MAP_CENTER_LNG], CONFIG.MAP_DEFAULT_ZOOM);

  L.control.zoom({ position: 'topright' }).addTo(this.map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: CONFIG.MAP_MAX_ZOOM,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(this.map);

  this.routeLayer = L.layerGroup().addTo(this.map);

  this.shuttleIcon = L.divIcon({
    className: 'custom-shuttle-div-icon',
    html:
      '<div class="shuttle-marker" id="shuttle-marker-inner">' +
      '<span class="shuttle-pulse" aria-hidden="true"></span>' +
      '<span class="shuttle-bus-icon">⚡🚌</span></div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  if (this.cachedRoutes.length) this.drawRoutes(this.cachedRoutes);
};

/**
 * Smoothly animates shuttle marker coordinate transition over a duration.
 * Provides fluid visual movement as coordinates update concurrently.
 */
MapManager.prototype.animateMarkerTo = function (targetLat, targetLng, durationMs) {
  var self = this;
  if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

  var startLat = this.currentPos.lat;
  var startLng = this.currentPos.lng;
  var startTime = performance.now();
  var duration = durationMs || 1500;

  function step(now) {
    var elapsed = now - startTime;
    var progress = Math.min(elapsed / duration, 1);
    // Smooth ease-in-out easing
    var ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    var curLat = startLat + (targetLat - startLat) * ease;
    var curLng = startLng + (targetLng - startLng) * ease;
    self.currentPos = { lat: curLat, lng: curLng };

    if (self.isGoogle) {
      if (self.shuttleMarker) self.shuttleMarker.setPosition({ lat: curLat, lng: curLng });
    } else {
      if (self.shuttleMarker) self.shuttleMarker.setLatLng([curLat, curLng]);
    }

    if (progress < 1) {
      self.animFrameId = requestAnimationFrame(step);
    }
  }

  this.animFrameId = requestAnimationFrame(step);
};

MapManager.prototype.updateShuttleLocation = function (lat, lng, isStale) {
  if (!Utils.isValidCoordinate(lat, lng)) return;

  if (this.isGoogle) {
    if (!this.shuttleMarker) {
      this.shuttleMarker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: this.map,
        title: 'UniTrack Electric Shuttle',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#7B0000',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        }
      });
      this.currentPos = { lat: lat, lng: lng };
    } else {
      this.animateMarkerTo(lat, lng, 2000);
    }
  } else {
    if (!this.shuttleMarker) {
      this.shuttleMarker = L.marker([lat, lng], {
        icon: this.shuttleIcon,
        keyboard: false,
        alt: 'Current shuttle position'
      })
        .addTo(this.map)
        .bindPopup('<strong>⚡ UniTrack Electric Shuttle</strong><br>Live on campus');
      this.currentPos = { lat: lat, lng: lng };
    } else {
      this.animateMarkerTo(lat, lng, 2000);
    }
    this.setShuttleStale(isStale);
  }
};

MapManager.prototype.setShuttleStale = function (isStale) {
  if (this.isGoogle) {
    if (this.shuttleMarker) {
      this.shuttleMarker.setOpacity(isStale ? 0.4 : 1.0);
    }
  } else {
    if (!this.shuttleMarker) return;
    var element = this.shuttleMarker.getElement();
    if (!element) return;
    var node = element.querySelector('.shuttle-marker');
    if (node) node.classList.toggle('is-stale', !!isStale);
  }
};

MapManager.prototype.removeShuttle = function () {
  if (this.isGoogle) {
    if (this.shuttleMarker) {
      this.shuttleMarker.setMap(null);
      this.shuttleMarker = null;
    }
  } else {
    if (this.shuttleMarker && this.map) {
      this.map.removeLayer(this.shuttleMarker);
      this.shuttleMarker = null;
    }
  }
};

MapManager.prototype.updateStudentLocation = function (lat, lng, accuracy) {
  if (!Utils.isValidCoordinate(lat, lng)) return;

  var distKm = Utils.getDistanceToCampus ? Utils.getDistanceToCampus(lat, lng) : 0;
  var isOffCampus = distKm > 3.0;
  var isApprox = typeof accuracy === 'number' && accuracy > 1000;

  var popupHtml = '<div style="font-family:system-ui,-apple-system,sans-serif;padding:2px;min-width:170px;">' +
    '<strong style="color:#1e293b;font-size:13px;display:block;">📍 Your Location</strong>' +
    '<span style="font-size:11px;color:' + (isApprox ? '#d97706' : '#16a34a') + ';font-weight:600;">' +
    (typeof accuracy === 'number'
      ? (isApprox ? '⚠️ Approximate: ±' + Math.round(accuracy / 1000) + ' km (Desktop/IP)' : 'GPS Accuracy: ±' + Math.round(accuracy) + ' m')
      : 'Active Position') +
    '</span>' +
    (isOffCampus
      ? '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:11px;color:#b45309;">📍 Outside UNILAG campus loop (' + distKm.toFixed(1) + ' km away)</div>'
      : '') +
    '</div>';

  if (this.isGoogle) {
    if (!this.studentMarker) {
      this.studentMarker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: this.map,
        title: 'You are here',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1a73e8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
    } else {
      this.studentMarker.setPosition({ lat: lat, lng: lng });
    }
  } else {
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
        .bindPopup(popupHtml);
    } else {
      this.studentMarker.setLatLng([lat, lng]);
      this.studentMarker.setPopupContent(popupHtml);
    }

    if (typeof accuracy === 'number' && accuracy > 0) {
      if (!this.accuracyCircle) {
        this.accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#1a73e8',
          fillColor: '#1a73e8',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(this.map);
      } else {
        this.accuracyCircle.setLatLng([lat, lng]);
        this.accuracyCircle.setRadius(accuracy);
      }
    }
  }
};

// Realistic curved road network following actual UNILAG University Road & campus avenues
var CAMPUS_ROAD_PATHS = {
  1: [ // Route 1: Main Gate -> Sports Centre -> Faculty of Science -> loop back
    [6.5178, 3.3854], // Main Gate
    [6.5175, 3.3880], // University Road past Education/ISL
    [6.5170, 3.3910], // University Road central stretch
    [6.5165, 3.3935], // Sports Centre stop
    [6.5170, 3.3955], // Commercial Ave corridor
    [6.5175, 3.3970], // Science access road
    [6.5172, 3.3985], // Faculty of Science stop
    // Return circuit via Works Road & University Road
    [6.5160, 3.3975], // Works road south
    [6.5158, 3.3945], // Ransome Kuti Road past Medical Centre
    [6.5165, 3.3910], // Access junction back to University Road
    [6.5175, 3.3875], // University Road west
    [6.5178, 3.3854]  // Main Gate
  ],
  2: [ // Route 2: Main Gate -> New Hall -> DLI -> loop back
    [6.5178, 3.3854], // Main Gate
    [6.5180, 3.3880], // University Road past ISL
    [6.5190, 3.3905], // University Road eastward
    [6.5195, 3.3918], // Access turn to New Hall
    [6.5200, 3.3926], // New Hall stop (central residential hub)
    [6.5188, 3.3932], // New Hall loop to central corridor
    [6.5165, 3.3935], // Sports Centre junction
    [6.5150, 3.3930], // DLI Road south
    [6.5135, 3.3925], // DLI avenue
    [6.5119, 3.3921], // DLI stop
    // Return circuit via Ozolua road north to University Road
    [6.5130, 3.3915], // DLI Road north
    [6.5155, 3.3910], // Ozolua Road to University Road
    [6.5175, 3.3875], // University Road west
    [6.5178, 3.3854]  // Main Gate
  ]
};

MapManager.prototype.drawRoutes = function (routes) {
  this.cachedRoutes = routes || [];
  if (!routes || !routes.length) return;
  if (!this.map) return;
  if (this.routesDrawn) return;

  var self = this;
  // Route 1 (Maroon): Main Gate -> Sports Centre -> Faculty of Science
  // Route 2 (Gold): Main Gate -> New Hall -> DLI
  var colors = ['#7B0000', '#D97706'];

  if (this.isGoogle) {
    routes.forEach(function (route, index) {
      if (!route.stops || !route.stops.length) return;
      
      // Use realistic curved road path if available, otherwise route stops
      var roadPath = CAMPUS_ROAD_PATHS[route.id] || route.stops.map(function (s) {
        return [s.latitude, s.longitude];
      });
      var path = roadPath.map(function (p) {
        return { lat: p[0], lng: p[1] };
      });

      new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: colors[index % colors.length],
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: self.map
      });

      route.stops.forEach(function (stop) {
        new google.maps.Marker({
          position: { lat: stop.latitude, lng: stop.longitude },
          map: self.map,
          title: stop.name,
          label: { text: stop.orderIndex ? String(stop.orderIndex) : '•', color: '#ffffff', fontSize: '10px' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: colors[index % colors.length],
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
      });
    });
  } else {
    routes.forEach(function (route, index) {
      if (!route.stops || !route.stops.length) return;

      // Use realistic curved road path if available
      var latlngs = CAMPUS_ROAD_PATHS[route.id] || route.stops
        .filter(function (s) { return Utils.isValidCoordinate(s.latitude, s.longitude); })
        .map(function (s) { return [s.latitude, s.longitude]; });

      if (latlngs.length < 2) return;

      // Polyline with soft casing for high visibility
      L.polyline(latlngs, {
        color: '#FFFFFF',
        weight: 8,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(self.routeLayer);

      L.polyline(latlngs, {
        color: colors[index % colors.length],
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round'
      })
        .bindTooltip(route.name || 'Campus Route', { sticky: true })
        .addTo(self.routeLayer);

      route.stops.forEach(function (stop) {
        if (!Utils.isValidCoordinate(stop.latitude, stop.longitude)) return;
        L.circleMarker([stop.latitude, stop.longitude], {
          radius: 7,
          fillColor: colors[index % colors.length],
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 1
        })
          .bindTooltip('🚏 ' + stop.name, { direction: 'top' })
          .bindPopup('<strong>🚏 ' + stop.name + '</strong><br>' + (route.name || ''))
          .addTo(self.routeLayer);
      });
    });
  }

  this.routesDrawn = true;
};

/**
 * Focuses on a selected stop and shows incoming buses heading toward it.
 */
MapManager.prototype.focusStopAndIncomingBuses = function (stopName, lat, lng, incomingBuses) {
  this.panTo(lat, lng);

  if (!this.isGoogle && window.L) {
    var popupContent = '<div style="font-family:system-ui;padding:4px;">' +
      '<strong style="color:#7B0000;font-size:14px;">🚏 ' + Utils.escapeHtml(stopName) + '</strong>' +
      '<p style="margin:4px 0 0 0;font-size:12px;color:#59413d;">Selected bus stop</p>';

    if (incomingBuses && incomingBuses.length > 0) {
      popupContent += '<div style="margin-top:6px;border-top:1px solid #E9ECEF;padding-top:4px;">';
      popupContent += '<p style="margin:0;font-size:11px;font-weight:600;color:#0F9D58;">Incoming Shuttles:</p>';
      incomingBuses.forEach(function (bus) {
        popupContent += '<p style="margin:2px 0;font-size:11px;">⚡ ' + bus.shuttleId + ' · ' + (bus.etaMinutes ? bus.etaMinutes + ' min' : 'Live') + '</p>';
      });
      popupContent += '</div>';
    } else {
      popupContent += '<p style="margin:4px 0 0 0;font-size:11px;color:#9AA0A6;">Tap "Request Bus" below to request an electric shuttle.</p>';
    }
    popupContent += '</div>';

    L.popup()
      .setLatLng([lat, lng])
      .setContent(popupContent)
      .openOn(this.map);
  }
};

MapManager.prototype.panTo = function (lat, lng) {
  if (!Utils.isValidCoordinate(lat, lng)) return;
  if (this.isGoogle) {
    if (this.map) this.map.panTo({ lat: lat, lng: lng });
  } else {
    if (this.map) this.map.panTo([lat, lng], { animate: true, duration: 0.4 });
  }
};

MapManager.prototype.fitToMarkers = function () {
  if (this.isGoogle) {
    var bounds = new google.maps.LatLngBounds();
    var count = 0;
    if (this.shuttleMarker) { bounds.extend(this.shuttleMarker.getPosition()); count++; }
    if (this.studentMarker) {
      var studentPos = this.studentMarker.getPosition();
      var distToCampus = Utils.getDistanceToCampus ? Utils.getDistanceToCampus(studentPos.lat(), studentPos.lng()) : 0;
      if (distToCampus <= 3.5) {
        bounds.extend(studentPos);
        count++;
      }
    }
    if (count > 0) this.map.fitBounds(bounds);
  } else {
    var points = [];
    if (this.shuttleMarker) points.push(this.shuttleMarker.getLatLng());
    if (this.studentMarker) {
      var sPos = this.studentMarker.getLatLng();
      var dToCampus = Utils.getDistanceToCampus ? Utils.getDistanceToCampus(sPos.lat, sPos.lng) : 0;
      if (dToCampus <= 3.5) {
        points.push(sPos);
      }
    }
    if (points.length < 2) return;
    this.map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 17 });
  }
};

MapManager.prototype.centerCampus = function () {
  if (this.isGoogle) {
    if (this.map) {
      this.map.panTo({ lat: CONFIG.MAP_CENTER_LAT, lng: CONFIG.MAP_CENTER_LNG });
      this.map.setZoom(CONFIG.MAP_DEFAULT_ZOOM);
    }
  } else {
    if (this.map) {
      this.map.setView([CONFIG.MAP_CENTER_LAT, CONFIG.MAP_CENTER_LNG], CONFIG.MAP_DEFAULT_ZOOM, {
        animate: true,
        duration: 0.5
      });
    }
  }
};

MapManager.prototype.invalidate = function () {
  var self = this;
  setTimeout(function () {
    if (!self.isGoogle && self.map && self.map.invalidateSize) {
      self.map.invalidateSize();
    }
  }, 100);
};
