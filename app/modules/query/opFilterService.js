/* --------------------------------
 Developed by
 Jonathan Meyer, David Benson, Michael Bowman, Tony Baron
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opFilterService',
    function (opStateService) {
        'use strict';

        var TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

        /**
         * Create a WMS TIME parameter formatted filter
         * @param startTime start bounding time
         * @param stopTime stop bounding time
         * @returns {string}
         */
        this.createWmsTimeFilter = function (startTime, stopTime) {
            var startString = startTime.format(TIME_FORMAT) + 'Z';
            var stopString = stopTime.format(TIME_FORMAT) + 'Z';

            return startString + '/' + stopString;
        };

        /**
         * Create a CQL formatted temporal filter using start/stop field names and given values
         * @param startField field name to use as start bounds
         * @param stopField field name to use as stop bounds
         * @param startTime start bounding time
         * @param stopTime stop bounding time
         * @returns {*}
         */
        this.createCqlTemporalFilter = function (startField, stopField, startTime, stopTime) {
            var startString = startTime.format(TIME_FORMAT) + 'Z';
            var stopString = stopTime.format(TIME_FORMAT) + 'Z';

            var cqlFilter;
            // Use BETWEEN when start/stop time is the same
            if (startField === stopField) {
                cqlFilter = startField + ' BETWEEN ' + startString + ' AND ' + stopString;
            }
            else {
                cqlFilter = startField + ' >= ' + startString + ' AND ' +
                    stopField + ' <= ' + stopString;
            }

            return cqlFilter;
        };

        /**
         * Create an INTERSECTion query with a passed in WKT value and the geometry of the layer of interest
         * @param geomField name of geometry field in layer
         * @param WKT Well-Known Text of geometry to intersect against layer geometry
         * @returns {*}
         */
        this.createCqlSpatialIntersectsFilter = function (geomField, WKT) {
            var spatialFilter = null;
            if (angular.isDefined(WKT) && WKT !== null) {
                spatialFilter = 'INTERSECTS("' + geomField + '", ' + WKT + ')';
            }

            return spatialFilter;
        };

        this.createCqlSpatialContainsFilter = function(geomField, WKT) {
            var spatialFilter = null;
            if (angular.isDefined(WKT) && WKT !== null) {
                spatialFilter = 'CONTAINS("' + geomField + '", ' + WKT + ')';
            }

            return spatialFilter;
        };

        /**
         * Create a BBOX query filter with a passed in west,south,east,north formatted string
         * @param geomField name of geometry field in layer
         * @param westSouthEastNorthBounds string comma delimited bounds
         * @param crs optional EPSG code to be passed when constructing BBOX query
         * @returns {*}
         */
        this.createCqlSpatialBBoxFilter = function (geomField, westSouthEastNorthBounds, crs) {
            var spatialFilter = null;
            var crsOption = '';
            // If crs is specified, construct the 6th parameter.  This will be done for WFS queries.
            if (crs) {
                crsOption = ', \'' + crs + '\'';
            }
            if (angular.isDefined(westSouthEastNorthBounds) && westSouthEastNorthBounds !== null) {
                spatialFilter = 'BBOX("' + geomField + '",' + westSouthEastNorthBounds + crsOption + ')';
            }

            return spatialFilter;
        };

        /**
         * Create a parameter object that is a pure cql_filter or a combination cql/time filter based on whether the
         * layer is time-enabled or not.
         * @param layer object containing time and geometry field data for creating the filters
         * @param startTime temporal lower bound
         * @param stopTime temporal upper bound
         * @param spatialBounds WKT geometry used to enforce intersection with results
         * @returns {{}}
         */
        this.createWmsFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds) {
            var response = {};
            var cqlFilters = [];

            if (layer.fields.time !== null) {
                if (angular.isDefined(layer.fields.time.wmsTime) && layer.fields.time.wmsTime === true) {
                    response['time'] = this.createWmsTimeFilter(startTime, stopTime);
                }
                else {
                    cqlFilters.push(this.createCqlTemporalFilter(
                        layer.fields.time.start.field,
                        layer.fields.time.stop.field,
                        startTime, stopTime));
                }
            }

            var spatialFilter = null;

            if (layer.fields.geometry !== null) {
                spatialFilter =
                    this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);
            }

            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };

        /**
         * Create a parameter object that is a pure cql_filter or a combination cql/time filter based on whether the
         * layer is time-enabled or not.
         * @param layer object containing time and geometry field data for creating the filters
         * @param startTime temporal lower bound
         * @param stopTime temporal upper bound
         * @param spatialBounds WKT geometry used to enforce intersection with results
         * @returns {{}}
         */
        this.createWmsBboxFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds, crs) {
            var response = {};
            var cqlFilters = [];

            if (layer.fields.time !== null) {
                if (angular.isDefined(layer.fields.time.wmsTime) && layer.fields.time.wmsTime === true) {
                    response['time'] = this.createWmsTimeFilter(startTime, stopTime);
                }
                else {
                    cqlFilters.push(this.createCqlTemporalFilter(
                        layer.fields.time.start.field,
                        layer.fields.time.stop.field,
                        startTime, stopTime));
                }
            }

            var spatialFilter =
                this.createCqlSpatialBBoxFilter(layer.fields.geometry.field, spatialBounds, crs);
                //this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);

            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };

        /**
         * Create a parameter object that is a pure cql_filter or a combination cql/time filter based on whether the
         * layer is time-enabled or not.
         * @param layer object containing time and geometry field data for creating the filters
         * @param startTime temporal lower bound
         * @param stopTime temporal upper bound
         * @param spatialBounds WKT geometry used to enforce intersection with results
         * @returns {{}}
         */
        this.createWmsIntersectsFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds) {
            var response = {};
            var cqlFilters = [];

            if (layer.fields.time !== null) {
                if (angular.isDefined(layer.fields.time.wmsTime) && layer.fields.time.wmsTime === true) {
                    response['time'] = this.createWmsTimeFilter(startTime, stopTime);
                }
                else {
                    cqlFilters.push(this.createCqlTemporalFilter(
                        layer.fields.time.start.field,
                        layer.fields.time.stop.field,
                        startTime, stopTime));
                }
            }

            var spatialFilter =
                this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);

            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };

        /**
         * Create a cql_filter for a layer given, spatial (WKT) and temporal bounds
         * @param layer object with a required fields object
         * @param startTime
         * @param stopTime
         * @param spatialBounds
         * @returns {{cql_filter: string}}
         */
        this.createWfsFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds) {
            var cqlFilters = [];
            var response = {};

            if (layer.fields.time !== null) {
                cqlFilters.push(this.createCqlTemporalFilter(
                    layer.fields.time.start.field, layer.fields.time.stop.field, startTime, stopTime));
            }

            var spatialFilter =
                this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);

            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };

        /**
         * Create a cql_filter for a layer given spatial (lat/lon) and temporal bounds
         * @param layer
         * @param startTime
         * @param stopTime
         * @param spatialBounds in comma delimited west,south,east,north order
         * @param crs EPSG code to be passed when constructing BBOX query
         * @returns {{}}
         */
        this.createWfsBBoxFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds, crs) {
            var cqlFilters = [];
            var response = {};

            if (layer.fields.time !== null) {
                cqlFilters.push(this.createCqlTemporalFilter(
                    layer.fields.time.start.field, layer.fields.time.stop.field, startTime, stopTime));
            }

            var spatialFilter =
                this.createCqlSpatialBBoxFilter(layer.fields.geometry.field, spatialBounds, crs);
                //this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);
            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };

        /**
         * Create a cql_filter for a layer given spatial WKT and temporal bounds
         * @param layer
         * @param startTime
         * @param stopTime
         * @param spatialBounds in WKT format
         * @returns {{}}
         */
        this.createWfsIntersectsFilterRequestForLayer = function (layer, startTime, stopTime, spatialBounds) {
            var cqlFilters = [];
            var response = {};

            if (layer.fields.time !== null) {
                cqlFilters.push(this.createCqlTemporalFilter(
                    layer.fields.time.start.field, layer.fields.time.stop.field, startTime, stopTime));
            }

            var spatialFilter =
                this.createCqlSpatialIntersectsFilter(layer.fields.geometry.field, spatialBounds);

            if (spatialFilter !== null) {
                cqlFilters.push(spatialFilter);
            }

            var customFilter = opStateService.getCustomFilterByLayer(layer.workspace + ':' + layer.name);

            if (customFilter !== null) {
                cqlFilters.push(customFilter);
            }

            if (cqlFilters.length > 0) {
                response['cql_filter'] = cqlFilters.join(' AND ');
            }

            return response;
        };
    }
);