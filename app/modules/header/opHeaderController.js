/* --------------------------------
 Developed by Jonathan Meyer
 Applied Information Sciences
 7/8/2014
 ---------------------------------*/

angular.module('opApp.header').controller('opHeaderController',
    function ($scope, $rootScope, $location, $modal, $timeout, opConfig, opPopupWindow, opStateService) {
        'use strict';

        $scope.classification = opConfig.classification;
        $scope.bamfLink = '';
        $scope.kmlLink = '';
        $scope.kmlEnabled = false;
        $scope.docLink = opConfig.docLink;
        $scope.announcementCount = 0;
        $scope.announcementsEnabled = false;

        $scope.isActive = function (viewLocation) {
            return viewLocation === $location.path();
        };

        $scope.showSecurityBanner = function () {
            $modal.open({
                templateUrl: 'modules/header/opSecurityBanner.html'
            });
        };
        $scope.openResults = function (){
            opPopupWindow.showPopup('results.html');
        };
        $scope.drawStart = function (){
            $rootScope.$broadcast('drawStart');
            $scope.isDrawing = true;
        };
        $scope.drawClear = function (){
            $rootScope.$broadcast('drawClear');
        };

        $scope.showBookmark = function () {
            $scope.bamfLink = opStateService.getPermalink();
            $modal.open({
                templateUrl: 'modules/header/opBookmark.html'
            });
        };

        $scope.buildKmlLink = function() {
            var val = opStateService.getDatasets();
            if (val !== null && val.length > 0) {
                $scope.kmlEnabled = true;
                $scope.kmlLink = opConfig.server.url + '/wms/kml?layers=' + val.join(',');

                var timeFilter = opStateService.getTemporalFilter();

                var timeStr = null;
                var titleString = null;
                if (timeFilter !== null && timeFilter.type) {
                    if (timeFilter.type === 'duration') {
                        timeStr = 'back' + timeFilter.value + timeFilter.interval + '/present';
                        var timeLookup = {'h': 'Hour', 'd': 'Day', 'w': 'Week'};
                        titleString = 'OGC Last ' + timeFilter.value + ' ' + timeLookup[timeFilter.interval];
                        // Add s to make interval name plural if greater than 1
                        if (timeFilter.value !== 1) {
                            titleString += 's';
                        }
                    }
                    else if (timeFilter.type === 'range') {
                        timeStr = timeFilter.start.format('YYYY-MM-DDTHH:mm:ss\\Z') + '/' +
                            timeFilter.stop.format('YYYY-MM-DDTHH:mm:ss\\Z');
                        titleString = 'OGC between ' + timeFilter.start.format('YYYY-MM-DDTHH:mm:ss\\Z') + ' and ' +
                            timeFilter.stop.format('YYYY-MM-DDTHH:mm:ss\\Z');
                    }
                }

                if (timeStr !== null) {
                    $scope.kmlLink += '&time=' + timeStr;
                }
                if (titleString !== null) {
                    $scope.kmlLink += '&kmltitle=' + titleString;
                }
            }
            else {
                $scope.kmlEnabled = false;
            }
        };

        $scope.showFeedback = function () {
            $modal.open({
                templateUrl: 'modules/header/opFeedback.html',
                windowClass: 'small-modal'
            });
        };

        $scope.showAnnouncements = function () {
            $rootScope.$broadcast('showAnnouncements');
        };

        $scope.$on('announcementsChanged', function (e, messages, enabled) {
            $scope.announcementCount = messages.length;
            $scope.announcementsEnabled = enabled;
        });


        $scope.$on('mapBoundsChanged', function(){
            $timeout(function() {
                $scope.isDrawing = false;
            });
        });

        $scope.$on('filters-updated', function() {
            $scope.buildKmlLink();
        });

        $scope.buildKmlLink();
        //$scope.workspaces = Configuration.workspaces;
    });
