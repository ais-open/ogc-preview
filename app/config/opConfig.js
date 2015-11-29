
angular.module('opApp')
  .service('opConfig', function($http, L, moment) {
    'use strict';

    return {
        /* LEAFLET CONFIGURATION */
        leafletLayers: [
            {
                prettyName: 'Natural Earth',
                name: 'ne:NE1_HR_LC_SR_W_DR',
                url: 'http://demo.boundlessgeo.com/geoserver/wms',
                params: {
                    tileSize: 512
                }
            },
            {
                prettyName: 'Natural Earth Land',
                name: 'maps:ne_50m_land',
                url: 'http://demo.boundlessgeo.com/geoserver/wms',
                params: {
                    tileSize: 512
                }
            },
            {
                prettyName: 'Blue Marble',
                name: 'nasa:bluemarble',
                url: 'http://demo.boundlessgeo.com/geoserver/wms',
                params: {
                    tileSize: 512
                }
            },
            {
                prettyName: 'Shaded Relief',
                name: '0',
                url: 'http://basemap.nationalmap.gov/arcgis/services/USGSShadedReliefOnly/MapServer/WMSServer',
                params: {
                    tileSize: 512
                }
            }
        ],

        leafletOptions: {
            center: [20.0, -50.0],
            zoom: 3,
            attributionControl: false,
            crs: L.CRS.EPSG4326
        },

        classification: 'UNCLASSIFIED',

        docLink: 'OGC-Preview User Guide.pptx',

        // countryDataUrl: '/config/countries.geo.json',
        countryDataUrl: '/config/countries.geo.json',
        shapeToGeoUrl: '/shapes',

        // Identification of the server(s) providing data layers for use by Feature Browser
        // order here matters for priority of layers
        // if multiple geoservers have the same named layer, we will display the one from the server
        // with the lowest index (highest in this list)
        servers: [
            {
                url: 'http://demo.boundlessgeo.com/geoserver',
                ajaxUrl: 'http://demo.boundlessgeo.com/geoserver',
                name: 'prod',
                wmsVersion: '1.3.0',
                wfsVersion: '1.0.0',
                wfsOutputFormat: 'text/xml; subtype=gml/3.1.1'
            },
            // {
            //     url: '/geoserver',
            //     ajaxUrl: '/geoserver',
            //     name: 'beta',
            //     wmsVersion: '1.3.0',
            //     wfsVersion: '1.0.0',
            //     wfsOutputFormat: 'text/xml; subtype=gml/3.1.1'
            // },
            // {
            //     url: '/geoserver',
            //     ajaxUrl: '/geoserver',
            //     name: 'dev',
            //     wmsVersion: '1.3.0',
            //     wfsVersion: '1.0.0',
            //     wfsOutputFormat: 'text/xml; subtype=gml/3.1.1'
            // }
        ],

        // Used to make intelligent guesses as to what time fields are available
        timeFields: {
            start: ['start', 'begin', 'up', 'event', 'time', 'date'],
            stop: ['stop', 'end', 'down', 'event', 'time', 'date']
        },
        // As found in DescribeFeatureType under element's type attributes
        timeFieldTypes : [ 'xsd:date', 'xsd:dateTime' ],
        geomFieldNamespace : 'gml',

        /* Sanity values for performance, etc. */
        // Cap value for features returned by WMS tile set per layer
        wmsFeatureLimiter : 10000,
        wfsFeatureLimiter : 1000,
        // 2 minutes cache period on all layers
        cachePeriod: 60 * 2,
        // 2 minutes cache period for layer metadata
        layerCachePeriod: 60 * 2,

        maxDaysBack: 14,
        defaultDaysBack : 1,

        /* Ranges used to prime the pre-selection of ranges */
        dateList: [
            // One based because of a weird issue with falsey values in angular views.
            {index: 1, name: 'Today', date: [moment().utc().startOf('d'), moment().utc().add('days', 1).startOf('d')]},
            {index: 2, name: 'Yesterday', date: [moment().utc().subtract('days', 1).startOf('d'), moment().utc().startOf('d')]},
            {index: 4, name: 'Last Two Weeks', date: [moment().utc().subtract('days', 14).startOf('d'), moment().utc().add('days',1).startOf('d')]}
        ],

        // List of tags to attempt to match against WMS layer keywords.
        // If a tag cannot be found for any layer it is not added as a selection.
        // Order is important as that is the order they will be rendered in layer control.
        recognizedTags: [ 'MODIS', 'VIIRS', 'TOPP' ],

        getVersion: function(){
          return $http({ method: 'GET', url: 'config/version.json', timeout: 50000}).then(function (result) {
              return result.data;
          });
        }
    };
});
