/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/17/2014
 ---------------------------------*/

angular.module('opApp.query')
    .service('opExportService',
        function (opConfig, opFilterService, opStateService) {
            'use strict';

            /**
             * Get a KML export from the OGC service
             * @param layer         layer we are interested in
             * @param startTime     start time to filter on
             * @param stopTime      stop time to filter on
             * @param spatialBounds spatial bounds to filter on
             */
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

            /**
             * Get a WFS export file for the specified format (CSV, shapefile, or GeoRSS)
             * @param outputFormat
             * @param layer         layer we are interested in
             * @param startTime     start time to filter on
             * @param stopTime      stop time to filter on
             * @param spatialBounds spatial bounds to filter on
             */
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

            /**
             * Get the URL for the the OGC service to create a CSV export file
             * @param layer         layer we are interested in
             * @param startTime     start time to filter on
             * @param stopTime      stop time to filter on
             * @param spatialBounds spatial bounds to filter on
             */
            this.createCsvExportRequest = function (layer, startTime, stopTime, spatialBounds) {
                return createWfsExportRequest('csv', layer, startTime, stopTime, spatialBounds);
            };

            /**
             * Get the URL for the the OGC service to create a shapefile export file
             * @param layer         layer we are interested in
             * @param startTime     start time to filter on
             * @param stopTime      stop time to filter on
             * @param spatialBounds spatial bounds to filter on
             */
            this.createShapefileExportRequest = function (layer, startTime, stopTime, spatialBounds) {
                return createWfsExportRequest('SHAPE-ZIP', layer, startTime, stopTime, spatialBounds);
            };

            /**
             * Get the URL for the the OGC service to create a geoRSS export file
             * @param layer         layer we are interested in
             * @param startTime     start time to filter on
             * @param stopTime      stop time to filter on
             * @param spatialBounds spatial bounds to filter on
             */
            this.createGeoRSSExportRequest = function (layer, startTime, stopTime, spatialBounds) {
                return createWfsExportRequest('GeoRSS', layer, startTime, stopTime, spatialBounds);
            };
        }
    );
