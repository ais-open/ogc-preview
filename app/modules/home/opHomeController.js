/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.home').controller('opHomeController',
  function ($scope, $rootScope, opStateService, opPopupWindow, $window, $routeParams) {
    'use strict';

    //if($routeParams.serverName) {
    //  opStateService.setActiveServer($routeParams.serverName);
    //} else {
    //  opStateService.setActiveServer('all');
    //}
    //console.log('servers: ' + JSON.stringify(opStateService.getActiveServer()));
    //console.log('server count: ' + opStateService.getActiveServer().length);
    //console.log('server 1 name: ' + opStateService.getActiveServer()[0].name);
    var initialize = function () {
        console.log('Starting up opHomeController...');
    };
    initialize();

    $window.broadcast = function (){
      var args = arguments;
      $rootScope.$broadcast.apply($scope, args);
    };
  }
);
