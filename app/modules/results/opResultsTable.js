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

            scope.$watch('opModel', function () {
                
                var dataSet = [];
                
                
                if(scope.opModel.length > 0){
                    var columns = []
                    var columnKeys = scope.opModel[0];
                    for(var property in columnKeys){
                        columns.push({"sTitle":property});
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
                        select: {
                            style: 'multi+shift'
                        },
                        columns: columns
                    });

                    for (var i = 0; i < scope.opModel.length; i++) {
                        var row = scope.opModel[i];
                        var item = []
                    
                        for(var property in row)
                            item.push(row[property]);
                        dataSet.push(item);
                    }
                    table.fnAddData(dataSet);   

                    $('#table tbody').on( 'click', 'tr', function () {
                        var rowData = table.api().rows( {selected:true} ).data();
                        $window.opener.resultsSelected(rowData);
                    });       
                }
            });
            
            
        }
    };
}]);
