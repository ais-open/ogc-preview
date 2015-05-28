/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp').directive('opHeader', function() {
    'use strict';

    return {
        restrict: 'E',
        templateUrl: 'modules/header/opHeader.html',
        controller: 'opHeaderController'
    };
});
