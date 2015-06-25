/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp')
    .service('opStateService', function State($q, $rootScope, $location, $timeout, L, moment, opConfig) {
        'use strict';

        var self = this;
        var state = {};
        var lastMapBounds = null;
        var lastBBoxBounds = null;

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
                    console.log('Unrecognized format of bounds parameter: ' + bboxString);
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
                    console.log('Unable to identify a valid interval type in duration from temporal filter \'' +
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
                    console.log('Unable to identify a valid range in temporal filter \'' + filter + '\'.');
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
                console.log('Unable to identify a valid temporal filter from \'' + filter + '\'. ' +
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
                stopTime = moment().endOf('hour');
                startTime = moment(stopTime).subtract(filter.interval, filter.value).startOf('hour');
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

        $rootScope.$on('$routeUpdate', function() {
            // If changes are detected in map state params push out broadcast
            // We only broadcast if there is a new filter
            var boundsValue = self.getState(boundsId);
            var bboxValue = self.getState(bboxId);
            if (angular.isDefined(boundsValue) && lastMapBounds !== boundsValue) {
                lastMapBounds = boundsValue;
                debounceBroadcast('map-state-updated');
            }
            else if (angular.isDefined(bboxValue) && lastBBoxBounds !== bboxValue) {
                lastBBoxBounds = bboxValue;
                debounceBroadcast('map-state-updated');
            }

            debounceBroadcast('filters-updated', null);
        });

        this.setActiveServer = function(serverName) {
          if(serverName == 'all') {
              this.activeServer = opConfig.servers;
          } else {
              for (var i = 0; i < opConfig.servers.length; i++) {
                  if (serverName == opConfig.servers[i].name) {
                      this.activeServer = new Array(opConfig.servers[i]);
                      return;
                  }
              }
              // default to all servers
              this.activeServer = new Array(opConfig.servers);
          }
        };

        this.getActiveServer = function() {
          return this.activeServer;
        };

        this.getServerNameByIndex = function(serverIndex) {
          return this.activeServer[serverIndex].name;
        };

        this.setActiveServerData = function(serverData) {
            var activeServers = [];
            serverData.forEach(function(server) {
                if(server.active) {
                    activeServers.push(server);
                }
            });
            this.activeServer = activeServers;
            console.log('servers active: ' + JSON.stringify(activeServers));
            //console.log('server changed, new data: ' + JSON.stringify(server));
        };
    }
);