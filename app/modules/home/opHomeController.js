angular.module('opApp').controller('opHomeController', ['$scope', '$rootScope', 'opStateService', 'opPopupWindow',
    '$window', '$log',
    function ($scope, $rootScope, opStateService, opPopupWindow, $window, $log) {
        'use strict';

        var initialize = function () {
            $log.log('Starting up opHomeController...');
        };
        initialize();

        $window.broadcast = function () {
            var args = arguments;
            $rootScope.$broadcast.apply($scope, args);
        };
    }]);
