/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/17/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opExportService',
    function (opConfig, opFilterService, opStateService) {
        'use strict';

        this.createKmlExportRequest = function (layer, startTime, stopTime, spatialBounds) {
            var server = opStateService.getServer(layer.server);
            var wmsVersion = server.wmsVersion;
            //var filters = opFilterService.createWmsBboxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);
            var filters = opFilterService.createWmsIntersectsFilterRequestForLayer(layer, startTime, stopTime, spatialBounds);
            return angular.extend(filters,
                {
                    layers: layer.workspace + ':' + layer.name,
                    version: wmsVersion,
                    mode: 'download'
                });
        };

        var createWfsExportRequest = function (outputFormat, layer, startTime, stopTime, spatialBounds) {
            var server = opStateService.getServer(layer.server);
            var wfsVersion = server.wfsVersion;
            //var filters = opFilterService.createWfsBBoxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);
            var filters = opFilterService.createWfsIntersectsFilterRequestForLayer(layer, startTime, stopTime, spatialBounds);

            return angular.extend(filters,
                {
                    version: wfsVersion,
                    request: 'GetFeature',
                    typeName: layer.workspace + ':' + layer.name,
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
