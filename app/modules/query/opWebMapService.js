/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opWebMapService',
        function ($q, $http, opConfig, opStateService, $log) {
            'use strict';

            /**
             * Perform a WMS GetCapabilities request against the configured data source
             *
             * @returns {*}
             */
            this.getCapabilities = function (serverName) {

                var deferred = $q.defer();
                var server = opStateService.getServer(serverName);
                var version = server.wmsVersion;

                $log.log('Requesting capabilities from server ' + server.name);

                var params = {version: version, request: 'GetCapabilities'};
                var url = server.ajaxUrl + '/wms';
                if (!!server.getCapabilitiesUrl) {
                    url = server.getCapabilitiesUrl;
                }

                $http.get(url, {params: params}).then(function (result) {
                    $log.log('Successfully retrieved GetCapabilities result.');
                    deferred.resolve(result);
                }, function (reason) {
                    // error
                    var error = 'Error retrieving GetCapabilities result: ' + reason.data;
                    $log.log(error);
                    deferred.reject(reason);
                });

                return deferred.promise;
            };

            /**
             * Get leaflet map parameters for OGC querying
             * @param serverName    servername for getting layers from
             * @param name          layer name
             * @param workspace     layer's workspace name
             * @param params        params we already known
             */
            this.getLeafletWmsParams = function (serverName, name, workspace, params) {
                var server = opStateService.getServer(serverName);
                var workspacedLayer = workspace + ':' + name;
                return angular.extend(
                    {
                        transparent: true,
                        format: 'image/png',
                        version: server.wmsVersion,
                        layers: workspacedLayer,
                        maxfeatures: opConfig.wmsFeatureLimiter
                    }, params);
            };

            /**
             * Get the leaflet basemap parameters for OGC querying
             * @param layerName     layername
             * @param params        parameters we already know
             */
            this.getLeafletWmsBasemapParams = function (layerName, params) {
                return angular.extend(
                    {
                        format: 'image/jpeg',
                        layers: layerName
                    }, params);
            };

            /**
             * Get the legend graphic's URL from the OGC service for the layer
             * @param serverName    server name to interact with
             * @param layerName     layer we are interested in
             * @param legendOptions legend options for font, etc.
             * @returns {string}    the URL
             */
            this.getLegendGraphicUrl = function (serverName, layerName, legendOptions) {
                var server = opStateService.getServer(serverName);
                var options = angular.extend({
                    forceLabels: 'on',
                    fontName: 'Helvetica',
                    fontAntiAliasing: true,
                    fontSize: 12,
                    fontColor: '0xFFFFFF'
                }, legendOptions);

                var optionsArray = [];
                angular.forEach(options, function (value, key) {
                    optionsArray.push(key + ':' + value);
                });

                var params =
                {
                    version: server.wmsVersion,
                    request: 'GetLegendGraphic',
                    format: 'image/png',
                    transparent: true,
                    layer: layerName,
                    /* jshint ignore:start */
                    legend_options: optionsArray.join(';')
                    /* jshint ignore:end */
                };

                var url = server.ajaxUrl + '/wms';
                return url + '?' + $.param(params);
            };
        });
