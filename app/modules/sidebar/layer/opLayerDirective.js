/**
 * Created by Jonathan.Meyer on 5/29/2014.
 */

angular.module('opApp').directive('opLayer', function() {
    'use strict';

    return {
        scope: {},
        restrict: 'E',
        templateUrl: 'modules/sidebar/layer/opLayerSelect.html'
    };
});

