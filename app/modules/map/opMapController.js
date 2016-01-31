/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.map').controller('opMapController',
    function ($scope, $rootScope, $timeout, L, opConfig, opStateService, opWebMapService, opPopupWindow, $log) {
        'use strict';

        L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a polygon filter.';
        L.drawLocal.draw.toolbar.buttons.rectangle = 'Draw a rectangle filter.';
        L.drawLocal.edit.toolbar.buttons.edit = 'Edit filter shapes.';
        L.drawLocal.edit.toolbar.buttons.editDisabled = 'No filters to edit.';
        L.drawLocal.edit.toolbar.buttons.remove = 'Delete filter shapes.';
        L.drawLocal.edit.toolbar.buttons.removeDisabled = 'No filters to delete.';

        var map;
        var bboxLayer;
        var layerControl;
        var legendControl;
        var drawnCountries = [];

        /**
         * Gets the map bounds from the URL (via the State service) and sets the map to the requested bounds.
         */
        var checkForMapBoundsState = function () {
            var bounds = opStateService.getBounds();
            if (bounds) {
                map.fitBounds(bounds);
            }
        };

        /**
         * Gets the bounding box bounds from the URL (via the state service) and sets the bounding
         * appropriately.
         */
        var checkForBBoxBoundsState = function () {
            var boundsString = opStateService.getAttributeBounds();

            var countryIdent = 'country:';
            var circleIdent = 'circle:';
            if (boundsString) {
                // if we have 'country' in the bounds, we can parse out countries to set up the geoJSON region
                if (boundsString.indexOf(countryIdent) > -1) {
                    var countryString = boundsString.substring(countryIdent.length, boundsString.length);
                    var countries = countryString.split(',');
                    $timeout(function () {
                        $rootScope.$broadcast('country-bounds-from-route', countries);
                    }, 1000);
                    // if we have 'circle' in the bounds, we can parse out the lat, long, and radius to create a circle
                } else if (boundsString.indexOf(circleIdent) > -1) {
                    // circle
                    var circleString = boundsString.substring(circleIdent.length, boundsString.length);
                    var circleData = circleString.split(',');
                    var lat = circleData[0];
                    var long = circleData[1];
                    var radius = circleData[2];
                    drawCircle(lat, long, radius);
                    // by default we are using a 4-corner bounding box
                } else {
                    var coords = boundsString.split(',');
                    if (coords.length === 4) {
                        // bounding box
                        $timeout(function () {
                            // send broadcast to sidebar location filter to set our bounds to a 4-point box
                            $rootScope.$broadcast('box-bounds-from-route', coords);
                        }, 1000);
                        // if we don't have at least 4 coordinates, tell the location filter to start with default
                    } else if (coords.length < 4) {
                        $timeout(function () {
                            // send broadcast to sidebar location filter to set our bounds to default
                            $rootScope.$broadcast('default-from-route');
                        }, 1000);
                    }
                }
                // if bounds string doesn't exist, set location filter to default
            } else {
                $timeout(function () {
                    $rootScope.$broadcast('default-from-route');
                }, 1000);
            }
            // sync result popup if the window is open to our bounding region changes
            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
            $rootScope.$broadcast('mapBoundsChanged');
        };

        /**
         * Creates a WKT (Well Known Text) version of a circle from lat, long, and radius and sets the WKT parameter
         * of the bound box layer as the circle to be later used for OGC queries.  Also draws circle to Leaflet.
         * @param lat       midpoint of circle latitude in degrees
         * @param long      midpoint of circle longitude in degrees
         * @param radius    radius of circle in meters
         */
        var drawCircle = function (lat, long, radius) {
            var wkt = new Wkt.Wkt(); // jshint ignore:line
            var polyCircle = createCirclePoly(lat, long, radius);
            wkt.fromObject(polyCircle);
            var origin = L.latLng(lat, long);
            var circleLayer = new L.circle(origin, radius, {
                color: '#ffd800', weight: 2, opacity: 1, fill: false
            });

            bboxLayer.clearLayers();
            bboxLayer.addLayer(circleLayer);
            bboxLayer.wkt = wkt.write();
        };

        /**
         * Removes any previously drawn layer from the bounding box layer and draws a rectangle according to the bounds
         * @param bounds    Lat/Long bounds in the format of L.latLng or [[south, west],[north,east]]
         */
        var redrawRect = function (bounds) {
            if (bounds) {

                var rect = new L.rectangle(bounds, {color: '#ffd800', weight: 2, opacity: 1, fill: false});
                var wkt = new Wkt.Wkt(); // jshint ignore:line
                wkt.fromObject(rect);
                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);
                bboxLayer.wkt = wkt.write();

                // tell results window that the bounding region has changed
                opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };

        /**
         * Creates the layer for Leaflet and the WKT for OGC services queries for a set of geoJSON coordinates
         * @param bounds    geoJSON formatted coordinates
         */
        var drawFileBounds = function (bounds) {
            var fileBounds = new L.geoJson(bounds, {
                    color: '#ffd800', weight: 2, opacity: 1, fill: false
                }
            );

            //create one large WKT from all the countries we have active
            var wktTotal = new Wkt.Wkt(); // jshint ignore:line
            wktTotal.read('MULTIPOLYGON(())');

            var wktObject = new Wkt.Wkt(); // jshint ignore:line
            for (var i = 0; i < bounds.features.length; i++) {
                var object = bounds.features[i].geometry;
                wktObject.read(JSON.stringify(object));
                wktTotal.merge(wktObject);
            }
            wktTotal.components.splice(0, 1);
            bboxLayer.wkt = wktTotal.write();

            // var wktBounds = new Wkt.Wkt();
            // wktBounds.read(JSON.stringify(bounds.geometry));
            bboxLayer.clearLayers();
            bboxLayer.addLayer(fileBounds);
            bboxLayer.wkt = wktTotal.write();

            map.fitBounds(fileBounds);
            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
            $rootScope.$broadcast('mapBoundsChanged');
        };

        /**
         * Creates a country for leaflet, adds it to the bounding region layers, keeps track of drawn countries, and
         * creates WKT for OGC services queries from supplied geoJSON
         * @param geoJsonCountry    geoJSON formatted country bounds
         */
        var drawCountry = function (geoJsonCountry) {
            var country = new L.geoJson(geoJsonCountry, {
                    color: '#ffd800', weight: 2, opacity: 1, fill: false
                }
            );

            // remove other bbox layers if we're adding our first country
            if (drawnCountries.length === 0 && bboxLayer.getLayers().length > 0) {
                bboxLayer.clearLayers();
            }

            var wktCountry = new Wkt.Wkt(); // jshint ignore:line
            wktCountry.read(JSON.stringify(geoJsonCountry.geometry));
            var countryData = {
                id: geoJsonCountry.id,
                leafletId: country._leaflet_id, // jshint ignore:line
                wkt: wktCountry.write()
            };

            if (drawnCountries.indexOf(countryData) === -1) {
                drawnCountries.push(countryData);
            }

            // create one large WKT from all the countries we have active
            var wktTotal = new Wkt.Wkt(); // jshint ignore:line

            // add a blank multipology component because wicket requires
            // merge to have the same type of components (or merge a polygon
            // into a MULTIPOLYGON)
            wktTotal.read('MULTIPOLYGON(())');
            for (var i = 0; i < drawnCountries.length; i++) {
                var countryWkt = new Wkt.Wkt(drawnCountries[i].wkt); // jshint ignore:line
                wktTotal.merge(countryWkt);
            }
            // remove the first blank component we created
            wktTotal.components.splice(0, 1);

            // bboxLayer.clearLayers(); // TODO put this back in
            bboxLayer.addLayer(country);
            bboxLayer.wkt = wktTotal.write();

            //map.fitBounds(country);
            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
            $rootScope.$broadcast('mapBoundsChanged');
        };

        /**
         * Removes a specific country by passing in that country's geoJSON bounds and removes the leaflet drawing
         * @param bounds    geoJSON bounds of a country
         */
        var removeCountryDraw = function (bounds) {
            var countryId = bounds.id;
            for (var i = 0; i < drawnCountries.length; i++) {
                if (drawnCountries[i].id === countryId) {
                    // country found, can delete
                    var layerId = drawnCountries[i].leafletId;
                    bboxLayer.removeLayer(layerId);
                    drawnCountries.splice(i, 1);
                    break;
                }
            }
        };

        /**
         * Draws a bounding region of the current viewable (in browser/leaflet) map area
         */
        var drawCurrentBounds = function () {
            var bounds = map.getBounds();
            if (bounds) {
                var rect = new L.rectangle(bounds, {color: '#ffd800', weight: 4, opacity: 1, fill: false});

                var wkt = new Wkt.Wkt(); // jshint ignore:line
                wkt.fromObject(rect);

                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);
                bboxLayer.wkt = wkt.write();

                // update the results window that the bounding region has changed
                opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };

        /**
         * Initial function call -- set up all of mapping variables, define the basemaps from config, and check the
         * URL for any map view  or bounding region we need to set up
         */
        var initializeMap = function () {
            $log.log('Starting up opMapController...');

            var baseLayers = {};

            var initialBaseLayer;

            for (var i = 0; i < opConfig.leafletLayers.length; i++) {

                var layer = opConfig.leafletLayers[i];
                // We have to manually set zIndex as the layer control screws up basemaps with
                // overlays when switching between them
                layer.params['zIndex'] = i;

                if (layer.params['type'] && layer.params['type'].toLowerCase() === 'wmts') {
                    baseLayers[layer.prettyName] = L.tileLayer(layer.url, {z: '0'});
                }
                else {
                    baseLayers[layer.prettyName] = L.tileLayer.wms(layer.url,
                        opWebMapService.getLeafletWmsBasemapParams(layer.name, layer.params));
                }
                if (!initialBaseLayer) {
                    initialBaseLayer = baseLayers[layer.prettyName];
                }
            }

            map = L.map('map', opConfig.leafletOptions);

            initialBaseLayer.addTo(map);
            layerControl = L.control.layers(baseLayers).addTo(map);

            opStateService.setLeafletMapCRS(opConfig.leafletOptions.crs.code);
            opStateService.setLeafletMap(map);
            opStateService.setLayerControl(layerControl);


            // create the bounding box
            bboxLayer = L.featureGroup().addTo(map);

            map.getFilterBounds = function () {
                //just a little hacky, but not too much.
                // blame david if this breaks.
                //return bboxLayer.getBounds();
                return bboxLayer.wkt;
            };
            bboxLayer.getBounds().isValid();

            checkForMapBoundsState();

            checkForBBoxBoundsState();

            L.control.mousePosition({
                position: 'bottomright',
                emptyString: '&nbsp;',
                valFormatter: function (pos) {
                    var ns = pos.lat > 0 ? ' N' : ' S';
                    var ew = pos.lng > 0 ? ' E' : ' W';
                    return (('    ' + pos.lat.toFixed(3)).slice(-7) + ns + ', ' + ('    ' + pos.lng.toFixed(3)).slice(-8) + ew).replace(/ /g, '&nbsp;');
                }

            }).addTo(map);

            legendControl = L.control.layerLegend();
            legendControl.addTo(map);
            legendControl.updateLegend();

            var drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: bboxLayer,
                    edit: false
                },
                draw: {
                    polyline: false,
                    marker: false,
                    polygon: {
                        shapeOptions: {color: '#ffd800', weight: 2}
                    },
                    rectangle: {
                        shapeOptions: {color: '#ffd800', weight: 2}
                    },
                    circle: {
                        shapeOptions: {color: '#ffd800', weight: 2}
                    }
                }
            });
            map.addControl(drawControl);

            map.on('draw:created', function () {
                $rootScope.$broadcast('manual-draw-started');
            });

            map.on('moveend', setBounds);

            var clearDrawings = function () {
                bboxLayer.clearLayers();
                bboxLayer.wkt = '';
                opPopupWindow.broadcast(opStateService.getResultsWindow(), 'mapBoundsChanged');
                opStateService.setAttributeBBox();
                $rootScope.$broadcast('mapBoundsChanged');
            };

            $scope.$on('drawClear', function () {
                clearDrawings();
            });

            map.on('draw:deleted', function () {
                clearDrawings();
            });

            map.on('draw:drawstart', function () {
                bboxLayer.clearLayers();
            });

            map.on('draw:created', function (e) {
                var layer = e.layer;
                var wkt = new Wkt.Wkt(); // jshint ignore:line
                // check if we're drawing a polygon or circle
                // if circle, we need to do a bunch of math to make it a polygon
                if (layer._mRadius) {
                    // layer is a circle drawing
                    var origin = layer.getLatLng();
                    var radius = layer.getRadius();
                    var polyCircle = createCirclePoly(origin.lat, origin.lng, radius);
                    wkt.fromObject(polyCircle);
                    var circleString = 'circle:' + origin.lat + ',' + origin.lng + ',' + radius;
                    opStateService.setAttributeBboxPolyCircle(circleString);
                } else {
                    // layer is a polygon
                    wkt.read(JSON.stringify(layer.toGeoJSON()));
                    opStateService.setAttributeBBox(layer.getBounds());
                }
                bboxLayer.addLayer(layer);
                bboxLayer.wkt = wkt.write();

                // opStateService.setAttributeBBox(layer.getBounds());
                var results = opStateService.getResultsWindow();
                // Handle the case when result window is opened and then closed
                // causing draw complete operation to fail making it impossible to
                // break out of the draw step
                if (results && !results.closed) {
                    opPopupWindow.broadcast(results, 'mapBoundsChanged');
                }
                $rootScope.$broadcast('mapBoundsChanged');
            });

            map.on('move', function () {
                $rootScope.$broadcast('map-changed');
            });
        };

        /**
         * Creates a polygon coordinates for a circle based on latitude, long, and radius
         * @param lat       latitude in degrees
         * @param long      longitude in degrees
         * @param radius    radius in meters
         * @returns Leaflet L.polygon representation of the circle
         */
        var createCirclePoly = function (lat, long, radius) {
            var vertices = 120;
            var origin = L.latLng(lat, long);
            var polys = createGeodesicPolygon(origin, radius, vertices);
            var polygon = [];

            for (var i = 0; i < polys.length; i++) {
                var geometry = [polys[i].lat, polys[i].lng];
                polygon.push(geometry);
            }
            return L.polygon(polygon);
        };

        /**
         * Event handler for map moveend.  Send bounds change to the State Service for query string persistence.
         *
         * @param e
         */
        var setBounds = function (e) {
            opStateService.setBounds(e.target.getBounds());
        };

        /**
         * Broadcast receiver -- when map state is updated, updates map view and bounding region
         */
        $rootScope.$on('map-state-updated', function () {
            checkForMapBoundsState();
            checkForBBoxBoundsState();
        });

        /**
         * Broadcast receiver for when layers and toggled on and off to display the corresponding legend on the map
         */
        $rootScope.$on('layer-selection-changed', function (event, layers) {
            var legends = [];
            angular.forEach(layers, function (layer) {
                // layer is e.g. : dev:osg:archsites
                //                 server:workspace:layername
                var splitLayer = layer.split(':');
                var serverName = splitLayer[0];
                var layerName = splitLayer[1] + ':' + splitLayer[2];
                var legendGraphicUrl = opWebMapService.getLegendGraphicUrl(serverName, layerName);
                $log.log('identified legend url: ' + legendGraphicUrl);
                legends.push(legendGraphicUrl);
            });

            legendControl.updateLegend(legends);
        });

        /**
         * Broadcast receiver for when the bounds for a bounding box is updated, redraw that layer and box
         */
        $rootScope.$on('bounds-text-updated', function (event, boundsString) {
            var bounds = boundsString.split(',');
            var leafletBounds = [[bounds[1], bounds[0]], [bounds[3], bounds[2]]];
            redrawRect(leafletBounds);
        });

        /**
         * Broadcast receiver for when to set the current map view as the bounding region
         */
        $rootScope.$on('bounds-current-bounds', function () {
            opStateService.setAttributeBBox(map.getBounds());
            drawCurrentBounds();
        });

        /**
         * Broadcast receiver for when to set a country as the bounding region
         */
        $rootScope.$on('bounds-country-bounds', function (event, geoJsonCountry) {
            drawCountry(geoJsonCountry);
        });

        /**
         * Broadcast receiver for when to set the geoJSON bounds from a shapefile as the bounding region
         */
        $rootScope.$on('bounds-file-bounds', function (event, bounds) {
            drawFileBounds(bounds);
        });

        /**
         * Broadcast receiver for when to remove a country from the bounding region
         */
        $rootScope.$on('remove-country-bounds', function (event, bounds) {
            removeCountryDraw(bounds);
        });

        /**
         * Broadcast receiver for when to remove all countries from the bounding region
         */
        $rootScope.$on('remove-country-selections', function () {
            bboxLayer.clearLayers();
            drawnCountries = [];
        });

        /**
         * Broadcast receiver to zoom the map to the requested layer so it fits the whole screen (best view)
         */
        $rootScope.$on('latest-data-button-zoom', function (event, layer) {
            var southWest = L.latLng(layer.southBbox, layer.westBbox);
            var northEast = L.latLng(layer.northBbox, layer.eastBbox);
            var bounds = L.latLngBounds(southWest, northEast);
            // max zoom is arbitrary, I didn't want it zooming in all the way and losing context
            map.fitBounds(bounds, {maxZoom: 5});
        });

        /*
         Convert a mid point and radius (circle) to a polygon of x sides
         @param  origin  Leaflet lat/long object
         @param  radius  radius from leaflet layer
         @param  sides   number of sides of generated polygon (higher is more precise, but slower)

         mostly from:
         http://stackoverflow.com/questions/24145205/writing-a-function-to-convert-a-circle-to-a-polygon-using-leaflet-js
         referencing:
         http://trac.osgeo.org/openlayers/browser/trunk/openlayers/lib/OpenLayers/Util.js
         @returns    array of points
         */
        var createGeodesicPolygon = function (origin, radius, sides) {

            var latLon = origin;
            var angle;
            var newLonLat;
            var geomPoint;
            var points = [];

            for (var i = 0; i < sides; i++) {
                angle = (i * 360 / sides);
                newLonLat = destinationVincenty(latLon, angle, radius);
                geomPoint = L.latLng(newLonLat.lng, newLonLat.lat);

                points.push(geomPoint);
            }

            return points;
        };

        // Extend Leaflet Utils to contain some constants for converting a circle
        // mostly from:
        // http://stackoverflow.com/questions/24145205/writing-a-function-to-convert-a-circle-to-a-polygon-using-leaflet-js
        // referencing:
        // http://trac.osgeo.org/openlayers/browser/trunk/openlayers/lib/OpenLayers/Util.js
        L.Util.VincentyConstants = {
            a: 6378137,
            b: 6356752.3142,
            f: 1 / 298.257223563
        };

        // do a lot of math that I don't want to confirm
        // mostly from:
        // http://stackoverflow.com/questions/24145205/writing-a-function-to-convert-a-circle-to-a-polygon-using-leaflet-js
        // referencing:
        // http://trac.osgeo.org/openlayers/browser/trunk/openlayers/lib/OpenLayers/Util.js
        /**
         *
         * @param lonlat Long/Lat as a L.latLng object in degrees
         * @param brng  bearing angle in degrees
         * @param dist  ground distance in meters
         * @returns returns destination point
         */
        var destinationVincenty = function (lonlat, brng, dist) {

            var u = L.Util;
            var ct = u.VincentyConstants;
            var a = ct.a, b = ct.b, f = ct.f;
            var lon1 = lonlat.lng;
            var lat1 = lonlat.lat;
            var s = dist;
            var pi = Math.PI;
            var alpha1 = brng * pi / 180; //converts brng degrees to radius
            var sinAlpha1 = Math.sin(alpha1);
            var cosAlpha1 = Math.cos(alpha1);
            var tanU1 = (1 - f) * Math.tan(lat1 * pi / 180 /* converts lat1 degrees to radius */);
            var cosU1 = 1 / Math.sqrt((1 + tanU1 * tanU1)), sinU1 = tanU1 * cosU1;
            var sigma1 = Math.atan2(tanU1, cosAlpha1);
            var sinAlpha = cosU1 * sinAlpha1;
            var cosSqAlpha = 1 - sinAlpha * sinAlpha;
            var uSq = cosSqAlpha * (a * a - b * b) / (b * b);
            var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
            var B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
            var sigma = s / (b * A), sigmaP = 2 * Math.PI;
            var cos2SigmaM;
            var sinSigma;
            var cosSigma;
            while (Math.abs(sigma - sigmaP) > 1e-12) {
                cos2SigmaM = Math.cos(2 * sigma1 + sigma);
                sinSigma = Math.sin(sigma);
                cosSigma = Math.cos(sigma);
                var deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
                    B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
                sigmaP = sigma;
                sigma = s / (b * A) + deltaSigma;
            }
            var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
            var lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
                (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
            var lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
            var C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
            var lam = lambda - (1 - C) * f * sinAlpha *
                (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
            // var revAz = Math.atan2(sinAlpha, -tmp);  // final bearing
            var lamFunc = lon1 + (lam * 180 / pi); //converts lam radius to degrees
            var lat2a = lat2 * 180 / pi; //converts lat2a radius to degrees

            return L.latLng(lamFunc, lat2a);
        };

        // load this controller!
        initializeMap();
    });
