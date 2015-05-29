var gulp = require('gulp');
var browserSync = require('browser-sync');
var proxyMiddleware = require('http-proxy-middleware');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var es = require('event-stream');
var bowerFiles = require('main-bower-files');
var print = require('gulp-print');
var Q = require('q');

var paths = {
  vendor: './app/bower_components',
  scripts: ['./app/**/*.js', '!./app/bower_components/**', '!./app/config/**'],
  config: ['./app/config/*'],
  styles: ['./app/**/lib.less', './app/**/app.less'],
  images: ['./app/**/*.+(png|gif|eot|svg|ttf|woff)', './app/favicon.ico', '!./app/styles/**'],
  index: ['./app/index.html', './app/results.html'],
  partials: ['./app/**/*.html', '!./app/*.html', '!./app/styles/**', '!./app/bower_components/**'],
  distDev: './dist.dev',
  distDevBower: './dist.dev/bower_components',
  distProd: './dist.prod',
  distProdScripts: './dist.prod/scripts'
};

var pipes = {};

pipes.listPaths = function () {
  return gulp.src(paths.scripts).pipe(print());
  //return  gulp.src(bowerFiles()).pipe(print());
};

pipes.orderedVendorScripts = function () {
  return plugins.order(['jquery.js', 'angular.js']);
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

pipes.builtAppScriptsDev = function () {
  return pipes.validatedAppScripts()
      .pipe(gulp.dest(paths.distDev));
};

pipes.builtAppScriptsProd = function () {
  var scriptedPartials = pipes.scriptedPartials();
  var validatedAppScripts = pipes.validatedAppScripts();

  return es.merge(scriptedPartials, validatedAppScripts)
      .pipe(pipes.orderedAppScripts())
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.concat('app.min.js'))
      .pipe(plugins.uglify())
      .pipe(plugins.sourcemaps.write())
      .pipe(gulp.dest(paths.distProdScripts));
};

pipes.builtVendorScriptsDev = function () {
  return gulp.src(bowerFiles(), {base: paths.vendor})
      .pipe(gulp.dest(paths.distDevBower));
};

pipes.builtVendorScriptsProd = function () {
  return gulp.src(bowerFiles(), {base: paths.vendor})
      .pipe(pipes.orderedVendorScripts())
      .pipe(plugins.concat('vendor.min.js'))
      .pipe(plugins.uglify())
      .pipe(gulp.dest(paths.distProdScripts));
};

pipes.validatedPartials = function () {
  return gulp.src(paths.partials)
      .pipe(plugins.htmlhint({'doctype-first': false}))
      .pipe(plugins.htmlhint.reporter());
};

pipes.builtPartialsDev = function () {
  return pipes.validatedPartials()
      .pipe(gulp.dest(paths.distDev));
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
      .pipe(gulp.dest(paths.distDev));
};

pipes.builtStylesProd = function () {
  return gulp.src(paths.styles)
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.less())
      .pipe(plugins.minifyCss())
      .pipe(plugins.sourcemaps.write())
      .pipe(pipes.minifiedFileName())
      .pipe(gulp.dest(paths.distProd));
};

pipes.validatedIndex = function () {
  return gulp.src(paths.index)
      .pipe(plugins.htmlhint())
      .pipe(plugins.htmlhint.reporter());
};

pipes.builtIndexDev = function () {

  pipes.builtImages(paths.distDev);
  pipes.builtConfig(paths.distDev + '/config');

  var orderedVendorScripts = pipes.builtVendorScriptsDev()
      .pipe(pipes.orderedVendorScripts());

  var orderedAppScripts = pipes.builtAppScriptsDev()
      .pipe(pipes.orderedAppScripts());

  var appStyles = pipes.builtStylesDev();

  return pipes.validatedIndex()
      .pipe(gulp.dest(paths.distDev)) // write first to get relative path for inject
      .pipe(plugins.inject(orderedVendorScripts, {relative: true, name: 'bower'}))
      .pipe(plugins.inject(orderedAppScripts, {relative: true}))
      .pipe(plugins.inject(appStyles, {relative: true}))
      .pipe(gulp.dest(paths.distDev));
};

pipes.builtIndexProd = function () {

  pipes.builtImages(paths.distProd);
  pipes.builtConfig(paths.distProd + '/config');

  var vendorScripts = pipes.builtVendorScriptsProd();
  var appScripts = pipes.builtAppScriptsProd();
  var appStyles = pipes.builtStylesProd();
  console.log('Writing index');

  return pipes.validatedIndex()
      .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
      .pipe(plugins.inject(vendorScripts, {relative: true, name: 'bower'}))
      .pipe(plugins.inject(appScripts, {relative: true}))
      .pipe(plugins.inject(appStyles, {relative: true}))
      .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
      .pipe(gulp.dest(paths.distProd));
};

pipes.builtAppDev = function () {
  return es.merge(pipes.builtIndexDev(), pipes.builtPartialsDev());
};

pipes.builtAppProd = function () {
  return pipes.builtIndexProd();
};


// == TASKS ========

gulp.task('list-paths', pipes.listPaths);

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

// moves html source files into the dev environment
gulp.task('build-partials-dev', pipes.builtPartialsDev);

// converts partials to javascript using html2js
gulp.task('convert-partials-to-js', pipes.scriptedPartials);

// runs jshint on the dev server scripts
gulp.task('validate-devserver-scripts', pipes.validatedDevServerScripts);

// runs jshint on the app scripts
gulp.task('validate-app-scripts', pipes.validatedAppScripts);

// moves app scripts into the dev environment
gulp.task('build-app-scripts-dev', pipes.builtAppScriptsDev);

// concatenates, uglifies, and moves app scripts and partials into the prod environment
gulp.task('build-app-scripts-prod', pipes.builtAppScriptsProd);

// compiles app sass and moves to the dev environment
gulp.task('build-styles-dev', pipes.builtStylesDev);

// compiles and minifies app sass to css and moves to the prod environment
gulp.task('build-styles-prod', pipes.builtStylesProd);

// moves vendor scripts into the dev environment
gulp.task('build-vendor-scripts-dev', pipes.builtVendorScriptsDev);

// concatenates, uglifies, and moves vendor scripts into the prod environment
gulp.task('build-vendor-scripts-prod', pipes.builtVendorScriptsProd);

// validates and injects sources into index.html and moves it to the dev environment
gulp.task('build-index-dev', pipes.builtIndexDev);

// validates and injects sources into index.html, minifies and moves it to the dev environment
gulp.task('build-index-prod', pipes.builtIndexProd);

// builds a complete dev environment
gulp.task('build-app-dev', pipes.builtAppDev);

// builds a complete prod environment
gulp.task('build-app-prod', pipes.builtAppProd);

// cleans and builds a complete dev environment
gulp.task('clean-build-app-dev', ['clean-dev'], pipes.builtAppDev);

// cleans and builds a complete prod environment
gulp.task('clean-build-app-prod', ['clean-prod'], pipes.builtAppProd);

// clean, build, and watch live changes to the dev environment
gulp.task('watch-dev', ['clean-build-app-dev', 'validate-devserver-scripts'], function () {
  var proxy = proxyMiddleware('/geoserver', {target: 'http://demo.boundlessgeo.com'});

  browserSync.init({
    server: {
      baseDir: "./dist.dev",
      middleware: [proxy]
    }
  });

  //// watch index
  //gulp.watch(paths.index, function() {
  //  return pipes.builtIndexDev()
  //      .pipe(browserSync.stream());
  //});
  //
  //// watch app scripts
  //gulp.watch(paths.scripts, function() {
  //  return pipes.builtAppScriptsDev()
  //      .pipe(browserSync.stream());
  //});
  //
  //// watch html partials
  //gulp.watch(paths.partials, function() {
  //  return pipes.builtPartialsDev()
  //      .pipe(browserSync.stream());
  //});
  //
  //// watch styles
  //gulp.watch(paths.styles, function() {
  //  return pipes.builtStylesDev()
  //      .pipe(browserSync.stream());
  //});

});

// clean, build, and watch live changes to the prod environment
gulp.task('watch-prod', ['clean-build-app-prod', 'validate-devserver-scripts'], function () {

  // start nodemon to auto-reload the dev server
  plugins.nodemon({script: 'server.js', ext: 'js', watch: ['devServer/'], env: {NODE_ENV: 'production'}})
      .on('change', ['validate-devserver-scripts'])
      .on('restart', function () {
        console.log('[nodemon] restarted dev server');
      });

  // start live-reload server
  plugins.livereload.listen({start: true});

  // watch index
  gulp.watch(paths.index, function () {
    return pipes.builtIndexProd()
        .pipe(plugins.livereload());
  });

  // watch app scripts
  gulp.watch(paths.scripts, function () {
    return pipes.builtAppScriptsProd()
        .pipe(plugins.livereload());
  });

  // watch hhtml partials
  gulp.watch(paths.partials, function () {
    return pipes.builtAppScriptsProd()
        .pipe(plugins.livereload());
  });

  // watch styles
  gulp.watch(paths.styles, function () {
    return pipes.builtStylesProd()
        .pipe(plugins.livereload());
  });

});

// default task builds for prod
gulp.task('default', ['clean-build-app-prod']);
