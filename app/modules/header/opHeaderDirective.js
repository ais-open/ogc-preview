angular.module('opApp').directive('opHeader', function () {
    'use strict';

    return {
        restrict: 'E',
        templateUrl: 'modules/header/opHeader.html',
        controller: 'opHeaderController'
    };
});
