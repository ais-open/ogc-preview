/**
 * Created by Jonathan.Meyer on 5/29/2014.
 */

angular.module('opApp').controller('opLayerController',
    function ($rootScope, $scope, $location, $timeout, $window, moment, toaster, L, opConfig, opLayerService, opWebMapService,
              opWebFeatureService, opStateService, opFilterService, opExportService, opPopupWindow) {
        'use strict';

        var LayerGroups = function () {
            var self = {};
            var _groups = [];

            self.turnServerOff = function(serverName) {
                var i = _groups.length;
                while(i--) {
                    _groups[i].turnServerOff(serverName);
                    // we need to remove our group if we end up turning off all the layers in that group
                    if(_groups[i].getLayers().length === 0) {
                        _groups.splice(i, 1);
                    }
                }
            };

            self.addLayer = function (layer, tag) {
                var group = self.getGroupByTag(tag);
                // If not found, create new group matching tag and add to groups
                if (!group) {
                    group = new LayerGroup(tag);
                    _groups.push(group);
                }

                group.addLayer(layer);
            };

            self.getGroups = function() {
                return _groups;
            };

            self.getGroupTags = function() {
                var tags = [];
                for (var i=0; i < _groups.length; i++) {
                    tags.push(_groups[i].getTag());
                }

                return tags;
            };

            self.getGroupByTag = function(tag) {
                var group;

                for (var i = 0; i < _groups.length; i++) {
                    if (_groups[i].getTag() && _groups[i].getTag() === tag) {
                        group = _groups[i];
                    }
                }

                return group;
            };

            self.getCount = function() {
                return _groups.length;
            };

            return self;
        };

        var LayerGroup = function (tag) {
            var self = {};
            var _tag = tag;
            var _layers = [];

            self.turnServerOff = function(serverName) {
                var i = _layers.length;
                while(i--) {
                    if(_layers[i].server === serverName) {
                        _layers.splice(i, 1);
                        $scope.layers.splice($scope.layers.indexOf(_layers[i]),1);
                    }
                }

                // remove tag if we remove all the layers associated with that tag.
                if(_layers.length === 0) {
                    _tag = null;
                }
                //_layers.forEach(function(layer) {
                //    if(layer.server === serverName) {
                //        var index = _layers.indexOf(layer);
                //        var length = _layers.length;
                //        _layers.splice(index,1);
                //    }
                //});
                //for(var i = 0; i < _layers.length; i++) {
                //    if(_layers[i].server === serverName) {
                //        _layers.splice(i, 1);
                //    }
                //}
            };

            self.getTag = function() {
                return _tag;
            };

            self.areAnyActive = function() {
                for (var i=0; i < _layers.length; i++) {
                    if (angular.isDefined(_layers[i].active) && _layers[i].active) {
                        return true;
                    }
                }

                return false;
            };

            self.areAllActive = function() {
                for (var i=0; i < _layers.length; i++) {
                    if (!angular.isDefined(_layers[i].active) || _layers[i].active === false) {
                        return false;
                    }
                }

                return true;
            };

            self.toggleChecked = function() {
                var setCheckedState = true;
                if (self.areAllActive()) {
                    setCheckedState = false;
                }

                for (var i=0; i < _layers.length; i++) {
                    if (_layers[i].active !== setCheckedState) {
                        $scope.datasetStateChanged(_layers[i].uid);
                        _layers[i].active = setCheckedState;
                    }
                }
            };

            self.getActiveLayers = function() {
                var result = [];
                for (var i=0; i < _layers.length; i++)
                {
                    if (_layers[i].active) {
                        result.push(_layers[i]);
                    }
                }
            };

            self.getLayers = function() {
                return _layers;
            };

            self.addLayer = function(layer) {
                _layers.push(layer);
            };

            self.removeLayer = function(layer) {
                _layers.slice(layer, 1);
            };

            return self;
        };

        $scope.DEBUG = opStateService.isDebug();

        $scope.layerExpanded = true;
        $scope.filter = '';
        $scope.tags = [];

        $scope.layersLoading = false;
        $scope.layers = [];
        $scope.layerGroups = null;

        // Leaflet objects
        $scope.map = null;
        $scope.leafletGroup = null;
        $scope.layerControl = null;

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

        var getLayerByUid = function(layers, uid) {
            for (var i=0; i < layers.length; i++) {
                if (layers[i].uid === uid) {
                    return layers[i];
                }
            }
        };

        var arrayIntersect = function(a, b) {
            for (var i=0; i < a.length; i++) {
                for (var j=0; j < b.length; j++) {
                    if (a[i].toLowerCase() === b[j].toLowerCase()) {
                        return true;
                    }
                }
            }

            return false;
        };

        var checkTagMatch = function(tags, tag) {
            for (var i=0; i < tags.length; i++) {
                if (tag.toLowerCase() === tags[i].toLowerCase()) {
                    return true;
                }
            }

            return false;
        };

        var groupLayers = function (layers, tags) {
            var unrecognized = [];
            var recognized = [];
            //var layerGroups = new LayerGroups();

            // First, bucket all layers in to whether the have recognized tags or not
            for (var i=0; i < layers.length; i++) {
                // Make sure there are metadata tags.  LayerGroups don't have them.
                if (layers[i].tags && arrayIntersect(layers[i].tags, tags)) {
                    recognized.push(layers[i]);
                }
                else {
                    unrecognized.push(layers[i]);
                }
            }

            // Group all layers with recognized tags
            for (i=0; i < tags.length; i++) {
                for (var j=0; j < recognized.length; j++) {
                    if (checkTagMatch(recognized[j].tags, tags[i]))
                    {
                        $scope.layerGroups.addLayer(recognized[j], tags[i]);
                    }
                }
            }

            // Add final uncategorized group for the rejects
            for (i=0; i < unrecognized.length; i++) {
                $scope.layerGroups.addLayer(unrecognized[i], 'UNCATEGORIZED');
            }

            //return layerGroups;
        };

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
            }
        };

        var exportData = function (exportGenerator, layer, bounds, spatialBounds, crs, url) {
            //var bounds = opStateService.getTimeBoundsFromTemporalFilter();
            if (angular.isDefined(layer.active) && layer.active !== null && layer.active) {
                var params = exportGenerator(layer, bounds[0], bounds[1], spatialBounds, crs);

                return url + '?' + $.param(params);
            }
        };

        // watch for wfs query from popup window, this could be refactored somewhere else.
        $scope.$on('queryWfs', function(e, layer) {
            var timeBounds = opStateService.getTimeBoundsFromTemporalFilter();
            var mapBounds = $scope.map.getFilterBounds();
            var spatialBounds;

            if (mapBounds.isValid() && angular.isDefined(layer) && angular.isDefined(layer.active) && layer.active !== null && layer.active && layer.fields.geometry) {
                spatialBounds = mapBounds.toBBoxString();
                var epsgCode = opStateService.getLeafletMapCRS();
                var filter = opFilterService.createWfsBBoxFilterRequestForLayer(layer, timeBounds[0], timeBounds[1],
                    spatialBounds, epsgCode);

                // TODO get this to work with multiple servers
                var server = opStateService.getServer(layer.server);
                opLayerService.getFilteredJsonFeatures(layer, filter).then(
                    function(result){
                        result.kmlUrl = exportData(opExportService.createKmlExportRequest,
                            layer, timeBounds, spatialBounds, epsgCode, server.url + '/wms/kml');
                        result.csvUrl = exportData(opExportService.createCsvExportRequest,
                            layer, timeBounds, spatialBounds, epsgCode, server.url + '/wfs');
                        result.shpUrl = exportData(opExportService.createShapefileExportRequest,
                            layer, timeBounds, spatialBounds, epsgCode, server.url + '/wfs');
                        result.rssUrl = exportData(opExportService.createGeoRSSExportRequest,
                            layer, timeBounds, spatialBounds, epsgCode, server.url + '/wfs');
                        opPopupWindow.broadcast( opStateService.getResultsWindow(), 'queryWfsResult', result);
                    },
                    function(reason){ console.log(reason); });
            }else{
                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'queryWfsResult', {error: 'nobbox'});
            }
        });

        $scope.$on('filters-updated', function() {
            var bounds = opStateService.getTimeBoundsFromTemporalFilter();

            for (var i=0; i < $scope.layers.length; i++)
            {
                var layer = $scope.layers[i];
                if (angular.isDefined(layer.active) && layer.active !== null && layer.active && layer.fields.time !== null) {
                    applyLayerFilters(layer, bounds[0], bounds[1]);
                }
            }
        });

        $scope.setFilter = function (filter) {
            $scope.filter = filter;
        };

        $scope.isLayerVisible = function(layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);
            if ($scope.filter === 'active') {
                return layer.active;
            }

            return true;
        };

        $scope.isGroupVisible = function(groupTag) {
            if ($scope.filter === '') {
                return true;
            }
            else if ($scope.filter === 'active') {
                var group = $scope.layerGroups.getGroupByTag(groupTag);

                if (group) {
                    if (group.areAnyActive())
                    {
                        return true;
                    }
                }

                return false;
            } else if (groupTag === $scope.filter) {
                return true;
            }
            return false;
        };

        $scope.datasetStateChanged = function (layerUid) {
            var layer = getLayerByUid($scope.layers, layerUid);

            if (layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined){
                console.log('disabling already enabled layer: \'' + layer.name + '\'');
                removeLayer(layer);

                // Disabling complete.  Get out of here
                return;
            }

            console.log('enabling layer: \'' + layer.name + '\'');

            //toaster.pop('wait', 'Date/Time', 'Identifying time metadata for ' + layer.title);

            // lets try adding layer to map
            // Oh, BTW zIndex is critical, as without overlays appear under baselayers when basselayers are switched
            if (zIndex >= maxZIndex) { zIndex = 50; }
            var server = opStateService.getServer(layer.server);
            var wmsLayer = L.tileLayer.wms(server.url + '/wms',
                opWebMapService.getLeafletWmsParams(layer.server, layer.name, layer.workspace, { tileSize: 512, zIndex: zIndex }));
            zIndex += 1;

            //opWebMapService.getLeafletWms(layer.title, layer.name, layer.workspace, {});
            layer.mapHandle = wmsLayer;

            // Is this layer time enabled?  Set relevant time values if so.
            opLayerService.getFields(layer).then(
                function (result) {
                    layer.fields = result;

                    // Verify time was set for this layer.. result will be undefined if not
                    if (result.time) {
                        console.log('Time fields identified. ' +
                            'Start: \'' + result.time.start.field + '\', ' +
                            'Stop: \'' + result.time.stop.field + '\'');
                        if (result.time.start.value && result.time.stop.value) {
                            console.log('Time values identified. ' +
                                'Start: \'' + result.time.start.value + '\', ' +
                                'Stop: \'' + result.time.stop.value + '\'');
                        }
                        else {
                            console.log('Time values were not identified as layer is not configured for WMS time');
                        }
                    }
                },
                function (reason) {
                    console.log('Couldn\'t identify time values for this layer... how embarrassing: ' + reason);
                    toaster.pop('note', 'Date/Time', 'Unable to detect time fields for layer \'' + layer.title + '\'.  Date/Time filtering will not be applied to this layer.');
                }
            )
                /* Regardless of time enablement, add layer to the map.  We are chaining behind time checking to ensure
                 time values are applied to layer before it is drawn on map so no expensive WMS requests are made
                 while asynchronous calls are made to determine dataset time fields. */
                .then(function() {
                    var timeBounds = opStateService.getTimeBoundsFromTemporalFilter();

                    /*
                     opLayerService.isDataPresent(layer, timeBounds[0], timeBounds[1]).then(
                     function(hasData) {
                     layer.hasData = hasData;
                     console.log('layer hasdata: ' + hasData);
                     }
                     );
                     */

                    applyLayerFilters(layer, timeBounds[0], timeBounds[1]);

                    addLayer(layer);
                    $rootScope.$broadcast('filters-updated');
                });
        };

        var layerLoadCompleteHandler = function(layer){
            if(layer.timeout){
                $timeout.cancel(layer.timeout);
            }
            layer.timeout = $timeout(function(){
                layer.loading = false;
                console.log('Tiles loaded for layer ' + layer.name);
            }, 0, true);
        };

        var updateLayerLoadComplete = function(e) {
            for (var i=0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (layer.mapHandle === e.target) {
                    layerLoadCompleteHandler(layer);
                    break;
                }
            }
        };

        var layerLoadStartHandler = function(layer){
            if(layer.timeout){
                $timeout.cancel(layer.timeout);
            }
            layer.timeout = $timeout(function(){
                layer.loading = true;
                console.log('Loading tiles for layer ' + layer.name);
            }, 0, true);
        };

        var updateLayerLoadStart = function(e) {
            for (var i=0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if (layer.mapHandle === e.target) {
                    layerLoadStartHandler(layer);
                    break;
                }
            }
        };

        /**
         * Handle all layer addition to leaflet and state changes required
         * @param layer
         */
        var addLayer = function(layer) {
            if (!$scope.map.hasLayer(layer.mapHandle)) {
                layer.mapHandle.on('loading', updateLayerLoadStart);
                layer.mapHandle.on('load', updateLayerLoadComplete);

                $scope.map.addLayer(layer.mapHandle);

                opStateService.addDataset(layer.server + ':' + layer.workspace + ':' + layer.name);

                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'updateFilters',
                    _.filter($scope.layers, function (l){
                        return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                    }));
            }
        };

        /**
         * Handle all layer removal from leaflet and state changes required
         * @param layer
         */
        var removeLayer = function(layer) {
            layer.params = null;
            layer.mapHandle.off('loading', updateLayerLoadStart);
            layer.mapHandle.off('load', updateLayerLoadComplete);
            $scope.map.removeLayer(layer.mapHandle);

            layer.mapHandle = null;

            opStateService.removeDataset(layer.server + ':' + layer.workspace + ':' + layer.name);

            opPopupWindow.broadcast( opStateService.getResultsWindow(), 'updateFilters',
                _.filter($scope.layers, function (l){
                    return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                }));
        };



        var clearLayers = function() {
            var leafletGroup = $scope.leafletGroup;
            if (leafletGroup !== null){
                for (var i=0; i < $scope.layers.length; i++) {
                    var layer = $scope.layers[i];
                    if (layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined)
                    {
                        $scope.map.removeLayer(layer.mapHandle);
                        layer.mapHandle = null;
                        layer.active = false;
                    }
                }
            }
        };

        var clearServerSpecificLayers = function(serverName) {
            for (var i=0; i < $scope.layers.length; i++) {
                var layer = $scope.layers[i];
                if(layer.active && layer.mapHandle !== null && layer.mapHandle !== undefined && layer.server === serverName) {
                    removeLayer(layer);
                }
            }
        };

        var updateLayerSelections = function() {
            var datasets = opStateService.getDatasets();

            for (var i = 0; i < datasets.length; i++) {
                var splitDataset = datasets[i].split(':');
                var dataset = { name: splitDataset[2], workspace: splitDataset[1], server: splitDataset[0] };

                var found = false;
                // Attempt to configure based on query parameter repr of filters
                for (var j = 0; j < $scope.layers.length; j++) {
                    var layer = $scope.layers[j];

                    if (layer.name === dataset.name && layer.workspace === dataset.workspace && layer.server === dataset.server) {
                        // Yay, we found our layer in configured datasource... we can break out now.
                        // if the layer is already active, don't try to change it's state.
                        if(!layer.active) {
                            layer.active = true;
                            $scope.datasetStateChanged(layer.uid);
                        }
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    toaster.pop('error', 'Configuration Error', 'Unable able to find \'' + dataset + '\' in selected data source.');
                }
            }

        };

        // this is for refresh datasets button in debug mode
        $scope.updateAllLayers = function() {
            var servers = opStateService.getActiveServer();
            for(var i = 0; i < servers.length; i++) {
                clearServerSpecificLayers(servers[i].name);
                $scope.layerGroups.turnServerOff(servers[i].name);
                $scope.updateLayers(true, servers[i].name);
            }
        };

        $scope.$on('refresh-server', function(event, args) {
            var datasets = opStateService.getDatasets().slice(0);
            var serverData = args;
            var activeServers = opStateService.getActiveServer();
            if(activeServers.indexOf(serverData) != -1) {
                console.log('Refreshing server ' + serverData.name);
                clearServerSpecificLayers(serverData.name);
                $scope.layerGroups.turnServerOff(serverData.name);
                $scope.updateLayers(true, serverData.name);
                //opStateService.setDatasets(datasets);
            }
            //for (var i = 0; i < datasets.length; i++) {
            //    var splitDataset = datasets[i].split(':');
            //    var dataset = {name: splitDataset[2], workspace: splitDataset[1], server: splitDataset[0]};
            //
            //    var found = false;
            //    // Attempt to configure based on query parameter repr of filters
            //    for (var j = 0; j < $scope.layers.length; j++) {
            //        var layer = $scope.layers[j];
            //
            //        if (layer.name === dataset.name && layer.workspace === dataset.workspace && layer.server === dataset.server) {
            //            // Yay, we found our layer in configured datasource... we can break out now.
            //            // if the layer is already active, don't try to change it's state.
            //            //if (!layer.active) {
            //                layer.active = false;
            //                $scope.datasetStateChanged(layer.uid);
            //            //}
            //            found = true;
            //            break;
            //        }
            //    }
            //}
        });

        $scope.updateLayers = function(force, serverName) {
            var server = opStateService.getServer(serverName);
            var previousActiveServerCount = opStateService.getPreviouslyActiveServer().length;

            server.loading = true;

            // attempting to not display 'servers loading' when loading the 2nd server
            if(previousActiveServerCount > 0) {
                $scope.layersLoading = false;
            } else {
                $scope.layersLoading = true;
            }

            // if no servers are configured, we're clearing all the layers like it was the first time
            // we're using the app.
            if(previousActiveServerCount === 0) {
                clearLayers();
            }

            opLayerService.getLayers(force, serverName).then(function (layers) {
                var server = opStateService.getServer(serverName);
                server.loading = false;
                $scope.layersLoading = false;
                // Give layers a uid so that we pass reference to it within the controller
                // added a multiplier here for "sever number"... assuming there isn't over 1000 layers,
                // adjust multiplier if there is over 1000 layers.
                var serverNum = opStateService.getServerNumByName(serverName);
                var uidStart = serverNum * 1000;
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    layer.uid = uidStart+i;
                    layer.legendGraphic = opWebMapService.getLegendGraphicUrl(serverName, layer.workspace + ':' + layer.name);
                }
                groupLayers(layers, opConfig.recognizedTags);
                $scope.tags = $scope.tags.concat($scope.layerGroups.getGroupTags());
                $scope.layers = $scope.layers.concat(layers);

            }, function (reason) {
                $scope.layersLoading = false;
                toaster.pop('error', 'Configuration Error', 'Unable to retrieve layers... is your GeoServer running?\n' + reason);
            }).
              then(function () {
                  updateLayerSelections();
              });
        };

        // THIS GUY BASICALLY BOOTSTRAPS ALL LAYERS INTO THE APP
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

        this.resetLayerData = function() {
            $scope.layerGroups = new LayerGroups();
            $scope.tags = [];
            //$scope.layerGroups = null;
            $scope.layers = []
        };


        this.resetAndLoadLayers = function() {
            opStateService.setActiveServer('all');
            var servers = opStateService.getActiveServer();
            this.resetLayerData();
            if(opStateService.getActiveServer() !== undefined) {
                for (var i = 0; i < servers.length; i++) {
                    servers[i].active = true;
                    $scope.initializeLayers(servers[i].name);
                    // if we want servers defaulted on, set active to true
                    // to highlight the header bar control as active
                }
            }
        };

        this.resetAndLoadLayers();

        $scope.friendlyLayer = function() {
            var activeLayers = opStateService.getDatasets();
            return activeLayers.length + ' enabled';
        };

        //
        $scope.$on('servers-updated', function(event, args) {
            //console.log('args: ' + JSON.stringify(args));
            var serversOn = args[0];
            var serversOff = args[1];
            //console.log('servers on: ' + serversOn);
            //console.log('servers off: ' + serversOff);

            serversOn.forEach(function(server) {
                $scope.turnServerOn(server.name);

            });

            serversOff.forEach(function(server) {
                $scope.turnServerOff(server.name);
            });
        });

        $scope.turnServerOn = function(server) {
            $scope.initializeLayers(server);
        };

        $scope.turnServerOff = function(server) {
            $scope.layerGroups.turnServerOff(server);
            clearServerSpecificLayers(server);
        };

        opPopupWindow.on('resultsHeartbeat', function (win){
            if (!opStateService.getResultsWindow()){
                opStateService.setResultsWindow(win);
                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'updateFilters',
                    _.filter($scope.layers, function (l){
                        return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                    }));
            }
        });
        opPopupWindow.on('resultsInit', function (win){
            opStateService.setResultsWindow(win);
            opPopupWindow.broadcast( opStateService.getResultsWindow(), 'updateFilters',
                _.filter($scope.layers, function (l){
                    return _.contains(opStateService.getDatasets(), l.server + ':' + l.workspace + ':' + l.name);
                }));
        });
    });
