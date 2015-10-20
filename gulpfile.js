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
    scripts: ['./app/**/*.js', '!./app/bower_components/**', '!./app/config/**'],
    config: ['./app/config/*'],
    styles: ['./app/**/lib.less', './app/**/app.less'],
    stylesAll: ['./app/**/*.less', './app/**/*.css'],
    images: ['./app/**/*.+(png|gif|eot|svg|ttf|woff)', './app/favicon.ico', '!./app/styles/**', '!./app/bower_components/**'],
    index: ['./app/index.html', './app/results.html'],
    partials: ['./app/**/*.html', '!./app/*.html', '!./app/styles/**', '!./app/bower_components/**'],
    distDev: './.tmp',
    distProd: './dist',
    distProdScripts: './dist/scripts'
};

var pipes = {};

var getVersionJson = function() {
    return JSON.parse(fs.readFileSync('./app/config/version.json','utf8'));
};

pipes.orderedVendorScripts = function () {
    return plugins.order(['**/jquery.js', '**/angular.js']);
};

pipes.orderedAppScripts = function () {
    return plugins.angularFilesort();
};

pipes.minifiedFileName = function () {
    return plugins.rename(function (path) {
        path.extname = '.min' + path.extname;
    });
};

pipes.validatedAppScripts = function () {
    return gulp.src(paths.scripts)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'));
};

pipes.copyPartialsProd = function() {
    return pipes.validatedPartials()
        .pipe(gulp.dest(paths.distProd))
};

pipes.builtPartialsScriptProd = function() {
    return pipes.scriptedPartials()
        .pipe(plugins.concat('partials.min.js'))
        .pipe(gulp.dest(paths.distProdScripts))
};

pipes.copyAppScriptsProd = function() {
    return pipes.validatedAppScripts()
        .pipe(gulp.dest(paths.distProd))
};

pipes.builtAppScriptsProd = function () {
    return pipes.validatedAppScripts()
        .pipe(plugins.ngAnnotate())
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('app.min.js'))
        .pipe(plugins.uglify({mangle:false}))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtVendorScriptsProd = function () {
    return gulp.src(bowerFiles(), {base: paths.vendor})
        .pipe(gfilter('**/*.js'))
        .pipe(pipes.orderedVendorScripts())
        .pipe(pipes.minifiedFileName())
        .pipe(plugins.concat('vendor.min.js'))
        //.pipe(plugins.uglify())
        .pipe(gulp.dest(paths.distProdScripts));
};

pipes.validatedPartials = function () {
    return gulp.src(paths.partials)
        .pipe(plugins.htmlhint({'doctype-first': false}))
        .pipe(plugins.htmlhint.reporter());
};

pipes.scriptedPartials = function () {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: "opApp"
        }));
};

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

pipes.validatedIndex = function () {
    return gulp.src(paths.index)
        .pipe(plugins.htmlhint())
        .pipe(plugins.htmlhint.reporter());
};

pipes.builtIndexProd = function () {

    pipes.builtImages(paths.distProd);
    pipes.builtConfig(paths.distProd + '/config');

    //var partialScript = pipes.builtPartialsScriptProd();
    var vendorScripts = pipes.builtVendorScriptsProd();
    series(pipes.copyPartialsProd(),pipes.copyAppScriptsProd());
    var appStyles = series(pipes.builtStylesProd());
    var scripts = series(vendorScripts);

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
        .pipe(plugins.inject(scripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(gulp.dest(paths.distProd));
};

pipes.validateAppDev = function() {
    return es.merge(pipes.validatedAppScripts(), pipes.validatedIndex(), pipes.validatedPartials())
};

pipes.builtAppProd = function () {
    return pipes.builtIndexProd();
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

// == TASKS ========
gulp.task('bump', function() {
    var pkg = getVersionJson();
    var newVer = pkg.version.split('-')[0];

    gulp.src('./package.json')
    .pipe(bump({version: newVer}))
    .pipe(gulp.dest('./'));

    gulp.src('./bower.json')
    .pipe(bump({version: newVer}))
    .pipe(gulp.dest('./'));

    gulp.src('./app/config/version.json')
    .pipe(bump({version: newVer + '-' + process.env.BUILD_NUMBER}))
    .pipe(gulp.dest('./app/config'));
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

gulp.task('prod-artifacts', ['clean-build-app-prod'], pipes.buildArtifacts);

// clean, build, and watch live changes to the dev environment
gulp.task('watch-dev', ['build-styles-dev', 'validate-app-scripts', 'bump'], function () {
    var proxy = proxyMiddleware('/geoserver', {target: 'http://demo.boundlessgeo.com'});

    browserSync.init({
        port: 3000,
        server: {
            baseDir: ['./app','./.tmp'],
            middleware: [proxy]
        }
    });

    gulp.watch(paths.stylesAll, ['build-styles-dev']);
    gulp.watch(['./app/**/*.*', '!./app/**/*.+(css|less)']).on('change', browserSync.reload);
});

// clean, build, and watch live changes to the prod environment
gulp.task('watch-prod', ['clean-build-app-prod', 'bump'], function () {
    var proxy = proxyMiddleware('/geoserver', {target: 'http://demo.boundlessgeo.com'});

    browserSync.init({
        port: 9000,
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

// default task builds for prod
gulp.task('default', ['prod-artifacts', 'bump']);

// placeholder for unit test integration
gulp.task('test', function() {});
