/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp')
    .service('opStateService', function State($q, $rootScope, $location, $route, $timeout, L, moment, opConfig, $log) {
        'use strict';
        var self = this;
        var state = {};
        var lastMapBounds = null;
        var lastBBoxBounds = null;
        var lastDatasetsValue = null;

        var datasetId = 'datasets';
        var dateId = 'temporal';
        var boundsId = 'map-bounds';
        var bboxId = 'bbox-bounds';
        var customFilterId = 'custom-cql';
        var debounceTimer = {};

        var mapState = {};

        var resultsWindow;
        var leafletMap;
        var leafletMapCRS;
        var leafletLayerControl;

        var activeServer = [];
        var previousActiveServer = [];

        this.getDatasetsId = function() {
            return datasetId;
        };

        this.getResultsWindow = function () {
          return resultsWindow;
        };

        this.setResultsWindow = function (value) {
          resultsWindow = value;
        };

        this.setLeafletMapCRS = function(CRS) {
            leafletMapCRS = CRS;
        };

        this.getLeafletMapCRS = function() {
            return leafletMapCRS;
        };

        this.setLeafletMap = function(map) {
            leafletMap = map;
        };

        this.getLeafletMap = function () {
            var deferred = $q.defer();
            var self = this;

            if (!angular.isDefined(leafletMap)) {
                $timeout(function() {
                    deferred.resolve(self.getLeafletMap());
                },500);
            }
            else {
                deferred.resolve(leafletMap);
            }

            return deferred.promise;
        };

        this.setLayerControl = function(control) {
            leafletLayerControl = control;
        };

        this.getLayerControl = function () {
            var deferred = $q.defer();
            var self = this;

            if (!angular.isDefined(leafletLayerControl)) {
                $timeout(function() {
                    deferred.resolve(self.getLayerControl());
                },500);
            }
            else {
                deferred.resolve(leafletLayerControl);
            }

            return deferred.promise;
        };

        var serializeState = function () {
            $location.search(state);
        };

        var deserializeState = function () {
            state = $location.search();
        };

        this.getState = function (stateId) {
            deserializeState();
            return state[stateId];
        };

        this.isDebug = function () {
            var debug = this.getState('debug');

            if (angular.isDefined(debug) && debug !== null) {
                debug = JSON.parse(debug.toLowerCase());
            }
            else {
                debug = false;
            }

            return debug;
        };

        this.setState = function (stateId, value) {
            state[stateId] = value;
            serializeState();
        };

        /**
         * Expects to find coordinate bounds in the following comma delimited format: west,north,east,south
         * @returns {*}
         */
        var parseBBoxIntoBounds = function (bboxString) {
            var bounds;
            if (bboxString) {
                var coords = bboxString.split(',');
                if (coords.length === 4) {
                    bounds = L.latLngBounds({lon: coords[0], lat: coords[1]}, {lon: coords[2], lat: coords[3]});
                }
                else {
                    $log.log('Unrecognized format of bounds parameter: ' + bboxString);
                }
            }

            return bounds;
        };

        /**
         * Expects to find coordinate bounds in the following comma delimited format: west,north,east,south
         * @returns {*}
         */
        this.getBounds = function() {
            var bounds = this.getState(boundsId);

            // Setting last checker on initialization only
            // without this toggling a layer or changing time re-pans mat to location in querystring
            if (lastMapBounds === null) {
                lastMapBounds = bounds;
            }

            return parseBBoxIntoBounds(bounds);
        };

        /**
         * Expects to find coordinate bounds in the following comma delimited format: west,north,east,south
         * @returns {*}
         */
        this.getAttributeBounds = function() {
            var bounds = this.getState(bboxId);

            // Setting last checker on initialization only
            // without this toggling a layer or changing time recreates bbox at location in querystring
            if (lastBBoxBounds === null) {
                lastBBoxBounds = bounds;
            }

            return parseBBoxIntoBounds(bounds);
        };

        this.newGetAttributeBounds = function() {
            var bounds = this.getState(bboxId);
            return bounds;
        };

        this.setBounds = function(bounds) {
            mapState[boundsId] = bounds.toBBoxString();
        };

        this.setAttributeBBox = function(bounds) {
            if (bounds) {
                mapState[bboxId] = bounds.toBBoxString();
            }
            else {
                delete mapState[bboxId];
                // If bbox is on the query string remove it when cancels happen
                if (state[bboxId]){
                    delete state[bboxId];
                    serializeState();
                }
            }
        };

        this.setAttributeBBoxText = function(bounds) {
            if (bounds) {
                mapState[bboxId] = bounds;
                debounceBroadcast('bounds-text-updated', bounds);
            }
            else {
                debounceBroadcast('bounds-text-updated','');
                delete mapState[bboxId];
                // If bbox is on the query string remove it when cancels happen
                if (state[bboxId]){
                    delete state[bboxId];
                    serializeState();
                }
            }
        };

        this.setAttributeBBoxCurrentBounds = function() {
            debounceBroadcast('bounds-current-bounds');
        };

        this.setAttributeBBoxCountry = function(geoJsonBounds, countryBboxList) {
            if(countryBboxList) {
              mapState[bboxId] = countryBboxList;
            }
            // dont use debounce broadcast here
            $rootScope.$broadcast('bounds-country-bounds', geoJsonBounds);
        };

        this.setAttributeBBoxFile = function(geoJsonBounds) {
          $rootScope.$broadcast('bounds-file-bounds', geoJsonBounds);
        };

        this.removeAttributeBBoxCountry = function(bounds) {
          var countryList = mapState[bboxId];
          var country = bounds.id;

          if(countryList.indexOf(country) > -1) {
            // exists
            var countryIdent = 'country:';
            var countryString = countryList.substring(countryIdent.length,countryList.length);
            var countries = countryString.split(',');
            countries.splice(countryString.indexOf(country), 1);
            var newString = countryIdent + countries.join(',');
            // if we end up deleting the last country, remove bbox from our state
            if(newString === countryIdent) {
              delete mapState[bboxId];
              if (state[bboxId]){
                delete state[bboxId];
                serializeState();
              }
            } else {
              mapState[bboxId] = newString;
            }
          }
            debounceBroadcast('remove-country-bounds', bounds);
        };

        this.setAttributeBboxPolyCircle = function(circleString) {
          if(circleString) {
            mapState[bboxId] = circleString;
          }
        };

        this.getPermalink = function() {
            var self = this;

            // Save state
            var initialState = state;

            angular.forEach(mapState, function(value, key) {
                self.setState(key, value);
            });

            var location = $location.absUrl();
            state = initialState;
            // Shove original state back out
            serializeState();

            return location;
        };

        this.getTemporalFilter = function() {
            var filter = this.getState(dateId);
            if (filter === undefined) {
                // default to default days back configured in opConfig
                filter = 'D' + opConfig.defaultDaysBack + 'd';
                this.setState(dateId, filter);
            }

            // Used if validation of input filter fails.
            var fallbackFilter = {
                type: 'duration',
                interval: 'd',
                value: opConfig.defaultDaysBack
            };

            // Duration handling
            if (filter.substring(0, 1) === 'D') {
                var interval = filter.substring(filter.length - 1).toLowerCase();
                var value = parseInt(filter.substring(1, filter.length - 1));

                if (['d','h','w'].indexOf(interval) === -1)
                {
                    $log.log('Unable to identify a valid interval type in duration from temporal filter \'' +
                        filter + '\'. Setting to default');
                    filter = fallbackFilter;
                }
                else {
                    filter = {
                        type: 'duration',
                        interval: interval,
                        value: value
                    };
                }
            }
            // Range handling
            else if (filter.substring(0, 1) === 'R') {
                var startTime, stopTime;
                var range = filter.substring(1, filter.length - 1).split(',');

                // Verify that we have only 2 elements - start, stop time
                if (range.length === 2) {
                    startTime = moment.utc(range[0], 'YYYY-MM-DDTHH:mm:ss');
                    stopTime = moment.utc(range[1], 'YYYY-MM-DDTHH:mm:ss');
                }
                else {
                    $log.log('Unable to identify a valid range in temporal filter \'' + filter + '\'.');
                    stopTime = moment();
                    startTime = moment(stopTime).subtract('d', opConfig.defaultDaysBack);
                }

                filter = {
                    type: 'range',
                    start: startTime,
                    stop: stopTime
                };
            }
            else {
                $log.log('Unable to identify a valid temporal filter from \'' + filter + '\'. ' +
                    'Defaulting to duration.');
                filter = fallbackFilter;
            }

            return filter;
        };

        this.getDatasets = function () {
            var datasets = this.getState(datasetId);
            if (datasets === undefined) {
                datasets = [];
            }
            else if (typeof datasets === 'string') {
                datasets = [ datasets ];
            }

            return datasets;
        };

        this.setDatasets = function (datasets) {
            this.setState(datasetId, datasets);
            //debounceBroadcast('filters-updated', null);
            debounceBroadcast('layer-selection-changed', datasets);

        };

        this.addDataset = function(name) {
            var datasets = this.getDatasets();

            if (datasets.indexOf(name) === -1) {
                datasets.push(name);
            }
            this.setDatasets(datasets);
        };

        this.removeDataset = function(name) {
            var datasets = this.getDatasets();

            if (~datasets.indexOf(name)) {
                datasets.splice(datasets.indexOf(name), 1);
            }
            this.setDatasets(datasets);
        };

        this.getTimeBoundsFromTemporalFilter = function() {
            var filter = this.getTemporalFilter();

            var startTime, stopTime;

            // Duration handling
            if (filter.type === 'duration') {
                stopTime = moment().endOf('hour').utc();
                startTime = moment(stopTime).subtract(filter.interval, filter.value).startOf('hour').utc();
            }
            // Range handling
            else if (filter.type === 'range') {
                startTime = filter.start;
                stopTime = filter.stop;
            }

            return [startTime, stopTime];
        };

        this.setDuration = function(interval, value) {
            var originalValue = this.getState(dateId);
            var filter = 'D' + value.toString() + interval;

            if (originalValue !== filter) {
                this.setState(dateId, filter);

                debounceBroadcast('filters-updated', 'temporal');
            }
        };

        this.setTimeRange = function(startTime, stopTime) {
            var originalValue = this.getState(dateId);
            var filter =
                'R' + startTime.format('YYYY-MM-DDTHH:mm:ss\\Z') + ',' +
                stopTime.format('YYYY-MM-DDTHH:mm:ss\\Z');

            if (originalValue !== filter) {
                this.setState(dateId, filter);

                debounceBroadcast('filters-updated', 'temporal');
            }
        };

        var debounceBroadcast = function (message, args) {
            if(debounceTimer[message]){
                $timeout.cancel(debounceTimer[message]);
            }
            debounceTimer[message] = $timeout(function(){
                $rootScope.$broadcast(message, args);
            }, 500);
        };


        this.getCustomFilter = function() {
            var filters = this.getState(customFilterId);
            var result = {};
            if (angular.isDefined(filters)) {
                filters = filters.split(';');
                for (var i=0; i < filters.length; i++) {
                    var firstIndex = filters[i].indexOf('=');
                    var filter = [filters[i].slice(0,firstIndex), filters[i].slice(firstIndex + 1)];
                    if (filter.length === 2) {
                        result[filter[0]] = filter[1];
                    }
                }
            }

            return result;
        };

        this.getCustomFilterByLayer = function(namespacedName) {
            var result = this.getCustomFilter();

            if (namespacedName in result) {
                return result[namespacedName];
            }

            return null;
        };

        // sometimes we need to figure out what servers are configured to be allowed to be turned on/off
        // this returns a JSON object of the server by the server's configured name
        this.getServerByConfig = function(serverName) {
            for(var i = 0; i < opConfig.servers.length; i++) {
                if(opConfig.servers[i].name === serverName) {
                    return opConfig.servers[i];
                }
            }
        };

        $rootScope.$on('$routeUpdate', function() {
            // If changes are detected in map state params push out broadcast
            // We only broadcast if there is a new filter
            var boundsValue = self.getState(boundsId);
            var bboxValue = self.getState(bboxId);
            var datasetsValue = self.getState(datasetId);
            if (angular.isDefined(boundsValue) && lastMapBounds !== boundsValue) {
                lastMapBounds = boundsValue;
                debounceBroadcast('map-state-updated');
            }
            else if (angular.isDefined(bboxValue) && lastBBoxBounds !== bboxValue) {
                lastBBoxBounds = bboxValue;
                debounceBroadcast('bounds-from-route', bboxValue);
                debounceBroadcast('map-state-updated');
            }
            else if (angular.isDefined(datasetsValue) && lastDatasetsValue !== datasetsValue) {
                lastDatasetsValue = datasetsValue;
                // loop through the datasets that are in the url, and turn on the servers that
                // the user wants us to use
                var serversOn = previousActiveServer;
                if(datasetsValue.constructor === Array) {
                    angular.forEach(datasetsValue, function (dataset) {
                        // serverName:workspace:layerName
                        var serverName = dataset.split(':')[0];
                        var server = self.getServerByConfig(serverName);
                        if (serversOn.indexOf(server) === -1) {
                            serversOn.push(server);
                        }
                    });
                } else {
                    var serverName = datasetsValue.split(':')[0];
                    if (serversOn.indexOf(serverName) === -1) {
                        var server = self.getServerByConfig(serverName);
                        serversOn.push(server);
                    }
                }
                if (serversOn.length > 0) {
                    previousActiveServer = activeServer;
                    activeServer = serversOn;
                    self.compareServers();
                }
            }
            debounceBroadcast('filters-updated', null);
        });

        this.setAllServersActive = function() {
            activeServer = opConfig.servers;
            previousActiveServer = activeServer;
        };

        // this is from HeaderController to set active servers based on header tabs
        this.setActiveServer = function(serverName) {
            for (var i = 0; i < opConfig.servers.length; i++) {
              if (serverName === opConfig.servers[i].name) {
                  activeServer = new Array(opConfig.servers[i]);
                  return;
              }
            }

            if(previousActiveServer.length === 0) {
                previousActiveServer = activeServer;
            }
        };

        // returns the active server (array) info
        this.getActiveServer = function() {
          return activeServer;
        };

        // returns the previously activer server (array) info
        this.getPreviouslyActiveServer = function() {
            return previousActiveServer;
        };

        // returns the configured index of the server based on the server's name
        // used primarily for layer UID generation (to differentiate between same-named layers, but on diff. servers)
        this.getServerNumByName = function(serverName) {
            for(var i = 0; i < opConfig.servers.length; i++) {
                if(opConfig.servers[i].name === serverName) {
                    return i;
                }
            }
        };

        // get the server JSON object based on the server name (from ACTIVE servers, not config'd servers)
        this.getServer = function(serverName) {
            for(var i = 0; i < activeServer.length; i++) {
                if(activeServer[i].name === serverName) {
                    return activeServer[i];
                }
            }
        };

        // set the active server info (based on the header controller tab toggles)
        this.setActiveServerData = function(serverData) {
            var activeServers = [];
            serverData.forEach(function(server) {
                if(server.active) {
                    activeServers.push(server);
                }
            });
            previousActiveServer = activeServer;
            activeServer = activeServers;
            this.compareServers();
        };

        // essentially do a diff between activeServer and previouslyActiveServer to figure out
        // which servers we need to "turn off" and "turn on"
        this.compareServers = function() {
            // servers to turn off are those that ARE in previousActiveServer but ARE NOT in activeServer
            var serversToTurnOff = [];

            // servers to turn on are those that ARE NOT in previousActiveServer but ARE in activeServer
            var serversToTurnOn = [];

            serversToTurnOff.forEach(function (server) {
                $log.log(server);
            });

            // this is ugly, but I want to get something working before revisiting logic.
            // we're essentially doing a diff between old and new servers to figure out
            // who to turn "on" and who to turn "off"
            if (previousActiveServer.length === 0) {
                serversToTurnOn = activeServer;
            } else if (activeServer.length === 0) {
                serversToTurnOff = previousActiveServer;
            } else {
                previousActiveServer.forEach(function (oldServer) {
                    var found = false;
                    activeServer.forEach(function (newServer) {
                        if (newServer.name === oldServer.name) {
                            found = true;
                        }
                    });
                    if (!found) {
                        serversToTurnOff.push(oldServer);
                    }
                });

                activeServer.forEach(function(newServer) {
                    var found = false;
                    previousActiveServer.forEach(function (oldServer) {
                        if(oldServer.name === newServer.name) {
                            found = true;
                        }
                    });
                    if(!found) {
                        serversToTurnOn.push(newServer);
                    }
                });
            }

            $log.log('Turning on: ' + JSON.stringify(serversToTurnOn));
            $log.log('Turning off: ' + JSON.stringify(serversToTurnOff));

            // LayerController actually handles the "turn off" and "turn on" controls.
            $timeout(function(){
                $rootScope.$broadcast('servers-updated', [serversToTurnOn, serversToTurnOff]);
            }, 500);

            // after turning on active servers, cache our state of servers on
            previousActiveServer = activeServer;

        };
    }
);
