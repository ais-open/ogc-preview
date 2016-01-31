/**
 * Announcements Directive
 *
 * @author David Benson
 * @company Applied Information Sciences
 * @created 1/23/2014
 *
 * Adds announcements based on the announcements.json script
 */

angular.module('opApp.header')
    .directive('opAnnouncements', function ($modal, $templateCache, $rootScope, opAnnouncementsService) {
        'use strict';
        return {
            templateUrl: 'modules/header/opAnnouncements.html',
            restrict: 'EA',
            link: function postLink(scope) {
                scope.enabled = false;
                scope.messages = [];
                scope.selected = {};
                scope.index = 0;

                scope.select = function(index) {
                    scope.index = index;
                    if (scope.index < 0) {
                        scope.index = scope.messages.length - 1;
                    }
                    if (scope.index >= scope.messages.length) {
                        scope.index = 0;
                    }
                    scope.selected = scope.messages[scope.index];
                };

                /**
                 * Show the previous announcement
                 */
                scope.previous = function () {
                    scope.select(scope.index - 1);
                };

                /**
                 * Show the next announcement
                 */
                scope.next = function () {
                    scope.select(scope.index + 1);
                };

                /**
                 * Hide the announcement banner
                 */
                scope.close = function () {
                    opAnnouncementsService.save();
                };

                /**
                 * Show all the messages in a single window
                 */
                scope.showAll = function () {
                    $modal.open({
                        scope: scope,
                        templateUrl: 'modules/header/opNews.html',
                        windowClass: 'news-modal'
                    });
                };

                /**
                 * Broadcast receiver for whenever the announcements have changed
                 */
                $rootScope.$on('announcementsChanged', function (e, messages, enabled) {
                    scope.messages = messages;
                    scope.enabled = enabled;
                    scope.selected = messages.length ? messages[0] : {};
                    scope.index = 0;
                });

                /**
                 * Broadcast receiver for when the show the announcements
                 */
                $rootScope.$on('showAnnouncements', function () {
                    scope.showAll();
                });

            }
        };
    });