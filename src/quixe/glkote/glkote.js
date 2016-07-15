/* GlkOte -- a Javascript display library for IF interfaces
 * GlkOte Library: version 2.2.2.
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glk/glkote.html>
 * 
 * This Javascript library is copyright 2008-16 by Andrew Plotkin.
 * It is distributed under the MIT license; see the "LICENSE" file.
 *
 * GlkOte is a tool for creating interactive fiction -- and other text-based
 * applications -- on a web page. It is a Javascript library which handles
 * the mechanics of displaying text, arranging panes of text, and accepting
 * text input from the user.
 *
 * GlkOte is based on the Glk API. However, GlkOte's API is not identical to
 * Glk, even allowing for the differences between Javascript and C. GlkOte is
 * adapted to the realities of a web application environment -- a thin
 * Javascript layer which communicates with a distant server in intermittent
 * bursts.
 *
 * GlkOte can be used from two angles. First, in a purely client-side IF
 * application. The (included, optional) glkapi.js file facilitates this; it
 * wraps around GlkOte and provides an API that is identical to Glk, as
 * closely as Javascript allows. An IF interpreter written in Javascript,
 * running entirely within the user's web browser, can use glkapi.js just as
 * a C interpreter uses a normal Glk library. Or it could bypass glkapi.js
 * and use GlkOte directly.
 *
 * Alternatively, GlkOte could be used with a Glk library which acts as a
 * web service. The RemGlk library (not included) can be used this way.
 * In this mode, GlkOte collects user input and sends it to the web service
 * as a AJAX request. The service decodes the (JSON-format) input data,
 * executes a game turn, and returns the game response as a (JSON-format)
 * reply to the request. A proof-of-concept can be found at:
 *     https://github.com/erkyrath/remote-if-demo
 *
 * (A few calls, or arguments of calls, are marked "for autosave/autorestore
 * only". These exist for the purpose of getting a game displayed in a known
 * state, which is rather more complicated than the usual situation of 
 * letting a game start up and run.)
 *
 * For full documentation, see the docs.html file in this package.
 */


/* Put everything inside the GlkOte namespace. */
GlkOte = function() {

/* Module global variables */
var game_interface = null;
var dom_context = undefined;
var windowport_id = 'windowport';
var gameport_id = 'gameport';
var generation = 0;
var disabled = false;
var loading_visible = null;
var error_visible = false;
var windowdic = null;
var current_metrics = null;
var current_devpixelratio = null;
var currently_focussed = false;
var last_known_focus = 0;
var last_known_paging = 0;
var windows_paging_count = 0;
var graphics_draw_queue = [];
var resize_timer = null;
var retry_timer = null;
var perform_paging = true;
var detect_external_links = false;
var regex_external_links = null;

/* Some handy constants */
/* A non-breaking space character. */
var NBSP = "\xa0";
/* Number of paragraphs to retain in a buffer window's scrollback. */
var max_buffer_length = 200;
/* Size of the scrollbar, give or take some. */
var approx_scroll_width = 20;
/* Margin for how close you have to scroll to end-of-page to kill the
   moreprompt. (Really this just counters rounding error.) */
var moreprompt_margin = 2;

/* Some constants for key event native values. (Not including function 
   keys.) */
var key_codes = {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45
};

/* All the keys that can be used as line input terminators, and their
   native values. */
var terminator_key_names = {
    escape : key_codes.KEY_ESC,
    func1 : 112, func2 : 113, func3 : 114, func4 : 115, func5 : 116, 
    func6 : 117, func7 : 118, func8 : 119, func9 : 120, func10 : 121, 
    func11 : 122, func12 : 123
};
/* The inverse of the above. Maps native values to Glk key names. Set up at
   init time. */
var terminator_key_values = {};

/* The transcript-recording feature. If enabled, this sends session
   information to an external recording service. */
var recording = false;
var recording_state = null;
var recording_handler = null;
var recording_handler_url = null;
var recording_context = {};

/* An image cache. This maps numbers to Image objects. These are used only
   for painting in graphics (canvas) windows.
*/
var image_cache = {};

/* This function becomes GlkOte.init(). The document calls this to begin
   the game. The simplest way to do this is to give the <body> tag an
   onLoad="GlkOte.init();" attribute.
*/
function glkote_init(iface) {
  if (!iface && window.Game)
    iface = window.Game;
  if (!iface) {
    glkote_error('No game interface object has been provided.');
    return;
  }
  if (!iface.accept) {
    glkote_error('The game interface object must have an accept() function.');
    return;
  }
  game_interface = iface;

  if (!window.jQuery || !jQuery.fn.jquery) {
    glkote_error('The jQuery library has not been loaded.');
    return;
  }

  var version = jQuery.fn.jquery.split('.');
  if (version.length < 2 || version[0] < 1 || (version[0] == 1 && version[1] < 9)) {
    glkote_error('This version of the jQuery library is too old. (Version ' + jQuery.fn.jquery + ' found; 1.9.0 required.)');
    return;
  }

  /* Set up a static table. */
  for (var val in terminator_key_names) {
    terminator_key_values[terminator_key_names[val]] = val;
  }

  if (false) {
    /* ### test for mobile browser? "'ontouchstart' in document.documentElement"? */
    /* Paging doesn't make sense for iphone/android, because you can't
       get keystroke events from a window. */
    perform_paging = false;
  }

  /* Object mapping window ID (strings) to window description objects. */
  windowdic = {};

  if (iface.windowport)
      windowport_id = iface.windowport;
  if (iface.gameport)
      gameport_id = iface.gameport;

  var el = $('#'+windowport_id, dom_context);
  if (!el.length) {
    glkote_error('Cannot find windowport element #'+windowport_id+' in this document.');
    return;
  }
  el.empty();
  if (perform_paging)
    $(document).on('keypress', evhan_doc_keypress);
  $(window).on('resize', evhan_doc_resize);

  current_devpixelratio = window.devicePixelRatio || 1;

  /* We can get callbacks on any *boolean* change in the resolution level.
     Not, unfortunately, on all changes. */
  window.matchMedia('screen and (min-resolution: 1.5dppx)').addListener(evhan_doc_pixelreschange);
  window.matchMedia('screen and (min-resolution: 2dppx)').addListener(evhan_doc_pixelreschange);
  window.matchMedia('screen and (min-resolution: 3dppx)').addListener(evhan_doc_pixelreschange);
  window.matchMedia('screen and (min-resolution: 4dppx)').addListener(evhan_doc_pixelreschange);

  var res = measure_window();
  if (jQuery.type(res) === 'string') {
    glkote_error(res);
    return;
  }
  current_metrics = res;

  /* Check the options that control whether URL-like strings in the output
     are displayed as hyperlinks. */
  detect_external_links = iface.detect_external_links;
  if (detect_external_links) {
    regex_external_links = iface.regex_external_links;
    if (!regex_external_links) {
      /* Fill in a default regex for matching or finding URLs. */
      if (detect_external_links == 'search') {
        /* The searching case is hard. This regex is based on John Gruber's
           monstrosity, the "web URL only" variant:
           http://daringfireball.net/2010/07/improved_regex_for_matching_urls
           I cut it down a bit; it will not recognize bare domain names like
           "www.eblong.com". I also removed the "(?i)" from the beginning,
           because Javascript doesn't handle that syntax. (It's supposed to
           make the regex case-insensitive.) Instead, we use the 'i'
           second argument to RegExp().
        */
        regex_external_links = RegExp('\\b((?:https?://)(?:[^\\s()<>]+|\\(([^\\s()<>]+|(\\([^\\s()<>]+\\)))*\\))+(?:\\(([^\\s()<>]+|(\\([^\\s()<>]+\\)))*\\)|[^\\s`!()\\[\\]{};:\'".,<>?\u00ab\u00bb\u201c\u201d\u2018\u2019]))', 'i');
      }
      else {
        /* The matching case is much simpler. This matches any string
           beginning with "http" or "https". */
        regex_external_links = RegExp('^https?:', 'i');
      }
    }
  }

  /* Check the options that control transcript recording. */
  if (iface.recording_url) {
    recording = true;
    recording_handler = recording_standard_handler;
    recording_handler_url = iface.recording_url;
  }
  if (iface.recording_handler) {
    recording = true;
    recording_handler = iface.recording_handler;
    recording_handler_url = '(custom handler)';
  }
  if (recording) {
    /* But also check whether the user has opted out by putting "feedback=0"
       in the URL query. */
    var qparams = get_query_params();
    var flag = qparams['feedback'];
    if (jQuery.type(flag) != 'undefined' && flag != '1') {
      recording = false;
      glkote_log('User has opted out of transcript recording.');
    }
    else {
      /* Set up the recording-state object. */
      recording_state = {
        sessionId: (new Date().getTime())+""+( Math.ceil( Math.random() * 10000 ) ),
        input: null, output: null,
        timestamp: 0, outtimestamp: 0
      }
      if (iface.recording_label)
        recording_state.label = iface.recording_label;
      if (iface.recording_format == 'simple')
        recording_state.format = 'simple';
      else
        recording_state.format = 'glkote';
      glkote_log('Transcript recording active: session ' + recording_state.sessionId + ' "' + recording_state.label + '", destination ' + recording_handler_url);
    }
  }

  send_response('init', null, current_metrics);
}

/* Work out various pixel measurements used to compute window sizes:
   - the width and height of the windowport
   - the width and height of a character in a grid window
   - ditto for buffer windows (although this is only approximate, since
     buffer window fonts can be non-fixed-width, and styles can have
     different point sizes)
   - the amount of padding space around buffer and grid window content

   This stuff is determined by creating some invisible, offscreen windows
   and measuring their dimensions.
*/
function measure_window() {
  var metrics = {};
  var winsize, line1size, line2size, spansize, canvassize;

  /* We assume the gameport is the same size as the windowport, which
     is true on all browsers but IE7. Fortunately, on IE7 it's
     the windowport size that's wrong -- gameport is the size
     we're interested in. */
  var gameport = $('#'+gameport_id, dom_context);
  if (!gameport.length)
    return 'Cannot find gameport element #'+gameport_id+' in this document.';

  /* Backwards compatibility grace note: if the HTML file includes an
     old-style #layouttestpane div, we discard it. */
  $('#layouttestpane', dom_context).remove();

  /* Exclude padding and border. */
  metrics.width  = gameport.width();
  metrics.height = gameport.height();

  metrics.width  = gameport.width();
  metrics.height = gameport.height();

  /* Create a dummy layout div containing a grid window and a buffer window,
     each with two lines of text. */
  var layout_test_pane = $('<div>', { 'id':'layout_test_pane' });
  layout_test_pane.text('This should not be visible');
  layout_test_pane.css({
    /* "display:none" would make the pane not render at all, making it
       impossible to measure. Instead, make it invisible and offscreen. */
    position: 'absolute',
    visibility: 'hidden',
    left: '-1000px'
  });
  var line = $('<div>');
  line.append($('<span>', {'class': "Style_normal"}).text('12345678'));

  var gridwin = $('<div>', {'class': 'WindowFrame GridWindow'});
  var gridline1 = line.clone().addClass('GridLine').appendTo(gridwin);
  var gridline2 = line.clone().addClass('GridLine').appendTo(gridwin);
  var gridspan = gridline1.children('span');
  layout_test_pane.append(gridwin);

  var bufwin = $('<div>', {'class': 'WindowFrame BufferWindow'});
  var bufline1 = line.clone().addClass('BufferLine').appendTo(bufwin);
  var bufline2 = line.clone().addClass('BufferLine').appendTo(bufwin);
  var bufspan = bufline1.children('span');
  layout_test_pane.append(bufwin);

  var graphwin = $('<div>', {'class': 'WindowFrame GraphicsWindow'});
  var graphcanvas = $('<canvas>');
  graphcanvas.attr('width', 64);
  graphcanvas.attr('height', 32);
  graphwin.append(graphcanvas);
  layout_test_pane.append(graphwin);

  gameport.append(layout_test_pane);

  var get_size = function(el) {
    return {
      width: el.outerWidth(),
      height: el.outerHeight()
    };
  };

  /* Here we will include padding and border. */
  winsize = get_size(gridwin);
  spansize = get_size(gridspan);
  line1size = get_size(gridline1);
  line2size = get_size(gridline2);

  metrics.gridcharheight = gridline2.position().top - gridline1.position().top;
  metrics.gridcharwidth = gridspan.width() / 8;
  /* Yes, we can wind up with a non-integer charwidth value. */

  /* Find the total margin around the character grid (out to the window's
     padding/border). These values include both sides (left+right,
     top+bottom). */
  metrics.gridmarginx = winsize.width - spansize.width;
  metrics.gridmarginy = winsize.height - (line1size.height + line2size.height);

  /* Here we will include padding and border. */
  winsize = get_size(bufwin);
  spansize = get_size(bufspan);
  line1size = get_size(bufline1);
  line2size = get_size(bufline2);

  metrics.buffercharheight = bufline2.position().top - bufline1.position().top;
  metrics.buffercharwidth = bufspan.width() / 8;
  /* Yes, we can wind up with a non-integer charwidth value. */

  /* Again, these values include both sides (left+right, top+bottom). */
  metrics.buffermarginx = winsize.width - spansize.width;
  metrics.buffermarginy = winsize.height - (line1size.height + line2size.height);

  /* Here we will include padding and border. */
  winsize = get_size(graphwin);
  canvassize = get_size(graphcanvas);
  
  /* Again, these values include both sides (left+right, top+bottom). */
  metrics.graphicsmarginx = winsize.width - canvassize.width;
  metrics.graphicsmarginy = winsize.height - canvassize.height;

  /* Now that we're done measuring, discard the pane. */
  layout_test_pane.remove();
  
  /* These values come from the game interface object. */
  metrics.outspacingx = 0;
  metrics.outspacingy = 0;
  metrics.inspacingx = 0;
  metrics.inspacingy = 0;

  if (game_interface.spacing != undefined) {
    metrics.outspacingx = game_interface.spacing;
    metrics.outspacingy = game_interface.spacing;
    metrics.inspacingx = game_interface.spacing;
    metrics.inspacingy = game_interface.spacing;
  }
  if (game_interface.outspacing != undefined) {
    metrics.outspacingx = game_interface.outspacing;
    metrics.outspacingy = game_interface.outspacing;
  }
  if (game_interface.inspacing != undefined) {
    metrics.inspacingx = game_interface.inspacing;
    metrics.inspacingy = game_interface.inspacing;
  }
  if (game_interface.inspacingx != undefined)
    metrics.inspacingx = game_interface.inspacingx;
  if (game_interface.inspacingy != undefined)
    metrics.inspacingy = game_interface.inspacingy;
  if (game_interface.outspacingx != undefined)
    metrics.outspacingx = game_interface.outspacingx;
  if (game_interface.outspacingy != undefined)
    metrics.outspacingy = game_interface.outspacingy;

  return metrics;
}

/* This function becomes GlkOte.update(). The game calls this to update
   the screen state. The argument includes all the information about new
   windows, new text, and new input requests -- everything necessary to
   construct a new display state for the user.
*/
function glkote_update(arg) {
  hide_loading();

  /* This field is *only* for the autorestore case, and only on the very
     first update. It contains additional information (from save_allstate)
     which helps recreate the display. */
  var autorestore = null;
  if (arg.autorestore && generation == 0)
    autorestore = arg.autorestore;
  delete arg.autorestore; /* keep it out of the recording */

  if (recording)
    recording_send(arg);

  if (arg.type == 'error') {
    glkote_error(arg.message);
    return;
  }

  if (arg.type == 'pass') {
    return;
  }

  if (arg.type == 'retry') {
    if (!retry_timer) {
      glkote_log('Event has timed out; will retry...');
      show_loading();
      retry_timer = delay_func(2, retry_update);
    }
    else {
      glkote_log('Event has timed out, but a retry is already queued!');
    }
    return;
  }

  if (arg.type != 'update') {
    glkote_log('Ignoring unknown message type ' + arg.type + '.');
    return;
  }

  if (arg.gen == generation) {
    /* Nothing has changed. */
    glkote_log('Ignoring repeated generation number: ' + generation);
    return;
  }
  if (arg.gen < generation) {
    /* This update belongs in the past. */
    glkote_log('Ignoring out-of-order generation number: got ' + arg.gen + ', currently at ' + generation);
    return;
  }
  generation = arg.gen;

  /* Un-disable the UI, if it was previously disabled. */
  if (disabled) {
    jQuery.each(windowdic, function(winid, win) {
      if (win.inputel) {
        win.inputel.prop('disabled', false);
      }
    });
    disabled = false;
  }

  /* Perform the updates, in a most particular order. */

  if (arg.input != null)
    accept_inputcancel(arg.input);
  if (arg.windows != null)
    accept_windowset(arg.windows);
  if (arg.content != null)
    accept_contentset(arg.content);
  if (arg.input != null)
    accept_inputset(arg.input);

  if (arg.specialinput != null)
    accept_specialinput(arg.specialinput);

  /* Any buffer windows that have changed need to be scrolled down.
     Then, we take the opportunity to update topunseen. (If a buffer
     window hasn't changed, topunseen hasn't changed.) */

  jQuery.each(windowdic, function(winid, win) {
    if (win.type == 'buffer' && win.needscroll) {
      /* needscroll is true if the window has accumulated any content or
         an input field in this update cycle. needspaging is true if
         the window has any unviewed content from *last* cycle; we set 
         it now if any new content remains unviewed after the first
         obligatory scrolldown. 
         (If perform_paging is false, we forget about needspaging and
         just always scroll to the bottom.) */
      win.needscroll = false;

      if (!win.needspaging) {
        var frameel = win.frameel;

        if (!perform_paging) {
          /* Scroll all the way down. Note that scrollHeight is not a jQuery
             property; we have to go to the raw DOM to get it. */
          frameel.scrollTop(frameel.get(0).scrollHeight);
          win.needspaging = false;
        }
        else {
          /* Scroll the unseen content to the top. */
          frameel.scrollTop(win.topunseen - current_metrics.buffercharheight);
          /* Compute the new topunseen value. */
          win.pagefrommark = win.topunseen;
          var frameheight = frameel.outerHeight();
          var realbottom = buffer_last_line_top_offset(win);
          var newtopunseen = frameel.scrollTop() + frameheight;
          if (newtopunseen > realbottom)
            newtopunseen = realbottom;
          if (win.topunseen < newtopunseen)
            win.topunseen = newtopunseen;
          /* The scroll-down has not touched needspaging, because it is
             currently false. Let's see if it should be true. */
          if (frameel.scrollTop() + frameheight + moreprompt_margin >= frameel.get(0).scrollHeight) {
            win.needspaging = false;
          }
          else {
            win.needspaging = true;
          }
        }

        /* Add or remove the more prompt and previous mark, based on the
           new needspaging flag. Note that the more-prompt will be
           removed when the user scrolls down; but the prev-mark
           stays until we get back here. */
        var moreel = $('#win'+win.id+'_moreprompt', dom_context);
        var prevel = $('#win'+win.id+'_prevmark', dom_context);
        if (!win.needspaging) {
          if (moreel.length)
            moreel.remove();
          if (prevel.length)
            prevel.remove();
        }
        else {
          if (!moreel.length) {
            moreel = $('<div>',
              { id: 'win'+win.id+'_moreprompt', 'class': 'MorePrompt' } );
            moreel.append('More');
            /* 20 pixels is a cheap approximation of a scrollbar-width. */
            var morex = win.coords.right + approx_scroll_width;
            var morey = win.coords.bottom;
            moreel.css({ bottom:morey+'px', right:morex+'px' });
            $('#'+windowport_id, dom_context).append(moreel);
          }
          if (!prevel.length) {
            prevel = $('<div>',
              { id: 'win'+win.id+'_prevmark', 'class': 'PreviousMark' } );
            frameel.prepend(prevel);
          }
          prevel.css('top', (win.pagefrommark+'px'));
        }
      }
    }
  });

  /* Set windows_paging_count. (But don't set the focus -- we'll do that
     momentarily.) */
  readjust_paging_focus(false);

  /* Disable everything, if that was requested (or if this is a special
     input cycle). */
  disabled = false;
  if (arg.disable || arg.specialinput) {
    disabled = true;
    jQuery.each(windowdic, function(winid, win) {
      if (win.inputel) {
        win.inputel.prop('disabled', true);
      }
    });
  }

  /* Figure out which window to set the focus to. (But not if the UI is
     disabled. We also skip this if there's paging to be done, because
     focussing might autoscroll and we want to trap keystrokes for 
     paging anyhow.) */

  var newinputwin = 0;
  if (!disabled && !windows_paging_count) {
    jQuery.each(windowdic, function(winid, win) {
      if (win.input) {
        if (!newinputwin || win.id == last_known_focus)
          newinputwin = win.id;
      }
    });
  }

  if (newinputwin) {
    /* MSIE is weird about when you can call focus(). The input element
       has probably just been added to the DOM, and MSIE balks at
       giving it the focus right away. So we defer the call until
       after the javascript context has yielded control to the browser. */
    var focusfunc = function() {
      var win = windowdic[newinputwin];
      if (win.inputel) {
        win.inputel.focus();
      }
    };
    defer_func(focusfunc);
  }

  if (autorestore) {
    if (autorestore.history) {
      jQuery.each(autorestore.history, function(winid, ls) {
          win = windowdic[winid];
          if (win != null) {
            win.history = ls.slice(0);
            win.historypos = win.history.length;
          }
        });
    }
    if (autorestore.defcolor) {
      jQuery.each(autorestore.defcolor, function(winid, val) {
          win = windowdic[winid];
          if (win != null) {
            win.defcolor = val;
          }
        });
    }
    

    /* For the case of autorestore (only), we short-circuit the paging
       mechanism and assume the player has already seen all the text. */
    jQuery.each(windowdic, function(winid, win) {
        if (win.type == 'buffer') {
          window_scroll_to_bottom(win);
        }
      });
    
    if (!(autorestore.metrics 
        && autorestore.metrics.width == current_metrics.width 
        && autorestore.metrics.height == current_metrics.height)) {
      /* The window metrics don't match what's recorded in the
         autosave. Trigger a synthetic resize event. */
      current_metrics.width += 2;
      evhan_doc_resize();
    }
  }

  /* Done with the update. Exit and wait for the next input event. */
}

/* Handle all the window changes. The argument lists all windows that
   should be open. Any unlisted windows, therefore, get closed.

   Note that if there are no changes to the window state, this function
   will not be called. This is different from calling this function with
   an empty argument object (which would mean "close all windows").
*/
function accept_windowset(arg) {
  jQuery.each(windowdic, function(winid, win) { win.inplace = false; });
  jQuery.map(arg, accept_one_window);

  /* Close any windows not mentioned in the argument. */
  var closewins = jQuery.map(windowdic, function(win, winid) {
      if (!win.inplace)
        return win;
    });
  jQuery.map(closewins, close_one_window);
}

/* Handle the update for a single window. Open it if it doesn't already
   exist; set its size and position, if those need to be changed.
*/
function accept_one_window(arg) {
  var frameel, win;

  if (!arg) {
    return;
  }

  win = windowdic[arg.id];
  if (win == null) {
    /* The window must be created. */
    win = { id: arg.id, type: arg.type, rock: arg.rock };
    windowdic[arg.id] = win;
    var typeclass;
    if (win.type == 'grid')
      typeclass = 'GridWindow';
    if (win.type == 'buffer')
      typeclass = 'BufferWindow';
    if (win.type == 'graphics')
      typeclass = 'GraphicsWindow';
    var rockclass = 'WindowRock_' + arg.rock;
    frameel = $('<div>',
      { id: 'window'+arg.id,
        'class': 'WindowFrame ' + typeclass + ' ' + rockclass });
    frameel.data('winid', arg.id);
    frameel.on('mousedown', arg.id, evhan_window_mousedown);
    if (perform_paging && win.type == 'buffer')
      frameel.on('scroll', arg.id, evhan_window_scroll);
    if (win.type == 'grid' || win.type == 'graphics')
      frameel.on('click', win.id, evhan_input_mouse_click);
    if (win.type == 'buffer')
      frameel.attr({
        'aria-live':'polite',
        'aria-atomic':'false',
        'aria-relevant':'additions' });
    win.frameel = frameel;
    win.gridheight = 0;
    win.gridwidth = 0;
    win.input = null;
    win.inputel = null;
    win.terminators = {};
    win.reqhyperlink = false;
    win.reqmouse = false;
    win.needscroll = false;
    win.needspaging = false;
    win.topunseen = 0;
    win.pagefrommark = 0;
    win.coords = { left:null, top:null, right:null, bottom:null };
    win.history = new Array();
    win.historypos = 0;
    $('#'+windowport_id, dom_context).append(frameel);
  }
  else {
    frameel = win.frameel;
    if (win.type != arg.type)
      glkote_error('Window ' + arg.id + ' was created with type ' + win.type + ', but now is described as type ' + arg.type);
  }

  win.inplace = true;

  if (win.type == 'grid') {
    /* Make sure we have the correct number of GridLine divs. */
    var ix;
    if (arg.gridheight > win.gridheight) {
      for (ix=win.gridheight; ix<arg.gridheight; ix++) {
        var el = $('<div>',
          { id: 'win'+win.id+'_ln'+ix, 'class': 'GridLine' });
        el.append(NBSP);
        win.frameel.append(el);
      }
    }
    if (arg.gridheight < win.gridheight) {
      for (ix=arg.gridheight; ix<win.gridheight; ix++) {
        var el = $('#win'+win.id+'_ln'+ix, dom_context);
        if (el.length)
          el.remove();
      }
    }
    win.gridheight = arg.gridheight;
    win.gridwidth = arg.gridwidth;
  }

  if (win.type == 'buffer') {
    /* Don't need anything? */
  }

  if (win.type == 'graphics') {
    var el = $('#win'+win.id+'_canvas', dom_context);
    if (!el.length) {
      win.graphwidth = arg.graphwidth;
      win.graphheight = arg.graphheight;
      win.defcolor = '#FFF';
      el = $('<canvas>',
        { id: 'win'+win.id+'_canvas' });
      /* The pixel-ratio code here should work correctly on Chrome and
         Safari, on screens of any pixel-ratio. I followed
         http://www.html5rocks.com/en/tutorials/canvas/hidpi/ .
      */
      win.backpixelratio = 1;
      var canvas = el.get(0);
      var ctx = canvas_get_2dcontext(el);
      if (ctx) {
        /* This property is still namespaced as of 2016. */
        win.backpixelratio = ctx.webkitBackingStorePixelRatio
          || ctx.mozBackingStorePixelRatio
          || ctx.msBackingStorePixelRatio
          || ctx.oBackingStorePixelRatio
          || ctx.backingStorePixelRatio 
          || 1;
      }
      win.scaleratio = current_devpixelratio / win.backpixelratio;
      //glkote_log('### created canvas with scale ' + win.scaleratio + ' (device ' + current_devpixelratio + ' / backstore ' + win.backpixelratio + ')');
      el.attr('width', win.graphwidth * win.scaleratio);
      el.attr('height', win.graphheight * win.scaleratio);
      el.css('width', (win.graphwidth + 'px'));
      el.css('height', (win.graphheight + 'px'));
      win.frameel.css('background-color', win.defcolor);
      if (ctx) {
        /* Set scale to win.scaleratio */
        ctx.setTransform(win.scaleratio, 0, 0, win.scaleratio, 0, 0);
      }
      win.frameel.append(el);
    }
    else {
      if (win.graphwidth != arg.graphwidth || win.graphheight != arg.graphheight) {
        win.graphwidth = arg.graphwidth;
        win.graphheight = arg.graphheight;
        el.attr('width', win.graphwidth * win.scaleratio);
        el.attr('height', win.graphheight * win.scaleratio);
        el.css('width', (win.graphwidth + 'px'));
        el.css('height', (win.graphheight + 'px'));
        /* Clear to the default color, as if for a "fill" command. */
        var ctx = canvas_get_2dcontext(el);
        if (ctx) {
          ctx.setTransform(win.scaleratio, 0, 0, win.scaleratio, 0, 0);
          ctx.fillStyle = win.defcolor;
          ctx.fillRect(0, 0, win.graphwidth, win.graphheight);
          ctx.fillStyle = '#000000';
        }
        win.frameel.css('background-color', win.defcolor);
        /* We have to trigger a redraw event for this window. But we can't do
           that from inside the accept handler. We'll set up a deferred
           function call. */
        var funcarg = win.id;
        defer_func(function() { send_window_redraw(funcarg); });
      }
    }
  }

  /* The trick is that left/right/top/bottom are measured to the outside
     of the border, but width/height are measured from the inside of the
     border. (Measured by the browser's DOM methods, I mean.) */
  var styledic;
  if (0 /*###Prototype.Browser.IE*/) {
    /* Actually this method works in Safari also, but in Firefox the buffer
       windows are too narrow by a scrollbar-width. So we don't use it
       generally. */
    var width = arg.width;
    var height = arg.height;
    if (arg.type == 'grid') {
      width -= current_metrics.gridmarginx;
      height -= current_metrics.gridmarginy;
    }
    if (arg.type == 'buffer') {
      width -= current_metrics.buffermarginx;
      height -= current_metrics.buffermarginy;
    }
    if (width < 0)
      width = 0;
    if (height < 0)
      height = 0;
    styledic = { left: arg.left+'px', top: arg.top+'px',
      width: width+'px', height: height+'px' };
    win.coords.left = arg.left;
    win.coords.top = arg.top;
    win.coords.right = current_metrics.width - (arg.left+arg.width);
    win.coords.bottom = current_metrics.height - (arg.top+arg.height);
  }
  else {
    /* This method works in everything but IE. */
    var right = current_metrics.width - (arg.left + arg.width);
    var bottom = current_metrics.height - (arg.top + arg.height);
    styledic = { left: arg.left+'px', top: arg.top+'px',
      right: right+'px', bottom: bottom+'px' };
    win.coords.left = arg.left;
    win.coords.top = arg.top;
    win.coords.right = right;
    win.coords.bottom = bottom;
  }
  frameel.css(styledic);
}

/* Handle closing one window. */
function close_one_window(win) {
  win.frameel.remove();
  delete windowdic[win.id];
  win.frameel = null;

  var moreel = $('#win'+win.id+'_moreprompt', dom_context);
  if (moreel.length)
    moreel.remove();
}

/* Regular expressions used in twiddling runs of whitespace. */
var regex_initial_whitespace = new RegExp('^ ');
var regex_final_whitespace = new RegExp(' $');
var regex_long_whitespace = new RegExp('  +', 'g'); /* two or more spaces */

/* Given a run of N spaces (N >= 2), return N-1 non-breaking spaces plus
   a normal one. */
function func_long_whitespace(match) {
  var len = match.length;
  if (len == 1)
    return ' ';
  /* Evil trick I picked up from Prototype. Gives len-1 copies of NBSP. */
  var res = new Array(len).join(NBSP);
  return res + ' ';
}

/* Handle all of the window content changes. */
function accept_contentset(arg) {
  jQuery.map(arg, accept_one_content);
}

/* Handle the content changes for a single window. */
function accept_one_content(arg) {
  var win = windowdic[arg.id];

  /* Check some error conditions. */

  if (win == null) {
    glkote_error('Got content update for window ' + arg.id + ', which does not exist.');
    return;
  }

  if (win.input && win.input.type == 'line') {
    glkote_error('Got content update for window ' + arg.id + ', which is awaiting line input.');
    return;
  }

  win.needscroll = true;

  if (win.type == 'grid') {
    /* Modify the given lines of the grid window (and leave the rest alone). */
    var lines = arg.lines;
    var ix, sx;
    for (ix=0; ix<lines.length; ix++) {
      var linearg = lines[ix];
      var linenum = linearg.line;
      var content = linearg.content;
      var lineel = $('#win'+win.id+'_ln'+linenum, dom_context);
      if (!lineel.length) {
        glkote_error('Got content for nonexistent line ' + linenum + ' of window ' + arg.id + '.');
        continue;
      }
      if (!content || !content.length) {
        lineel.text(NBSP);
      }
      else {
        lineel.empty();
        for (sx=0; sx<content.length; sx++) {
          var rdesc = content[sx];
          var rstyle, rtext, rlink;
          if (jQuery.type(rdesc) === 'object') {
            if (rdesc.special !== undefined)
              continue;
            rstyle = rdesc.style;
            rtext = rdesc.text;
            rlink = rdesc.hyperlink;
          }
          else {
            rstyle = rdesc;
            sx++;
            rtext = content[sx];
            rlink = undefined;
          }
          var el = $('<span>',
            { 'class': 'Style_' + rstyle } );
          if (rlink == undefined) {
            insert_text_detecting(el, rtext);
          }
          else {
            var ael = $('<a>',
              { 'href': '#', 'class': 'Internal' } );
            ael.text(rtext);
            ael.on('click', build_evhan_hyperlink(win.id, rlink));
            el.append(ael);
          }
          lineel.append(el);
        }
      }
    }
  }

  if (win.type == 'buffer') {
    /* Append the given lines onto the end of the buffer window. */
    var text = arg.text;
    var ix, sx;

    if (win.inputel) {
      /* This can happen if we're waiting for char input. (Line input
         would make this content update illegal -- but we already checked
         that.) The inputel is inside the cursel, which we're about to
         rip out. We remove it, so that we can put it back later. */
        win.inputel.detach();
    }

    var cursel = $('#win'+win.id+'_cursor', dom_context);
    if (cursel.length)
      cursel.remove();
    cursel = null;

    if (arg.clear) {
      win.frameel.empty();
      win.topunseen = 0;
      win.pagefrommark = 0;
    }

    /* Accept a missing text field as doing nothing. */
    if (text === undefined)
      text = [];

    /* Each line we receive has a flag indicating whether it *starts*
       a new paragraph. (If the flag is false, the line gets appended
       to the previous paragraph.)

       We have to keep track of two flags per paragraph div. The blankpara
       flag indicates whether this is a completely empty paragraph (a
       blank line). We have to drop a NBSP into empty paragraphs --
       otherwise they'd collapse -- and so this flag lets us distinguish
       between an empty paragraph and one which truly contains a NBSP.
       (The difference is, when you append data to a truly empty paragraph,
       you have to delete the placeholder NBSP.)

       The endswhite flag indicates whether the paragraph ends with a
       space (or is completely empty). See below for why that's important. */

    for (ix=0; ix<text.length; ix++) {
      var textarg = text[ix];
      var content = textarg.content;
      var divel = null;
      if (textarg.append) {
        if (!content || !content.length)
          continue;
        divel = buffer_last_line(win);
      }
      if (divel == null) {
        /* Create a new paragraph div */
        divel = $('<div>', { 'class': 'BufferLine' });
        divel.data('blankpara', true);
        divel.data('endswhite', true);
        win.frameel.append(divel);
      }
      if (textarg.flowbreak)
        divel.addClass('FlowBreak');
      if (!content || !content.length) {
        if (divel.data('blankpara'))
          divel.text(NBSP);
        continue;
      }
      if (divel.data('blankpara')) {
        divel.data('blankpara', false);
        divel.empty();
      }
      /* We must munge long strings of whitespace to make sure they aren't
         collapsed. (This wouldn't be necessary if "white-space: pre-wrap"
         were widely implemented. Mind you, these days it probably *is*,
         but why update working code, right?)
         The rule: if we find a block of spaces, turn all but the last one
         into NBSP. Also, if a div's last span ends with a space (or the
         div has no spans), and a new span begins with a space, turn that
         into a NBSP. */
      for (sx=0; sx<content.length; sx++) {
        var rdesc = content[sx];
        var rstyle, rtext, rlink;
        if (jQuery.type(rdesc) === 'object') {
          if (rdesc.special !== undefined) {
            if (rdesc.special == 'image') {
              /* This is not as restrictive as the Glk spec says it should
                 be. Margin-aligned images which do not follow a line
                 break should disappear. This will undoubtedly cause
                 headaches for portability someday. */
              var imgurl = rdesc.url;
              if (window.GiLoad && GiLoad.get_image_url) {
                var newurl = GiLoad.get_image_url(rdesc.image);
                if (newurl)
                  imgurl = newurl;
              }
              var el = $('<img>', 
                { src:imgurl,
                  width:''+rdesc.width, height:''+rdesc.height } );
              if (rdesc.alttext)
                el.attr('alt', rdesc.alttext);
              else
                el.attr('alt', 'Image '+rdesc.image);
              switch (rdesc.alignment) {
                case 'inlineup':
                  el.addClass('ImageInlineUp');
                  break;
                case 'inlinedown':
                  el.addClass('ImageInlineDown');
                  break;
                case 'inlinecenter':
                  el.addClass('ImageInlineCenter');
                  break;
                case 'marginleft':
                  el.addClass('ImageMarginLeft');
                  break;
                case 'marginright':
                  el.addClass('ImageMarginRight');
                  break;
                default:
                  el.addClass('ImageInlineUp');
                  break;
              }
              if (rdesc.hyperlink != undefined) {
                var ael = $('<a>',
                  { 'href': '#', 'class': 'Internal' } );
                ael.append(el);
                ael.on('click', build_evhan_hyperlink(win.id, rdesc.hyperlink));
                el = ael;
              }
              divel.append(el);
              divel.data('endswhite', false);
              continue;
            }
            glkote_log('Unknown special entry in line data: ' + rdesc.special);
            continue;
          }
          rstyle = rdesc.style;
          rtext = rdesc.text;
          rlink = rdesc.hyperlink;
        }
        else {
          rstyle = rdesc;
          sx++;
          rtext = content[sx];
          rlink = undefined;
        }
        var el = $('<span>',
          { 'class': 'Style_' + rstyle } );
        rtext = rtext.replace(regex_long_whitespace, func_long_whitespace);
        if (divel.data('endswhite')) {
          rtext = rtext.replace(regex_initial_whitespace, NBSP);
        }
        if (rlink == undefined) {
          insert_text_detecting(el, rtext);
        }
        else {
          var ael = $('<a>',
            { 'href': '#', 'class': 'Internal' } );
          ael.text(rtext);
          ael.on('click', build_evhan_hyperlink(win.id, rlink));
          el.append(ael);
        }
        divel.append(el);
        divel.data('endswhite', regex_final_whitespace.test(rtext));
      }
    }

    /* Trim the scrollback. If there are more than max_buffer_length
       paragraphs, delete some. (It would be better to limit by
       character count, rather than paragraph count. But this is
       easier.) (Yeah, the prev-mark can wind up included in the count --
       and trimmed out. It's only slightly wrong.) */
    var parals = win.frameel.children();
    if (parals.length) {
      var totrim = parals.length - max_buffer_length;
      if (totrim > 0) {
        var ix, obj;
        var offtop = parals.get(totrim).offsetTop;
        win.topunseen -= offtop;
        if (win.topunseen < 0)
          win.topunseen = 0;
        win.pagefrommark -= offtop;
        if (win.pagefrommark < 0)
          win.pagefrommark = 0;
        for (ix=0; ix<totrim; ix++) {
          $(parals.get(ix)).remove();
        }
      }
    }

    /* Stick the invisible cursor-marker inside (at the end of) the last
       paragraph div. We use this to position the input box. */
    var divel = buffer_last_line(win);
    if (divel) {
      cursel = $('<span>',
        { id: 'win'+win.id+'_cursor', 'class': 'InvisibleCursor' } );
      cursel.append(NBSP);
      divel.append(cursel);

      if (win.inputel) {
        /* Put back the inputel that we found earlier. */
        var inputel = win.inputel;
        var pos = cursel.position();
        /* This calculation is antsy. (Was on Prototype, anyhow, I haven't
           retested in jquery...) On Firefox, buffermarginx is too high (or
           getWidth() is too low) by the width of a scrollbar. On MSIE,
           buffermarginx is one pixel too low. We fudge for that, giving a
           result which errs on the low side. */
        var width = win.frameel.width() - (current_metrics.buffermarginx + pos.left + 2);
        if (width < 1)
          width = 1;
        /* ### opera absolute positioning failure? */
        inputel.css({ position: 'absolute',
          left: '0px', top: '0px', width: width+'px' });
        cursel.append(inputel);
      }
    }
  }

  if (win.type == 'graphics') {
    /* Perform the requested draw operations. */
    var draw = arg.draw;
    var ix;
    
    /* Accept a missing draw field as doing nothing. */
    if (draw === undefined)
      draw = [];

    /* Unfortunately, image-draw actions might take some time (if the image
       data is not cached). So we can't do this with a simple synchronous loop.
       Instead, we must add drawing ops to a queue, and then have a function
       callback that executes them. (It's a global queue, not per-window.)
       
       We assume that if the queue is nonempty, a callback is already waiting
       out there, so we don't have to set it up.
    */

    var docall = (graphics_draw_queue.length == 0);
    for (ix=0; ix<draw.length; ix++) {
      var op = draw[ix];
      /* We'll be paranoid and clone the op object, throwing in a window
         number. */
      var newop = { winid:win.id };
      jQuery.extend(newop, op);
      graphics_draw_queue.push(newop);
    }
    if (docall && graphics_draw_queue.length > 0) {
      perform_graphics_ops(null);
    }
  }
}

/* Handle all necessary removal of input fields.

   A field needs to be removed if it is not listed in the input argument,
   *or* if it is listed with a later generation number than we remember.
   (The latter case means that input was cancelled and restarted.)
*/
function accept_inputcancel(arg) {
  var hasinput = {};
  jQuery.map(arg, function(argi) { 
    if (argi.type)
      hasinput[argi.id] = argi;
  });

  jQuery.each(windowdic, function(winid, win) {
    if (win.input) {
      var argi = hasinput[win.id];
      if (argi == null || argi.gen > win.input.gen) {
        /* cancel this input. */
        win.input = null;
        if (win.inputel) {
          win.inputel.remove();
          win.inputel = null;
        }
      }
    }
  });
}

/* Handle all necessary creation of input fields. Also, if a field needs
   to change position, move it.
*/
function accept_inputset(arg) {
  var hasinput = {};
  var hashyperlink = {};
  var hasmouse = {};
  jQuery.map(arg, function(argi) {
    if (argi.type)
      hasinput[argi.id] = argi;
    if (argi.hyperlink)
      hashyperlink[argi.id] = true;
    if (argi.mouse)
      hasmouse[argi.id] = true;
  });

  jQuery.each(windowdic, function(tmpid, win) {
    win.reqhyperlink = hashyperlink[win.id];
    win.reqmouse = hasmouse[win.id];

    var argi = hasinput[win.id];
    if (argi == null)
      return;
    win.input = argi;

    /* Maximum number of characters to accept. */
    var maxlen = 1;
    if (argi.type == 'line')
      maxlen = argi.maxlen;

    var inputel = win.inputel;
    if (inputel == null) {
      var classes = 'Input';
      if (argi.type == 'line') {
        classes += ' LineInput';
      }
      else if (argi.type == 'char') {
        classes += ' CharInput';
      }
      else {
        glkote_error('Window ' + win.id + ' has requested unrecognized input type ' + argi.type + '.');
      }
      inputel = $('<input>',
        { id: 'win'+win.id+'_input',
          'class': classes, type: 'text', maxlength: maxlen });
      if (true) /* should be mobile-webkit-only? */
        inputel.attr('autocapitalize', 'off');
      inputel.attr({
          'aria-live':'off'
        });
      if (argi.type == 'line') {
        inputel.on('keypress', evhan_input_keypress);
        inputel.on('keydown', evhan_input_keydown);
        if (argi.initial)
          inputel.val(argi.initial);
        win.terminators = {};
        if (argi.terminators) {
          for (var ix=0; ix<argi.terminators.length; ix++) 
            win.terminators[argi.terminators[ix]] = true;
        }
      }
      else if (argi.type == 'char') {
        inputel.on('keypress', evhan_input_char_keypress);
        inputel.on('keydown', evhan_input_char_keydown);
      }
      inputel.on('focus', win.id, evhan_input_focus);
      inputel.on('blur', win.id, evhan_input_blur);
      inputel.data('winid', win.id);
      win.inputel = inputel;
      win.historypos = win.history.length;
      win.needscroll = true;
    }

    if (win.type == 'grid') {
      var lineel = $('#win'+win.id+'_ln'+argi.ypos, dom_context);
      if (!lineel.length) {
        glkote_error('Window ' + win.id + ' has requested input at unknown line ' + argi.ypos + '.');
        return;
      }
      var pos = lineel.position();
      var xpos = pos.left + Math.round(argi.xpos * current_metrics.gridcharwidth);
      var width = Math.round(maxlen * current_metrics.gridcharwidth);
      /* This calculation is antsy. See below. (But grid window line input
         is rare in IF.) */
      var maxwidth = win.frameel.width() - (current_metrics.buffermarginx + xpos + 2);
      if (width > maxwidth)
        width = maxwidth;
      inputel.css({ position: 'absolute',
        left: xpos+'px', top: pos.top+'px', width: width+'px' });
      win.frameel.append(inputel);
    }

    if (win.type == 'buffer') {
      var cursel = $('#win'+win.id+'_cursor', dom_context);
      if (!cursel.length) {
        cursel = $('<span>',
          { id: 'win'+win.id+'_cursor', 'class': 'InvisibleCursor' } );
        cursel.append(NBSP);
        win.frameel.append(cursel);
      }
      var pos = cursel.position();
      /* This calculation is antsy. (Was on Prototype, anyhow, I haven't
           retested in jquery...) On Firefox, buffermarginx is too high (or
           getWidth() is too low) by the width of a scrollbar. On MSIE,
           buffermarginx is one pixel too low. We fudge for that, giving a
           result which errs on the low side. */
      var width = win.frameel.width() - (current_metrics.buffermarginx + pos.left + 2);
      if (width < 1)
        width = 1;
      /* ### opera absolute positioning failure? */
      inputel.css({ position: 'absolute',
        left: '0px', top: '0px', width: width+'px' });
      cursel.append(inputel);
    }
  });
}

function accept_specialinput(arg) {
  if (arg.type == 'fileref_prompt') {
    var replyfunc = function(ref) {
      send_response('specialresponse', null, 'fileref_prompt', ref);
    };
    try {
      var writable = (arg.filemode != 'read');
      Dialog.open(writable, arg.filetype, arg.gameid, replyfunc);
    }
    catch (ex) {
      GlkOte.log('Unable to open file dialog: ' + ex);
      /* Return a failure. But we don't want to call send_response before
         glkote_update has finished, so we defer the reply slightly. */
      replyfunc = function(ref) {
        send_response('specialresponse', null, 'fileref_prompt', null);
      };
      defer_func(replyfunc);
    }
  }
  else {
    glkote_error('Request for unknown special input type: ' + arg.type);
  }
}

/* Return the element which is the last BufferLine element of the
   window. (jQuery-wrapped.) If none, return null.
*/
function buffer_last_line(win) {
  var divel = last_child_of(win.frameel); /* not wrapped */
  if (divel == null)
    return null;
  /* If the sole child is the PreviousMark, there are no BufferLines. */
  if (divel.className != 'BufferLine')
    return null;
  return $(divel);
}

/* Return the vertical offset (relative to the parent) of the top of the 
   last child of the parent. We use the raw DOM "offsetTop" property;
   jQuery doesn't have an accessor for it.
   (Possibly broken in MSIE7? It worked in the old version, though.)
*/
function buffer_last_line_top_offset(win) {
  var divel = buffer_last_line(win);
  if (!divel || !divel.length)
    return 0;
  return divel.get(0).offsetTop;
}

/* Set windows_paging_count to the number of windows that need paging.
   If that's nonzero, pick an appropriate window for the paging focus.

   The canfocus flag determines whether this function can jump to an
   input field focus (should paging be complete).

   This must be called whenever a window's needspaging flag changes.
*/
function readjust_paging_focus(canfocus) {
  windows_paging_count = 0;
  var pageable_win = 0;

  if (perform_paging) {
    jQuery.each(windowdic, function(tmpid, win) {
        if (win.needspaging) {
          windows_paging_count += 1;
          if (!pageable_win || win.id == last_known_paging)
            pageable_win = win.id;
        }
      });
  }
    
  if (windows_paging_count) {
    /* pageable_win will be set. This is our new paging focus. */
    last_known_paging = pageable_win;
  }

  if (!windows_paging_count && canfocus) {
    /* Time to set the input field focus. This is the same code as in
       the update routine, although somewhat simplified since we don't
       need to worry about the DOM being in flux. */

    var newinputwin = 0;
    if (!disabled && !windows_paging_count) {
      jQuery.each(windowdic, function(tmpid, win) {
          if (win.input) {
            if (!newinputwin || win.id == last_known_focus)
              newinputwin = win.id;
          }
        });
    }
    
    if (newinputwin) {
      var win = windowdic[newinputwin];
      if (win.inputel) {
        win.inputel.focus();
      }
    }
  }
}

/* Return the game interface object that was provided to init(). Call
   this if a subsidiary library (e.g., dialog.js) needs to imitate some
   display setting. Do not try to modify the object; it will probably
   not do what you want.
*/
function glkote_get_interface() {
  return game_interface;
}

/* Set the DOM context. This is the jQuery element within which all Glk
   DOM elements are looked up. (#gameport, #windowport, etc.)

   In normal usage this is always undefined (meaning, DOM elements are
   searched for within the entire document). This is a fast case;
   jQuery optimizes for it. However, some apps (not Quixe!) want to 
   detach the Glk DOM and maintain it off-screen. That's possible if you 
   set the DOM context to the detached element. I think (although I have
   not tested) that this configuration is less well-optimized.

   You cannot use this to maintain two separate Glk DOMs in the same
   document. Sorry.
*/
function glkote_set_dom_context(val) {
  dom_context = val;
}

/* Return the current DOM context. (Normally undefined.)
*/
function glkote_get_dom_context() {
  return dom_context;
}

/* Stash extra information needed for autosave only.
*/
function glkote_save_allstate() {
  var obj = {
    metrics: {
      width: current_metrics.width,
      height: current_metrics.height
    },
    history: {}
  };

  jQuery.each(windowdic, function(winid, win) {
      if (win.history && win.history.length)
        obj.history[winid] = win.history.slice(0);
      if (win.defcolor) {
        if (obj.defcolor === undefined)
          obj.defcolor = {};
        obj.defcolor[winid] = win.defcolor;
      }
    });
  
  return obj;
}

/* Log the message in the browser's error log, if it has one. (This shows
   up in Safari, in Opera, and in Firefox if you have Firebug installed.)
*/
function glkote_log(msg) {
  if (window.console && console.log)
    console.log(msg);
  else if (window.opera && opera.postError)
    opera.postError(msg);
}

/* Display the red error pane, with a message in it. This is called on
   fatal errors.

   Deliberately does not use any jQuery functionality, because this
   is called when jQuery couldn't be loaded.
*/
function glkote_error(msg) {
  if (!msg)
    msg = '???';

  var el = document.getElementById('errorcontent');
  remove_children(el);
  el.appendChild(document.createTextNode(msg));

  el = document.getElementById('errorpane');
  if (el.className == 'WarningPane')
    el.className = null;
  el.style.display = '';   /* el.show() */
  error_visible = true;

  hide_loading();
}

/* Displays a blue warning pane, with a message in it.

   Unlike glkote_error, a warning can be removed (call glkote_warning with
   no argument). The warning pane is intrusive, so it should be used for
   for conditions that interrupt or suspend normal play. An error overrides
   a warning.

   (Quixe uses this to display an "end of session" message.)
*/
function glkote_warning(msg) {
  if (error_visible)
    return;

  if (!msg) {
    $('#errorpane').hide();
    return;
  }

  var el = document.getElementById('errorcontent');
  remove_children(el);
  el.appendChild(document.createTextNode(msg));

  $('#errorpane').addClass('WarningPane');
  $('#errorpane').show();
  hide_loading();
}

/* Cause an immediate input event, of type "external". This invokes
   Game.accept(), just like any other event.
*/
function glkote_extevent(val) {
  send_response('external', null, val);
}

/* If we got a 'retry' result from the game, we wait a bit and then call
   this function to try it again.
*/
function retry_update() {
  retry_timer = null;
  glkote_log('Retrying update...');

  send_response('refresh', null, null);
}

/* Hide the error pane. */
function clear_error() {
  $('#errorpane', dom_context).hide();
}

/* Hide the loading pane (the spinny compass), if it hasn't already been
   hidden.

   Deliberately does not use any jQuery functionality.
*/
function hide_loading() {
  if (loading_visible == false)
    return;
  loading_visible = false;

  var el = document.getElementById('loadingpane');
  if (el) {
    el.style.display = 'none';  /* el.hide() */
  }
}

/* Show the loading pane (the spinny compass), if it isn't already visible.

   Deliberately does not use any jQuery functionality.
*/
function show_loading() {
  if (loading_visible == true)
    return;
  loading_visible = true;

  var el = document.getElementById('loadingpane');
  if (el) {
    el.style.display = '';   /* el.show() */
  }
}

/* Remove all children from a DOM element. (Not a jQuery collection!)

   Deliberately does not use any jQuery functionality.
*/
function remove_children(parent) {
  var obj, ls;
  ls = parent.childNodes;
  while (ls.length > 0) {
    obj = ls.item(0);
    parent.removeChild(obj);
  }
}

/* Return the last child element of a DOM element. (Ignoring text nodes.)
   If the element has no element children, this returns null.
   This returns a raw DOM element! Remember to $() it if you want to pass
   it to jquery.
*/
function last_child_of(obj) {
  var ls = obj.children();
  if (!ls || !ls.length)
    return null;
  return ls.get(ls.length-1);
}

/* Add text to a DOM element. If GlkOte is configured to detect URLs,
   this does that, converting them into 
   <a href='...' class='External' target='_blank'> tags.
   
   This requires calls to document.createTextNode, because jQuery doesn't
   have a notion of appending literal text. I swear...
*/
function insert_text_detecting(el, val) {
  if (!detect_external_links) {
    el.append(document.createTextNode(val));
    return;
  }

  if (detect_external_links == 'match') {
    /* For 'match', we test the entire span of text to see if it's a URL.
       This is simple and fast. */
    if (regex_external_links.test(val)) {
      var ael = $('<a>',
        { 'href': val, 'class': 'External', 'target': '_blank' } );
      ael.text(val);
      el.append(ael);
      return;
    }
    /* If not, fall through. */
  }
  else if (detect_external_links == 'search') {
    /* For 'search', we have to look for a URL within the span -- perhaps
       multiple URLs. This is more work, and the regex is more complicated
       too. */
    while (true) {
      var match = regex_external_links.exec(val);
      if (!match)
        break;
      /* Add the characters before the URL, if any. */
      if (match.index > 0) {
        var prefix = val.substring(0, match.index);
        el.append(document.createTextNode(prefix));
      }
      /* Add the URL. */
      var ael = $('<a>',
        { 'href': match[0], 'class': 'External', 'target': '_blank' } );
      ael.text(match[0]);
      el.append(ael);
      /* Continue searching after the URL. */
      val = val.substring(match.index + match[0].length);
    }
    if (!val.length)
      return;
    /* Add the final string of characters, if there were any. */
  }

  /* Fall-through case. Just add the text. */
  el.append(document.createTextNode(val));
}

/* Get the CanvasRenderingContext2D from a canvas element. 
*/
function canvas_get_2dcontext(canvasel) {
  if (!canvasel || !canvasel.length)
    return undefined;
  var canvas = canvasel.get(0);
  if (canvas && canvas.getContext) {
    return canvas.getContext('2d');
  }
  return undefined;
}

/* This is responsible for drawing the queue of graphics operations.
   It will do simple fills synchronously, but image draws must be
   handled in a callback (because the image data might need to be pulled
   from the server).

   If the loadedimg argument is null, this was called to take care of
   new drawing ops. On an image draw, we call back here with loadedimg
   as the Image DOM object that succeeded (or failed).
*/
function perform_graphics_ops(loadedimg, loadedev) {
  if (graphics_draw_queue.length == 0) {
    glkote_log('perform_graphics_ops called with no queued ops' + (loadedimg ? ' (plus image!)' : ''));
    return;
  }
  //glkote_log('### perform_graphics_ops, ' + graphics_draw_queue.length + ' queued' + (loadedimg ? ' (plus image!)' : '') + '.'); /*###*/

  /* Look at the first queue entry, execute it, and then shift it off.
     On error we must be sure to shift anyway, or the queue will jam!
     Note that if loadedimg is not null, the first queue entry should
     be a matching 'image' draw. */

  while (graphics_draw_queue.length) {
    var op = graphics_draw_queue[0];
    var win = windowdic[op.winid];
    if (!win) {
      glkote_log('perform_graphics_ops: op for nonexistent window ' + op.winid);
      graphics_draw_queue.shift();
      continue;
    }

    var el = $('#win'+win.id+'_canvas', dom_context);
    var ctx = canvas_get_2dcontext(el);
    if (!ctx) {
      glkote_log('perform_graphics_ops: op for nonexistent canvas ' + win.id);
      graphics_draw_queue.shift();
      continue;
    }

    var optype = op.special;
    
    switch (optype) {
      case 'setcolor':
        /* Set the default color (no visible changes). */
        win.defcolor = op.color;
        break;
      case 'fill':
        /* Both color and geometry are optional here. */
        if (op.color === undefined)
          ctx.fillStyle = win.defcolor;
        else
          ctx.fillStyle = op.color;
        if (op.x === undefined) {
          /* Fill the whole canvas frame. Also set the background color,
             so that future window resizes look nice. */
          ctx.fillRect(0, 0, win.graphwidth, win.graphheight);
          win.frameel.css('background-color', ctx.fillStyle);
        }
        else {
          ctx.fillRect(op.x, op.y, op.width, op.height);
        }
        ctx.fillStyle = '#000000';
        break;
      case 'image':
        /* This is the tricky case. If this is a successful load callback,
           loadedimg already contains the desired image. If it doesn't, we
           check the cache. If that doesn't have it, we have to create a new
           Image and set up the loading callbacks. */
        if (!loadedimg) {
          var oldimg = image_cache[op.image];
          if (oldimg && oldimg.width > 0 && oldimg.height > 0) {
            loadedimg = oldimg;
            loadedev = true;
            //glkote_log('### found image in cache');
          }
          else {
            /* This cached image is broken. I don't know if this can happen,
               but if it does, drop it. */
            delete image_cache[op.image];
          }
        }
        if (!loadedimg) {
          var imgurl = op.url;
          if (window.GiLoad && GiLoad.get_image_url) {
            var newurl = GiLoad.get_image_url(op.image);
            if (newurl)
              imgurl = newurl;
          }
          //glkote_log('### setting up callback with url');
          var newimg = new Image();
          $(newimg).on('load', function(ev) { perform_graphics_ops(newimg, ev); });
          $(newimg).on('error', function(ev) { perform_graphics_ops(newimg, null); });
          /* Setting the src attribute will trigger one of the above
             callbacks. */
          newimg.src = imgurl;
          return;
        }
        /* We were called back with an image. Hopefully it loaded ok. Note that
           for the error callback, loadedev is null. */
        if (loadedev) {
          image_cache[op.image] = loadedimg;
          ctx.drawImage(loadedimg, op.x, op.y, op.width, op.height);
        }
        loadedev = null;
        loadedimg = null;
        /* Either way, continue with the queue. */
        break;
      default:
        glkote_log('Unknown special entry in graphics content: ' + optype);
        break;
    }

    graphics_draw_queue.shift();
  }
  //glkote_log('### queue empty.');
}

/* Run a function (no arguments) in timeout seconds. */
function delay_func(timeout, func)
{
  return window.setTimeout(func, timeout*1000);
}

/* Run a function (no arguments) "soon". */
function defer_func(func)
{
  return window.setTimeout(func, 0.01*1000);
}

/* Debugging utility: return a string displaying all of an object's
   properties, recursively. (Do not call this on an object which references
   anything big!) */
function inspect_deep(res) {
  var keys = jQuery.map(res, function(val, key) { return key; });
  keys.sort();
  var els = jQuery.map(keys, function(key) {
      var val = res[key];
      if (jQuery.type(val) === 'string')
        val = "'" + val + "'";
      else if (!(jQuery.type(val) === 'number'))
        val = inspect_deep(val);
      return key + ':' + val;
    });
  return '{' + els.join(', ') + '}';
}

/* Debugging utility: same as above, but only one level deep. */
function inspect_shallow(res) {
  var keys = jQuery.map(res, function(val, key) { return key; });
  keys.sort();
  var els = jQuery.map(keys, function(key) {
      var val = res[key];
      if (jQuery.type(val) === 'string')
        val = "'" + val + "'";
      return key + ':' + val;
    });
  return '{' + els.join(', ') + '}';
}

/* Add a line to the window's command history, and then submit it to
   the game. (This is a utility function used by various keyboard input
   handlers.)
*/
function submit_line_input(win, val, termkey) {
  var historylast = null;
  if (win.history.length)
    historylast = win.history[win.history.length-1];

  /* Store this input in the command history for this window, unless
     the input is blank or a duplicate. */
  if (val && val != historylast) {
    win.history.push(val);
    if (win.history.length > 20) {
      /* Don't keep more than twenty entries. */
      win.history.shift();
    }
  }

  send_response('line', win, val, termkey);
}

/* Invoke the game interface's accept() method, passing along an input
   event, and also including all the information about incomplete line
   inputs.

   This is called by each event handler that can signal a completed input
   event.

   The val and val2 arguments are only used by certain event types, which
   is why most of the invocations pass three arguments instead of four.
*/
function send_response(type, win, val, val2) {
  if (disabled && type != 'specialresponse')
    return;

  var winid = 0;
  if (win)
    winid = win.id;
  var res = { type: type, gen: generation };

  if (type == 'line') {
    res.window = win.id;
    res.value = val;
    if (val2)
      res.terminator = val2;
  }
  else if (type == 'char') {
    res.window = win.id;
    res.value = val;
  }
  else if (type == 'hyperlink') {
    res.window = win.id;
    res.value = val;
  }
  else if (type == 'mouse') {
    res.window = win.id;
    res.x = val;
    res.y = val2;
  }
  else if (type == 'external') {
    res.value = val;
  }
  else if (type == 'specialresponse') {
    res.response = val;
    res.value = val2;
  }
  else if (type == 'redraw') {
    res.window = win.id;
  }
  else if (type == 'init' || type == 'arrange') {
    res.metrics = val;
  }

  if (!(type == 'init' || type == 'refresh' || type == 'specialresponse')) {
    jQuery.each(windowdic, function(tmpid, win) {
      var savepartial = (type != 'line' && type != 'char') 
                        || (win.id != winid);
      if (savepartial && win.input && win.input.type == 'line'
        && win.inputel && win.inputel.val()) {
        var partial = res.partial;
        if (!partial) {
          partial = {};
          res.partial = partial;
        };
        partial[win.id] = win.inputel.val();
      }
    });
  }

  if (recording) {
    recording_state.input = res;
    recording_state.timestamp = (new Date().getTime());
  }
  game_interface.accept(res);
}

/* ---------------------------------------------- */

/* Take apart the query string of the current URL, and turn it into
   an object map.
   (Adapted from querystring.js by Adam Vandenberg.)
*/
function get_query_params() {
    var map = {};

    var qs = location.search.substring(1, location.search.length);
    if (qs.length) {
        var args = qs.split('&');

        qs = qs.replace(/\+/g, ' ');
        for (var ix = 0; ix < args.length; ix++) {
            var pair = args[ix].split('=');
            var name = decodeURIComponent(pair[0]);
            
            var value = (pair.length==2)
                ? decodeURIComponent(pair[1])
                : name;
            
            map[name] = value;
        }
    }

    return map;
}

/* This is called every time the game updates the screen state. It
   wraps up the update with the most recent input event and sends them
   off to whatever is handling transcript recordings.
*/
function recording_send(arg) {
  recording_state.output = arg;
  recording_state.outtimestamp = (new Date().getTime());

  var send = true;

  /* If the format is not "glkote", we should massage state.input and
     state.output. (Or set send=false to skip this update entirely.) */
  if (recording_state.format == 'simple') {
    var input = recording_state.input;
    var output = recording_state.output;

    var inputtype = null;
    if (input)
      inputtype = input.type;

    if (inputtype == 'line' || inputtype == 'char') {
      recording_state.input = input.value;
    }
    else if (inputtype == 'init' || inputtype == 'external' || inputtype == 'specialresponse' || !inputtype) {
      recording_state.input = '';
    }
    else {
      /* Do not send 'arrange' or 'redraw' events. */
      send = false;
    }

    /* We keep track of which windows are buffer windows. */
    if (output.windows) {
      recording_context.bufferwins = {};
      for (var ix=0; ix<output.windows.length; ix++) {
        if (output.windows[ix].type == 'buffer')
          recording_context.bufferwins[output.windows[ix].id] = true;
      }
    }

    /* Accumulate all the text that's sent to buffer windows. */
    var buffer = '';

    if (output.content) {
      for (var ix=0; ix<output.content.length; ix++) {
        var content = output.content[ix];
        if (recording_context.bufferwins && recording_context.bufferwins[content.id]) {
          if (content.text) {
            for (var jx=0; jx<content.text.length; jx++) {
              var text = content.text[jx];
              if (!text.append)
                buffer = buffer + '\n';
              if (text.content) {
                for (var kx=0; kx<text.content.length; kx++) {
                  var el = text.content[kx];
                  /* Why did I allow the LINE_DATA_ARRAY to have two
                     possible formats? Sigh */
                  if (jQuery.type(el) == 'string') {
                    kx++;
                    buffer = buffer + text.content[kx];
                  }
                  else {
                    if (el.text)
                      buffer = buffer + el.text;
                  }
                }
              }
            }
          }
        }
      }      
    }

    recording_state.output = buffer;
  }


  if (send)
    recording_handler(recording_state);

  recording_state.input = null;
  recording_state.output = null;
  recording_state.timestamp = 0;
  recording_state.outtimestamp = 0;
}

/* Send a wrapped-up state off to an AJAX handler. The state is a JSONable
   object containing input, output, and timestamps. The format of the input
   and output depends on the recording parameters.

   (The timestamp field refers to the input time, which is what you generally
   care about. The outtimestamp will nearly always follow very closely. If
   there's a long gap, you know your game has spent a long time computing.)

   If the AJAX request returns an error, this shuts off recording (rather
   than trying again for future commands).
*/
function recording_standard_handler(state) {
  jQuery.ajax(recording_handler_url, {
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(state),
        error: function(jqxhr, textstatus, errorthrown) {
          glkote_log('Transcript recording failed; deactivating. Error ' + textstatus + ': ' + errorthrown);
          recording = false;
        }
      } );
}

/* ---------------------------------------------- */

/* DOM event handlers. */

/* Detect the browser window being resized.
   Unfortunately, this doesn't catch "make font bigger/smaller" changes,
   which ought to trigger the same reaction.)
*/
function evhan_doc_resize(ev) {
  /* We don't want to send a whole flurry of these events, just because
     the user is dragging the window-size around. So we set up a short
     timer, and don't do anything until the flurry has calmed down. */

  if (resize_timer != null) {
    window.clearTimeout(resize_timer);
    resize_timer = null;
  }

  resize_timer = delay_func(0.20, doc_resize_real);
}

/* This executes when no new resize events have come along in the past
   0.20 seconds. (But if the UI is disabled, we delay again, because
   the game can't deal with events yet.)

   Note that this sends a Glk "arrange" event, not a "redraw" event.
   Those will follow soon if needed.

   (What actually happens, and I apologize for this, is that the
   "arrange" event causes the game to send new window sizes. The
   accept handler sees a size change for a graphics window and queues
   up a "redraw" event via send_window_redraw.)

   ### We really should distinguish between disabling the UI (delay
   resize events) from shutting down the UI (ignore resize events).
 */
function doc_resize_real() {
  resize_timer = null;

  if (disabled) {
    resize_timer = delay_func(0.20, doc_resize_real);
    return;
  }

  var new_metrics = measure_window();
  if (new_metrics.width == current_metrics.width
    && new_metrics.height == current_metrics.height) {
    /* If the metrics haven't changed, skip the arrange event. Necessary on
       mobile webkit, where the keyboard popping up and down causes a same-size
       resize event.

       This is not ideal; it means we'll miss metrics changes caused by
       font-size changes. (Admittedly, we don't have any code to detect those
       anyhow, so small loss.) */
    return;
  }
  current_metrics = new_metrics;
  send_response('arrange', null, current_metrics);
}

/* Send a "redraw" event for the given (graphics) window. This is triggered
   by the accept handler when it sees a graphics window change size.

   (Not actually an event handler, but I put it down here with
   doc_resize_real.)
*/
function send_window_redraw(winid) {
  var win = windowdic[winid];

  /* It's not likely that the window has been deleted since this function
     was queued up. But we'll be paranoid. */
  if (!win || win.type != 'graphics')
    return;

  send_response('redraw', win, null);
}

/* Event handler: the devicePixelRatio has changed. (Really we only get
   this for changes across particular thresholds, but I set up a bunch.)
*/
function evhan_doc_pixelreschange(ev) {
  var ratio = window.devicePixelRatio || 1;
  if (ratio != current_devpixelratio) {
    current_devpixelratio = ratio;
    glkote_log('### devicePixelRatio changed to ' + current_devpixelratio);

    /* If we have any graphics windows, we need to redo their size and
       scale, and then hit them with a redraw event. */
    jQuery.each(windowdic, function(winid, win) {
        if (win.type == 'graphics') {
          var el = $('#win'+win.id+'_canvas', dom_context);
          win.scaleratio = current_devpixelratio / win.backpixelratio;
          //glkote_log('### changed canvas to scale ' + win.scaleratio + ' (device ' + current_devpixelratio + ' / backstore ' + win.backpixelratio + ')');
          var ctx = canvas_get_2dcontext(el);
          el.attr('width', win.graphwidth * win.scaleratio);
          el.attr('height', win.graphheight * win.scaleratio);
          el.css('width', (win.graphwidth + 'px'));
          el.css('height', (win.graphheight + 'px'));
          if (ctx) {
            /* Set scale to win.scaleratio */
            ctx.setTransform(win.scaleratio, 0, 0, win.scaleratio, 0, 0);
            ctx.fillStyle = win.defcolor;
            ctx.fillRect(0, 0, win.graphwidth, win.graphheight);
            ctx.fillStyle = '#000000';
          }
          win.frameel.css('background-color', win.defcolor);
          /* We have to trigger a redraw event for this window. But we can't do
             a bunch of them from the same handler. We'll set up a deferred
             function call. */
          defer_func(function() { send_window_redraw(winid); });
        }  
      });
  }
}

/* Event handler: keypress events on input fields.

   Move the input focus to whichever window most recently had it.
*/
function evhan_doc_keypress(ev) {
  if (disabled) {
    return;
  }

  var keycode = 0;
  if (ev) keycode = ev.which;

  if (ev.target.tagName.toUpperCase() == 'INPUT') {
    /* If the focus is already on an input field, don't mess with it. */
    return;
  }
  if (ev.target.className.indexOf('CanHaveInputFocus') >= 0) {
    /* If the focus is on an element which insists it's input-like,
       don't mess with that either. This is necessary for input fields
       in shadow DOM and plugins. */
    return;
  }

  if (ev.altKey || ev.metaKey || ev.ctrlKey) {
    /* Don't mess with command key combinations. This is not a perfect
       test, since option-key combos are ordinary (accented) characters
       on Mac keyboards, but it's close enough. */
    return;
  }

  if (0) { /*### opera browser?*/
    /* Opera inexplicably generates keypress events for the shift, option,
       and command keys. The keycodes are 16...18. We don't want those
       to focus-and-scroll-down. */
    if (!keycode)
      return;
    if (keycode < 32 && keycode != 13)
      return;
  }

  var win;

  if (windows_paging_count) {
    win = windowdic[last_known_paging];
    if (win) {
      if (!((keycode >= 32 && keycode <= 126) || keycode == 13)) {
        /* If the keystroke is not a printable character (or Enter),
           we return and let the default behavior happen. That lets
           pageup/pagedown/home/end work normally. */
        return;
      }
      ev.preventDefault();
      var frameel = win.frameel;
      /* Scroll the unseen content to the top. */
      frameel.scrollTop(win.topunseen - current_metrics.buffercharheight);
      /* Compute the new topunseen value. */
      var frameheight = frameel.outerHeight();
      var realbottom = buffer_last_line_top_offset(win);
      var newtopunseen = frameel.scrollTop() + frameheight;
      if (newtopunseen > realbottom)
        newtopunseen = realbottom;
      if (win.topunseen < newtopunseen)
        win.topunseen = newtopunseen;
      if (win.needspaging) {
        /* The scroll-down might have cleared needspaging already. But 
           if not... */
        if (frameel.scrollTop() + frameheight + moreprompt_margin >= frameel.get(0).scrollHeight) {
          win.needspaging = false;
          var moreel = $('#win'+win.id+'_moreprompt', dom_context);
          if (moreel.length)
            moreel.remove();
          readjust_paging_focus(true);
        }
      }
      return;
    }
  }

  win = windowdic[last_known_focus];
  if (!win)
    return;
  if (!win.inputel)
    return;

  win.inputel.focus();

  if (win.input.type == 'line') {

    if (keycode == 13) {
      /* Grab the Return/Enter key here. This is the same thing we'd do if
         the input field handler caught it. */
      submit_line_input(win, win.inputel.val(), null);
      /* Safari drops an extra newline into the input field unless we call
         preventDefault() here. */
      ev.preventDefault();
      return;
    }

    if (keycode) {
      /* For normal characters, we fake the normal keypress handling by
         appending the character onto the end of the input field. If we
         didn't call preventDefault() here, Safari would actually do
         the right thing with the keystroke, but Firefox wouldn't. */
      /* This is completely wrong for accented characters (on a Mac
         keyboard), but that's beyond my depth. */
      if (keycode >= 32) {
        var val = String.fromCharCode(keycode);
        win.inputel.val(win.inputel.val() + val);
      }
      ev.preventDefault();
      return;
    }

  }
  else {
    /* In character input, we only grab normal characters. Special keys
       should be left to behave normally (arrow keys scroll the window,
       etc.) (This doesn't work right in Firefox, but it's not disastrously
       wrong.) */
    //### grab arrow keys too? They're common in menus.
    var res = null;
    if (keycode == 13)
      res = 'return';
    else if (keycode == key_codes.KEY_BACKSPACE)
      res = 'delete';
    else if (keycode)
      res = String.fromCharCode(keycode);
    if (res) {
      send_response('char', win, res);
    }
    ev.preventDefault();
    return;
  }
}

/* Event handler: mousedown events on windows.

   Remember which window the user clicked in last, as a hint for setting
   the focus. (Input focus and paging focus are tracked separately.)
*/
function evhan_window_mousedown(ev) {
  var winid = ev.data;
  var win = windowdic[winid];
  if (!win)
    return;

  if (win.inputel) {
    last_known_focus = win.id;
    if (0 /*###Prototype.Browser.MobileSafari*/) {
      ev.preventDefault();
      //glkote_log("### focus to " + win.id);
      //### This doesn't always work, blah
      win.inputel.focus();
    }
  }

  if (win.needspaging)
    last_known_paging = win.id;
  else if (win.inputel)
    last_known_paging = 0;
}

/* Event handler: mouse click events on graphics or grid windows
*/
function evhan_input_mouse_click(ev) {
  var winid = ev.data;
  var win = windowdic[winid];
  if (!win)
    return;

  if (ev.button != 0)
    return;
  if (!win.reqmouse)
    return;

  var xpos = 0;
  var ypos = 0;
  if (win.type == 'grid') {
    /* Measure click position relative to the zeroth line of the grid. */
    var lineel = $('#win'+win.id+'_ln'+0, dom_context);
    if (lineel.length) {
      var linepos = lineel.offset();
      xpos = Math.floor((ev.clientX - linepos.left) / current_metrics.gridcharwidth);
      ypos = Math.floor((ev.clientY - linepos.top) / current_metrics.gridcharheight);
    }
    if (xpos >= win.gridwidth)
      xpos = win.gridwidth-1;
    if (xpos < 0)
      xpos = 0;
    if (ypos >= win.gridheight)
      ypos = win.gridheight-1;
    if (ypos < 0)
      ypos = 0;
  }
  else if (win.type == 'graphics') {
    /* Measure click position relative to the canvas. */
    var canel = $('#win'+win.id+'_canvas', dom_context);
    if (canel.length) {
      var pos = canel.offset();
      xpos = ev.clientX - pos.left;
      ypos = ev.clientY - pos.top;
    }
    if (xpos >= win.graphwidth)
      xpos = win.graphwidth-1;
    if (xpos < 0)
      xpos = 0;
    if (ypos >= win.graphheight)
      ypos = win.graphheight-1;
    if (ypos < 0)
      ypos = 0;
  }
  else {
    return;
  }

  ev.preventDefault();
  send_response('mouse', win, xpos, ypos);
}

/* Event handler: keydown events on input fields (character input)

   Detect the arrow keys, and a few other special keystrokes, for
   character input. We don't grab *all* keys here, because that would
   include modifier keys (shift, option, etc) -- we don't want to
   count those as character input.
*/
function evhan_input_char_keydown(ev) {
  var keycode = 0;
  if (ev) keycode = ev.keyCode; //### ev.which?
  if (!keycode) return true;

  var res = null;

  /* We don't grab Return/Enter in this function, because Firefox lets
     it go through to the keypress handler (even if we try to block it),
     which results in a double input. */

  switch (keycode) {
    case key_codes.KEY_LEFT:
      res = 'left'; break;
    case key_codes.KEY_RIGHT:
      res = 'right'; break;
    case key_codes.KEY_UP:
      res = 'up'; break;
    case key_codes.KEY_DOWN:
      res = 'down'; break;
    case key_codes.KEY_BACKSPACE:
      res = 'delete'; break;
    case key_codes.KEY_ESC:
      res = 'escape'; break;
    case key_codes.KEY_TAB:
      res = 'tab'; break;
    case key_codes.KEY_PAGEUP:
      res = 'pageup'; break;
    case key_codes.KEY_PAGEDOWN:
      res = 'pagedown'; break;
    case key_codes.KEY_HOME:
      res = 'home'; break;
    case key_codes.KEY_END:
      res = 'end'; break;
    case 112:
      res = 'func1'; break;
    case 113:
      res = 'func2'; break;
    case 114:
      res = 'func3'; break;
    case 115:
      res = 'func4'; break;
    case 116:
      res = 'func5'; break;
    case 117:
      res = 'func6'; break;
    case 118:
      res = 'func7'; break;
    case 119:
      res = 'func8'; break;
    case 120:
      res = 'func9'; break;
    case 121:
      res = 'func10'; break;
    case 122:
      res = 'func11'; break;
    case 123:
      res = 'func12'; break;
  }

  if (res) {
    var winid = $(this).data('winid');
    var win = windowdic[winid];
    if (!win || !win.input)
      return true;

    send_response('char', win, res);
    return false;
  }

  return true;
}

/* Event handler: keypress events on input fields (character input)

   Detect all printable characters. (Arrow keys and such don't generate
   a keypress event on all browsers, which is why we grabbed them in
   the keydown handler, above.)
*/
function evhan_input_char_keypress(ev) {
  var keycode = 0;
  if (ev) keycode = ev.which;
  if (!keycode) return false;

  var res;
  if (keycode == 13)
    res = 'return';
  else
    res = String.fromCharCode(keycode);

  var winid = $(this).data('winid');
  var win = windowdic[winid];
  if (!win || !win.input)
    return true;

  send_response('char', win, res);
  return false;
}

/* Event handler: keydown events on input fields (line input)

   Divert the up and down arrow keys to scroll through the command history
   for this window. */
function evhan_input_keydown(ev) {
  var keycode = 0;
  if (ev) keycode = ev.keyCode; //### ev.which?
  if (!keycode) return true;

  if (keycode == key_codes.KEY_UP || keycode == key_codes.KEY_DOWN) {
    var winid = $(this).data('winid');
    var win = windowdic[winid];
    if (!win || !win.input)
      return true;

    if (keycode == key_codes.KEY_UP && win.historypos > 0) {
      win.historypos -= 1;
      if (win.historypos < win.history.length)
        this.value = win.history[win.historypos];
      else
        this.value = '';
    }

    if (keycode == key_codes.KEY_DOWN && win.historypos < win.history.length) {
      win.historypos += 1;
      if (win.historypos < win.history.length)
        this.value = win.history[win.historypos];
      else
        this.value = '';
    }

    return false;
  }
  else if (terminator_key_values[keycode]) {
    var winid = $(this).data('winid');
    var win = windowdic[winid];
    if (!win || !win.input)
      return true;

    if (win.terminators[terminator_key_values[keycode]]) {
      /* This key is listed as a current terminator for this window,
         so we'll submit the line of input. */
      submit_line_input(win, win.inputel.val(), terminator_key_values[keycode]);
      return false;
    }
  }

  return true;
}

/* Event handler: keypress events on input fields (line input)

   Divert the enter/return key to submit a line of input.
*/
function evhan_input_keypress(ev) {
  var keycode = 0;
  if (ev) keycode = ev.which;
  if (!keycode) return true;

  if (keycode == 13) {
    var winid = $(this).data('winid');
    var win = windowdic[winid];
    if (!win || !win.input)
      return true;

    submit_line_input(win, this.value, null);
    return false;
  }

  return true;
}

/* Event handler: focus events on input fields

   Notice that the focus has switched to a line/char input field.
*/
function evhan_input_focus(ev) {
  var winid = ev.data;
  var win = windowdic[winid];
  if (!win)
    return;

  currently_focussed = true;
  last_known_focus = winid;
  last_known_paging = winid;
}

/* Event handler: blur events on input fields

   Notice that the focus has switched away from a line/char input field.
*/
function evhan_input_blur(ev) {
  var winid = ev.data;
  var win = windowdic[winid];
  if (!win)
    return;

  currently_focussed = false;
}

/* Event handler: scrolling in buffer window 
*/
function evhan_window_scroll(ev) {
  var winid = ev.data;
  var win = windowdic[winid];
  if (!win)
    return;

  if (!win.needspaging)
    return;

  var frameel = win.frameel;
  var frameheight = frameel.outerHeight();
  var realbottom = buffer_last_line_top_offset(win);
  var newtopunseen = frameel.scrollTop() + frameheight;
  if (newtopunseen > realbottom)
    newtopunseen = realbottom;
  if (win.topunseen < newtopunseen)
    win.topunseen = newtopunseen;

  if (frameel.scrollTop() + frameheight + moreprompt_margin >= frameel.get(0).scrollHeight) {
    win.needspaging = false;
    var moreel = $('#win'+win.id+'_moreprompt', dom_context);
    if (moreel.length)
      moreel.remove();
    readjust_paging_focus(true);
    return;
  }
}

/* Scroll a buffer window all the way down, removing the MORE prompt.
   This is only used in the autorestore case.
*/
function window_scroll_to_bottom(win) {
  var frameel = win.frameel;

  var frameheight = frameel.outerHeight();
  frameel.scrollTop(frameel.get(0).scrollHeight - frameheight);

  var realbottom = buffer_last_line_top_offset(win);
  var newtopunseen = frameel.scrollTop() + frameheight;
  if (newtopunseen > realbottom)
    newtopunseen = realbottom;
  if (win.topunseen < newtopunseen)
    win.topunseen = newtopunseen;
  if (win.needspaging) {
    /* The scroll-down might have cleared needspaging already. But 
       if not... */
    if (frameel.scrollTop() + frameheight + moreprompt_margin >= frameel.get(0).scrollHeight) {
      win.needspaging = false;
      var moreel = $('#win'+win.id+'_moreprompt', dom_context);
      if (moreel.length)
        moreel.remove();
      readjust_paging_focus(true);
    }
  }
}

/* Event handler constructor: report a click on a hyperlink
   (This is a factory that returns an appropriate handler function, for
   stupid Javascript closure reasons.)

   Generate the appropriate event for a hyperlink click. Return false,
   to suppress the default HTML action of hyperlinks.
*/
function build_evhan_hyperlink(winid, linkval) {
  return function() {
    var win = windowdic[winid];
    if (!win)
      return false;
    if (!win.reqhyperlink)
      return false;
    send_response('hyperlink', win, linkval);
    return false;
  };
}

/* ---------------------------------------------- */

/* End of GlkOte namespace function. Return the object which will
   become the GlkOte global. */
return {
  version:  '2.2.2',
  init:     glkote_init, 
  update:   glkote_update,
  extevent: glkote_extevent,
  getinterface: glkote_get_interface,
  getdomcontext: glkote_get_dom_context,
  setdomcontext: glkote_set_dom_context,
  save_allstate : glkote_save_allstate,
  log:      glkote_log,
  warning:  glkote_warning,
  error:    glkote_error
};

}();

/* End of GlkOte library. */
