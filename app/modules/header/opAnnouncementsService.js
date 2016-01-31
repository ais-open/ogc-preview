/**
 * Announcements Service
 *
 * @author David Benson
 * @company Applied Information Sciences
 * @created 10/11/2013
 *
 * Handles managing announcement messages
 */
angular.module('opApp.header')
    .service('opAnnouncementsService', function ($log, $http, $timeout, $rootScope, moment, localStorageService) {
        'use strict';
        var self = this;

        var minTime = moment.utc();
        var maxTime = moment('1970-01-01');

        /**
         * store Min time
         * @param val   time
         * @returns {*}
         */
        var storedMin = function(val) {
            if (val !== undefined) {
                localStorageService.set('announcementMin', val);
                minTime = moment(val);
            }
            if (localStorageService.get('announcementMin') !== undefined) {
                return moment(localStorageService.get('announcementMin'));
            }
            return minTime;
        };

        /**
         * Store max time
         * @param val   time
         * @returns {*}
         */
        var storedMax = function(val) {
            if (val !== undefined) {
                localStorageService.set('announcementMax', val);
                maxTime = moment(val);
            }
            if (localStorageService.get('announcementMax') !== undefined) {
                return moment(localStorageService.get('announcementMax'));
            }
            return maxTime;
        };

        self.messages = [];
        self.updated = false;

        /**
         * Get the announcements
         * @returns {*}
         */
        self.getAnnouncements = function () {
            return $http({ method: 'GET', url: 'config/announcements.json?_=' + moment().valueOf(), timeout: 50000}).then(function (result) {
                return result.data;
            });
        };

        // Load the current announcements
        self.load = function () {

            // Load the previous time stamps if they were saved in local storage
            var oldMinTime = storedMin();
            var oldMaxTime = storedMax();
            if (oldMinTime.isValid() && oldMaxTime.isValid()) {
                minTime = oldMinTime;
                maxTime = oldMaxTime;
            }

            self.getAnnouncements().then(function (data) {

                // Remove messages in the future and sort newest to oldest
                self.messages = _(data).filter(function (item) {
                    return moment.utc().isAfter(item.pubdate);
                }).sortBy('pubdate').reverse().value();

                // Adjust all the message attributes for display
                self.messages = _.each(self.messages, function(msg) {
                    msg.title = msg.title || 'Attention';

                    if (msg.category) {
                        msg.state = msg.category.toLowerCase();
                    } else {
                        msg.state = 'info';
                    }

                    if (msg.state === 'failure') {
                        msg.icon= 'exclaim';
                    } else if (msg.state === 'success') {
                        msg.icon = 'checkmark';
                    } else {
                        msg.icon = 'info';
                    }

                    var ts = moment.utc(msg.pubdate);
                    if (ts.hours() === 0 && ts.minutes() === 0 &&
                        ts.seconds() === 0 && ts.milliseconds() === 0) {
                        msg.formattedDate = ts.format('YYYY-MM-DD');
                    } else if (msg.pubdate.indexOf('T') > 0) {
                        msg.formattedDate = ts.format('YYYY-MM-DD HH:mm:ss[Z]');
                    } else {
                        msg.formattedDate = msg.pubdate;
                    }
                    return msg;
                });

                // Check whether there are any new announcements
                if (self.messages.length) {
                    var lastMsg = self.messages[0];
                    if (minTime.isAfter(lastMsg.pubdate) ||
                        maxTime.isBefore(lastMsg.pubdate)) {
                        self.updated = true;
                    }
                }

                // Notify other components of the change
                $rootScope.$broadcast('announcementsChanged', self.messages, self.updated);
            });
        };

        // Use local storage to figure out which messages have been viewed
        self.save = function() {
            if (!self.messages.length) {
                return;
            }
            try {
                if (minTime.isAfter(self.messages[0].pubdate)) {
                    storedMin(self.messages[0].pubdate);
                }
                if (maxTime.isBefore(self.messages[0].pubdate)) {
                    storedMax(self.messages[0].pubdate);
                }
            } catch (err) {
                $log.error('Unable to check announcement published time.');
            }
            self.updated = false;

            // Notify other components of the change
            $rootScope.$broadcast('announcementsChanged', self.messages, self.updated);
        };

        // Load the static announcement data at startup
        $timeout(function() {
            self.load();
        },100); // Delaying IE to load scripts and give a chance to attach listeners
    });