angular.module('opApp').service('opLayerService', ['$q', 'localStorageService', 'opConfig', 'opWebMapService',
    'opWebFeatureService','opFilterService','opStateService','$log',
        function ($q, localStorageService, opConfig, opWebMapService, opWebFeatureService, opFilterService, opStateService, $log) {
            'use strict';

            this.localStorageLayersKey = 'opApp.layersCache';
            this.localStorageLayerFieldsKey = 'opApp.layerTimes';

            /**
             * Identify first matching time field that meet the naming and data type criteria.
             * Data type criteria are defined in opConfig.js
             * Naming criteria are defined in validFields parameter
             * @param validFields array of valid field substrings
             * @param availableFields array of fields objects available in layer
             * @returns {null or Object}
             */
            var determineTimeField = function (validFields, availableFields) {
                var timeField = null;
                for (var i = 0; i < validFields.length; i++) {
                    for (var j = 0; j < availableFields.length; j++) {
                        if (availableFields[j].name.toLowerCase().indexOf(validFields[i]) > -1 && opConfig.timeFieldTypes.indexOf(availableFields[j].type) > -1) {
                            return availableFields[j].name;
                        }
                    }
                }

                return timeField;
            };

            /**
             * Identifies the first field name with a Geometry type found within a DescribeFeatureType result
             * @param availableFields array of fields objects available in layer
             * @returns {*}
             */
            var determineGeometryField = function (availableFields) {
                var geomField = null;
                for (var i = 0; i < availableFields.length; i++) {
                    if (availableFields[i].type.indexOf(opConfig.geomFieldNamespace) === 0) {
                        geomField = {field: availableFields[i].name, type: availableFields[i].type};
                        break;
                    }
                }

                return geomField;
            };

            /**
             * Cache data fields associated with a layer
             * @param layer     layer we're using
             * @param fields    field data for the layer
             */
            this.setFieldCache = function (layer, fields) {
                var cacheLayer = {
                    name: layer.name,
                    workspace: layer.workspace,
                    fields: fields,
                    cachedOn: moment(new Date()).unix()
                };

                var timeCache = localStorageService.get(this.localStorageLayerFieldsKey);
                if (timeCache === null) {
                    timeCache = [];
                }
                for (var i = 0; i < timeCache.length; i++) {
                    if (timeCache[i].name === cacheLayer.name && timeCache[i].workspace === cacheLayer.workspace) {
                        timeCache[i] = cacheLayer;
                        localStorageService.set(this.localStorageLayerFieldsKey, timeCache);
                        return;
                        // Done.  Get out so we don't push in again.
                    }
                }

                // Not found in existing cache
                timeCache.push(cacheLayer);
                localStorageService.set(this.localStorageLayerFieldsKey, timeCache);
            };

            /**
             * Clear all the layer and field cache data
             */
            this.clearCache = function () {
                localStorageService.set(this.localStorageLayersKey, null);
                localStorageService.set(this.localStorageLayerFieldsKey, null);
            };

            /**
             * Clear all the data associated with a server
             * @param serverNum
             */
            this.clearCacheForServer = function (serverNum) {
                localStorageService.set(this.localStorageLayersKey + serverNum, null);
                localStorageService.set(this.localStorageLayerFieldsKey, null);
            };

            /**
             * Performs a number of chained async processes to determine the fields and time dimensions of passed in layer
             * Returned promise will be resolved with either an object structured as follows or rejected:
             *
             * NOTE: time value will be unset if layer is not time enabled
             *
             *
             {
                fields: {
                    time: {
                        start: { field: 'start_time', value: '2013-01-01T00:00:00Z'},
                        stop: { field: 'stop_time', value: '2013-12-31T00:00:00Z' },
                        wmsTime: true
                    },
                    geometry: {
                        field: 'geom', type: 'Polygon'
                    },
                    list: [{name: 'some_field_name', type: 'xsd:date'}, {...}]
                }
              }
             *
             * @param layer object containing a string values for name and workspaces keys, as well as the new fields key
             * @returns {Promise}
             */
            this.getFields = function (layer) {
                var deferred = $q.defer();
                var self = this;

                /*
                 Expect a cached object as follows:
                 [
                 {
                 name: '...',
                 workspace: '...',
                 fields: '...',
                 cachedOn: ...
                 },
                 ...
                 ]
                 */
                var fieldsCache = localStorageService.get(self.localStorageLayerFieldsKey);
                var currentUnix = moment(new Date()).unix();

                if (fieldsCache !== null) {
                    for (var i = 0; i < fieldsCache.length; i++) {
                        var cacheLayer = fieldsCache[i];
                        if (layer.name === cacheLayer.name && layer.workspace === cacheLayer.workspace && layer.server === cacheLayer.server) {
                            $log.log('Found layer and workspace match in cache... does it fall within cache period?');
                            var diff = Math.abs(currentUnix - cacheLayer.cachedOn);
                            $log.log('Seconds since last layer cache: ' + diff);
                            if (diff < opConfig.layerCachePeriod) {
                                deferred.resolve(cacheLayer.fields);
                                return deferred.promise;
                            }
                        }
                    }
                }

                /*
                 There are 4 types of layers we are concerned with identifying:

                 No time fields at all
                 Time fields but not WMS TIME enabled
                 Time fields WITH WMS TIME enabled
                 Raster layers without known time fields, but temporally enabled via WMS TIME
                 */
                opWebFeatureService.extractFieldsAndTypes(layer.server, layer.name, layer.workspace).then(
                    function (fields) {
                        layer.fields.list = fields;
                        var startField = determineTimeField(opConfig.timeFields.start, fields);
                        var stopField = determineTimeField(opConfig.timeFields.stop, fields);
                        var geometry = determineGeometryField(fields);

                        if (geometry === null) {
                            $log.log('Unable to determine geometry field.  Layer ' + layer.name +
                                ' will not be queryable.');
                        }
                        else {
                            layer.fields.geometry = geometry;
                        }

                        var time;
                        // Changed Feature Browser to not attempt to configure layers without WMS time
                        // at all.  Only layers that have time enabled can be temporally queried.
                        if (layer.fields.time !== null && startField !== null && stopField !== null) {
                            if (!angular.isDefined(layer.fields.time) || layer.fields.time === null) {
                                layer.fields.time = {start: {}, stop: {}, wmsTime: false};
                            }

                            time = {
                                // result from 1st promise - startValue
                                start: {field: startField, value: layer.fields.time.start.value},
                                // result from 2nd promise - stopValue
                                stop: {field: stopField, value: layer.fields.time.stop.value},
                                wmsTime: angular.isDefined(layer.fields.time.wmsTime) && layer.fields.time.wmsTime
                            };
                            $log.log(time);

                            layer.fields.time = time;
                        }
                        else {
                            $log.log('Unable to determine time fields.  Layer ' + layer.name +
                                ' is not time enabled.');
                        }

                        self.setFieldCache(layer, layer.fields);
                        deferred.resolve(layer.fields);
                    },
                    function (reason) {
                        // This is to allow time-enabled raster mosaics to function.
                        self.setFieldCache(layer, layer.fields);
                        layer.raster = true;

                        $log.log('Unable to determine field types: ' + reason);
                        deferred.resolve(layer.fields);
                        $log.log('Assuming raster layer.');
                    });

                return deferred.promise;
            };

            /**
             * Query a layer to determine if any data is present given temporal and spatial domains.
             *
             * @param layer object containing at minimum 'name', 'workspace' and 'time' properties
             * @param startBound begin time of temporal filter
             * @param endBound end time of temporal filter
             * @param spatialWKT optional spatial filter defined as valid WKT
             * @returns {*}
             */
            this.isDataPresent = function (layer, startBound, endBound, spatialWKT) {
                var filters = opFilterService.createWfsFilterRequestForLayer(layer, startBound, endBound, spatialWKT);
                return opWebFeatureService.isDataPresent(layer.server, layer.name, layer.workspace, layer.fields, filters);
            };

            /**
             * Query a layer and retrieve all the features in GeoJSON format that match the given filters
             * @param layer
             * @param filters
             * @returns {*}
             */
            this.getFilteredJsonFeatures = function (layer, filters, srs) {
                // return opWebFeatureService.getFilteredJsonFeatures(layer.server, layer.name, layer.workspace, layer.fields,
                //     filters, {maxFeatures: opConfig.wfsFeatureLimiter, srsName: 'EPSG:4326'});
                return opWebFeatureService.getFilteredJsonFeatures(layer.server, layer.name, layer.workspace, layer.fields,
                    filters, {maxFeatures: opConfig.wfsFeatureLimiter, srsName: srs});
            };

            /**
             * Fetch all available layers and time values available from a WMS GetCapabilities request.
             * This can utilize cached data if force is set to false.
             *
             * @param force identify whether this operation should force a refresh from server (true) or use local cache (false)
             *
             * @returns {*}
             */
            this.getLayers = function (force, serverName) {
                var deferred = $q.defer();
                var self = this;
                var serverNum = opStateService.getServerNumByName(serverName);
                var layersCached = localStorageService.get(self.localStorageLayersKey + serverNum);
                var currentUnix = moment(new Date()).unix();

                if (!force &&
                    layersCached !== undefined && layersCached !== null &&
                    Math.abs(currentUnix - layersCached.cachedOn) < opConfig.cachePeriod) {
                    $log.log('Seconds since last layer cache: ' + Math.abs(currentUnix - layersCached.cachedOn));
                    $log.log('Thanks for not forcing me to re-request layers, since they are in local storage...');

                    deferred.resolve(layersCached.layers);
                }

// expected layers structure
                /*
                 layers: [
                 { name: 'hi1', workspace: 'derp', abstract: 'detailed description', tags: ['hi', 'guy'],
                 fields: {
                 time: {
                 start: { field: 'start_time', value: '2013-01-01T00:00:00Z'},
                 stop: { field: 'stop_time', value: '2013-12-31T00:00:00Z' },
                 wmsTime: true
                 },
                 geometry: {
                 field: 'geom', type: 'Polygon'
                 },
                 list: [{name: 'some_field_name', type: 'xsd:date'}, {...}]
                 }
                 }, {...} ]
                 */
                else {
                    //this.clearCache();
                    this.clearCacheForServer(serverNum);
                    opWebMapService.getCapabilities(serverName).then(function (result) {

                        if (result !== null) {
                            var layers = [];

                            var xmlDoc = $.parseXML(result.data);

                            var nodes = xmlDoc.getElementsByTagName('Layer');

                            // Skip first Layer element, this contains all the CRS garbage and is just a container for the child Layers
                            for (var i = 1; i < nodes.length; i++) {
                                var layer = {
                                    fields: {
                                        time: null,
                                        geometry: null,
                                        list: []
                                    }
                                };

                                for (var j = 0; j < nodes.item(i).childNodes.length; j++) {
                                    var node = nodes.item(i).childNodes.item(j);
                                    if (node.nodeType === 1) {
                                        layer.server = serverName;
                                        switch (node.nodeName) {
                                            case 'Name':
                                                layer.name = node.textContent;
                                                var index = layer.name.indexOf(':');
                                                if (index > -1) {
                                                    var nameSplit = layer.name.split(':');
                                                    layer.workspace = nameSplit[0];
                                                    layer.name = nameSplit[1];
                                                }
                                                break;
                                            case 'Title':
                                                layer.title = node.textContent;
                                                break;
                                            case 'Abstract':
                                                layer.abstract = node.textContent;
                                                break;
                                            case 'KeywordList':
                                                var keywords = [];
                                                for (var k = 0; k < node.childNodes.length; k++) {
                                                    var keywordNode = node.childNodes.item(k);
                                                    if (keywordNode.nodeType === 1) {
                                                        keywords.push(keywordNode.textContent);
                                                    }
                                                }
                                                layer.tags = keywords;
                                                break;
                                            // If this element is present, we are dealing with a time enabled layer.
                                            case 'Dimension':
                                                for (var a = 0; a < node.attributes.length; a++) {
                                                    // Verify that this is a time Dimension attribute
                                                    if (node.attributes[a].textContent === 'time') {
                                                        var time = node.textContent.split('/');
                                                        // Start/Stop/Periodicity is the format of Dimension textContent.
                                                        // e.g.
                                                        /*
                                                         <Dimension name="time" default="current" units="ISO8601">
                                                         2014-01-01T05:00:00.000Z/2014-03-18T04:00:00.000Z/P1D
                                                         </Dimension>
                                                         */
                                                        layer.fields.time = {
                                                            start: {value: time[0]},
                                                            stop: {value: time[1]},
                                                            wmsTime: true
                                                        };
                                                    }
                                                }
                                                break;
                                            case 'EX_GeographicBoundingBox':
                                                for (var b = 0; b < node.childNodes.length; b++) {
                                                    var childNode = node.childNodes.item(b);
                                                    if (childNode.nodeName === 'westBoundLongitude') {
                                                        layer.westBbox = childNode.textContent;
                                                    }
                                                    if (childNode.nodeName === 'eastBoundLongitude') {
                                                        layer.eastBbox = childNode.textContent;
                                                    }
                                                    if (childNode.nodeName === 'southBoundLatitude') {
                                                        layer.southBbox = childNode.textContent;
                                                    }
                                                    if (childNode.nodeName === 'northBoundLatitude') {
                                                        layer.northBbox = childNode.textContent;
                                                    }
                                                }
                                                break;
                                        }
                                    }
                                }

                                // filter out any layer-groups... for some reason they are not namespaced...
                                // we can't temporally filter them anyway
                                if (layer.workspace !== undefined) {
                                    layers.push(layer);
                                }
                            }

                            var cachedDate = moment(new Date()).unix();
                            var layersCache = {layers: layers, cachedOn: cachedDate};
                            localStorageService.set(self.localStorageLayersKey + serverNum, layersCache);
                            deferred.resolve(layers);
                        }
                        else {
                            var error = 'Unable to retrieve server capabilities.';
                            $log.log(error);
                            deferred.reject(error);
                        }
                    }, function (reason) {
                        var error = 'Unable to retrieve server capabilities.' + reason;
                        $log.log(error);
                        deferred.reject(error);
                    });

                }

                return deferred.promise;
            };
        }]);
