angular.module('opApp').filter('plainTextToHtml', ['$sce',
    function ($sce) {
        'use strict';

        return function (plainText) {
            if (!plainText) {
                return '';
            }

            var output = [];
            $.each(plainText.split('\n'), function (key, value) {
                output.push(value);
            });

            // NOTE: leading space is very intentional as following auto-linking code is expecting space to split on
            output = output.join(' <br/>');

            // Perform very dumb auto-linking... This will need work if it is going to handle anything but the most
            // rudimentary URLs.  We are assuming that any space delimited string that starts with http:// or https://
            // is a link.
            var autoLinked = [];
            $.each(output.split(' '), function (key, value) {
                if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) {
                    autoLinked.push('<a href="' + value + '" target="_blank">' + value + '</a>');
                }
                else {
                    autoLinked.push(value);
                }
            });

            output = autoLinked.join(' ');

            return $sce.trustAsHtml(output);
        };
    }]);
