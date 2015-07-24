// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      //'app/bower_components/angular/angular.js',
      //'app/bower_components/angular-animate/angular-animate.js',
      //'app/bower_components/angular-mocks/angular-mocks.js',
      //'app/bower_components/angular-resource/angular-resource.js',
      //'app/bower_components/angular-cookies/angular-cookies.js',
      //'app/bower_components/angular-sanitize/angular-sanitize.js',
      //'app/bower_components/angular-route/angular-route.js',
      //'app/bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js',
      //'app/bower_components/momentjs/moment.js',
      //'app/bower_components/lodash/dist/lodash.compat.js',
      //'app/bower_components/restangular/dist/restangular.js',
      //'app/bower_components/AngularJS-Toaster/toaster.js',
      //'app/bower_components/angular-local-storage/angular-local-storage.js',
/*

            <script src="bower_components/angular-local-storage/angular-local-storage.js"></script>
            <script src="bower_components/leaflet-dist/leaflet.js"></script>
            <script src="bower_components/AngularJS-Toaster/toaster.js"></script>
*/

      //'app/modules/*.js',
      //'app/modules/**/*.js',
      //'app/modules/app.js',
      //'app/modules/header/opAnnouncementsDirective.js',
      //'app/modules/filters/opPlaintTextToHtml.js',
      //'app/modules/filters/opUnixToDate.js',
      //'app/modules/header/opHeaderController.js',
      //'app/modules/header/opHeaderDirective.js',
      //'app/modules/header/opAnnouncementsService.js',
      //'app/modules/home/opHomeController.js',
      //'app/modules/map/opMapController.js',
      //'app/modules/map/opMapDirective.js',
      //'app/modules/results/opResults.js',
      //'app/modules/query/opLayerService.js',
      //'app/modules/query/opWebFeatureService.js',
      //'app/modules/query/opWebMapService.js',
      //'app/modules/sidebar/opSidebarController.js',
      //'app/modules/sidebar/opSidebarDirective.js',
      //'app/modules/sidebar/layer/opLayerController.js',
      //'app/modules/sidebar/layer/opLayerDirective.js',
      //'app/modules/sidebar/temporal/opDateTimeDirective.js',
      //'app/modules/sidebar/temporal/opDateTimeController.js',
      //'app/modules/query/opFilterService.js',
      //'app/modules/query/opExportService.js',
      //'app/modules/ui/opPopupWindow.js',
      //'app/modules/ui/opPopup.js',
      //'app/modules/opStateService.js',
      //'app/modules/opConfig.js',
      //'test/spec/*.js',
      //'test/spec/**/*.js'
    ],

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 8070,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    preprocessors: {
      'app/scripts/**/*.js': 'coverage'
    },
    reporters: ['progress', 'coverage']

  });
};
