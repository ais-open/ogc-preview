/**
 * Created by Jonathan.Meyer on 5/29/2014.
 */

'use strict';

angular.module('opApp').directive('opLayer', function() {
    return {
        scope: {},
        restrict: 'E',
        templateUrl: 'modules/sidebar/layer/opLayerSelect.html'
    };
});

