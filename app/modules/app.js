var app = angular.module('opApp', [
    'opApp.query',
    'opApp.sidebar',
    'opApp.sidebar.layer',
    'opApp.sidebar.temporal',
    'opApp.ui',
    'opApp.results',
    'opApp.map',
    'opApp.home',
    'opApp.header',
    'opApp.filters',
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


app.config(function ($routeProvider, $locationProvider) {
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
