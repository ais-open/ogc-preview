angular.module('opApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'ngAnimate',
    'ngFileUpload',
    'restangular',
    'toaster',
    'ui.bootstrap',
    'ui.select',
    'rzModule',
    'LocalStorageModule'
]);


angular.module('opApp').config(['$routeProvider', function ($routeProvider) {
        'use strict';
        $routeProvider
            .when('/', {
                templateUrl: 'modules/home/opHome.html',
                controller: 'opHomeController',
                reloadOnSearch: false
            })
            .otherwise({
                redirectTo: '/'
            });
    }])
    .value('moment', window.moment)
    .value('L', window.L);
