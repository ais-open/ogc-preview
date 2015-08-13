angular.module('opApp.ui')
  .directive('opPopup', function ($timeout) {
    'use strict';
    var hasPopup = false;
    var boo = function (e){
      if (hasPopup && !popup.is(e.target) && (!popup.has(e.target).length || e.target.className==='close')) {
        // if target != popup
        angular.element('body').off('click mousewheel DOMMouseScroll', boo);
        if (popup.data('target')){
          popup.data('target').removeClass('open');
        }
        popup.remove();
        hasPopup = false;
      }
    };
    var popup = angular.element('<div class="popover right"><div class="arrow"></div>' +
      '<div class="popover-inner">' +
      '<div class="close">&times;</div>' +
      '<div class="popover-content"></div>'+
      '</div></div>');

    return {
      restrict: 'A',
      link: function postLink(scope, element, attrs) {

        element.on('mouseup', function (e){
          e.stopPropagation();
          e.preventDefault();

          if (hasPopup && popup.data('target') === element){
            // this feels a little dirty tricking boo into thinking it got an event with a target, but it works...
            boo({target:element});
            return;
          }else if (popup.data('target')){
            popup.data('target').removeClass('open');
          }

          hasPopup = true;
          popup
            .remove()
            .insertAfter(element.parents('.sidebar-nav-fixed'))
            .css({
              position: 'fixed',
              display: 'block',
              top: element.offset().top  + 6 - (popup.height()/2),
              left: element.offset().left + 10 + element.width()//e.clientX + 20
            })
            .data('target', element)
            .find('.popover-content').html(attrs.opPopup);
          element.addClass('open');

          $timeout(function(){
            angular.element('body').on('click mousewheel DOMMouseScroll', boo);
            popup.css({top: element.offset().top  + 4 - (popup.height()/2)});
          });

        }).on('mousedown click', function (e){
          e.stopPropagation();
          e.preventDefault();
        });

        scope.$on('$destroy', function () {
          $timeout(function () {
            element.off('mouseup mousedown click');
          });
        });
      }
    };
  });
