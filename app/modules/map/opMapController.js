/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.map').controller('opMapController',
    function ($scope, $rootScope, $timeout, L, opConfig, opStateService, opWebMapService, opPopupWindow) {
        'use strict';

        L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a polygon filter.';
        L.drawLocal.draw.toolbar.buttons.rectangle = 'Draw a rectangle filter.';
        L.drawLocal.edit.toolbar.buttons.edit =  'Edit filter shapes.';
        L.drawLocal.edit.toolbar.buttons.editDisabled = 'No filters to edit.';
        L.drawLocal.edit.toolbar.buttons.remove = 'Delete filter shapes.';
        L.drawLocal.edit.toolbar.buttons.removeDisabled = 'No filters to delete.';

        var map;
        var bboxLayer;
        var layerControl;
        var legendControl;

        var checkForMapBoundsState  = function() {
            var bounds = opStateService.getBounds();
            if (bounds) {
                map.fitBounds(bounds);
            }
        };

        var checkForBBoxBoundsState  = function() {
            var bboxBounds = opStateService.getAttributeBounds();
            if (bboxBounds) {
                var rect = new L.rectangle(bboxBounds, { color: '#ffd800', weight: 2, opacity: 1, fill: false });
                bboxLayer.clearLayers();
                bboxLayer.addLayer(rect);

                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                $rootScope.$broadcast('mapBoundsChanged');
            }
        };


        var initializeMap = function () {
            console.log('Starting up opMapController...');

            var baseLayers = {};

            var initialBaseLayer;

            for (var i = 0; i < opConfig.leafletLayers.length; i++) {

                var layer = opConfig.leafletLayers[i];
                // We have to manually set zIndex as the layer control screws up basemaps with
                // overlays when switching between them
                layer.params['zIndex'] = i;

                if (layer.params['type'] && layer.params['type'].toLowerCase() === 'wmts') {
                    baseLayers[layer.prettyName] = L.tileLayer(layer.url, {z:'0'});
                }
                else {
                    baseLayers[layer.prettyName] = L.tileLayer.wms(layer.url,
                        opWebMapService.getLeafletWmsBasemapParams(layer.name, layer.params));
                }
                if (!initialBaseLayer) {
                    initialBaseLayer = baseLayers[layer.prettyName];
                }
            }

            map = L.map('map', opConfig.leafletOptions);

            initialBaseLayer.addTo(map);
            layerControl = L.control.layers(baseLayers).addTo(map);

            opStateService.setLeafletMapCRS(opConfig.leafletOptions.crs.code);
            opStateService.setLeafletMap(map);
            opStateService.setLayerControl(layerControl);


            // create the bounding box
            bboxLayer = L.featureGroup().addTo(map);

            map.getFilterBounds = function(){
                //just a little hacky, but not too much.
                // blame david if this breaks.
                return bboxLayer.getBounds();
            };

            checkForMapBoundsState();

            checkForBBoxBoundsState();

            L.control.mousePosition({
                position: 'bottomright',
                emptyString: '&nbsp;',
                valFormatter: function (pos){
                    var ns = pos.lat > 0 ? ' N' : ' S';
                    var ew = pos.lng > 0 ? ' E' : ' W';
                    return (('    ' + pos.lat.toFixed(3)).slice(-7) + ns + ', ' + ('    ' + pos.lng.toFixed(3)).slice(-8) + ew).replace(/ /g, '&nbsp;');
                }

            }).addTo(map);

            legendControl = L.control.layerLegend();
            legendControl.addTo(map);

            legendControl.updateLegend();

            map.on('moveend', setBounds);



            var rect = new L.Draw.Rectangle(map, {
                shapeOptions: { color: '#ffd800', weight: 2, opacity: 1, fill: false }
            });

            var isDrawing = false;
            $scope.$on('drawStart', function (){
                if (!isDrawing) {
                    rect.enable();
                    isDrawing = true;
                }else{
                    rect.disable();
                    isDrawing = false;
                }
            });
            $scope.$on('drawClear', function (){
                bboxLayer.clearLayers();
                opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
                opStateService.setAttributeBBox();
                $rootScope.$broadcast('mapBoundsChanged');
            });


            /*new L.Control.Draw({
             draw: {
             circle: false,
             marker: false,
             polyline: false,
             polygon: false,
             rectangle: {
             shapeOptions: { color: '#ffd800', weight: 2, opacity: 1, fill: false }
             }
             },
             edit: {
             featureGroup: bboxLayer,
             edit:false
             }
             }).addTo(map);*/

            map.on('draw:drawstart', function () {
                bboxLayer.clearLayers();
            });

            map.on('draw:created', function (e) {
                isDrawing = false;
                var layer = e.layer;
                bboxLayer.addLayer(layer);
                opStateService.setAttributeBBox(layer.getBounds());
                var results = opStateService.getResultsWindow();
                // Handle the case when result window is opened and then closed
                // causing draw complete operation to fail making it impossible to
                // break out of the draw step
                if (results && !results.closed) {
                    opPopupWindow.broadcast(results, 'mapBoundsChanged');
                }
                $rootScope.$broadcast('mapBoundsChanged');
            });
            /*
             map.on('draw:edited', function (e){

             });

             map.on('draw:deleted', function (e) {
             var layer = e.layer;
             bboxLayer.removeLayer(layer);
             opPopupWindow.broadcast( opStateService.getResultsWindow(), 'mapBoundsChanged');
             });*/
        };

        /**
         * Event handler for map moveend.  Send bounds change to the State Service for query string persistence.
         *
         * @param e
         */
        var setBounds = function (e) {
            opStateService.setBounds(e.target.getBounds());
        };

        initializeMap();

        $rootScope.$on('map-state-updated', function() {
            checkForMapBoundsState();

            checkForBBoxBoundsState();
        });

        $rootScope.$on('layer-selection-changed', function(event, layers) {
            var legends = [];
            angular.forEach(layers, function(layer) {
                var legendGraphicUrl = opWebMapService.getLegendGraphicUrl(layer);
                console.log('identified legend url: ' + legendGraphicUrl);
                legends.push(legendGraphicUrl);
            });

            legendControl.updateLegend(legends);
        });
    });
