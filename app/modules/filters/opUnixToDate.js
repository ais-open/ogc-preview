angular.module('opApp').filter('unixToDate', function () {
        'use strict';
        return function (unixdate) {
            return moment.unix(unixdate).format('MM/DD/YYYY HH:mm:ss');
        };
    });