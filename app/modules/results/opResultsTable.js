angular.module('opApp').directive('opResultsTable', ['$timeout', '$window',
    function ($timeout, $window) {
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
        link: function (scope, element) {
            var table = null;
            scope.idColumn = null;
            scope.$watch('opModel', function () {
                
                var dataSet = [];
                var columns = [];
                var selectStyle = false;
                
                if(scope.opModel.length){
                    
                    var columnKeys = scope.opModel[0].properties;
                    var columnIndex = 0;
                    for(var property in columnKeys){
                        columns.push({"sTitle":property});
                        columnIndex++;
                    }

                    if(scope.opModel[0].id)
                    {
                        columns.push({"sTitle": "fid"});
                        selectStyle = {style: 'os'};
                    }

                    if(table != null){
                        table.fnClearTable();
                        table.fnDestroy();
                        $('#table').empty();
                    }
                    
                    table = $('#table').dataTable(
                    {
                        "bPaginate": false,
                        "bLengthChange": false, 
                        "bDestroy": true,
                        "bInfo": false,
                        select: selectStyle,
                        columns: columns
                    });

                    for (var i = 0; i < scope.opModel.length; i++) {
                        var row = scope.opModel[i].properties;
                        var item = []
                    
                        for(var property in row)
                            item.push(row[property]);
                        if(scope.opModel[i].id)
                            item.push(scope.opModel[i].id);
                        dataSet.push(item);
                    }
                    $.fn.dataTableExt.sErrMode = 'none';
                    table.fnAddData(dataSet);

                    scope.noData = false;

                    if(selectStyle)
                    {
                        $(document).keydown(function (event) {
                            event.preventDefault();
                            switch(event.keyCode)
                            {
                                //arrow down
                                case 40:
                                    var currentRow = $(".selected").get(0);
                                    
                                    if(!currentRow)
                                    {
                                        table.api().row(':first').select();
                                        $(window).scrollTop(0);
                                        var rowData = table.api().rows( {selected:true} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                    }
                                    if(currentRow.nextSibling)
                                    {
                                        table.api().rows('.selected').deselect();
                                        $(window).scrollTop(currentRow.offsetTop);
                                        $(currentRow).next().addClass("selected");
                                        table.api().row('.selected').select();
                                        
                                        var rowData = table.api().rows( {selected:true} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                        
                                    }
                                    break;
                                //arrow up
                                case 38:
                                    var currentRow = $(".selected").get(0);
                                    if(!currentRow)
                                    {
                                        table.api().row(':last').select();
                                        $(window).scrollTop($(document).height());
                                        var rowData = table.api().rows( {selected:true} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                    }
                                    if(currentRow.previousSibling)
                                    {
                                        table.api().rows('.selected').deselect();
                                        $(window).scrollTop(currentRow.offsetTop);
                                        $(currentRow).prev().addClass("selected");
                                        table.api().row('.selected').select();
                                        var rowData = table.api().rows( {selected:true} ).data();
                                        $window.opener.resultsSelected(scope.layer, rowData);
                                        
                                    }
                                    break;
                            }
                        });

                        $('#table tbody').on( 'click', 'tr', function () {
                            var rowData = table.api().rows( {selected:true} ).data();
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
