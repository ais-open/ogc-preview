/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/17/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opExportService',
    function (opConfig, opFilterService, opStateService) {
        'use strict';

        // moved these variables to multiple server variant (each function gets the server its working with)
        //var WFS_VERSION = opConfig.server.wfsVersion;
        //var WMS_VERSION = opConfig.server.wmsVersion;

        this.createKmlExportRequest = function (layer, startTime, stopTime, spatialBounds, crs) {
            var server = opStateService.getServer(layer.server);
            var wfsVersion = server.wfsVersion;
            var wmsVersion = server.wmsVersion;
            var filters = opFilterService.createWmsBboxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);

            return angular.extend(filters,
                {
                    layers: layer.server + ':' + layer.workspace + ':' + layer.name,
                    version: wmsVersion,
                    mode: 'download'
                });
        };

        var createWfsExportRequest = function (outputFormat, layer, startTime, stopTime, spatialBounds, crs) {
            var server = opStateService.getServer(layer.server);
            var wfsVersion = server.wfsVersion;
            var wmsVersion = server.wmsVersion;
            var filters = opFilterService.createWfsBBoxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);

            return angular.extend(filters,
                {
                    version: wfsVersion,
                    request: 'GetFeature',
                    typeName: layer.server + ':' + layer.workspace + ':' + layer.name,
                    outputFormat: outputFormat
                });
        };

        this.createCsvExportRequest = function (layer, startTime, stopTime, spatialBounds) {
            return createWfsExportRequest('csv', layer, startTime, stopTime, spatialBounds);
        };

        this.createShapefileExportRequest = function (layer, startTime, stopTime, spatialBounds) {
            return createWfsExportRequest('SHAPE-ZIP', layer, startTime, stopTime, spatialBounds);
        };

        this.createGeoRSSExportRequest = function (layer, startTime, stopTime, spatialBounds) {
            return createWfsExportRequest('GeoRSS', layer, startTime, stopTime, spatialBounds);
        };
    }
);