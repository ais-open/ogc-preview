/**
 * Created by meyerjd on 8/5/2014.
 */

L.Control.LegendToggle = L.Control.extend({
    options: {
        position: 'topright'
    },

    _currentLegends: [],
    _legendControl: undefined,
    _legendEnabled: true,


    _toggleClass: function(el, name) {
        'use strict';

        if (L.DomUtil.hasClass(el, name)) {
            L.DomUtil.removeClass(el, name);
        } else {
            L.DomUtil.addClass(el, name);
        }
    },

    _toggleLegend: function (e) {
        'use strict';

        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);

        this._legendEnabled = !this._legendEnabled;
        this._toggleClass(e.currentTarget, 'leaflet-control-legend-toggle-active');

        this.updateLegend();
    },

    updateLegend: function(layers) {
        'use strict';

        var self = this;
        if (layers) {
            this._currentLegends = layers;
        }


        if (this._map && this._legendControl) {
            this._map.removeControl(this._legendControl);
        }

        if (this._legendEnabled) {
            if (!this._legendControl) {
                this._legendControl = L.control({position: 'bottomright'});
            }

            this._legendControl.onAdd = function () {
                var div = L.DomUtil.create('div', 'leaflet-control-legend');

                div.innerHTML += '<strong>Layer Legend</strong><br/>';

                if (self._currentLegends.length > 0) {
                    angular.forEach(self._currentLegends, function (legend) {

                        div.innerHTML += '<img src="' + legend + '" alt="legend"/><br/>';
                    });
                } else {
                    div.innerHTML += 'No selected layers';
                }

                return div;
            };

            if (this._map) {
                this._legendControl.addTo(this._map);
            }
        }
        else {
            this._legendControl = undefined;
        }
    },

    onAdd: function (map) {
        'use strict';

        this._map = map;
        var controlDiv = L.DomUtil.create('div', 'leaflet-control-legend-toggle leaflet-control-legend-toggle-active');
        controlDiv.setAttribute('title','Toggle Layer Legend');
        L.DomEvent.on(controlDiv, 'click', this._toggleLegend, this);
        return controlDiv;
    },

    updateLayers: this.updateLegend
});

L.control.layerLegend = function (options) {
    'use strict';

    return new L.Control.LegendToggle(options);
};
