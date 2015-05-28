/**
 * Created by bensonda on 7/21/2014.
 */

angular.module('opApp').directive('opResults', function() {
    'use strict';

    return {
        restrict: 'EA',
        templateUrl: 'modules/results/opResults.html',
        controller: function ($scope, $rootScope, $window, $interval, $timeout) {

            $scope.model = {
                currentTab: null,
                loading: true,
                currentData: [],
                layers: [],
                kmlUrl: '',
                csvUrl: '',
                shpUrl: '',
                rssUrl: '',
                error:''
            };

            $scope.selectLayer = function (name){
                // Keep clicking on active tab from re-querying
                if ($scope.model.currentTab !== name) {
                    $scope.updateResults(name);
                }
            };

            $scope.updateResults = function (name) {
                $scope.model.currentTab = name;
                $scope.model.currentData = [];
                $scope.model.loading = true;
                $window.opener.broadcast('queryWfs', name);
            };

            $scope.$on('updateFilters', function (e, val){
                $scope.model.layers = val;
                if (!$scope.model.currentTab || !_.contains(val, $scope.model.currentTab) ){
                    $scope.selectLayer(val[0]);
                }
            });

            $scope.$on('queryWfsResult', function (e, data){
                $scope.model.loading = false;
                $scope.model.kmlUrl = data.kmlUrl;
                $scope.model.csvUrl = data.csvUrl;
                $scope.model.shpUrl = data.shpUrl;
                $scope.model.rssUrl = data.rssUrl;
                $scope.model.error = data.error;
                $scope.model.currentData = _.map(data.features, 'properties');
            });

            $scope.$on('mapBoundsChanged', function (){
                $scope.updateResults($scope.model.currentTab);
            });

            // communicate with parent
            $timeout(function () {
                $interval(function (){
                    return $window.opener.resultsHeartbeat && $window.opener.resultsHeartbeat(window);
                }, 2500);
                return $window.opener.resultsInit && $window.opener.resultsInit(window);
            }, 2500);

            $window.broadcast = function (){
                console.log(arguments);
                var args = arguments;
                $timeout( function (){
                    $rootScope.$broadcast.apply($scope, args);
                });
            };
        }
    };
});


