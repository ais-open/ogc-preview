/**
 * Created by Jonathan.Meyer on 6/23/2014.
 */

angular.module('opApp.sidebar.temporal').directive('opDateTime', function () {
    'use strict';
    return {
        scope: {},
        templateUrl: 'modules/sidebar/temporal/opDateRange.html',
        restrict: 'E'
    };
});