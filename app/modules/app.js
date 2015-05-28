var app = angular.module('opApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'ngAnimate',

    'restangular',
    'toaster',
    'ui.bootstrap',
    'LocalStorageModule'
]);

app.config(function ($routeProvider) {
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
})
    .value('moment', window.moment)
    .value('L', window.L);
