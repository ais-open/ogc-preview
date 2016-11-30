angular.module('opApp').controller('opLayerController', ['$rootScope', '$scope', '$location', '$timeout', '$window',
    'moment', 'toaster', 'L', 'opConfig', 'opLayerService', 'opWebMapService', 'opWebFeatureService', 'opStateService',
    'opFilterService', 'opExportService', 'opPopupWindow', '$log',
    function ($rootScope, $scope, $location, $timeout, $window, moment, toaster, L, opConfig, opLayerService, opWebMapService,
              opWebFeatureService, opStateService, opFilterService, opExportService, opPopupWindow, $log) {
        'use strict';

        /**
         * Hashes the string for use as a poor man's UUID
         * @returns most-likely unique hash
         */
        String.prototype.hashCode = function () {
            var hash = 0;
            var length = this.length;
            if (length === 0) {
                return hash;
            }
            for (var i = 0; i < length; i++) {
                var chr = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        };

        /**
         * Called when layer transparency slider bar is moved and thus sets the transparency value for the layer
         * @param layer the layer object we are operating on
         */
        $scope.onTransparencyChange = function (layer) {
            if (layer.active) {
                // translate from scale 0-100 to 0-1
                var value = layer.transparencySlider.value * 0.01;
                $scope.setTransparency(layer, value);
            }
        };

        /**
         * Sets the opacity on the map's leaflet layer object for the specified value
         * @param layer layer object we are working on
         * @param value value from 0 to 100 (0%-100%) from transparent->opaque
         */
        $scope.setTransparency = function (layer, value) {
            layer.mapHandle.setOpacity(value);
        };

        /**
         * Callback for when a layer is loaded on leaflet
         * @param layer     layer object
         */
        var layerLoadCompleteHandler = function (layer) {
            if (layer.timeout) {
                $timeout.cancel(layer.timeout);
            }
            layer.timeout = $timeout(function () {
                layer.loading = false;
                $log.log('Tiles loaded for layer ' + layer.name);
            }, 0, true);
        };

        /**
         * Callback for when a layer has started to load in leaflet
         * @param layer     associated layer object
         */
        var layerLoadStartHandler = function (layer) {
            if (layer.timeout) {
                $timeout.cancel(layer.timeout);
            }
            layer.timeout = $timeout(function () {
                layer.loading = true;
                $log.log('Loading tiles for layer ' + layer.name);
            }, 0, true);
        };


        /**
         * Callback for when a layer is loaded on leaflet
         * @param layer     layer object
         */
        var updateLayerLoadComplete = function (e) {
            for (var i = 0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (layer.mapHandle === e.target) {
                    layerLoadCompleteHandler(layer);
                    break;
                }
            }
        };

        /**
         * Callback for when a layer has started to load in leaflet
         * @param layer     associated layer object
         */
        var updateLayerLoadStart = function (e) {
            for (var i = 0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (layer.mapHandle === e.target) {
                    layerLoadStartHandler(layer);
                    break;
                }
            }
        };


        /**
         * Handle all layer removal from leaflet and state changes required
         * @param layer
         */
        var removeLayer = function (layer) {
            layer.params = null;
            layer.mapHandle.off('loading', updateLayerLoadStart);
            layer.mapHandle.off('load', updateLayerLoadComplete);
            $scope.map.removeLayer(layer.mapHandle);

            layer.mapHandle = null;

            opStateService.removeDataset(layer.server + ':' + layer.workspace + ':' + layer.name);

            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'updateFilters',
                _.filter($scope.layers, function (l) {
                    return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                }));
        };

        /**
         * Map layers to a group
         * @param tag   Tag or name to call the group
         * @returns {{}} Object to of a group of layers
         * @constructor
         */
        var LayerGroup = function (tag) {
            var self = {};
            var _tag = tag;
            var _layers = [];

            /**
             * If a server turns off, we need to loop through and remove layers from a group of that layer is turned off.
             * @param serverName    server to turn off
             */
            self.turnServerOff = function (serverName) {
                var i = _layers.length;
                while (i--) {
                    if (_layers[i].server === serverName) {
                        if (_layers[i].active) {
                            removeLayer(_layers[i]);
                        }
                        $scope.layers.splice($scope.layers.indexOf(_layers[i]), 1);
                        _layers.splice(i, 1);
                    }
                }

                // remove tag if we remove all the layers associated with that tag.
                if (_layers.length === 0) {
                    _tag = null;
                }
            };

            /**
             * Return tag name
             * @returns {*}
             */
            self.getTag = function () {
                return _tag;
            };

            self.areAnyTagged = function(tags) {
                for (var i=0; i < _layers.length; i++) {
                    if (angular.isDefined(_layers[i].tags) && arrayIntersect(_layers[i].tags, tags)) {
                        return true;
                    }
                }
                return false;
            };

            /**
             * Find if any layers associated with this tag are toggled on
             * @returns {boolean}   true if any layers are on, false otherwise
             */
            self.areAnyActive = function () {
                for (var i = 0; i < _layers.length; i++) {
                    if (angular.isDefined(_layers[i].active) && _layers[i].active) {
                        return true;
                    }
                }

                return false;
            };

            /**
             * Find if all layers associated with this tag are toggled on
             * @returns {boolean}   true if all layers are on, false otherwise
             */
            self.areAllActive = function () {
                for (var i = 0; i < _layers.length; i++) {
                    if (!angular.isDefined(_layers[i].active) || _layers[i].active === false) {
                        return false;
                    }
                }

                return true;
            };

            /**
             *
             */
            self.toggleChecked = function () {
                var setCheckedState = true;
                if (self.areAllActive()) {
                    setCheckedState = false;
                }

                for (var i = 0; i < _layers.length; i++) {
                    if (_layers[i].active !== setCheckedState) {
                        _layers[i].active = setCheckedState;
                        $scope.datasetStateChanged(_layers[i].uid);
                    }
                }
            };

            /**
             *
             */
            self.getActiveLayers = function () {
                var result = [];
                for (var i = 0; i < _layers.length; i++) {
                    if (_layers[i].active) {
                        result.push(_layers[i]);
                    }
                }
            };

            /**
             * Get all the layers associated with this tag/group
             * @returns {Array}
             */
            self.getLayers = function () {
                return _layers;
            };

            /**
             * Add a layer to this group/tag
             * @param layer
             */
            self.addLayer = function (layer) {
                _layers.push(layer);
            };

            //self.removeLayer = function(layer) {
            //    _layers.slice(layer, 1);
            //};

            return self;
        };

        /**
         * Keep track of Groups of  layers based on TAGS/KEYWORDS to be displayed under one heading
         * @returns Object containing all groups and layers in groups
         * @constructor
         */
        var LayerGroups = function () {
            var self = {};
            var _groups = [];

            /**
             * When a server gets turned off, we need to go find all the layers inside a group that is associated
             * with that layer and "turn them off" (remove them from the group).  If we remove all layers from a group
             * by doing this, we remove the group.
             * @param serverName
             */
            self.turnServerOff = function (serverName) {
                var i = _groups.length;
                while (i--) {
                    _groups[i].turnServerOff(serverName);
                    // we need to remove our group if we end up turning off all the layers in that group
                    if (_groups[i].getLayers().length === 0) {
                        _groups.splice(i, 1);
                    }
                }
            };

            /**
             * Add a layer to a group
             * @param layer layer object to add
             * @param tag   tag name for the layer to be associated with
             */
            self.addLayer = function (layer, tag) {
                var group = self.getGroupByTag(tag);
                // If not found, create new group matching tag and add to groups
                if (!group) {
                    group = new LayerGroup(tag);
                    _groups.push(group);
                }

                group.addLayer(layer);
            };

            /**
             * Getter of all groups
             * @returns Array of groups
             */
            self.getGroups = function () {
                return _groups;
            };

            /**
             * Getter of all the tags in use
             * @returns {Array} tags
             */
            self.getGroupTags = function () {
                var tags = [];
                for (var i = 0; i < _groups.length; i++) {
                    tags.push(_groups[i].getTag());
                }

                return tags;
            };

            /**
             * Getter of a group associated by its tag
             * @param tag   tag to look up group by
             * @returns {*} group
             */
            self.getGroupByTag = function (tag) {
                var group;

                for (var i = 0; i < _groups.length; i++) {
                    if (_groups[i].getTag() === tag) {
                        group = _groups[i];
                    }
                }

                return group;
            };

            /**
             * Get number of groups created
             * @returns {Number}    total number of groups
             */
            self.getCount = function () {
                return _groups.length;
            };

            return self;
        };

        $scope.popOverHtml = '';

        // tell whether popover is open or closed
        $scope.isOpen = false;

        $scope.DEBUG = opStateService.isDebug();

        $scope.layerExpanded = true;
        $scope.filter = '';
        $scope.selectionFilter = '';
        $scope.collectionTypeFilter = '';
        $scope.tags = [];

        $scope.layersLoading = false;
        $scope.layers = [];
        $scope.layerGroups = null;

        // Leaflet objects
        $scope.map = null;
        $scope.leafletGroup = null;
        $scope.layerControl = null;

        $scope.maskLayer = null;
        $scope.selectedLayer = null;

        var zIndex = 50;
        var maxZIndex = 100;

        /*
         Layer Model:
         layer: { uid: 123456,
         name: 'hi1',
         workspace: 'derp',
         active: false,
         loading: false,
         mapHandle,
         time: {
         start: { field: 'start_time', value: '2014-01-01T00:00:00Z'},
         stop: { field: 'stop_time', value: '2014-05-22T00:00:00Z' },
         wmsTime: true
         }
         }

         */

        /**
         * Look up a layer by its UUID
         * @param layers    array of all layers
         * @param uid       legit uuid of an existing layer
         * @returns {*}     layer object associated with the uuid supplied
         */
        var getLayerByUid = function (layers, uid) {
            for (var i = 0; i < layers.length; i++) {
                if (layers[i].uid === uid) {
                    return layers[i];
                }
            }
        };

        var arrayIntersect = function (a, b) {
            for (var i = 0; i < a.length; i++) {
                for (var j = 0; j < b.length; j++) {
                    if (a[i].toLowerCase() === b[j].toLowerCase()) {
                        return true;
                    }
                }
            }

            return false;
        };

        /**
         * Check if tag is in tags, ignoring case
         * @param tags      array of strings
         * @param tag       string
         * @returns {boolean}   true if tag is in tags, false otherwise
         */
        var checkTagMatch = function (tags, tag) {
            for (var i = 0; i < tags.length; i++) {
                if (tag.toLowerCase() === tags[i].toLowerCase()) {
                    return true;
                }
            }

            return false;
        };

        /**
         * Match up all the layers to their tags if they should have some, bucket non-matchers into a catch-all
         * @param layers    all of the layers
         * @param tags      all of the tags
         */
        var groupLayers = function (layers, tags) {
            var unrecognized = [];
            var recognized = [];

            // First, bucket all layers in to whether the have recognized tags or not
            for (var i = 0; i < layers.length; i++) {
                // Make sure there are metadata tags.  LayerGroups don't have them.
                if (layers[i].tags && arrayIntersect(layers[i].tags, tags)) {
                    recognized.push(layers[i]);
                }
                else {
                    unrecognized.push(layers[i]);
                }
            }

            // Group all layers with recognized tags
            for (i = 0; i < tags.length; i++) {
                for (var j = 0; j < recognized.length; j++) {
                    if (checkTagMatch(recognized[j].tags, tags[i])) {
                        $scope.layerGroups.addLayer(recognized[j], tags[i]);
                    }
                }
            }

            // Add final uncategorized group for the rejects
            for (i = 0; i < unrecognized.length; i++) {
                $scope.layerGroups.addLayer(unrecognized[i], 'UNCATEGORIZED');
            }
        };

        /**
         * Creates a query based on the current filters for a layer and sets the params for future OGC querying
         * @param layer     layer we are operating on
         * @param startTime start time object (moment object)
         * @param stopTime  stop time object (moment)
         */
        var applyLayerFilters = function (layer, startTime, stopTime) {
            var params = opFilterService.createWmsFilterRequestForLayer(layer, startTime, stopTime);
            // Only applies a new layer filter if the params are different from the previous ones
            // This keeps all selected layers from continually refreshing when toggling layers on/off
            if (!angular.isDefined(layer.params) ||
                layer.params === null ||
                (layer.params !== params &&
                (!angular.isDefined(params.time) || params.time !== layer.params.time) &&
                (!angular.isDefined(params.cql_filter) || params.cql_filter !== layer.params.cql_filter))) {// jshint ignore:line
                layer.params = params;
                layer.mapHandle.setParams(params);
                $scope.$broadcast('queryWfs', layer);
            }
        };

        /**
         * Parent function to get an export URL for the requested data type and layer
         * @param exportGenerator   function to do a specific type of generation
         * @param layer             layer we are opearating on
         * @param bounds            bounds
         * @param spatialBounds     spatial bounds
         * @param url               url to query on
         * @returns {string}        complete url for OGC
         */
        var exportData = function (exportGenerator, layer, bounds, spatialBounds, url) {
            //var bounds = opStateService.getTimeBoundsFromTemporalFilter();
            if (angular.isDefined(layer.active) && layer.active !== null && layer.active) {
                var params = exportGenerator(layer, bounds[0], bounds[1], spatialBounds);

                return url + '?' + $.param(params);
            }
        };

        /**
         * Broadcast receiver for whenever a WFS query needs to be sent to an OGC backend
         * @param e     event (not used, just angular boilerplate)
         * @param layer layer we are operating on
         */
        $scope.$on('queryWfs', function (e, layer) {
            var timeBounds = opStateService.getTimeBoundsFromTemporalFilter();
            //var mapBounds = $scope.map.getFilterBounds();
            var boundsAsWKT = $scope.map.getFilterBounds();
            //var spatialBounds;

            var spatialBounds = boundsAsWKT;

            //if (mapBounds.isValid() && angular.isDefined(layer) && angular.isDefined(layer.active) && layer.active !== null && layer.active && layer.fields.geometry) {
            if (boundsAsWKT !== '' && angular.isDefined(boundsAsWKT) && angular.isDefined(layer) && angular.isDefined(layer.active) && layer.active !== null && layer.active && layer.fields.geometry) {
                //spatialBounds = mapBounds.toBBoxString();
                var epsgCode = opStateService.getLeafletMapCRS();
                //var filter = opFilterService.createWfsBBoxFilterRequestForLayer(layer, timeBounds[0], timeBounds[1],
                //    spatialBounds, epsgCode);
                var filter = opFilterService.createWfsIntersectsFilterRequestForLayer(layer, timeBounds[0], timeBounds[1],
                    spatialBounds);

                var server = opStateService.getServer(layer.server);
                opLayerService.getFilteredJsonFeatures(layer, filter, epsgCode).then(
                    function (result) {
                        // data key should not exist
                        if (!result.data) {
                            result.kmlUrl = exportData(opExportService.createKmlExportRequest,
                                layer, timeBounds, spatialBounds, server.url + '/wms/kml');
                            result.csvUrl = exportData(opExportService.createCsvExportRequest,
                                layer, timeBounds, spatialBounds, server.url + '/wfs');
                            result.shpUrl = exportData(opExportService.createShapefileExportRequest,
                                layer, timeBounds, spatialBounds, server.url + '/wfs');
                            result.rssUrl = exportData(opExportService.createGeoRSSExportRequest,
                                layer, timeBounds, spatialBounds, server.url + '/wfs');
                            result.layer = layer;
                            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'queryWfsResult', result);
                        }
                    },
                    function (reason) {
                        $log.log(reason);
                    });
            } else {
                if (layer.raster) {
                    var logError = 'Is this layer a raster?  If so, no feature data is available.';
                    opPopupWindow.broadcast(opStateService.getResultsWindow(), 'queryWfsResult', {error: logError});
                } else {
                    opPopupWindow.broadcast(opStateService.getResultsWindow(), 'queryWfsResult', {error: 'nobbox'});
                }

            }
        });

        /**
         * Broadcast receiver for when filters were changed and layers need to be updated
         */
        $scope.$on('filters-updated', function () {
            var bounds = opStateService.getTimeBoundsFromTemporalFilter();
            var collectionFilter = opStateService.getCollectionFilter();
            
            if (collectionFilter != null && collectionFilter !== undefined) {
                $scope.collectionTypeFilter = collectionFilter;
            }

            for (var i = 0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (angular.isDefined(layer.active) && layer.active !== null && layer.active && layer.fields.time !== null) {
                    applyLayerFilters(layer, bounds[0], bounds[1]);
                }
            }
        });

        $scope.setSelectionFilter = function (filter) {
            $scope.selectionFilter = filter;
        };
        
        $scope.setCollectionTypeFilter = function (filter) {
            $scope.collectionTypeFilter = filter;
            opStateService.setCollectionFilter(filter);
        };

        /**
         * Set our total known filter scope variable
         * @param filter
         */
        $scope.setFilter = function (filter) {
            $scope.filter = filter;
        };

        /**
         * Determine if a layer is on
         * @param layerUid      valid UUID associated with a layer
         * @returns {boolean}   true if layer is on (toggled), false otherwise
         */
        $scope.isLayerVisible = function (layerUid) {
            var visible = false;
            var layer = getLayerByUid($scope.layers, layerUid);
            
            if ($scope.filter === 'active') {
                visible = layer.active;
            }
            
            // Check to see if configured tags for selected collection type
            // match the metadata tags associated with layer
            if ($scope.collectionTypeFilter !== '') {
                visible = arrayIntersect(opConfig.collectionTypes[$scope.collectionTypeFilter], layer.tags);
            }
            else {
                visible = true;
            }

            if ($scope.selectionFilter === 'active') {
                visible = visible && layer.active;
            }
            
            return visible;
        };


        /**
         *
         Check to see if the layer we're going to display in the sidebar is the highest priority according to GeoServer
         index.  This will run through any layers that have the same workspace:layerName as the current layer and determine
         if the current layer is the highest priority, displaying only one (the highest priority) for a same-named layer.
         * @param layerUid      valid UUID associated with a layer
         * @returns {boolean}   true if layer's server is highest priority as defined in config, false otherwise
         */
        $scope.isHighestPriority = function (layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);
            var priority = opStateService.getServerNumByName(layer.server);

            // always use lowest indexed server's layers
            if (priority === 0) {
                return true;
            }

            // find layers that match our layer's name
            var matches = _.filter($scope.layers, function (otherLayer) {
                if (layer.server !== otherLayer.server && layer.name === otherLayer.name && layer.workspace === otherLayer.workspace) {
                    return otherLayer;
                }
            });

            for (var i = 0; i < matches.length; i++) {
                var index = opStateService.getServerNumByName(matches[i].server);
                // if we found a matched sever and it has a lower index, we know the one we're on isn't the highest priority
                if (index < priority) {
                    return false;
                }
            }
            // if we didn't find another server or this layer is the highest priority, return true
            return true;
        };

        /**
         * Determine if a layer is exactly duplicated (as by title/layername) across servers
         * @param layerUid      valid UUID associated with a layer
         * @returns {boolean}   true if duped, false otherwise
         */
        $scope.isLayerDuped = function (layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);
            for (var i = 0; i < $scope.layers.length; i++) {
                if (layer.title === $scope.layers[i].title && layer.server !== $scope.layers[i].server) {
                    // layer is duped
                    return true;
                }
            }
            return false;
        };

        /**
         * Determine if any layers in a group are toggled on or not
         * @param groupTag      tag (group) to look up
         * @returns {boolean}   true if any layers in tag are active, false otherwise
         */
        $scope.isGroupVisible = function (groupTag) {
            var visible = false;
            var group = $scope.layerGroups.getGroupByTag(groupTag);
            if ($scope.filter === '') {
                visible = true;
            }
            else if ($scope.filter === 'active') {
                if (group) {
                    if (group.areAnyActive()) {
                        visible = true;
                    }
                }

                visible = false;
            } else if (groupTag === $scope.filter) {
                visible = true;
            }
            visible = false;
            
            // Check to see if configured tags for selected collection type
            // match the metadata tags for any layer within group
            if ($scope.collectionTypeFilter !== '')
            {
                visible = group.areAnyTagged(opConfig.collectionTypes[$scope.collectionTypeFilter]);
            }
            else {
                visible = true;
            }
            
            if ($scope.selectionFilter === 'active') {
                if (group) {
                    visible = visible && group.areAnyActive();
                }
            }
            return visible;
        };

        /**
         * Handle all layer addition to leaflet and state changes required
         * @param layer
         */
        var addLayer = function (layer) {
            if (!$scope.map.hasLayer(layer.mapHandle)) {
                layer.mapHandle.on('loading', updateLayerLoadStart);
                layer.mapHandle.on('load', updateLayerLoadComplete);

                $scope.map.addLayer(layer.mapHandle);

                opStateService.addDataset(layer.server + ':' + layer.workspace + ':' + layer.name);

                opPopupWindow.broadcast(opStateService.getResultsWindow(), 'updateFilters',
                    _.filter($scope.layers, function (l) {
                        return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                    }));
            }
        };

        /**
         * If data has changed on a layer (toggled on or off), update its state
         * @param layerUid      valid UUID of a layer
         */
        $scope.datasetStateChanged = function (layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);
            // layer.active gets set by checkbox before this code executes
            if (!layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined) {
                $log.log('disabling already enabled layer: \'' + layer.name + '\'');
                removeLayer(layer);

                // Disabling complete.  Get out of here
                return;
            }

            $log.log('enabling layer: \'' + layer.name + '\'');

            //toaster.pop('wait', 'Date/Time', 'Identifying time metadata for ' + layer.title);

            // lets try adding layer to map
            // Oh, BTW zIndex is critical, as without overlays appear under baselayers when basselayers are switched
            if (zIndex >= maxZIndex) {
                zIndex = 50;
            }
            var server = opStateService.getServer(layer.server);
            var wmsLayer = L.tileLayer.wms(server.url + '/wms',
                opWebMapService.getLeafletWmsParams(layer.server, layer.name, layer.workspace, {
                    tileSize: 512,
                    zIndex: zIndex
                }));
            zIndex += 1;

            //opWebMapService.getLeafletWms(layer.title, layer.name, layer.workspace, {});
            layer.mapHandle = wmsLayer;

            // Is this layer time enabled?  Set relevant time values if so.
            opLayerService.getFields(layer).then(
                function (result) {
                    layer.fields = result;

                    // Verify time was set for this layer.. result will be undefined if not
                    if (result.time) {
                        $log.log('Time fields identified. ' +
                            'Start: \'' + result.time.start.field + '\', ' +
                            'Stop: \'' + result.time.stop.field + '\'');
                        if (result.time.start.value && result.time.stop.value) {
                            $log.log('Time values identified. ' +
                                'Start: \'' + result.time.start.value + '\', ' +
                                'Stop: \'' + result.time.stop.value + '\'');
                            layer.timeEnabled = true;
                        }
                        else {
                            $log.log('Time values were not identified as layer is not configured for WMS time');
                            layer.timeEnabled = false;
                        }
                    }
                },
                function (reason) {
                    $log.log('Couldn\'t identify time values for this layer... how embarrassing: ' + reason);
                    toaster.pop('note', 'Date/Time', 'Unable to detect time fields for layer \'' + layer.title + '\'.  Date/Time filtering will not be applied to this layer.');
                    layer.timeEnabled = false;
                }
                )
                /* Regardless of time enablement, add layer to the map.  We are chaining behind time checking to ensure
                 time values are applied to layer before it is drawn on map so no expensive WMS requests are made
                 while asynchronous calls are made to determine dataset time fields. */
                .then(function () {
                    var timeBounds = opStateService.getTimeBoundsFromTemporalFilter();

                    /*
                     opLayerService.isDataPresent(layer, timeBounds[0], timeBounds[1]).then(
                     function(hasData) {
                     layer.hasData = hasData;
                     $log.log('layer hasdata: ' + hasData);
                     }
                     );
                     */

                    applyLayerFilters(layer, timeBounds[0], timeBounds[1]);

                    addLayer(layer);
                    $rootScope.$broadcast('filters-updated');
                });
        };

        /**
         * Remove all layers from leaflet and set them all off/not active
         */
        var clearLayers = function () {
            var leafletGroup = $scope.leafletGroup;
            if (leafletGroup !== null) {
                for (var i = 0; i < $scope.layers.length; i++) {
                    var layer = $scope.layers[i];
                    if (layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined) {
                        $scope.map.removeLayer(layer.mapHandle);
                        layer.mapHandle = null;
                        layer.active = false;
                    }
                }
            }
        };

        /**
         * Remove all layers from leaflet for a specific server
         * @param serverName    server name of layers we want to turn off
         */
        var clearServerSpecificLayers = function (serverName) {
            for (var i = 0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined && layer.server === serverName) {
                    removeLayer(layer);
                }
            }
        };

        /**
         * When layer state changes, we need to update our state for that layer
         * @param serverName    server that is associated with layers to get data from
         */
        var updateLayerSelections = function (serverName) {
            var datasets = opStateService.getDatasets();

            for (var i = 0; i < datasets.length; i++) {
                var splitDataset = datasets[i].split(':');
                var dataset = {name: splitDataset[2], workspace: splitDataset[1], server: splitDataset[0]};
                var found = false;
                // Attempt to configure based on query parameter repr of filters
                for (var j = 0; j < $scope.layers.length; j++) {
                    var layer = $scope.layers[j];

                    if (layer.name === dataset.name && layer.workspace === dataset.workspace && layer.server === dataset.server) {
                        // Yay, we found our layer in configured datasource... we can break out now.
                        // if the layer is already active, don't try to change it's state.
                        if (!layer.active) {
                            layer.active = true;
                            $scope.datasetStateChanged(layer.uid);
                        }
                        found = true;
                        break;
                    }
                }

                if (!found && dataset.server === serverName) {
                    toaster.pop('error', 'Configuration Error', 'Unable able to find \'' + dataset.name + '\' in selected data source.');
                }
            }
        };

        /**
         * Broadcast receiver for when a server is force refreshed (via UI debug)
         */
        $scope.$on('refresh-server', function (event, args) {
            var datasets = opStateService.getDatasets().slice(0);
            var serverData = args;
            var activeServers = opStateService.getActiveServer();
            if (activeServers.indexOf(serverData) !== -1) {
                $log.log('Refreshing server ' + serverData.name);
                //clearServerSpecificLayers(serverData.name);
                $scope.layerGroups.turnServerOff(serverData.name);
                $scope.updateLayers(true, serverData.name);
                opStateService.setDatasets(datasets);
            }
        });

        /**
         * Button on UI that will set temporal filters to last 24 hours of known data for a layer and do that query
         * @param layer
         */
        $scope.getLatestData = function (layer) {
            // var test = moment().toString();
            var stopTime = moment(layer.fields.time.stop.value);
            // var stopTime = moment(test);
            var startTime = moment(stopTime).subtract(1, 'd');
            var times = [startTime, stopTime];
            $rootScope.$broadcast('latest-data-button', times);

            //ensure layer is active
            if(!layer.active){
                layer.active = true;
                $scope.datasetStateChanged(layer.uid);
            }
            $rootScope.$broadcast('latest-data-button-zoom', layer);
        };

        /**
         * per https://github.com/angular-slider/angularjs-slider
         * this forces the slider to render correctly on load.
         */

        $scope.refreshSlider = function (layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);

            // Is this layer time enabled?  Set relevant time values if so.
            opLayerService.getFields(layer).then(
                function (result) {
                    layer.fields = result;

                    // Verify time was set for this layer.. result will be undefined if not
                    if (result.time) {
                        $log.log('Time fields identified. ' +
                            'Start: \'' + result.time.start.field + '\', ' +
                            'Stop: \'' + result.time.stop.field + '\'');
                        if (result.time.start.value && result.time.stop.value) {
                            $log.log('Time values identified. ' +
                                'Start: \'' + result.time.start.value + '\', ' +
                                'Stop: \'' + result.time.stop.value + '\'');
                            layer.timeEnabled = true;
                        }
                        else {
                            $log.log('Time values were not identified as layer is not configured for WMS time');
                            layer.timeEnabled = false;
                        }
                    }
                },
                function (reason) {
                    $log.log('Couldn\'t identify time values for this layer... how embarrassing: ' + reason);
                    toaster.pop('note', 'Date/Time', 'Unable to detect time fields for layer \'' + layer.title + '\'.  Date/Time filtering will not be applied to this layer.');
                    layer.timeEnabled = false;
                }
            );

            $timeout(function () {
                $scope.$broadcast('rzSliderForceRender');
            });
        };

        /**
         * Get new layer data from the server or cache
         * @param force         boolean true or false to force new data from server as opposed to using cache
         * @param serverName    server that is associated with layers to get data from
         */
        $scope.updateLayers = function (force, serverName) {
            var collectionFilter = opStateService.getCollectionFilter();
            if (collectionFilter !== null && collectionFilter !== undefined) {
                $scope.collectionTypeFilter = collectionFilter;
            }
            var server = opStateService.getServer(serverName);
            var previousActiveServerCount = opStateService.getPreviouslyActiveServer().length;

            server.loading = true;

            // attempting to not display 'servers loading' when loading the 2nd server
            if (previousActiveServerCount > 0) {
                $scope.layersLoading = false;
            } else {
                $scope.layersLoading = true;
            }

            // if no servers are configured, we're clearing all the layers like it was the first time
            // we're using the app.
            if (previousActiveServerCount === 0) {
                clearLayers();
            }

            opLayerService.getLayers(force, serverName).then(function (layers) {
                var server = opStateService.getServer(serverName);
                server.loading = false;
                $scope.layersLoading = false;
                // Give layers a uid so that we pass reference to it within the controller
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    var hashString = layer.name + layer.workspace + layer.server;
                    var hash = hashString.hashCode();
                    layer.uid = hash;
                    layer.legendGraphic = opWebMapService.getLegendGraphicUrl(serverName, layer.workspace + ':' + layer.name);

                    // lets add transparency slider info to each as well
                    layer.transparencySlider = {
                        value: 100,
                        floor: 0,
                        ceil: 100
                    };
                }
                groupLayers(layers, opConfig.recognizedTags);
                $scope.tags = $scope.tags.concat($scope.layerGroups.getGroupTags());
                $scope.layers = $scope.layers.concat(layers);

            }, function (reason) {
                $scope.layersLoading = false;
                toaster.pop('error', 'Configuration Error', 'Unable to retrieve layers... is your GeoServer running? Error: ' + JSON.stringify(reason));
            }).
            then(function () {
                updateLayerSelections(serverName);
            });
        };

        /**
         * Bootstrap and start the app
         * @param serverName    serverName from opConfig!
         */
        $scope.initializeLayers = function (serverName) {
            opStateService.getLeafletMap()
                .then(function (map) {
                        $scope.map = map;
                        $scope.updateLayers(false, serverName);
                    },
                    function (reason) {
                        toaster.pop('error', 'Leaflet Error', 'Unable to initialize map...\n' + reason);
                    }
                );
        };

        /**
         * Delete all layer and tag/group data
         */
        this.resetLayerData = function () {
            $scope.layerGroups = new LayerGroups();
            $scope.tags = [];
            //$scope.layerGroups = null;
            $scope.layers = [];
        };

        /**
         * Reset all the data and reload all layer data
         */
        this.resetAndLoadLayers = function () {
            // this sets all the servers to default as on
            opStateService.setAllServersActive();
            var servers = opStateService.getActiveServer();
            this.resetLayerData();
            if (opStateService.getActiveServer() !== undefined) {
                for (var i = 0; i < servers.length; i++) {
                    servers[i].active = true;
                    $scope.initializeLayers(servers[i].name);
                }
            }
        };

        /**
         * Kick things off!
         */
        this.resetAndLoadLayers();

        /**
         * Helper function to display a short layer info when sidebar layer is rolled up
         * @returns {string}
         */
        $scope.friendlyLayer = function () {
            var activeLayers = opStateService.getDatasets();
            return activeLayers.length + ' enabled';
        };

        /**
         * Broadcast receiver for when servers are toggled on and off
         */
        $scope.$on('servers-updated', function (event, args) {
            var serversOn = args[0];
            var serversOff = args[1];

            serversOn.forEach(function (server) {
                $scope.turnServerOn(server.name);

            });

            serversOff.forEach(function (server) {
                $scope.turnServerOff(server.name);
            });
        });

        /**
         * Turn a server on
         * @param server
         */
        $scope.turnServerOn = function (server) {
            $scope.initializeLayers(server);
        };

        /**
         * Turn a server off
         * @param server
         */
        $scope.turnServerOff = function (server) {
            $scope.layerGroups.turnServerOff(server);
            clearServerSpecificLayers(server);
        };

        $scope.$on('baseLayerChanged', function () {
            if($scope.maskLayer) {
                $scope.map.removeLayer($scope.maskLayer);
                $scope.maskLayer = null;
            }

            opStateService.getLeafletMaskLayer()
            .then(function(layer){
                // We have to manually set zIndex as the layer control screws up basemaps with
                // overlays when switching between them
                layer.params['zIndex'] = maxZIndex + 1;
                layer.params['opacity'] = 0.8;

                if (layer.params['type'] && layer.params['type'].toLowerCase() === 'wmts') {
                    $scope.maskLayer = L.tileLayer(layer.url, {z: '0'});
                }
                else {
                    $scope.maskLayer = L.tileLayer.wms(layer.url,
		      opWebMapService.getLeafletWmsBasemapParams(layer.name, layer.params));
                }
                $scope.maskLayer.addTo($scope.map);
            });
        });

        /**
         * Broadcast receiver for getting heartbeats from the popup window to keep sync
         */
        opPopupWindow.on('resultsHeartbeat', function (win) {
            if (!opStateService.getResultsWindow()) {
                opStateService.setResultsWindow(win);
                opPopupWindow.broadcast(opStateService.getResultsWindow(), 'updateFilters',
                    _.filter($scope.layers, function (l) {
                        return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                    }));
            }
        });

        /**
         * Broadcast receiver for getting our initial data into the popup
         */
        opPopupWindow.on('resultsInit', function (win) {
            opStateService.setResultsWindow(win);
            opPopupWindow.broadcast(opStateService.getResultsWindow(), 'updateFilters',
                _.filter($scope.layers, function (l) {
                    return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                }));
        });

         /**
          * Broadcast receiver for removing maskLayer and selectedLayer when the popup closes
          */
         opPopupWindow.on('resultsClosed', function () {
             if($scope.maskLayer) {
                 $scope.map.removeLayer($scope.maskLayer);
                 $scope.maskLayer = null;
             }
             if($scope.selectedLayer) {
                 $scope.map.removeLayer($scope.selectedLayer);
                 $scope.selectedLayer = null;
             }
         });

        /**
         * Broadcast receiver for adding maskLayer and selectedLayer to map when attributes are selected
         */
        opPopupWindow.on('resultsSelected', function (layer, rowData) {
            var dataArr = [];
            if(rowData)
            {
                //add layer from wms with selected ids    
                $.each($(rowData),function(key,value){
                    dataArr.push(value[value.length-1]);
                });
            }
            
            if(layer && dataArr.length > 0)
            {
                var server = opStateService.getServer(layer.server);
                //make wms call to build layer
                if($scope.selectedLayer)
                {
                    $scope.map.removeLayer($scope.selectedLayer);
                    $scope.selectedLayer = null;
                }
                
                if(!$scope.maskLayer){
                    opStateService.getLeafletMaskLayer()
                    .then(function(layer){
                        // We have to manually set zIndex as the layer control screws up basemaps with
                        // overlays when switching between them
                        layer.params['zIndex'] = maxZIndex + 1;
                        layer.params['opacity'] = 0.8;

                        if (layer.params['type'] && layer.params['type'].toLowerCase() === 'wmts') {
                            $scope.maskLayer = L.tileLayer(layer.url, {z: '0'});
                        }
                        else {
                            $scope.maskLayer = L.tileLayer.wms(layer.url,
			        opWebMapService.getLeafletWmsBasemapParams(layer.name, layer.params));
                        }
                        $scope.maskLayer.addTo($scope.map);
                    });
                }
                
                if(layer.timeEnabled){
                    
                    $scope.selectedLayer = L.tileLayer.wms(server.url + '/wms', 
                        opWebMapService.getLeafletWmsParams(layer.server, layer.name, 
                        layer.workspace, {
                            tileSize: 512,
                            zIndex: maxZIndex + 2,
                            featureId: dataArr,
                            time: layer.params.time,
                            transparent: true
                    })).addTo($scope.map);
                    $scope.selectedLayer.on('tileerror', function(error, tile) {
                        opPopupWindow.broadcast(opStateService.getResultsWindow(), 'selectedRowsError', {error: "Could not highlight selected features. Reduce number of selected rows."});
                    });
                }
                else
                {
                    
                    $scope.selectedLayer = L.tileLayer.wms(server.url + '/wms', 
                        opWebMapService.getLeafletWmsParams(layer.server, layer.name, 
                        layer.workspace, {
                            tileSize: 512,
                            zIndex: maxZIndex + 2,
                            featureId: dataArr,
                            transparent: true
                    })).addTo($scope.map);
                    $scope.selectedLayer.on('tileerror', function(error, tile) {
                        opPopupWindow.broadcast(opStateService.getResultsWindow(), 'selectedRowsError', {error: "Could not highlight selected features. Reduce number of selected rows."});
                    });
                }
            }
            else
            {
                if($scope.maskLayer)
                    $scope.map.removeLayer($scope.maskLayer);
                if($scope.selectedLayer)
                    $scope.map.removeLayer($scope.selectedLayer);
                $scope.maskLayer = null;
                $scope.seletedLayer = null;
            }
        });
    }]);
