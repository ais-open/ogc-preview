angular.module('opApp.filters')
    .filter('tagFilter', function () {
        'use strict';
        return function (groups) {
            // compare tags and sort alphabetically
            return groups.sort(function (a, b) {
                var tag1 = a.getTag();
                var tag2 = b.getTag();

                if (tag1 < tag2) {
                    return -1;
                }
                if (tag1 > tag2) {
                    return 1;
                }
                return 0;
            });
        };
    });