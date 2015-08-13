
angular.module('opApp.sidebar').controller('opSidebarController',
    function ($scope, opAnnouncementsService ) {
        'use strict';

        $scope.announcementsEnabled = opAnnouncementsService.updated;

        $scope.$on('announcementsChanged', function (e, messages, enabled) {
            $scope.announcementsEnabled = enabled;
        });
    });
