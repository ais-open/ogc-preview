var gulp = require('gulp');
var bump = require('gulp-bump');
var browserSync = require('browser-sync');
var proxyMiddleware = require('http-proxy-middleware');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var es = require('event-stream');
var fs = require('fs');
var series = require('stream-series');
var bowerFiles = require('main-bower-files');
var print = require('gulp-print');
var zip = require('gulp-zip');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var Q = require('q');
var debug = require('gulp-debug');
var gfilter = require('gulp-filter');

var paths = {
    vendor: './app/bower_components',
    //, '!./app/bower_components/Wicket/wicket-gmap3*', '!./app/bower_components/Wicket/wicket-arcgis*']
    scripts: ['./app/**/*.js', '!./app/bower_components/**', '!./app/config/**', '!./app/modules/results/**', '!./app/lib/**'],
    versionSource: './app/config/version.json',
    versionTargets: ['./app/config/version.json', './package.json', 'bower.json'],
    resultsScripts: ['./app/modules/results/**/*.js'],
    libs: './app/lib/**/*.js',
    config: ['./app/config/*'],
    styles: ['./app/**/lib.less', './app/**/app.less'],
    stylesAll: ['./app/**/*.less', './app/**/*.css'],
    images: ['./app/**/*.+(png|gif|eot|svg|ttf|woff)', './app/favicon.ico', '!./app/styles/**', '!./app/bower_components/**'],
    index: ['./app/index.html'],
    resultsIndex: ['./app/results.html'],
    partials: ['./app/**/*.html', '!./app/*.html', '!./app/styles/**', '!./app/bower_components/**'],
    distDev: './.tmp',
    distProd: './dist',
    distProdScripts: './dist/scripts'
};

var pipes = {};

var getVersionJson = function() {
    return JSON.parse(fs.readFileSync(paths.versionSource,'utf8'));
};

// ----- Ordering -----

pipes.orderedVendorScripts = function () {
    //return plugins.order(['**/jquery.js', '**/angular.js', '**/leaflet-dist/leaflet.js', '**/wicket.js', '**/wicket-leaflet.js']);
    return plugins.order([
        '**/jquery.js',
        '**/angular.js',
        '**/bootstrap.js',
        '**/ui-bootstrap-tpls.js',
        '**/leaflet.js',
        '**/wicket.js',
        '**/wicket-leaflet.js'
    ]);
    //return plugins.order(['**/jquery.js', '**/angular.js']);
};

pipes.orderedLibScripts = function() {
    return gulp.src(paths.libs)
      .pipe(gfilter(['**/*.js', '!**/dataTables.scroller.js', '!**/dataTables.select.min.js', '!**/jquery.dataTables.min.js']))
      .pipe(plugins.order([
          "**/jquery.dataTables.js",
          "**/dataTables.select.js"
        ]));
};

pipes.orderedAppScripts = function () {
    return plugins.angularFilesort();
};

pipes.minifiedFileName = function () {
    return plugins.rename(function (path) {
        path.extname = '.min' + path.extname;
    });
};

// ----- Validation -----

pipes.validatedPartials = function () {
    return gulp.src(paths.partials)
        .pipe(plugins.htmlhint({'doctype-first': false}))
        .pipe(plugins.htmlhint.reporter());
};

pipes.validatedAppScripts = function () {
    return gulp.src(paths.scripts)
        .pipe(gfilter(['**/*.js', '!**/dataTables.scroller.js', '!**/dataTables.select.min.js', '!**/jquery.dataTables.min.js', '!**/opResultsApp.js', '!**/opResultsTable.js']))
        .pipe(plugins.order([
          "**/jquery.dataTables.js",
          "**/dataTables.select.js",
          "app/lib/**/*.js",
          "app/modules/**/*.js"
        ]))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'));
};

pipes.validatedResultsScripts = function() {
    return gulp.src(paths.resultsScripts)
      .pipe(plugins.order(["**/opResultsApp.js"]))
      .pipe(plugins.jshint())
      .pipe(plugins.jshint.reporter('jshint-stylish'));
};

pipes.validatedIndex = function () {
    return gulp.src(paths.index)
        .pipe(plugins.htmlhint())
        .pipe(plugins.htmlhint.reporter());
};

pipes.validatedResults = function() {
    return gulp.src(paths.resultsIndex)
        .pipe(plugins.htmlhint())
        .pipe(plugins.htmlhint.reporter());
};

pipes.validateAppDev = function() {
    return es.merge(pipes.validatedAppScripts(), pipes.validatedIndex(), pipes.validatedPartials());
};

// ----- Copy -----

pipes.copyPartialsProd = function() {
    return pipes.validatedPartials()
        .pipe(gulp.dest(paths.distProd));
};

pipes.copyAppScriptsProd = function() {
    return pipes.validatedAppScripts()
        .pipe(gulp.dest(paths.distProd));
};

// ----- Build Minified-----

pipes.builtPartialsScriptProd = function() {
    return pipes.scriptedPartials()
        .pipe(plugins.concat('partials.min.js'))
        .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtAppScriptsProd = function () {
    return pipes.validatedAppScripts()
        //.pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('app.min.js'))
        .pipe(plugins.ngAnnotate())
        .pipe(plugins.uglify({mangle:false}))
        //.pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtResultsScriptsProd = function() {
    return pipes.validatedResultsScripts()
      .pipe(debug({title: 'results-scripts'}))
      .pipe(plugins.concat('results.min.js'))
      .pipe(plugins.ngAnnotate())
      .pipe(plugins.uglify({mangle:false}))
      .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtVendorScriptsProd = function () {
    return gulp.src(bowerFiles(), {base: paths.vendor})
        .pipe(gfilter(['**/*.js', '!**/wicket-arcgis.js', '!**/wicket-gmap3.js', '!**/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js']))
        .pipe(pipes.orderedVendorScripts())
        .pipe(pipes.minifiedFileName())
        .pipe(plugins.concat('vendor.min.js'))
        .pipe(plugins.uglify({mangle:false}))
        .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtLibScriptsProd = function() {
    return pipes.orderedLibScripts()
      .pipe(debug())
      .pipe(plugins.concat('lib.min.js'))
      .pipe(plugins.uglify({mangle:false}))
      .pipe(gulp.dest(paths.distProdScripts));
};

// ----- Build -----

pipes.builtImages = function (target) {
    return gulp.src(paths.images)
        .pipe(gulp.dest(target));
};

pipes.builtConfig = function (target) {
    return gulp.src(paths.config)
        .pipe(gulp.dest(target));
};

pipes.builtStylesDev = function () {
    return gulp.src(paths.styles)
        .pipe(plugins.less())
        .pipe(gulp.dest(paths.distDev))
        .pipe(browserSync.stream());
};

pipes.builtStylesProd = function () {
    return gulp.src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.less())
        .pipe(plugins.minifyCss())
        .pipe(plugins.sourcemaps.write())
        .pipe(pipes.minifiedFileName())
        .pipe(gulp.dest(paths.distProd))
        .pipe(browserSync.stream());
};

pipes.builtIndexProd = function () {
    pipes.builtImages(paths.distProd);
    pipes.builtConfig(paths.distProd + '/config');

    var vendorScripts = pipes.builtVendorScriptsProd().pipe(debug({title:'vendorScripts:'}));
    var libScripts = pipes.builtLibScriptsProd();
    var otherScripts = series(pipes.copyPartialsProd(), pipes.builtAppScriptsProd()).pipe(debug({title:'otherScripts:'}));
    var appStyles = series(pipes.builtStylesProd()).pipe(debug({title:'appStyles:'}));
    var scripts = series(vendorScripts, libScripts, otherScripts).pipe(debug({title:'scripts:'}));

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
        .pipe(plugins.inject(scripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(gulp.dest(paths.distProd));
};

pipes.builtResultsProd = function() {
    
    var appStyles = series(pipes.builtStylesProd());
    var scripts = series(pipes.builtVendorScriptsProd(), pipes.builtLibScriptsProd(), pipes.builtResultsScriptsProd());
    
    return pipes.validatedResults()
        .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
        .pipe(plugins.inject(scripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(gulp.dest(paths.distProd));
};

pipes.builtAppProd = function () {
    return series(pipes.builtIndexProd(), pipes.builtResultsProd());
};

pipes.buildArtifacts = function () {
  var war = gulp.src(paths.distProd + '/**/*')
      .pipe(zip('ogcpreview.war'))
      .pipe(gulp.dest('./artifacts'));

    var tar = gulp.src(paths.distProd + '/**/*')
        .pipe(plugins.tar('ogcpreview.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('./artifacts'));
      
    return es.merge(war, tar);
};

// ----- Convert -----

pipes.scriptedPartials = function () {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: "opApp"
        }));
};



// == TASKS ========

gulp.task('bump', function() {
    gulp.src(paths.versionTargets, {base: './'})
    .pipe(bump())
    .pipe(gulp.dest('./'));
});

gulp.task('tag-build', function() {
    // Removed logic expecting version.json to contain build number
    // Only add build number and add to packaged artifacts, never commmit back to repo
    var build_num = null;
    if (process.env.TRAVIS_BUILD_NUMBER) {
        build_num = process.env.TRAVIS_BUILD_NUMBER;
    }

    if (process.env.BUILD_NUMBER) {
        build_num = process.env.BUILD_NUMBER;
    }

    if (build_num != null) {
      var pkg = getVersionJson();
      var newVer = pkg.version;
      var newVerBuild = newVer + '-' + build_num;

      gulp.src(paths.versionSource, {base: './'})
      .pipe(bump({version: newVerBuild}))
      .pipe(gulp.dest('./'));
    }
});

// removes all compiled dev files
gulp.task('clean-dev', function () {
    var deferred = Q.defer();
    del(paths.distDev, function () {
        deferred.resolve();
    });
    return deferred.promise;
});

// removes all compiled production files
gulp.task('clean-prod', function () {
    var deferred = Q.defer();
    del(paths.distProd, function () {
        deferred.resolve();
    });
    return deferred.promise;
});

// checks html source files for syntax errors
gulp.task('validate-partials', pipes.validatedPartials);

// checks index.html for syntax errors
gulp.task('validate-index', pipes.validatedIndex);

// converts partials to javascript using html2js
gulp.task('convert-partials-to-js', pipes.scriptedPartials);

// runs jshint on the app scripts
gulp.task('validate-app-scripts', pipes.validatedAppScripts);

// run all validation on application
gulp.task('validate-app-dev', pipes.validateAppDev);

// concatenates, uglifies, and moves app scripts and partials into the prod environment
gulp.task('build-app-scripts-prod', pipes.builtAppScriptsProd);

// compiles app sass and moves to the dev environment
gulp.task('build-styles-dev', pipes.builtStylesDev);

// compiles and minifies app sass to css and moves to the prod environment
gulp.task('build-styles-prod', pipes.builtStylesProd);

// concatenates, uglifies, and moves vendor scripts into the prod environment
gulp.task('build-vendor-scripts-prod', pipes.builtVendorScriptsProd);

// validates and injects sources into index.html, minifies and moves it to the dev environment
gulp.task('build-index-prod', pipes.builtIndexProd);

// builds a complete prod environment
gulp.task('build-app-prod', pipes.builtAppProd);

// cleans and builds a complete prod environment
gulp.task('clean-build-app-prod', ['clean-prod'], pipes.builtAppProd);

gulp.task('prod-artifacts', ['tag-build', 'clean-build-app-prod'], pipes.buildArtifacts);

// clean, build, and watch live changes to the dev environment
gulp.task('watch-dev', ['build-styles-dev', 'validate-app-scripts'], function () {
    var proxy = proxyMiddleware('/geoserver', {target: 'http://demo.boundlessgeo.com'});
    var proxy2 = proxyMiddleware('/shapes/', {target: 'http://10.3.2.136:8000/'});
    var proxy3 = proxyMiddleware('/geoserver2', {target: 'http://172.17.0.3'});

    browserSync.init({
        port: 3000,
        server: {
            baseDir: ['./app','./.tmp'],
            middleware: [proxy, proxy2, proxy3]
        }
    });

    gulp.watch(paths.stylesAll, ['build-styles-dev']);
    gulp.watch(['./app/**/*.*', '!./app/**/*.+(css|less)']).on('change', browserSync.reload);
});

// clean, build, and watch live changes to the prod environment
gulp.task('watch-prod', ['clean-build-app-prod'], function () {
    var proxy = proxyMiddleware('/geoserver', {target: 'http://demo.boundlessgeo.com'});

    browserSync.init({
        port: 9001,
        server: {
            baseDir: ["./dist"],
            middleware: [proxy]
        }
    });

    gulp.watch(paths.stylesAll, ['build-styles-prod']);

    // watch index
    gulp.watch(paths.index, function () {
        return pipes.builtIndexProd()
            .pipe(browserSync.reload);
    });

    // watch app scripts
    gulp.watch(paths.scripts, function () {
        return pipes.builtAppScriptsProd()
            .pipe(browserSync.reload);
    });

    // watch hhtml partials
    gulp.watch(paths.partials, function () {
        return pipes.builtPartialsScriptProd()
            .pipe(browserSync.reload);
    });

    // watch styles
    gulp.watch(paths.styles, function () {
        return pipes.builtStylesProd()
            .pipe(browserSync.reload);
    });

});

// default task launches build
gulp.task('default', ['watch-dev']);

gulp.task('build', ['prod-artifacts']);

// placeholder for unit test integration
gulp.task('test', function() {});
