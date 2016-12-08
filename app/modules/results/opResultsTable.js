angular.module('opApp').directive('opResultsTable', ['$timeout', '$window', '$rootScope',
    function ($timeout, $window, $rootScope) {
    'use strict';

       

    return {
        restrict: 'EA',
        templateUrl: 'modules/results/opResultsTable.html',
        scope: {
            opModel: '=',
            loading: '=',
            error: '=',
            layer: '='
        },
        link: function (scope, element) { // jshint ignore:line
            var table = null;
            scope.idColumn = null;
            scope.$watch('opModel', function () {
                
                var dataSet = [];
                var columns = [];
                var selectStyle = false;
                
                if(scope.opModel.length){
                    
                    var columnKeys = scope.opModel[0].properties;
                    var index;
                    for(index=0; index<columnKeys.length; index++) {
                        columns.push({'sTitle':columnKeys[index]});
                    }

                    if(scope.opModel[0].id && scope.opModel[0].id.indexOf('fid-') < 0)
                    {
                        columns.push({'sTitle': 'fid'});
                        selectStyle = {style: 'os'};
                        $rootScope.selectDisabled = false;
                    }
                    else
                    {
                        $rootScope.selectDisabled = true;
                    }

                    if(table !== null){
                        table.fnClearTable();
                        table.fnDestroy();
                        $('#table').empty();
                    }
                    
                    table = $('#table').dataTable(
                    {
                        'bPaginate': false,
                        'bLengthChange': false,
                        'bDestroy': true,
                        'bInfo': false,
                        select: selectStyle,
                        columns: columns
                    });

                    for (var i = 0; i < scope.opModel.length; i++) {
                        var row = scope.opModel[i].properties;
                        var item = [];
                    
                        for(index=0; index<row.length; index++) {
                            item.push(row[index]);
                        }
                        if(scope.opModel[i].id) {
                            item.push(scope.opModel[i].id);
                        }
                        dataSet.push(item);
                    }
                    $.fn.dataTableExt.sErrMode = 'none';
                    table.fnAddData(dataSet);

                    scope.noData = false;

                    if(selectStyle)
                    {
                        $(document).keydown(function (event) {
                            var currentRow;
                            var rowData;
                            switch(event.keyCode)
                            {
                                //arrow down
                                case 40:
                                    event.preventDefault();
                                    currentRow = $('.selected:last').get(0);

                                    if(!currentRow)
                                    {
                                        table.api().row(':first').select();
                                        $(window).scrollTop(0);
                                        rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                    }
                                    if(currentRow.nextSibling)
                                    {
                                        if(!event.shiftKey) {
                                            table.api().rows('.selected').deselect();
                                        }
                                        $(window).scrollTop(currentRow.offsetTop);
                                        
                                        table.api().row(currentRow.nextSibling).select();
                                        
                                        rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                        
                                    }
                                    break;
                                //arrow up
                                case 38:
                                    event.preventDefault();
                                    currentRow = $('.selected:first').get(0);

                                    if(!currentRow)
                                    {
                                        table.api().row(':last').select();
                                        $(window).scrollTop($(document).height());
                                        rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                    }
                                    if(currentRow.previousSibling)
                                    {
                                        if(!event.shiftKey) {
                                            table.api().rows('.selected').deselect();
                                        }
                                        $(window).scrollTop(currentRow.offsetTop);
                    
                                        table.api().row(currentRow.previousSibling).select();
                                        rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                        
                                    }
                                    break;
                            }
                        });

                        table.api().on( 'search.dt', function () {
                            var rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                            $window.opener.resultsSelected(scope.layer, rowData);
                        });

                        $('#table tbody').on( 'click', 'tr', function () {
                            var rowData = table.api().rows( {selected:true, filter: 'applied'} ).data();
                            $window.opener.resultsSelected(scope.layer, rowData);
                        }); 
                    }
                }
                else
                {
                    scope.noData = true;
                }
            });
        }
    };
}]);
