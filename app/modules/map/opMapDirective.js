/**
 * Created by Jonathan.Meyer on 6/26/2014.
 */

angular.module('opApp.map').directive('opMap', function() {
    'use strict';

    return {
        scope : {},
        restrict: 'E',
        templateUrl: 'modules/map/opMap.html'
    };
});