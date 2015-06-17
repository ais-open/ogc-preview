/**
 * Created by Jonathan.Meyer on 6/29/2014.
 */

angular.module('opApp.sidebar.temporal').controller('opDateTimeController',
    function ($scope, $timeout, toaster, opConfig, opStateService) {
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
            endDate:   $scope.dateRange ? $scope.dateRange[1] : undefined
        };

        $scope.dateExpanded = false;
        $scope.valid = {
            duration: false,
            startRange: false,
            endRange: false
        };

        $scope.validationError = 'sup';
        $scope.dateKey = 'duration';
        $scope.duration = '1';
        $scope.durationKey = 'd';

        $scope.startDate = moment.utc().startOf('d').format('MM/DD/YYYY');
        $scope.startTime = moment.utc().startOf('d').format('HH:mm:ss');
        $scope.endDate = moment.utc().startOf('d').add('days', 1).format('MM/DD/YYYY');
        $scope.endTime = moment.utc().startOf('d').add('days', 1).format('HH:mm:ss');


        $scope.rangeTimeout = false;

        // Wire in the pre-configured date periods for ranges
        $scope.datelist = opConfig.dateList;

        var oldStart = '', oldEnd = '';
        var oldRange;
        var dateFormat = 'MM/DD/YY';
        var parseFormat = 'MM/DD/YYYYHH:mm:ss';

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
                opStateService.setTimeRange($scope.dateRange[0],$scope.dateRange[1]);
            }
        };

        var isInt = function (value) {
            return !isNaN(value) && parseInt(Number(value)) === value;
        };

        $scope.setDuration = function () {
            $scope.dateKey = 'duration';

            if (isInt($scope.duration) && $scope.durationKey.length === 1) {
                var initialValue = $scope.duration;
                var max;
                switch ($scope.durationKey) {
                    case 'h':
                        if (initialValue > opConfig.maxDaysBack * 24) {
                            max = opConfig.maxDaysBack * 24;
                        }
                        break;
                    case 'd':
                        if (initialValue > opConfig.maxDaysBack) {
                            max = opConfig.maxDaysBack;
                        }
                        break;
                    case 'w':
                        if (initialValue > opConfig.maxDaysBack / 7) {
                            max = Math.floor(opConfig.maxDaysBack / 7);
                        }
                        break;
                }
                if (max) {
                    $scope.validationError = 'Please reduce duration value to be less than or equal to ' + max + '.';
                    $scope.valid.duration = false;
                    console.log($scope.validationError);
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

                console.log($scope.validationError);
            }
        };

        $scope.setDurationKey = function(newKey) {
            $scope.durationKey = newKey;

            $scope.setDuration();
        };

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

        $scope.updateStart = function () {
            if($scope.rangeTimeout){
                $timeout.cancel($scope.rangeTimeout);
            }
            $scope.rangeTimeout = $timeout(function(){
                if ($scope.dateKey === 'range' && oldStart !== $scope.startDate + $scope.startTime) {
                    var date = moment.utc($scope.startDate +  $scope.startTime, parseFormat);
                    if (date.isValid()) {
                        oldStart = $scope.startDate + $scope.startTime;
                        $scope.dateRange = [date, $scope.dateRange[1]];
                        $scope.valid.startRange = true;

                        enforceDateRangeLimits($scope.dateRange, oldRange, opConfig.maxDaysBack);

                        if (!$scope.initializing) {
                            opStateService.setTimeRange($scope.dateRange[0], $scope.dateRange[1]);
                        }
                    }
                    else {
                        $scope.valid.startRange = false;
                    }
                }
            }, 1000);
        };

        var enforceDateRangeLimits = function(newDateRange, previousDateRange, maxDaysBack) {
            var compareFormat =  'MM/DD/YYYYHH:mm:ss';

            if (Math.abs(newDateRange[0].diff(newDateRange[1], 'days', true)) > maxDaysBack) {
                var message;
                if (angular.isDefined(previousDateRange)) {
                    if (previousDateRange[0].format(compareFormat) !== newDateRange[0].format(compareFormat) &&
                        previousDateRange[1].format(compareFormat) === newDateRange[1].format(compareFormat)) {
                        newDateRange[1] = moment(newDateRange[0]).add('days', maxDaysBack);
                        message = 'Start date is more than ' + maxDaysBack + ' days before ' +
                            'End Date.  End Date has been adjusted to not exceed this period.';
                        console.log(message);
                        toaster.pop('note', message);
                    }
                    else if (previousDateRange[0].format(compareFormat) === newDateRange[0].format(compareFormat) &&
                        previousDateRange[1].format(compareFormat) !== newDateRange[1].format(compareFormat)) {
                        newDateRange[0] = moment(newDateRange[1]).subtract('days', maxDaysBack);
                        message = 'End date is more than ' + opConfig.maxDaysBack + ' days after ' +
                            'Start Date.  Start Date has been adjusted to not exceed this period.';
                        console.log(message);
                        toaster.pop('note', message);
                    }
                }
            }
        };



        $scope.updateEnd = function () {
            if($scope.rangeTimeout){
                $timeout.cancel($scope.rangeTimeout);
            }
            $scope.rangeTimeout = $timeout(function() {
                    if ($scope.dateKey === 'range' && oldEnd !== $scope.endDate + $scope.endTime) {
                        var date = moment.utc($scope.endDate + $scope.endTime, parseFormat);
                        if (date.isValid() || ( !$scope.endDate && !$scope.endTime)) {
                            oldEnd = $scope.endDate + $scope.endTime;
                            $scope.dateRange = [$scope.dateRange[0], date];
                            $scope.valid.endRange = true;

                            enforceDateRangeLimits($scope.dateRange, oldRange, opConfig.maxDaysBack);

                            if (!$scope.initializing) {
                                opStateService.setTimeRange($scope.dateRange[0], $scope.dateRange[1]);
                            }
                        }
                        else {
                            $scope.valid.endRange = false;
                        }
                    }
                }, 1000);
        };

        $scope.advanceDateRange = function() {
            var startDate = moment($scope.dateRange[0]);
            var stopDate = moment($scope.dateRange[1]);

            if (startDate.isValid() && stopDate.isValid()) {
                var diff = Math.abs(startDate.diff(stopDate));

                startDate = moment(stopDate);
                stopDate.add('ms', diff);
                $scope.setDateRange([startDate, stopDate]);
            }
        };

        $scope.retreatDateRange = function() {
            var startDate = moment($scope.dateRange[0]);
            var stopDate = moment($scope.dateRange[1]);

            if (startDate.isValid() && stopDate.isValid()) {
                var diff = Math.abs(startDate.diff(stopDate));

                stopDate = moment(startDate);
                startDate.subtract('ms', diff);
                $scope.setDateRange([startDate, stopDate]);
            }
        };

        var updateDatePicker = function (start, end) {
            $scope.dateRange = [start, end];
            $scope.$apply();
        };

        $scope.$on('filters-updated', function() {
            updateTemporalFilters();
        });

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

        var initialize = function () {
            console.log('Starting up opDateTimeController...');
            updateTemporalFilters();


            $timeout(function () {
                angular.element('.start').daterangepicker(_.extend(drpOptions, {onlyShow: 'start'}), updateDatePicker);
                angular.element('.end').daterangepicker(_.extend(drpOptions, {onlyShow: 'end'}), updateDatePicker);
                dateRangeCreated = true;
            }, 1000);
        };
        initialize();
    }
);