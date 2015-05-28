/*jshint node:true */

var LIVERELOAD_PORT = 35729;

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
    'use strict';
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);
    grunt.loadNpmTasks('grunt-connect-proxy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-html2js');
    var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;
    var lrSnippet = require('connect-livereload')({ port: LIVERELOAD_PORT });
    var mountFolder = function (connect, dir) {
        return connect.static(require('path').resolve(dir));
    };

    // configurable paths
    var yeomanConfig = {
        app: 'app',
        dist: 'dist'
    };

    try {
        yeomanConfig.app = require('./bower.json').appPath || yeomanConfig.app;
    } catch (e) {
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        yeoman: yeomanConfig,
        watch: {
            less: {
                files: ['<%= yeoman.app %>/styles/{,*/}{,*/}*.less',
                    '<%= yeoman.app %>/styles/{,*/}{,*/}*.css'
                ],
                tasks: ['less']
            },
            templates: {
                files: [
                    '<%= yeoman.app %>/modules/{,*/}{,*/}*.html'
                ],
                tasks: ['html2js']
            },
            styles: {
                files: ['<%= yeoman.app %>/styles/{,*/}{,*/}*.css'],
                tasks: ['copy:styles', 'autoprefixer']
            },
            livereload: {
                options: {
                    livereload: LIVERELOAD_PORT
                },
                files: [
                    '<%= yeoman.app %>/{,*/}{,*/}*.html',
                    '.tmp/styles/{,*/}*.css',
                    '{.tmp,<%= yeoman.app %>}/modules/{,*/}*.js',
                    '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
                ]
            },
            jshint:{
                files: ['{.tmp,<%= yeoman.app %>}/modules/{,*/}*.js'],
                tasks: ['jshint']
            }
        },
        autoprefixer: {
            options: ['last 1 version'],
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '.tmp/styles/',
                        src: '{,*/}*.css',
                        dest: '.tmp/styles/'
                    }
                ]
            }
        },
        connect: {
            options: {
                port: 9000,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: '0.0.0.0'
            },
            proxies: [
                {
                    context: '/geoserver',
                    host: 'demo.boundlessgeo.com',
                    port: 80,
                    https: false,
                    changeOrigin: false,
                    xforward: true
                }
            ],
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            proxySnippet,
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, yeomanConfig.app)
                        ];
                    }
                }
            },
            test: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, 'test')
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, yeomanConfig.dist)
                        ];
                    }
                }
            }
        },
        open: {
            server: {
                url: 'http://localhost:<%= connect.options.port %>'
            }
        },
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            '.tmp',
                            '<%= yeoman.dist %>/*',
                            '!<%= yeoman.dist %>/.git*'
                        ]
                    }
                ]
            },
            server: '.tmp'
        },
        html2js: {
            options: {
                // custom options, see below
                htmlmin: {
                    //removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true
                },
                module: 'templates-main',
                base: '<%= yeoman.app %>'
            },
            main: {
                src: ['<%= yeoman.app %>/modules/{,*/}{,*/}*.html'],
                dest: '.tmp/scripts/templates.js'
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                'Gruntfile.js',
                '<%= yeoman.app %>/modules/{,*/}*.js',
                '!<%= yeoman.app %>/modules/lib/*.js'
            ]
        },
        less: {
            dist:{
                files: [
                    {
                        // no need for files, the config below should work
                        expand: true,
                        cwd: '<%= yeoman.app %>/styles',
                        src: ['*.less'],
                        dest: '.tmp/styles/',
                        ext: '.css'
                    }
                ]
            }
        },
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= yeoman.dist %>/scripts/{,*/}*.js',
                        '<%= yeoman.dist %>/styles/{,*/}*.css',
                        //'<%= yeoman.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
                        '<%= yeoman.dist %>/styles/fonts/*'
                    ]
                }
            }
        },
        useminPrepare: {
            html: ['<%= yeoman.app %>/*.html'],
            options: {
                dest: '<%= yeoman.dist %>'
            }
        },
        usemin: {
            html: ['<%= yeoman.dist %>/{,*/}*.html'],
            css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
            options: {
                dirs: ['<%= yeoman.dist %>']
            }
        },
        concat: {
            options: {
                stripBanners: 'false'
            }
        },
        htmlmin: {
            dist: {
                options: {
                    /*removeCommentsFromCDATA: true,
                     // https://github.com/yeoman/grunt-usemin/issues/44
                     //collapseWhitespace: true,
                     collapseBooleanAttributes: true,
                     removeAttributeQuotes: true,
                     removeRedundantAttributes: true,
                     useShortDoctype: true,
                     removeEmptyAttributes: true,
                     removeOptionalTags: true*/
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= yeoman.app %>',
                        src: ['*.html'], //, '**/*.html'],
                        dest: '<%= yeoman.dist %>'
                    }
                ]
            }
        },
        // Put files not handled in other tasks here
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: '<%= yeoman.app %>',
                        dest: '<%= yeoman.dist %>',
                        src: [
                            '*.{ico,png,txt}',
                            '.htaccess',
                            'images/{,*/}*',
                            'styles/fonts/*',
                          'modules/*.json',
                          'config/*'
                            //'WEB-INF/**'
                        ]
                    },
                    {
                        expand: true,
                        cwd: '.tmp/images',
                        dest: '<%= yeoman.dist %>/images',
                        src: [
                            'generated/*'
                        ]
                    },
                    {
                        expand: true,
                        cwd: '.tmp/styles',
                        dest: '<%= yeoman.dist %>/styles',
                        src: '{,*/}*.css'
                    },
                    {
                        expand: true,
                        cwd: '<%= yeoman.app %>/modules',
                        dest: '<%= yeoman.dist %>/modules',
                        src: '{,*/}{,*/}*.html'
                    }
                ]
            },
            styles: {
                expand: true,
                cwd: '<%= yeoman.app %>/styles',
                dest: '.tmp/styles/',
                src: '{,*/}*.css'
            },
            deploy: {
                expand: true,
                src: './artifacts/ogcpreview.tar.gz',
                dest: 'docker/'
            }
        },
        concurrent: {
            server: [
                'less',
                'html2js',
                'copy:styles'
            ],
            test: [
                'less',
                'html2js',
                'copy:styles'
            ],
            dist: [
                'less',
                'html2js',
                'copy:styles',
                'htmlmin'
            ]
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true
            }
        },
        ngmin: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '.tmp/concat/scripts',
                        src: '*.js',
                        dest: '.tmp/concat/scripts'
                    }
                ]
            }
        },
        uglify: {
            options: {
                sourceMap: function(path) { return path.replace(/.js/,'.map');},
                banner: '/*! -------------------------------- \n' +
                    '<%= pkg.name %> - v<%= pkg.version %>\n' +
                    'Developed By <%= pkg.author.name %> \n' +
                    '<%= pkg.author.company %> \n' +
                    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    '--------------------------------- */\n',
                preserveComments: 'some'
            }
        },
        compress: {
            war: {
                options: {
                    archive: './artifacts/ogcpreview.war',
                    mode: 'zip'
                },

                files: [
                    { cwd: '<%= yeoman.dist %>/', src: ['**'], expand: true }
                ]
            },
            tar: {
                options: {
                    archive: './artifacts/ogcpreview.tar.gz',
                    mode: 'tgz'
                },

                files: [
                    { cwd: '<%= yeoman.dist %>/', src: ['**'], dest: 'preview/',  expand: true }
                ]
            }
        }
    });

    grunt.registerTask('server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(
                [
                    'build',
                    //'open',
                    'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'concurrent:server',
            'autoprefixer',
            'configureProxies',
            'connect:livereload',
            //'open',
            'watch'
        ]);
    });

    grunt.registerTask('qserver', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'concurrent:server',
            'autoprefixer',
            'configureProxies',
            'connect:livereload',
            //'open',
            'watch'
        ]);
    });

    grunt.registerTask('test', [
        'clean:server',
        'concurrent:test',
        'autoprefixer',
        'connect:test',
        'karma'
    ]);

    grunt.registerTask('build', [
        'jshint',
        'test',
        'clean:dist',
        'useminPrepare',
        'concurrent:dist',
        'autoprefixer',
        'concat',
        'copy:dist',
        'ngmin',
        'uglify',
        'rev',
        'usemin',
        'compress:war',
        'compress:tar'
    ]);

    grunt.registerTask('docker-deploy', [
        'build',
        'copy:deploy'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test',
        'build'
    ]);
};
