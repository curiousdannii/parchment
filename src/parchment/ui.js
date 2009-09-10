/*
 * Parchment UI
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(){

window.gIsIphone = navigator.userAgent.match(/iPhone/i);

var topwin_element;
var topwin_dist = '0';

// Make the statusline always move to the top of the screen in MSIE < 7
$(document).ready(function() {
    topwin_element = document.getElementById('top-window');
    topwin_dist = '0';
    var ieMatch = navigator.appVersion.match(/MSIE (\d+)\./);
    if(ieMatch && +ieMatch[1]<7) {
        topwin_element.style.position = 'absolute';
        var move_element=function() {
            topwin_element.style.top = 1 * (document.documentElement.scrollTop + 1 * topwin_dist) + 'px';
        };
        window.onscroll = move_element;
        window.onresize = move_element;
    }
});

})();
