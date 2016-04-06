angular.module('opApp').directive('opResultsTable', ['$timeout',
    function ($timeout) {
    'use strict';

    if (typeof window.ColumnsPlugins === 'undefined') {
        window.ColumnsPlugins = {};
    }

    window.ColumnsPlugins.resizeable = {
        init: function () {
            this.columnData = {
                data: {},
                set: function (key, val) {
                    this.data[key] = val;
                },
                get: function (key) {
                    return this.data[key];
                }
            };
        },
        create: function () {
            var $this = this;
            setTimeout(function () {
                $($this.$el).find('table').resizableColumns({store: $this.columnData, syncHandlers: false});
            }, 0);
        }
    };

    return {
        restrict: 'EA',
        templateUrl: 'modules/results/opResultsTable.html',
        scope: {
            opModel: '=',
            loading: '=',
            error: '='
        },
        link: function (scope, element) {
            scope.noData = true;
            var viewTable = null;
            element.on('click', '.clear', function () {
                angular.element('.ui-table-search').val('').keyup();
            });

            scope.$watch('opModel', function () {
                if (viewTable) {
                    viewTable.destroy();
                }

                if (scope.opModel.length) {
                    scope.noData = false;
                    viewTable = element.find('.data-table').columns({
                        data: scope.opModel,
                        paginating: false,
                        //plugins: ['resizeable'],
                        template: '{{#search}}<div class="ui-columns-search"> <input class="ui-table-search" placeholder="Filter Results" type="text" name="query" data-columns-search="true" value="{{query}}" required /><div class="clear">&times;</div></div></div>{{/search}} {{#table}}<div class="ui-columns-table" data-columns-table="true"> <table class="display table table-striped table-bordered table-hover"> <thead> {{#headers}}   {{#sortable}} <th class="ui-table-sortable" data-columns-sortby="{{key}}"  data-resizable-column-id="{{header}}">{{header}}</th> {{/sortable}}  {{#notSortable}} <th data-resizable-column-id="{{header}}">{{header}}</th> {{/notSortable}}  {{#sortedUp}} <th class="ui-table-sort-up ui-table-sortable" data-columns-sortby="{{key}}" data-resizable-column-id="{{header}}">{{header}} <span class="ui-arrow">&#x25B2;</span></th> {{/sortedUp}}  {{#sortedDown}} <th class="ui-table-sort-down ui-table-sortable" data-columns-sortby="{{key}}" data-resizable-column-id="{{header}}">{{header}} <span class="ui-arrow">&#x25BC;</span></th> {{/sortedDown}}    {{/headers}} </thead> <tbody> {{#rows}} {{{.}}} {{/rows}} </tbody>  </table> </div>{{/table}}'
                    });

                    $timeout(function () {
                        angular.element('.ui-table-search').placeholder();
                    });
                } else {
                    scope.noData = true;
                }
            });

        }
    };
}]);
