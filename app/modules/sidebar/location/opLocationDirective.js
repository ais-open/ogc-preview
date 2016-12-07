angular.module('opApp').directive('opLocation', ['$q', '$http', '$filter', '$log', '$rootScope', '$timeout',
    'opCoordinateConversionService', 'opStateService', 'opConfig', 'Upload',
    function ($q, $http, $filter, $log, $rootScope, $timeout, opCoordinateConversionService, opStateService, opConfig, Upload) {
        'use strict';
        return {
            templateUrl: 'modules/sidebar/location/opLocation.html',
            restrict: 'EA',
            scope: {
                locationSelect: '=',
                country: '=',
            },

            link: function postLink(scope) {
                scope.expanded = false;
                scope.model = {
                    mapChanged: false,
                    locationKey: 'world',
                    format: 'dd',
                    latN: '',
                    latS: '',
                    lonE: '',
                    lonW: '',
                    lat: '',
                    lon: '',
                    dist: 100,
                    latNValid: true,
                    latSValid: true,
                    lonEValid: true,
                    lonWValid: true,
                    latValid: true,
                    lonValid: true,
                    distValid: true,
                    countries: '',
                    selectedCountries: {},
                    shapeLoading: false,
                    shapeGeoJson: '',
                    shapeToGeoUrl: opConfig.shapeToGeoUrl
                };

                /**
                 * Retrieves a GeoJSON file containing country names and geo boundary data
                 * @returns {*}
                 */
                var getCountries = function () {
                    var deferred = $q.defer();
                    var url = opConfig.countryDataUrl;

                    $http.get(url).then(
                        function (result) {
                            $log.log('Successfully retrieved list of countries.');
                            deferred.resolve(result);
                        },
                        function (reason) {
                            $log.log('Error retrieving  list of countries.  Check countryDataUrl ?');
                            deferred.reject(reason);
                        });

                    return deferred.promise;
                };

                /**
                 * Parse out the current location coordinates into a known location type
                 * @param location      coordinates
                 */
                var parseLocation = function (location) {
                    if (_.isArray(location)) {
                        if (location.length === 3) {
                            scope.model.lat = location[0];
                            scope.model.lon = location[1];
                            scope.model.dist = location[2];
                            scope.model.locationKey = 'center';
                        } else if (location.join(',') === '-90,-180,90,180' && !scope.country) {
                            scope.model.locationKey = 'world';
                        } else if (scope.country) {
                            scope.model.locationKey = 'country';
                        } else if (location.length === 2) {
                            scope.model.latS = location[0][0];
                            scope.model.lonW = location[0][1];
                            scope.model.latN = location[1][0];
                            scope.model.lonE = location[1][1];
                            scope.model.locationKey = 'bounds';
                        } else {
                            scope.locationKey = 'shape';
                        }
                    } else {
                        scope.model.locationKey = 'world';
                    }
                };

                /**
                 * Set the location format for switching between degrees (decimal), degrees (degree,minute,sec), and
                 * MGRS formats.
                 * @param newFormat     new location format string
                 */
                scope.setFormat = function (newFormat) {
                    var ne, sw, coords;
                    switch (scope.model.format) {
                        case 'dd':
                            sw = opCoordinateConversionService.prepForDDBroadcast(scope.model.latS, scope.model.lonW);
                            ne = opCoordinateConversionService.prepForDDBroadcast(scope.model.latN, scope.model.lonE);
                            coords = opCoordinateConversionService.prepForDDBroadcast(scope.model.lat, scope.model.lon);
                            break;
                        case 'dms':
                            sw = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latS, scope.model.lonW);
                            ne = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latN, scope.model.lonE);
                            coords = opCoordinateConversionService.prepForDMSBroadcast(scope.model.lat, scope.model.lon);
                            break;
                        case 'mgrs':
                            if (scope.model.mgrsSW) {
                                sw = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsSW);
                            }
                            if (scope.model.mgrsNE) {
                                ne = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsNE);
                            }
                            if (scope.model.mgrs) {
                                coords = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrs);
                            }
                            break;
                    }
                    scope.model.latS = '';
                    scope.model.lonW = '';
                    scope.model.latN = '';
                    scope.model.lonE = '';
                    scope.model.lat = '';
                    scope.model.lon = '';

                    switch (newFormat) {
                        case 'dd':
                            if (sw && ne) {
                                scope.model.latS = sw.dd[0];
                                scope.model.lonW = sw.dd[1];
                                scope.model.latN = ne.dd[0];
                                scope.model.lonE = ne.dd[1];
                            }
                            if (coords) {
                                scope.model.lat = coords.dd[0];
                                scope.model.lon = coords.dd[1];
                            }
                            break;
                        case 'dms':
                            if (sw && ne) {
                                scope.model.latS = sw.dms[0];
                                scope.model.lonW = sw.dms[1];
                                scope.model.latN = ne.dms[0];
                                scope.model.lonE = ne.dms[1];
                            }
                            if (coords) {
                                scope.model.lat = coords.dms[0];
                                scope.model.lon = coords.dms[1];
                            }
                            break;
                        case 'mgrs':
                            if (sw && ne) {
                                scope.model.mgrsSW = sw.mgrs || '';
                                scope.model.mgrsNE = ne.mgrs || '';
                            }
                            if (coords) {
                                scope.model.mgrs = coords.mgrs || '';
                            }
                            break;
                    }

                    scope.model.format = newFormat;

                };

                /**
                 * Called to upload a shapefile to the geoJSON format
                 * // TODO we need to test this and edit to use the URL from opConfig
                 * @param file  file passed in from the user (shapefile)
                 */
                scope.uploadFile = function (file) {
                    var upload = Upload.upload({
                        url: opConfig.shapeToGeoUrl + '?view=geojson&maxpoints=75',
                        data: {file: file}
                    });
                    scope.model.shapeLoading = true;

                    upload.then(function(resp){
                        scope.uploadComplete(resp.data);
                    },function(resp) {// jshint ignore:line
                        scope.model.shapeLoading = false;
                        scope.model.shapeGeoJson = 'Error converting shapefile.';
                    });
                };
                
                scope.uploadComplete = function (resp) {
                    if (!scope.model.shapeLoading) { return; }
                    
                    scope.model.shapeLoading = false;
                    if (typeof(resp) === 'string'){
                        scope.model.shapeGeoJson = 'An error occured reading the file.';
                        return;
                    }else if (!resp || resp.length === 0){
                        scope.model.shapeGeoJson = 'There are no shapes in this file.';
                        return;
                    }
                    
                    // reduce the shape to a less complex version if it's too long
                    /*var len = _.reduce(resp.data, function (a, item) {
                        return a + item.points.length;
                    }, 0);
                    _.each(resp.data, function (item) {
                        if (!Configuration.debugShape && (len > 3000 || (scope.msie && len > 1000))) {
                            item.simple = LeafletUtil.simplifyWKT(item.points);
                        } else {
                            item.simple = item.points;
                        }
                    });
                    len = _.reduce(resp.data, function (a, item) {
                        return a + item.simple.length;
                    }, 0);
                    
                    // still too large too - throw an error.
                    if (len > 3000 || (scope.msie && len > 1000)) {
                        $log.error('shape too large');
                        scope.model.shapeGeoJson = 'This shape is too complex.';
                        return;
                    }*/
                    
                    scope.model.shapeGeoJson = JSON.stringify(resp);
                    opStateService.setAttributeBBoxFile(resp);
                };

                /**
                 * Set the format and call follow on functions to set the entire world as the bounding region
                 */
                scope.setLocationWorld = function () {
                    scope.locationSelect = '-180,-90,180,90';
                    scope.model.locationKey = 'world';
                    scope.country = '';
                    $log.log('locationString: ' + scope.locationSelect);
                    scope.resetCountrySelection();
                    opStateService.setAttributeBBoxText(scope.locationSelect);
                };

                /**
                 * Set the format and call follow on functions to set the current map view as the bounding region
                 */
                scope.setLocationMap = function () {
                    scope.model.locationKey = 'map';
                    scope.country = '';
                    scope.model.mapChanged = false;
                    scope.resetCountrySelection();
                    opStateService.setAttributeBBoxCurrentBounds();
                };

                /**
                 * Add a country as part of the bounding region
                 * @param country   country to add
                 */
                scope.addCountrySelection = function (country) {
                    var countryString = $.map(scope.model.selectedCountries.selected,
                        function (selected) {
                            return selected.id;
                        }).join(',');
                    scope.model.locationSelect = 'country:' + countryString;
                    opStateService.setAttributeBBoxCountry(country, scope.model.locationSelect);
                    $log.log('Adding country filter of: ' + country.properties.name);
                };

                /**
                 * Remove all country selections
                 */
                scope.resetCountrySelection = function () {
                    scope.model.selectedCountries = {};
                    $rootScope.$broadcast('remove-country-selections');
                };

                /**
                 * Remove a specific country from the bounding region
                 * @param country   country object to remove
                 */
                scope.removeCountrySelection = function (country) {
                    opStateService.removeAttributeBBoxCountry(country);
                    $log.log('Removing country filter of: ' + country.properties.name);
                };

                /**
                 * Set the format and call follow on functions to set the bounding coordinates as the bounding region
                 */
                scope.setLocationBounds = function () {
                    if (scope.model.locationKey === 'center') {
                        return;
                    }
                    var sw, ne;
                    switch (scope.model.format) {
                        case 'dd':
                            scope.model.latSValid = opCoordinateConversionService.isValidLatDD(scope.model.latS);
                            scope.model.lonWValid = opCoordinateConversionService.isValidLonDD(scope.model.lonW);
                            scope.model.latNValid = opCoordinateConversionService.isValidLatDD(scope.model.latN);
                            scope.model.lonEValid = opCoordinateConversionService.isValidLonDD(scope.model.lonE);
                            break;
                        case 'dms':
                            scope.model.latSValid = opCoordinateConversionService.isValidLatDMS(scope.model.latS);
                            scope.model.lonWValid = opCoordinateConversionService.isValidLonDMS(scope.model.lonW);
                            scope.model.latNValid = opCoordinateConversionService.isValidLatDMS(scope.model.latN);
                            scope.model.lonEValid = opCoordinateConversionService.isValidLonDMS(scope.model.lonE);
                            break;
                        case 'mgrs':
                            scope.model.mgrsSWValid = opCoordinateConversionService.isValidMGRS(scope.model.mgrsSW);
                            scope.model.mgrsNEValid = opCoordinateConversionService.isValidMGRS(scope.model.mgrsNE);
                            break;
                    }

                    if ((scope.model.latN !== '' && scope.model.latS !== '' && scope.model.lonE !== '' && scope.model.lonW !== '') ||
                        (scope.model.mgrsNE && scope.model.mgrsSW && scope.model.format === 'mgrs')) {
                        scope.model.lat = '';
                        scope.model.lon = '';
                        scope.model.mgrs = '';
                        scope.country = '';
                        switch (scope.model.format) {
                            case 'dd':

                                if (scope.model.latSValid && scope.model.lonWValid && scope.model.latNValid && scope.model.lonEValid) {
                                    // scope.locationSelect = [
                                    //   [scope.model.latS, scope.model.lonW],
                                    //   [scope.model.latN, scope.model.lonE]
                                    // ];
                                    scope.locationSelect = String(scope.model.lonW) + ',' + String(scope.model.latN) + ',' + String(scope.model.lonE) + ',' + String(scope.model.latS);
                                }
                                break;
                            case 'dms':

                                sw = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latS, scope.model.lonW);
                                ne = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latN, scope.model.lonE);

                                if (sw && ne) {
                                    // scope.locationSelect = [sw.dd, ne.dd];
                                    scope.locationSelect = String(scope.model.lonW) + ',' + String(scope.model.latN) + ',' + String(scope.model.lonE) + ',' + String(scope.model.latS);
                                }
                                break;
                            case 'mgrs':
                                sw = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsSW);
                                ne = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsNE);


                                if (sw && ne) {
                                    scope.model.latN = ne.dd[0];
                                    scope.model.lonE = ne.dd[1];
                                    scope.model.latS = sw.dd[0];
                                    scope.model.lonW = sw.dd[1];
                                    // scope.locationSelect = [sw.dd, ne.dd];
                                    scope.locationSelect = String(scope.model.lonW) + ',' + String(scope.model.latN) + ',' + String(scope.model.lonE) + ',' + String(scope.model.latS);
                                }
                                break;
                        }

                        if (scope.model.locationKey !== 'map') {
                            scope.model.locationKey = 'bounds';
                        }
                        scope.resetCountrySelection();
                        opStateService.setAttributeBBoxText(scope.locationSelect);
                    }
                };

                /**
                 * Set the format and call follow on functions to set selected centerpoint and corner distance
                 * as the bounding region
                 */
                scope.setLocationCenter = function () {
                    if (scope.model.locationKey === 'bounds') {
                        return;
                    }
                    var lat, lng, coords, dist = scope.model.dist;
                    switch (scope.model.format) {
                        case 'dd':
                            scope.model.latValid = opCoordinateConversionService.isValidLatDD(scope.model.lat);
                            scope.model.lonValid = opCoordinateConversionService.isValidLonDD(scope.model.lon);
                            if (scope.model.latValid && scope.model.lonValid) {
                                lat = scope.model.lat;
                                lng = scope.model.lon;
                            }
                            break;
                        case 'dms':
                            scope.model.latValid = opCoordinateConversionService.isValidLatDMS(scope.model.lat);
                            scope.model.lonValid = opCoordinateConversionService.isValidLonDMS(scope.model.lon);
                            coords = opCoordinateConversionService.prepForDMSBroadcast(scope.model.lat, scope.model.lon);
                            if (coords) {
                                lat = coords.dd[0];
                                lng = coords.dd[1];
                            }
                            break;
                        case 'mgrs':
                            scope.model.mgrsValid = opCoordinateConversionService.isValidMGRS(scope.model.mgrs);
                            coords = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrs);
                            if (coords) {
                                lat = coords.dd[0];
                                lng = coords.dd[1];
                            }
                            break;
                    }
                    if (lat && lng && dist) {
                        scope.country = '';
                        scope.model.latN = '';
                        scope.model.latS = '';
                        scope.model.lonE = '';
                        scope.model.lonW = '';
                        scope.model.mgrsSW = '';
                        scope.model.mgrsNE = '';
                        var nwBearing = 315 / 180 * Math.PI;
                        var seBearing = 135 / 180 * Math.PI;
                        var R = 6371; // km

                        lat = lat / 180 * Math.PI;
                        lng = lng / 180 * Math.PI;

                        var lat1 = Math.asin(Math.sin(lat) * Math.cos(dist / R) +
                            Math.cos(lat) * Math.sin(dist / R) * Math.cos(nwBearing));
                        var lon1 = lng + Math.atan2(Math.sin(nwBearing) * Math.sin(dist / R) * Math.cos(lat),
                                Math.cos(dist / R) - Math.sin(lat) * Math.sin(lat1));
                        var lat2 = Math.asin(Math.sin(lat) * Math.cos(dist / R) +
                            Math.cos(lat) * Math.sin(dist / R) * Math.cos(seBearing));
                        var lon2 = lng + Math.atan2(Math.sin(seBearing) * Math.sin(dist / R) * Math.cos(lat),
                                Math.cos(dist / R) - Math.sin(lat) * Math.sin(lat2));

                        var finalLat1 = lat1 * 180 / Math.PI;
                        var finalLat2 = lat2 * 180 / Math.PI;
                        var finalLon1 = lon1 * 180 / Math.PI;
                        var finalLon2 = lon2 * 180 / Math.PI;

                        // lon1, lat2, lon2, lat2
                        scope.locationSelect = String(finalLon1) + ',' + String(finalLat2) + ',' + String(finalLon2) + ',' + String(finalLat1);

                        scope.locationKey = 'center';
                        scope.resetCountrySelection();
                        opStateService.setAttributeBBoxText(scope.locationSelect);
                    }
                };

                /**
                 * Sets the bounding region up for the leaflet tools to be used to draw polygons
                 */
                scope.setLocationDraw = function () {
                    scope.model.locationKey = 'draw';
                };

                scope.$watch('model.latN', scope.setLocationBounds);
                scope.$watch('model.latS', scope.setLocationBounds);
                scope.$watch('model.lonE', scope.setLocationBounds);
                scope.$watch('model.lonW', scope.setLocationBounds);
                scope.$watch('model.mgrsSW', scope.setLocationBounds);
                scope.$watch('model.mgrsNE', scope.setLocationBounds);
                scope.$watch('model.lonW', scope.setLocationBounds);
                scope.$watch('model.lat', scope.setLocationCenter);
                scope.$watch('model.lon', scope.setLocationCenter);
                scope.$watch('model.mgrs', scope.setLocationCenter);
                scope.$watch('model.dist', scope.setLocationCenter);
                scope.$watch('country', scope.setLocationCountry);

                /**
                 * Broadcast receiver for when a draw event is fired from leaflet, sets the mode to draw
                 */
                scope.$on('manual-draw-started', function () {
                    if (scope.model.locationKey !== 'draw') {
                        scope.expanded = true;
                    }
                    scope.resetCountrySelection();
                    scope.setLocationDraw();
                });

                /**
                 * When the map view is updated, update our model
                 */
                scope.$on('map-changed', function () {
                    scope.model.mapChanged = true;
                });

                /**
                 * Tell leaflet and other listeners that we've removed our drawings
                 */
                scope.clearManualDraw = function () {
                    $rootScope.$broadcast('drawClear');
                };

                /**
                 * Broadcast receiver for handling bounding coordinates from the URL
                 */
                scope.$on('box-bounds-from-route', function (event, coords) {
                    var west = Number(coords[0]);
                    var north = Number(coords[1]);
                    var east = Number(coords[2]);
                    var south = Number(coords[3]);
                    if (north > 90) {
                        north = 90;
                    }
                    if (south < -90) {
                        south = -90;
                    }
                    if (east > 180) {
                        east = 180;
                    }
                    if (west < -180) {
                        west = -180;
                    }
                    scope.model.latN = north;
                    scope.model.latS = south;
                    scope.model.lonW = west;
                    scope.model.lonE = east;
                    scope.setLocationBounds();
                });

                /**
                 * Broadcast receiver for handling bounding country selection from the URL
                 */
                scope.$on('country-bounds-from-route', function (event, countries) {
                    // look up country = id
                    // scope.setLocationCountry();
                    scope.model.locationKey = 'country';
                    scope.model.selectedCountries.selected = [];
                    for (var i = 0; i < countries.length; i++) {
                        for (var j = 0; j < scope.model.countries.length; j++) {
                            if (scope.model.countries[j].id === countries[i]) {
                                scope.model.selectedCountries.selected.push(scope.model.countries[j]);
                                scope.addCountrySelection(scope.model.countries[j]);
                            }
                        }
                    }
                });

                /**
                 * Broadcast receiver for fallback when the URL bounding region is bad or doesn't contain
                 * a bounding area -- we decided to set the whole world as the bounds
                 */
                scope.$on('default-from-route', function () {
                    scope.model.locationKey = 'world';
                    scope.setLocationWorld();
                });

                /**
                 * Helper function to parse our current location filter and create a short string
                 * that is displayed when the location filter selection is rolled up in the sidebar
                 * @returns {string}
                 */
                scope.friendlyLocation = function () {
                    return scope.model.locationKey.charAt(0).toUpperCase() + scope.model.locationKey.slice(1);
                };

                // parse the default location
                parseLocation(scope.locationSelect);

                // get our countries to display in the country location filter
                getCountries().then(
                    function (result) {
                        scope.model.countries = result.data.features;
                        // scope.model.countriesJson = result.data;
                    }
                );
            }
        };
    }]);
