angular.module('opApp').factory('opPopupWindow', function ($q, $window) {
  'use strict';
  // Public API here
  var queryWindowHandle;

  return {
    on: function (name, callback) {
      $window[name] = callback;
    },
    showPopup: function (url, initName, ret) {
      var promise = $q.defer();
      if (initName) {
        $window[initName] = function () {
          promise.resolve(queryWindowHandle, Array.prototype.slice.apply(arguments));
          return ret;
        };
      }
      if (!angular.isDefined(queryWindowHandle) || queryWindowHandle.closed) {
          queryWindowHandle = $window.open(url, 'newwindow_id', 'height=600,width=1200, resizable=yes, toolbar=no, menubar=no, scrollbars=yes, location=no, directories=no, status=no');
      }
      else {
          queryWindowHandle.focus();
      }

      return promise.promise;
    },
    broadcast: function (queryWindow){
      var promise = $q.defer();
      if (queryWindow){
        promise.resolve(queryWindow.broadcast.apply(this, Array.prototype.slice.apply(arguments, [1])));
      }else{
        promise.reject();
      }
      return promise.promise;
    }
  };
});
