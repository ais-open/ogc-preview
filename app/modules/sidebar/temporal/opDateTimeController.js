angular.module('opApp').controller('opDateTimeController', ['$scope', '$timeout', 'toaster', 'opConfig', 'opStateService', '$log',
    function ($scope, $timeout, toaster, opConfig, opStateService, $log) {
        'use strict';

        var dateRangeCreated = false;
        $scope.initializing = false;

        var drpOptions = {
            minDate: moment('1970-01-01T00:00:00 Z').utc(),
            maxDate: moment().utc().add('days', 1),
            showDropdowns: true,
            timePicker: true,
            timePicker12Hour: false,
            timePickerIncrement: 1,
            opens: 'right',
            format: 'MM/DD/YYYY HH:mm:ss',
            startDate: $scope.dateRange ? $scope.dateRange[0] : undefined,
            endDate: $scope.dateRange ? $scope.dateRange[1] : undefined
        };

        $scope.dateExpanded = false;
        $scope.valid = {
            duration: false,
            startRange: true,
            startTimeRange: true,
            endRange: true,
            endTimeRange: true
        };

        $scope.validationError = 'sup';
        $scope.dateKey = 'duration';
        $scope.duration = '1';
        $scope.durationKey = 'd';

        $scope.startDate = moment.utc().startOf('d').format('MM/DD/YYYY');
        $scope.startTime = moment.utc().startOf('d').format('HH:mm:ss');
        $scope.endDate = moment.utc().startOf('d').format('MM/DD/YYYY');
        $scope.endTime = moment.utc().endOf('d').format('HH:mm:ss');


        $scope.rangeTimeout = false;

        // Wire in the pre-configured date periods for ranges
        $scope.datelist = opConfig.dateList;

        var oldStart = '', oldEnd = '';
        var oldRange;
        var dateFormat = 'MM/DD/YYYY';
        var timeFormat = 'HH:mm:ss';
        var parseFormat = 'MM/DD/YYYYHH:mm:ss';

        /**
         * Check whether the date range is valid as well as within our app's ability based on our max capabilities
         * @param newDateRange          requested new range
         * @param previousDateRange     previous range that was being used
         * @param maxDaysBack           max time period in days
         */
        var enforceDateRangeLimits = function (newDateRange, previousDateRange, maxDaysBack) {
            var compareFormat = 'MM/DD/YYYYHH:mm:ss';
            var diff = newDateRange[0].diff(newDateRange[1], 'days', true);
            if(newDateRange[0].diff(newDateRange[1], 'days', true) > 0)
            {
                var message = "Start date cannot be after End date.";
                $log.log(message);
                toaster.pop('note', message);
                newDateRange[0] = previousDateRange[0];
                newDateRange[1] = previousDateRange[1];
            }
            if (Math.abs(newDateRange[0].diff(newDateRange[1], 'days', true)) > maxDaysBack) {
                var message;
                if (angular.isDefined(previousDateRange)) {
                    if (previousDateRange[0].format(compareFormat) !== newDateRange[0].format(compareFormat) &&
                        previousDateRange[1].format(compareFormat) === newDateRange[1].format(compareFormat)) {
                        newDateRange[1] = moment(newDateRange[0]).add('days', maxDaysBack);
                        message = 'Start date is more than ' + maxDaysBack + ' days before ' +
                            'End Date.  End Date has been adjusted to not exceed this period.';
                        $log.log(message);
                        toaster.pop('note', message);
                    }
                    else if (previousDateRange[0].format(compareFormat) === newDateRange[0].format(compareFormat) &&
                        previousDateRange[1].format(compareFormat) !== newDateRange[1].format(compareFormat)) {
                        newDateRange[0] = moment(newDateRange[1]).subtract('days', maxDaysBack);
                        message = 'End date is more than ' + opConfig.maxDaysBack + ' days after ' +
                            'Start Date.  Start Date has been adjusted to not exceed this period.';
                        $log.log(message);
                        toaster.pop('note', message);
                    }
                }
            }
        };

        /**
         * Get the latest temporal filtering from the state service and set up our filters to be in line visually
         */
        var updateTemporalFilters = function () {
            /*
             use initializing variable to keep filters from being pushed back out to location causing an endless
             update loop
             */
            $scope.initializing = true;
            var filter = opStateService.getTemporalFilter();

            if (filter.type === 'range') {
                $scope.setDateRange([filter.start, filter.stop]);

                drpOptions.startDate = $scope.dateRange[0];
                drpOptions.endDate = $scope.dateRange[1];
                oldRange = $scope.dateRange;
            }
            else if (filter.type === 'duration') {
                $scope.durationKey = filter.interval;
                $scope.duration = filter.value;
                $scope.setDuration();
            }
            $scope.initializing = false;
        };

        $scope.$watch('dateRange', function () {
            if (_.isArray($scope.dateRange)) {
                if ($scope.dateRange.length === 2 &&
                    $scope.dateRange[0].isValid &&
                    $scope.dateRange[1].isValid &&
                    $scope.dateRange[0].isValid() &&
                    $scope.dateRange[1].isValid() &&
                    (oldStart !== $scope.dateRange[0].format(parseFormat) ||
                    oldEnd !== $scope.dateRange[1].format(parseFormat))) {

                    enforceDateRangeLimits($scope.dateRange, oldRange, opConfig.maxDaysBack);

                    $scope.startDate = $scope.dateRange[0].format('MM/DD/YYYY');
                    $scope.startTime = $scope.dateRange[0].format('HH:mm:ss');
                    $scope.endDate = $scope.dateRange[1].format('MM/DD/YYYY');
                    $scope.endTime = $scope.dateRange[1].format('HH:mm:ss');

                    oldStart = $scope.startDate + $scope.startTime;
                    oldEnd = $scope.endDate + $scope.endTime;

                    if (dateRangeCreated) {
                        angular.element('.start, .end').daterangepicker({
                            action: 'update',
                            startDate: $scope.dateRange[0],
                            endDate: $scope.dateRange[1]
                        });

                        $scope.setDateRange($scope.dateRange);
                    }
                }
            }
        });

        /**
         * Set/update date range with val
         * @param val   new date range
         */
        $scope.setDateRange = function (val) {
            $scope.dateKey = 'range';

            if (val && val[0] && val[0].isValid() && val[1] && val[1].isValid()) {
                $scope.dateRange = val;
            } else {
                $scope.dateRange = [
                    moment.utc($scope.startDate + ' ' + $scope.startTime, 'MM/DD/YYYY HH:mm:ss'),
                    moment.utc($scope.endDate + ' ' + $scope.endTime, 'MM/DD/YYYY HH:mm:ss')
                ];
            }

            if ($scope.dateRange[0].isValid() && $scope.dateRange[1].isValid() && !$scope.initializing) {
                opStateService.setTimeRange($scope.dateRange[0], $scope.dateRange[1]);
            }
        };

        /**
         * Determine if a value is an integer
         * @param value     value to test
         * @returns {boolean}   true if int, false otherwise
         */
        var isInt = function (value) {
            return !isNaN(value) && parseInt(Number(value)) == value; // jshint ignore:line
        };

        /**
         * Set the model to duration time type
         */
        $scope.setDuration = function () {
            $scope.dateKey = 'duration';

            if (isInt($scope.duration) && $scope.durationKey.length === 1) {
                var initialValue = $scope.duration;
                var max;
                var unit;
                switch ($scope.durationKey) {
                    case 'h':
                        if (initialValue > opConfig.maxDaysBack * 24) {
                            max = opConfig.maxDaysBack * 24;
                            unit = 'hours';
                        }
                        break;
                    case 'd':
                        if (initialValue > opConfig.maxDaysBack) {
                            max = opConfig.maxDaysBack;
                            unit = 'days';
                        }
                        break;
                    case 'w':
                        if (initialValue > opConfig.maxDaysBack / 7) {
                            max = Math.floor(opConfig.maxDaysBack / 7);
                            unit = 'weeks';
                        }
                        break;
                }
                if (max) {
                    $scope.validationError = 'Please reduce duration value to be less than or equal to ' + max + ' ' + unit + '.';
                    $scope.valid.duration = false;
                    $log.log($scope.validationError);
                    toaster.pop('error', $scope.validationError);
                    return;
                }

                $scope.validationError = '';
                $scope.valid.duration = true;
                if (!$scope.initializing) {
                    opStateService.setDuration($scope.durationKey, $scope.duration);
                }
            }
            else {
                $scope.validationError = 'Please enter whole number value for duration';
                $scope.valid.duration = false;

                $log.log($scope.validationError);
            }
        };

        /**
         * Set duration key (like 'h' for hour, 'm' for minute, etc)
         * @param newKey    new key to set as active
         */
        $scope.setDurationKey = function (newKey) {
            $scope.durationKey = newKey;

            $scope.setDuration();
        };

        /**
         * Helper function to create friendly string to be displayed when the temporal filter is rolled up
         * @returns {string}
         */
        $scope.friendlyDate = function () {
            if ($scope.dateKey === 'duration') {
                var names = {h: ' Hour', d: ' Day', w: ' Week'};
                var rangeName, num = parseInt($scope.duration, 10);
                rangeName = 'Last';
                if (num === 1) {
                    return rangeName + names[$scope.durationKey];
                } else {
                    return rangeName + ' ' + num + names[$scope.durationKey] + 's';
                }
            }
            else if ($scope.dateKey === 'range') {
                return $scope.dateRange[0].format(dateFormat) + ' - ' + $scope.dateRange[1].format(dateFormat);
            }
        };

        /**
         * Set whether the temporal key is duration or range
         * @param key
         */
        $scope.setDateKey = function (key) {
            switch (key) {
                case 'duration':
                    $scope.setDuration();
                    break;
                case 'range':
                    $scope.setDateRange();
                    break;
            }
        };

        /**
         * When user is trying to change the start date/time, lets verify it.
         */
        $scope.updateStart = function () {
            if ($scope.rangeTimeout) {
                $timeout.cancel($scope.rangeTimeout);
            }
            $scope.rangeTimeout = $timeout(function () {
                $scope.valid.startRange = true;
                $scope.valid.startTimeRange = true;

                var startDate = moment($scope.startDate, dateFormat, true);
                if(!startDate.isValid()){
                    $scope.valid.startRange = false;
                }
                var startTime = moment($scope.startTime, timeFormat, true);
                if(!startTime.isValid()){
                    $scope.valid.startTimeRange = false;
                }
                
                if ((startDate.isValid() && startTime.isValid()) && $scope.dateKey === 'range' && oldStart !== $scope.startDate + $scope.startTime) {
                    var date = moment.utc($scope.startDate + $scope.startTime, parseFormat, true);
                    if (date.isValid()) {
                        oldStart = $scope.startDate + $scope.startTime;
                        $scope.dateRange = [date, $scope.dateRange[1]];

                        enforceDateRangeLimits($scope.dateRange, oldRange, opConfig.maxDaysBack);

                        if (!$scope.initializing) {
                            drpOptions.startDate = $scope.dateRange[0];
                            drpOptions.endDate = $scope.dateRange[1];
                            updateDatePicker($scope.dateRange[0], $scope.dateRange[1]);
                            opStateService.setTimeRange($scope.dateRange[0], $scope.dateRange[1]);

                            if(dateRangeCreated) {
                                angular.element('.start, .end').daterangepicker({
                                    action: 'update',
                                    startDate: $scope.dateRange[0],
                                    endDate: $scope.dateRange[1]
                                });
                            }
                            $scope.setDateRange($scope.dateRange);
                        }
                    }
                }
            }, 200);
        };

        /**
         * When user is trying to change the end date/time, lets verify it.
         */
        $scope.updateEnd = function () {
            if ($scope.rangeTimeout) {
                $timeout.cancel($scope.rangeTimeout);
            }
            
            $scope.rangeTimeout = $timeout(function () {
                $scope.valid.endRange = true;
                $scope.valid.endTimeRange = true;

                var endDate = moment($scope.endDate, dateFormat, true);
                if(!endDate.isValid()){
                    $scope.valid.endRange = false;
                }
                var endTime = moment($scope.endTime, timeFormat, true);
                if(!endTime.isValid()){
                    $scope.valid.endTimeRange = false;
                }
                
                if ((endDate.isValid() && endTime.isValid()) && $scope.dateKey === 'range' && oldEnd !== $scope.endDate + $scope.endTime) {
                    var date = moment.utc($scope.endDate + $scope.endTime, parseFormat);
                    if (date.isValid() || ( !$scope.endDate && !$scope.endTime)) {
                        oldEnd = $scope.endDate + $scope.endTime;
                        $scope.dateRange = [$scope.dateRange[0], date];
                        
                        enforceDateRangeLimits($scope.dateRange, oldRange, opConfig.maxDaysBack);

                        if (!$scope.initializing) {
                            drpOptions.startDate = $scope.dateRange[0];
                            drpOptions.endDate = $scope.dateRange[1];
                            updateDatePicker($scope.dateRange[0], $scope.dateRange[1]);
                            opStateService.setTimeRange($scope.dateRange[0], $scope.dateRange[1]);

                            if(dateRangeCreated) {
                                angular.element('.start, .end').daterangepicker({
                                    action: 'update',
                                    startDate: $scope.dateRange[0],
                                    endDate: $scope.dateRange[1]
                                });
                            }
                            $scope.setDateRange($scope.dateRange);
                        }
                    }
                }
            }, 200);
        };

        /**
         * Move the date range up by whatever selection we have (hour,  day, etc.) active
         */
        $scope.advanceDateRange = function () {
            var startDate = moment($scope.dateRange[0]);
            var stopDate = moment($scope.dateRange[1]);

            if (startDate.isValid() && stopDate.isValid()) {
                var diff = Math.abs(startDate.diff(stopDate));

                startDate = moment(stopDate);
                stopDate.add('ms', diff);
                $scope.setDateRange([startDate, stopDate]);
            }
        };

        /**
         * Move the date range back by whatever selection we have (hour,  day, etc.) active
         */
        $scope.retreatDateRange = function () {
            var startDate = moment($scope.dateRange[0]);
            var stopDate = moment($scope.dateRange[1]);

            if (startDate.isValid() && stopDate.isValid()) {
                var diff = Math.abs(startDate.diff(stopDate));

                stopDate = moment(startDate);
                startDate.subtract('ms', diff);
                $scope.setDateRange([startDate, stopDate]);
            }
        };

        /**
         * Update the date range picker widget
         * @param start     start date/time
         * @param end       end date/time
         */
        var updateDatePicker = function (start, end) {
            $scope.dateRange = [start, end];
            $scope.$apply();
        };

        /**
         * Broadcast receiver for when filters are updated to update our temporal action
         */
        $scope.$on('filters-updated', function () {
            updateTemporalFilters();
        });

        /**
         * Broadcast receiver for when the latest data button is pressed to be able to set the time filters
         * for whatever the latest time for a layer is as the end time and then that time minus 24 hours as the
         * start time.
         */
        $scope.$on('latest-data-button', function (event, times) {
            $scope.setDateRange(times);
        });

        /**
         * Start this thing!
         */
        var initialize = function () {
            $log.log('Starting up opDateTimeController...');
            updateTemporalFilters();


            $timeout(function () {
                angular.element('.start').daterangepicker(_.extend(drpOptions, {onlyShow: 'start'}), updateDatePicker);
                angular.element('.end').daterangepicker(_.extend(drpOptions, {onlyShow: 'end'}), updateDatePicker);
                dateRangeCreated = true;
            }, 1000);
        };

        // kick start this thang!
        initialize();
    }]);
