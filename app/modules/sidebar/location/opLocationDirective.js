angular.module('opApp')
    .directive('opLocation', function ($q, $http, $filter, $log, opCoordinateConversionService, opStateService, opConfig) {
        'use strict';
        return {
            templateUrl: 'modules/sidebar/location/opLocation.html',
            restrict: 'EA',
            scope: {
                locationSelect: '=',
                country: '='
            },
            link: function postLink(scope, element) {
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
                    countriesJson: ''
                };

                /*
                Retrieves a GeoJSON file containing country names and geo boundary data
                 */
                var getCountries = function() {
                    var deferred = $q.defer();
                    var url = opConfig.countryDataUrl;

                    $http.get(url).then(
                        function (result) {
                            $log.log('Successfully retrieved list of countries.');
                            deferred.resolve(result);
                        },
                        function (reason) {
                            $log.log('Error retrieving  list of countries.');
                            deferred.reject(reason);
                        });

                    return deferred.promise;
                };

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
                            sw = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsSW);
                            ne = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsNE);
                            coords = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrs);
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

                scope.setLocationWorld = function () {
                    console.log('Location: World');
                    scope.locationSelect = [
                        ['-90', '-180'],
                        ['90', '180']
                    ];
                    scope.model.locationKey = 'world';
                    scope.country = '';
                    opStateService.setAttributeBBoxText(scope.locationSelect);
                };

                scope.setLocationMap = function () {
                    console.log('Location: Map');
                    scope.model.locationKey = 'map';
                    scope.country = '';
                    scope.model.mapChanged = false;
                    opStateService.setAttributeBBoxCurrentBounds();
                };
                scope.setLocationCountry = function () {
                    console.log('Location: Country');
                    if (scope.country) {
                        scope.locationSelect = null;
                        scope.model.locationKey = 'country';
                        opStateService.setAttributeBBoxCountry(scope.country);
                    }
                };

                scope.setLocationBounds = function () {
                    console.log('Location: Bounds');
                    if (scope.model.locationKey === 'center'){
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
                        scope.model.lat  = '';
                        scope.model.lon  = '';
                        scope.model.mgrs = '';
                        scope.country    = '';
                        switch (scope.model.format) {
                            case 'dd':

                                if (scope.model.latSValid && scope.model.lonWValid && scope.model.latNValid && scope.model.lonEValid) {
                                    scope.locationSelect = [
                                        [scope.model.latS, scope.model.lonW],
                                        [scope.model.latN, scope.model.lonE]
                                    ];
                                }
                                break;
                            case 'dms':

                                sw = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latS, scope.model.lonW);
                                ne = opCoordinateConversionService.prepForDMSBroadcast(scope.model.latN, scope.model.lonE);

                                if (sw && ne) {
                                    scope.locationSelect = [sw.dd, ne.dd];
                                }
                                break;
                            case 'mgrs':
                                sw = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsSW);
                                ne = opCoordinateConversionService.prepForMGRSBroadcast(scope.model.mgrsNE);

                                if (sw && ne) {
                                    scope.locationSelect = [sw.dd, ne.dd];
                                }
                                break;
                        }

                        if (scope.model.locationKey !== 'map') {
                            scope.model.locationKey = 'bounds';
                        }
                        opStateService.setAttributeBBoxText(scope.locationSelect);
                    }
                };

                scope.setLocationCenter = function () {
                    console.log('Location: Center Point');
                    if (scope.model.locationKey === 'bounds'){
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

                        scope.locationSelect = [
                            [String(finalLat2), String(finalLon1)],
                            [String(finalLat1), String(finalLon2)]
                        ];

                        scope.locationKey = 'center';
                        opStateService.setAttributeBBoxText(scope.locationSelect);
                    }
                };

                element.find('.shape-upload-file').on('change', function () {
                    element.find('.shape-upload').submit();
                });
                scope.uploadComplete = function (file) {
                    console.log(file);
                    scope.country = '';
                    scope.model.latN = '';
                    scope.model.latS = '';
                    scope.model.lonE = '';
                    scope.model.lonW = '';
                    scope.model.mgrsSW = '';
                    scope.model.mgrsNE = '';
                    scope.model.lat = '';
                    scope.model.lat = '';
                    scope.model.mgrs = '';

                    scope.locationSelect = file.geom;
                    scope.locationKey = 'shape';
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

                scope.$on('mapMoved', function () {
                    scope.model.mapChanged = true;
                });

                scope.$on('setBounds', function (e, data) {
                    if (data.top >= 90 && data.bottom <= -90 && data.left <= -180 && data.right >= 180) {
                        scope.setLocationWorld();
                    } else {
                        scope.model.latN = data.top;
                        scope.model.latS = data.bottom;
                        scope.model.lonE = data.right;
                        scope.model.lonW = data.left;
                        scope.locationSelect = [
                            [data.bottom, data.left],
                            [data.top, data.right]
                        ];
                    }
                });
                parseLocation(scope.locationSelect);
                getCountries().then(
                    function (result) {
                        scope.countriesJson = result.data.features;
                    });
            }
        };
    });