angular.module('opApp').directive('opResults', function () {
    'use strict';

    return {
        restrict: 'EA',
        templateUrl: 'modules/results/opResults.html',
        controller: function ($scope, $rootScope, $window, $interval, $timeout, $log) {

            $scope.model = {
                currentTab: null,
                loading: true,
                currentData: [],
                layers: [],
                activeLayer: '',
                kmlUrl: '',
                csvUrl: '',
                shpUrl: '',
                rssUrl: '',
                error: '',
                headerError: '',
                selectDisabled: false
            };

            /**
             * Make sure we have the tab for the layer we're looking at
             * @param name
             */
            $scope.selectLayer = function (name) {
                
                $('#table').empty();
                // Keep clicking on active tab from re-querying
                if ($scope.model.currentTab !== name) {
                    $scope.updateResults(name);
                }
            };

            /**
             * Update the results table with new data
             * @param name
             */
            $scope.updateResults = function (name) {
                $scope.model.currentTab = name;
                $scope.model.currentData = [];
                $scope.model.loading = true;
                $scope.model.activeLayer = name;
                $window.opener.broadcast('queryWfs', name);
                $window.opener.resultsSelected(null, null, null);
            };

            /**
             * Broadcast receiver for when the filters are updated
             */
            $scope.$on('updateFilters', function (e, val) {
                $scope.model.layers = val;
                if (!$scope.model.currentTab || !_.contains(val, $scope.model.currentTab)) {
                    $scope.selectLayer(val[0]);
                }
            });

            /**
             * Broadcast receiver for when we get our data back from the OGC service
             */
            $scope.$on('queryWfsResult', function (e, data) {
                if ($scope.model.currentTab === data.layer) {
                    $scope.model.loading = false;
                    $scope.model.kmlUrl = data.kmlUrl;
                    $scope.model.csvUrl = data.csvUrl;
                    $scope.model.shpUrl = data.shpUrl;
                    $scope.model.rssUrl = data.rssUrl;
                    $scope.model.error = data.error;
                    $scope.model.currentData = data.features;
                }
                else
                {
                    $scope.model.loading = false;
                    $scope.model.error = data.error;
                }
            });

            /**
             * Broadcast receiver for when our map bounds changed
             */
            $scope.$on('mapBoundsChanged', function () {
                $scope.updateResults($scope.model.currentTab);
            });

            $scope.$on('selectedRowsError', function (e, data) {
                $scope.model.headerError = data.error;
            });

            $scope.$watch('selectDisabled', function(disabled) {
                $scope.model.selectDisabled = disabled;
            });
            
            // communicate with parent
            $timeout(function () {
                $interval(function () {
                    return $window.opener.resultsHeartbeat && $window.opener.resultsHeartbeat(window);
                }, 2500);
                return $window.opener.resultsInit && $window.opener.resultsInit(window);
            }, 2500);

            $window.broadcast = function () {
                $log.log(arguments);
                var args = arguments;
                $timeout(function () {
                    $rootScope.$broadcast.apply($scope, args);
                });
            };
        }
    };
});
