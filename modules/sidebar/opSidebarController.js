angular.module('opApp').controller('opSidebarController', ['$scope', 'opAnnouncementsService',
    function ($scope, opAnnouncementsService) {
        'use strict';

        $scope.announcementsEnabled = opAnnouncementsService.updated;

        $scope.$on('announcementsChanged', function (e, messages, enabled) {
            $scope.announcementsEnabled = enabled;
        });
    }]);
