/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.home').controller('opHomeController',
  function ($scope, $rootScope, opStateService, opPopupWindow, $window, $log) {
    'use strict';

    var initialize = function () {
        $log.log('Starting up opHomeController...');
    };
    initialize();

    $window.broadcast = function (){
      var args = arguments;
      $rootScope.$broadcast.apply($scope, args);
    };
  }
);
