/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/17/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opExportService',
    function (opConfig, opFilterService) {
        'use strict';

        var WFS_VERSION = opConfig.server.wfsVersion;
        var WMS_VERSION = opConfig.server.wmsVersion;

        this.createKmlExportRequest = function (layer, startTime, stopTime, spatialBounds, crs) {
            var filters = opFilterService.createWmsBboxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);

            return angular.extend(filters,
                {
                    layers: layer.workspace + ':' + layer.name,
                    version: WMS_VERSION,
                    mode: 'download'
                });
        };

        var createWfsExportRequest = function (outputFormat, layer, startTime, stopTime, spatialBounds, crs) {
            var filters = opFilterService.createWfsBBoxFilterRequestForLayer(layer, startTime, stopTime, spatialBounds, crs);

            return angular.extend(filters,
                {
                    version: WFS_VERSION,
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