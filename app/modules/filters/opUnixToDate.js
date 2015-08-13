/**
 * Created by Jonathan.Meyer on 6/2/2014.
 */

angular.module('opApp.filters')
.filter('unixToDate', function() {
    'use strict';
    return function(unixdate) {
        return moment.unix(unixdate).format('MM/DD/YYYY HH:mm:ss');
    };
});