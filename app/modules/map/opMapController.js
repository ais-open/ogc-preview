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
        L.drawLocal.edit.toolbar.buttons.edit =  'Edit filter shapes.';
        L.drawLocal.edit.toolbar.buttons.editDisabled = 'No filters to edit.';
        L.drawLocal.edit.toolbar.buttons.remove = 'Delete filter shapes.';
        L.drawLocal.edit.toolbar.buttons.removeDisabled = 'No filters to delete.';

        var map;
        var bboxLayer;
        var layerControl;
        var legendControl;

        var checkForMapBoundsState  = function() {
            var bounds = opStateService.getBounds();
            if (bounds) {
                map.fitBounds(bounds);
            }
        };

        var checkForBBoxBoundsState  = function() {
            var bboxBounds = opStateService.getAttributeBounds();
            if (bboxBounds) {
                var rect = new L.rectangle(bboxBounds, { color: '#ffd800', weight: 2, opacity: 1, fill: false });
                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);

                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };

        var redrawRect = function(bounds) {
            if (bounds) {

                var rect = new L.rectangle(bounds, { color: '#ffd800', weight: 2, opacity: 1, fill: false });
                var wkt = new Wkt.Wkt();
                wkt.fromObject(rect);
                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);
                bboxLayer.wkt = wkt.write();

                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };

        var drawCountry = function(geoJsonCountry) {
            var country = new L.geoJson(geoJsonCountry, {
                    color: '#ffd800', weight: 2, opacity: 1, fill: false
                }
            );
            var wkt = new Wkt.Wkt();
            wkt.read(JSON.stringify(geoJsonCountry.geometry));
            bboxLayer.clearLayers();
            bboxLayer.addLayer(country);
            bboxLayer.wkt = wkt.write();

            //map.fitBounds(country);
            opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
            $rootScope.$broadcast('mapBoundsChanged');
        };

        var drawCurrentBounds = function() {
            var bounds = map.getBounds();
            if(bounds) {
                var rect = new L.rectangle(bounds, { color: '#ffd800', weight: 4, opacity: 1, fill: false });

                var wkt = new Wkt.Wkt();
                wkt.fromObject(rect);

                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);
                bboxLayer.wkt = wkt.write();

                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };


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
                    baseLayers[layer.prettyName] = L.tileLayer(layer.url, {z:'0'});
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

            map.getFilterBounds = function(){
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
                valFormatter: function (pos){
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
                        shapeOptions: { color: '#ffd800', weight: 2 }
                    },
                    rectangle: {
                        shapeOptions: { color: '#ffd800', weight: 2 }
                    },
                    circle: {
                        shapeOptions: { color: '#ffd800', weight: 2 }
                    }
                }
            });
            map.addControl(drawControl);

            map.on('draw:created', function() {
                $rootScope.$broadcast('manual-draw-started');
            });

            map.on('moveend', setBounds);

            var clearDrawings = function () {
                bboxLayer.clearLayers();
                bboxLayer.wkt = '';
                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                opStateService.setAttributeBBox();
                $rootScope.$broadcast('mapBoundsChanged');
            };

            $scope.$on('drawClear', function (){
                clearDrawings();
            });

            map.on('draw:deleted', function() {
                clearDrawings();
            });

            map.on('draw:drawstart', function () {
                bboxLayer.clearLayers();
            });

            map.on('draw:created', function (e) {
                var layer = e.layer;
                var wkt = new Wkt.Wkt();
                // check if we're drawing a polygon or circle
                // if circle, we need to do a bunch of math to make it a polygon
                if(layer._mRadius) {
                    // layer is a circle drawing
                    var origin = layer.getLatLng();
                    var radius = layer.getRadius();
                    // configurable
                    var vertices = 60;

                    var polys = createGeodesicPolygon(origin, radius, vertices, 0);
                    var polygon = [];

                    for(var i = 0; i < polys.length; i++) {
                        var geometry = [polys[i].lat, polys[i].lng];
                        polygon.push(geometry);
                    }
                    var polyCircle = L.polygon(polygon);
                    wkt.fromObject(polyCircle);
                } else {
                    // layer is a polygon
                    wkt.read(JSON.stringify(layer.toGeoJSON()));
                }
                bboxLayer.addLayer(layer);
                bboxLayer.wkt = wkt.write();

                opStateService.setAttributeBBox(layer.getBounds());
                var results = opStateService.getResultsWindow();
                // Handle the case when result window is opened and then closed
                // causing draw complete operation to fail making it impossible to
                // break out of the draw step
                if (results && !results.closed) {
                    opPopupWindow.broadcast(results, 'mapBoundsChanged');
                }
                $rootScope.$broadcast('mapBoundsChanged');
            });

            map.on('move', function() {
                $rootScope.$broadcast('map-changed');
            });
        };

        /**
         * Event handler for map moveend.  Send bounds change to the State Service for query string persistence.
         *
         * @param e
         */
        var setBounds = function (e) {
            opStateService.setBounds(e.target.getBounds());
        };

        $rootScope.$on('map-state-updated', function() {
            checkForMapBoundsState();
            checkForBBoxBoundsState();
        });

        $rootScope.$on('layer-selection-changed', function(event, layers) {
            var legends = [];
            angular.forEach(layers, function(layer) {
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

        $rootScope.$on('bounds-text-updated', function(event, bounds) {
            redrawRect(bounds);
        });

        $rootScope.$on('bounds-current-bounds', function() {
            drawCurrentBounds();
        });

        $rootScope.$on('bounds-country-bounds', function(event,  geoJsonCountry) {
            drawCountry(geoJsonCountry);
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
         */
        var createGeodesicPolygon = function (origin, radius, sides) {

            var latlon = origin;
            var angle;
            var new_lonlat;
            var geom_point;
            var points = [];

            for (var i = 0; i < sides; i++) {
                angle = (i * 360 / sides);
                new_lonlat = destinationVincenty(latlon, angle, radius);
                geom_point = L.latLng(new_lonlat.lng, new_lonlat.lat);

                points.push(geom_point);
            }

            return points;
        };

        // add some magical math constants
        // mostly from:
        // http://stackoverflow.com/questions/24145205/writing-a-function-to-convert-a-circle-to-a-polygon-using-leaflet-js
        // referencing:
        // http://trac.osgeo.org/openlayers/browser/trunk/openlayers/lib/OpenLayers/Util.js
        L.Util.VincentyConstants = {
            a: 6378137,
            b: 6356752.3142,
            f: 1/298.257223563
        };

        // do a lot of math that I don't want to confirm
        // mostly from:
        // http://stackoverflow.com/questions/24145205/writing-a-function-to-convert-a-circle-to-a-polygon-using-leaflet-js
        // referencing:
        // http://trac.osgeo.org/openlayers/browser/trunk/openlayers/lib/OpenLayers/Util.js
        var destinationVincenty = function(lonlat, brng, dist) {

            var u = L.Util;
            var ct = u.VincentyConstants;
            var a = ct.a, b = ct.b, f = ct.f;
            var lon1 = lonlat.lng;
            var lat1 = lonlat.lat;
            var s = dist;
            var pi = Math.PI;
            var alpha1 = brng * pi/180 ; //converts brng degrees to radius
            var sinAlpha1 = Math.sin(alpha1);
            var cosAlpha1 = Math.cos(alpha1);
            var tanU1 = (1-f) * Math.tan( lat1 * pi/180 /* converts lat1 degrees to radius */ );
            var cosU1 = 1 / Math.sqrt((1 + tanU1*tanU1)), sinU1 = tanU1*cosU1;
            var sigma1 = Math.atan2(tanU1, cosAlpha1);
            var sinAlpha = cosU1 * sinAlpha1;
            var cosSqAlpha = 1 - sinAlpha*sinAlpha;
            var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
            var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
            var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
            var sigma = s / (b*A), sigmaP = 2*Math.PI;
            while (Math.abs(sigma-sigmaP) > 1e-12) {
                var cos2SigmaM = Math.cos(2*sigma1 + sigma);
                var sinSigma = Math.sin(sigma);
                var cosSigma = Math.cos(sigma);
                var deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-
                    B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
                sigmaP = sigma;
                sigma = s / (b*A) + deltaSigma;
            }
            var tmp = sinU1*sinSigma - cosU1*cosSigma*cosAlpha1;
            var lat2 = Math.atan2(sinU1*cosSigma + cosU1*sinSigma*cosAlpha1,
                (1-f)*Math.sqrt(sinAlpha*sinAlpha + tmp*tmp));
            var lambda = Math.atan2(sinSigma*sinAlpha1, cosU1*cosSigma - sinU1*sinSigma*cosAlpha1);
            var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
            var lam = lambda - (1-C) * f * sinAlpha *
                (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
            var revAz = Math.atan2(sinAlpha, -tmp);  // final bearing
            var lamFunc = lon1 + (lam * 180/pi); //converts lam radius to degrees
            var lat2a = lat2 * 180/pi; //converts lat2a radius to degrees

            return L.latLng(lamFunc, lat2a);
        };

        initializeMap();
    });
