/**
 * Created by David Benson
 */


L.Control.MousePosition = L.Control.extend({
  options: {
    position: 'bottomleft',
    separator: ' : ',
    emptyString: 'Unavailable',
    lngFirst: false,
    numDigits: 5,
    lngFormatter: undefined,
    latFormatter: undefined,
    prefix: ''
  },

  onAdd: function (map) {
    'use strict';
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    L.DomEvent.disableClickPropagation(this._container);
    map.on('mousemove', this._onMouseMove, this);
    this._container.innerHTML=this.options.emptyString;
    return this._container;
  },

  onRemove: function (map) {
    'use strict';
    map.off('mousemove', this._onMouseMove);
  },

  _onMouseMove: function (e) {
    'use strict';
    var value;
    if (this.options.valFormatter){
      value = this.options.valFormatter(e.latlng);
    }else {
      var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
      var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
      value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
    }
    var prefixAndValue = this.options.prefix + ' ' + value;
    this._container.innerHTML = prefixAndValue;
  }

});

L.Map.mergeOptions({
  positionControl: false
});

L.Map.addInitHook(function () {
  'use strict';
  if (this.options.positionControl) {
    this.positionControl = new L.Control.MousePosition();
    this.addControl(this.positionControl);
  }
});

L.control.mousePosition = function (options) {
  'use strict';
  return new L.Control.MousePosition(options);
};