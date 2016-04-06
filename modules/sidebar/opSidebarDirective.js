angular.module('opApp').directive('opSidebar', function () {
    'use strict';

    return {
        restrict: 'E',
        templateUrl: 'modules/sidebar/opSidebar.html',
        controller: 'opSidebarController',
        controllerAs: 'sidebar'
    };
});
