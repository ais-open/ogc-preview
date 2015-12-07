angular.module('opApp').factory('opCoordinateConversionService',
    function () {
    'use strict';

    //truncate is a sign appropriate truncation function
    var truncate = function (_value) {
        if (_value < 0) {
            return Math.ceil(_value);
        }
        else {
            return Math.floor(_value);
        }
    };

    /*
    Converts latitude decimal degrees (float) into degrees, minutes, seconds as a string in the format:
    'XX�XX'XX.XXX'
     */
    var ddLatToDMSLat = function (lat) {
        var degrees;
        var minutes;
        var seconds;
        if (lat <= 90 && lat >= 0) {
            degrees = truncate(lat);
            minutes = truncate((lat - degrees) * 60);
            seconds = ((((lat - degrees) * 60) - minutes) * 60).toFixed(3);
            return degrees + '�' + minutes + '\'' + seconds + '"';
        } else if (lat < 0 && lat >= -90) {
            degrees = truncate(lat);
            minutes = truncate((Math.abs(lat) - Math.abs(degrees)) * 60);
            seconds = ((((Math.abs(lat) - Math.abs(degrees)) * 60) - minutes) * 60).toFixed(3);
            return degrees + '�' + minutes + '\'' + seconds + '"';
        } else {
            return 'Invalid Latitude';
        }
    };

    /*
    Converts longitude decimal degrees (float) into degrees, minutes, seconds as a string in the format:
     'XX�XX'XX.XXX'
     */
    var ddLonToDMSLon = function (lon) {
        var degrees;
        var minutes;
        var seconds;
        if (lon <= 180 && lon >= 0) {
            degrees = truncate(lon);
            minutes = truncate((lon - degrees) * 60);
            seconds = ((((lon - degrees) * 60) - minutes) * 60).toFixed(3);
            return degrees + '�' + minutes + '\'' + seconds + '"';
        } else if (lon < 0 && lon >= -180) {
            degrees = truncate((lon));
            minutes = truncate((Math.abs(lon) - Math.abs(degrees)) * 60);
            seconds = ((((Math.abs(lon) - Math.abs(degrees)) * 60) - minutes) * 60).toFixed(3);
            return degrees + '�' + minutes + '\'' + seconds + '"';
        } else {
            return 'Invalid longitude';
        }
    };

    /*
     Converts latitude degrees, minutes, seconds into decimal degrees (float)
     */
    var dmsLatToDDLat = function (latDegree, latMinute, latSecond) {
        var degrees;
        var minutes;
        var seconds;
        if (parseFloat(latDegree) < 0) {
            seconds = parseFloat(latSecond) / 60;
            minutes = (parseFloat(latMinute) + seconds) / 60;
            degrees = parseFloat(Math.abs(latDegree));
            return ((degrees + minutes) * -1).toFixed(6);
        } else if (parseFloat(latDegree) >= 0) {
            seconds = parseFloat(latSecond) / 60;
            minutes = (parseFloat(latMinute) + seconds) / 60;
            degrees = parseFloat(latDegree);
            return (degrees + minutes).toFixed(6);
        } else {
            return 'Invalid Latitude';
        }
    };

    /*
    Converts longitude degrees, minutes, seconds into decimal degrees (float)
     */
    var dmsLonToDDLon = function (lonDegree, lonMinute, lonSecond) {
        var degrees;
        var minutes;
        var seconds;
        if (parseFloat(lonDegree) < 0) {
            seconds = parseFloat(lonSecond) / 60;
            minutes = (parseFloat(lonMinute) + seconds) / 60;
            degrees = parseFloat(Math.abs(lonDegree));
            return ((degrees + minutes) * -1).toFixed(6);
        } else if (parseFloat(lonDegree) >= 0) {
            seconds = parseFloat(lonSecond) / 60;
            minutes = (parseFloat(lonMinute) + seconds) / 60;
            degrees = parseFloat(lonDegree);
            return (degrees + minutes).toFixed(6);
        } else {
            return 'Invalid Longitude';
        }
    };

    //MyService is an object to contain all fields and
    //functions necessary to communicate with the various
    //controllers
    var coordService = {};

    /*
    Converts the decimal degrees of latitude and longitude input box the other formats (DMS and MGRS) so
    that those input boxes match as converted values.  Will do data validation by checking input coordinates
    fall between -80 and 84 latitude and -180 and 180 for longitude
     */
    coordService.prepForDDBroadcast = function (lat, lon) {
        if ((lat || lat === 0) && lat >= -90 && lat <= 90 && (lon || lon === 0)&& lon >= -180 && lon <= 180) {
            var results = {
                dms: [ddLatToDMSLat(lat), ddLonToDMSLon(lon)],
                dd: [lat, lon],
                mgrs: ''
            };
            if (lat >= -80 && lat <= 84) {
                results.mgrs = LLtoMGRS(lat, lon, 5);
            }
            return results;
        } else if (!(lat >= -80 && lat <= 84)) {
            return null;
        } else if (!(lon >= -180 && lon <= 180)) {
            return null;
        }
    };

    /*
     Converts the degrees, minutes, seconds strings of latitude and longitude input box the other formats (DD and MGRS) so
     that those input boxes match as converted values.  Will do data validation by checking input coordinates
     fall between -80 and 84 latitude and -180 and 180 for longitude
     */
    coordService.prepForDMSBroadcast = function (latDMS, lonDMS) {
        var latDegree, latMinute, latSecond, lonDegree, lonMinute, lonSecond;
        latDMS = latDMS.replace(/[NS ]/ig, '').split(/[�'"]/);
        lonDMS = lonDMS.replace(/[EW ]/ig, '').split(/[�'"]/);

        if (latDMS.length >= 3) {
            latDegree = parseInt(latDMS[0], 10);
            latMinute = parseInt(latDMS[1], 10);
            latSecond = parseFloat(latDMS[2], 10);
        } else if (latDMS.length === 1) {
            latDMS = latDMS[0].split('.');
            latSecond = parseFloat(latDMS[0].substr(-2) + '.' + latDMS[1], 10);
            latMinute = parseInt(latDMS[0].substr(-4, 2), 10);
            latDegree = parseInt(latDMS[0].slice(0, -4), 10);
        }
        if (lonDMS.length >= 3) {
            lonDegree = parseInt(lonDMS[0], 10);
            lonMinute = parseInt(lonDMS[1], 10);
            lonSecond = parseFloat(lonDMS[2], 10);
        } else if (lonDMS.length === 1) {
            lonDMS = lonDMS[0].split('.');
            lonSecond = parseFloat(lonDMS[0].substr(-2) + '.' + lonDMS[1], 10);
            lonMinute = parseInt(lonDMS[0].substr(-4, 2), 10);
            lonDegree = parseInt(lonDMS[0].slice(0, -4), 10);
        }

        if (
            latDegree >= -90 && latDegree <= 90 &&
            latMinute >= 0 && latMinute < 60 &&
            latSecond >= 0 && latSecond < 60 &&
            lonMinute >= 0 && lonMinute < 60 &&
            lonSecond >= 0 && lonSecond < 60 &&
            lonDegree >= -180 && lonDegree <= 180 &&
            parseFloat(latDegree) - parseFloat(latMinute * 0.01) - parseFloat(latSecond * 0.0001) >= -90 &&
            parseFloat(latDegree) + parseFloat(latMinute * 0.01) + parseFloat(latSecond * 0.0001) <=  90 &&
            parseFloat(lonDegree) - parseFloat(lonMinute * 0.01) - parseFloat(lonSecond * 0.0001) >= -180 &&
            parseFloat(lonDegree) + parseFloat(lonMinute * 0.01) + parseFloat(lonSecond * 0.0001) <=  180
        ) {
            var results = {
                dms: [
                    latDegree + '�' + latMinute + '\'' + latSecond + '"',
                    lonDegree + '�' + lonMinute + '\'' + lonSecond + '"'],
                dd: [
                    dmsLatToDDLat(latDegree, latMinute, latSecond),
                    dmsLonToDDLon(lonDegree, lonMinute, lonSecond)],
                mgrs: ''
            };
            if (results.dd[0] >= -80 && results.dd[0] <= 84) {
                results.mgrs = LLtoMGRS(results.dd[0], results.dd[1], 5);
            }
            return results;
        }else{
            return null;
        }
    };

    /*
     Converts the MGRS-encoded string of latitude and longitude input box the other formats (DMS and DD) so
     that those input boxes match as converted values.  Will do data validation by checking input coordinates
     fall between -80 and 84 latitude and -180 and 180 for longitude
     */
    //prepForMGRSBroadcast is the function that converts the
    //coordinates entered in the MGRS input boxes and sets
    //the rest of the fields in the myService object. data
    //validation is completed by checking if the input
    //coordinates return values to the latLon[] from the
    //USNGtoLL() function of the usng.js library.
    coordService.prepForMGRSBroadcast = function (MGRS) {
        var latLon = [];
        USNGtoLL(MGRS + '', latLon);

        if (isNaN(latLon[0]) || isNaN(latLon[1])) {
            return null;
        } else {
            // after 5 decimal places, the results start going off
            latLon[0] = Math.round(latLon[0] * 1e5) / 1.e5;
            latLon[1] = Math.round(latLon[1] * 1e5) / 1.e5;
            return {
                mgrs: MGRS,
                dd: latLon,
                dms: [ddLatToDMSLat(latLon[0]), ddLonToDMSLon(latLon[1])]
            };
        }
    };

    coordService.isValidLatDD = function(lat){
        return ((lat || lat === 0 || lat === '') && lat >= -90 && lat <= 90);
    };
    coordService.isValidLonDD = function(lon){
        return ( (lon || lon === 0 || lon === '')&& lon >= -180 && lon <= 180);
    };

    coordService.isValidLatDMS = function(latDMS){
        if (latDMS === ''){
            return true;
        }
        var latDegree, latMinute, latSecond;
        latDMS = latDMS.replace(/[NS ]/ig, '').split(/[�'"]/);

        if (latDMS.length >= 3) {
            latDegree = parseInt(latDMS[0], 10);
            latMinute = parseInt(latDMS[1], 10);
            latSecond = parseFloat(latDMS[2], 10);
        } else if (latDMS.length === 1) {
            latDMS = latDMS[0].split('.');
            latSecond = parseFloat(latDMS[0].substr(-2) + '.' + latDMS[1], 10);
            latMinute = parseInt(latDMS[0].substr(-4, 2), 10);
            latDegree = parseInt(latDMS[0].slice(0, -4), 10);
        }
        return (
            latDegree >= -90 && latDegree <= 90 &&
            latMinute >= 0 && latMinute < 60 &&
            latSecond >= 0 && latSecond < 60 &&
            parseFloat(latDegree) - parseFloat(latMinute * 0.01) - parseFloat(latSecond * 0.0001) >= -90 &&
            parseFloat(latDegree) + parseFloat(latMinute * 0.01) + parseFloat(latSecond * 0.0001) <=  90
        );
    };

    coordService.isValidLonDMS = function(lonDMS){
        if (lonDMS === ''){
            return true;
        }
        var lonDegree, lonMinute, lonSecond;
        lonDMS = lonDMS.replace(/[EW ]/ig, '').split(/[�'"]/);

        if (lonDMS.length >= 3) {
            lonDegree = parseInt(lonDMS[0], 10);
            lonMinute = parseInt(lonDMS[1], 10);
            lonSecond = parseFloat(lonDMS[2], 10);
        } else if (lonDMS.length === 1) {
            lonDMS = lonDMS[0].split('.');
            lonSecond = parseFloat(lonDMS[0].substr(-2) + '.' + lonDMS[1], 10);
            lonMinute = parseInt(lonDMS[0].substr(-4, 2), 10);
            lonDegree = parseInt(lonDMS[0].slice(0, -4), 10);
        }

        return (
            lonMinute >= 0 && lonMinute < 60 &&
            lonSecond >= 0 && lonSecond < 60 &&
            lonDegree >= -180 && lonDegree <= 180 &&
            parseFloat(lonDegree) - parseFloat(lonMinute * 0.01) - parseFloat(lonSecond * 0.0001) >= -180 &&
            parseFloat(lonDegree) + parseFloat(lonMinute * 0.01) + parseFloat(lonSecond * 0.0001) <=  180
        );
    };

    coordService.isValidMGRS = function (mgrs){
        if (mgrs === ''){
            return true;
        }
        mgrs = mgrs + '';
        return !!mgrs.match(/^([0-5][0-9][C-X]|60[C-X]|[ABYZ])[A-Z]{2}\d{4,14}$/i);
    };

    return coordService;
});
