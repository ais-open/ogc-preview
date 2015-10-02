angular.module('opApp.ui').factory('opPopupWindow', function ($q, $window) {
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
      // Had to add extra checks for queryWindow because on Firefox and IE when the results.html window is closed
      // there is no longer a handle so queryWindow.broadcast exceptions (Chrome apparently doesn't care).
      // This breaks when a certain sequence of having a layer on, opening and closing the View Attributes window, and
      // then turning off and on the associated layer's server -- it causes duplicated layer info among other problems.
      // checking length fixes issue with IE
      // checking queryWindow handle is NOT closed fixes issue with Firefox
      if (queryWindow && Object.keys(queryWindow).length > 0 && !queryWindow.closed) {
        promise.resolve(queryWindow.broadcast.apply(this, Array.prototype.slice.apply(arguments, [1])));
      } else {
        promise.reject();
      }
      return promise.promise;
    }
  };
});
