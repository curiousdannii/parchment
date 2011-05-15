/* GlkOte -- a Javascript display library for IF interfaces
 * GlkOte Library: version 0.2.2.
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glk/glkote.html>
 * 
 * This Javascript library is copyright 2008-10 by Andrew Plotkin. You may
 * copy and distribute it freely, by any means and under any conditions,
 * as long as the code and documentation is not changed. You may also
 * incorporate this code into your own program and distribute that, or
 * modify this code and use and distribute the modified version, as long
 * as you retain a notice in your program or documentation which mentions
 * my name and the URL shown above.
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
 * web service. However, this has not yet been implemented.
 *
 * For full documentation, see the docs.html file in this package.
 */


/* Put everything inside the GlkOte namespace. */
GlkOte = function() {

/* Module global variables */
var game_interface = null;
var windowport_id = 'windowport';
var gameport_id = 'gameport';
var generation = 0;
var disabled = false;
var loading_visible = null;
var windowdic = null;
var current_metrics = null;
var currently_focussed = false;
var last_known_focus = 0;
var last_known_paging = 0;
var windows_paging_count = 0;
var resize_timer = null;
var retry_timer = null;
var is_ie7 = false;
var perform_paging = true;

/* Some handy constants */
/* A non-breaking space character. */
var NBSP = "\xa0";
/* Number of paragraphs to retain in a buffer window's scrollback. */
var max_buffer_length = 200;

/* All the keys that can be used as line input terminators, and their
   native values. */
var terminator_key_names = {
    escape : Event.KEY_ESC,
    func1 : 112, func2 : 113, func3 : 114, func4 : 115, func5 : 116, 
    func6 : 117, func7 : 118, func8 : 119, func9 : 120, func10 : 121, 
    func11 : 122, func12 : 123
};
/* The inverse of the above. Set up at init time. */
var terminator_key_values = {};

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

  if (!window.Prototype) {
    glkote_error('The Prototype library has not been loaded.');
    return;
  }

  var version = Prototype.Version.split('.');
  if (version.length < 2 || (version[0] == 1 && version[1] < 6)) {
    glkote_error('This version of the Prototype library is too old. (Version ' + Prototype.Version + ' found; 1.6.0 required.)');
    return;
  }

  /* Set up a static table. */
  for (var val in terminator_key_names) {
    terminator_key_values[terminator_key_names[val]] = val;
  }

  if (Prototype.Browser.MobileSafari) {
    /* Paging doesn't make sense for iphone/android, because you can't
       get keystroke events from a window. */
    perform_paging = false;
  }
  if (Prototype.Browser.IE) {
    is_ie7 = window.XMLHttpRequest != null;
  }

  windowdic = new Hash();

  if (iface.windowport)
      windowport_id = iface.windowport;
  if (iface.gameport)
      gameport_id = iface.gameport;

  var el = $(windowport_id);
  if (!el) {
    glkote_error('Cannot find windowport element #'+windowport_id+' in this document.');
    return;
  }
  el.update();
  if (!Prototype.Browser.MobileSafari) 
    Event.observe(document, 'keypress', evhan_doc_keypress);
  Event.observe(window, 'resize', evhan_doc_resize);

  var res = measure_window();
  if (Object.isString(res)) {
    glkote_error(res);
    return;
  }
  current_metrics = res;

  send_response('init', null, current_metrics);
}

/* Work out various pixel measurements used to compute window sizes:
   - the width and height of the windowport
   - the width and height of a character in a grid window
   - ditto for buffer windows (although this is only approximate, since
     buffer window fonts can be non-fixed-width, and styles can have
     different point sizes)
   - the amount of padding space around buffer and grid window content

   This stuff is determined by measuring the dimensions of the (invisible,
   offscreen) windows in the layouttestpane div.
*/
function measure_window() {
  var metrics = {};
  var el, linesize, winsize, line1size, line2size, spansize;

  /* We assume the gameport is the same size as the windowport, which
     is true on all browsers but IE7. Fortunately, on IE7 it's
     the windowport size that's wrong -- gameport is the size
     we're interested in. */
  el = $(gameport_id);
  if (!el)
    return 'Cannot find gameport element #'+gameport_id+' in this document.';

  var portsize = el.getDimensions();
  metrics.width  = portsize.width;
  metrics.height = portsize.height;

  el = $('layouttest_grid');
  if (!el)
    return 'Cannot find layouttest_grid element for window measurement.';

  winsize = el.getDimensions();
  spansize = $('layouttest_gridspan').getDimensions();
  line1size = $('layouttest_gridline').getDimensions();
  line2size = $('layouttest_gridline2').getDimensions();

  metrics.gridcharheight = ($('layouttest_gridline2').positionedOffset().top
    - $('layouttest_gridline').positionedOffset().top);
  metrics.gridcharwidth = (spansize.width / 8);
  /* Yes, we can wind up with a non-integer charwidth value. */

  /* these values include both sides (left+right, top+bottom) */
  metrics.gridmarginx = winsize.width - spansize.width;
  metrics.gridmarginy = winsize.height - (line1size.height + line2size.height);

  el = $('layouttest_buffer');
  if (!el)
    return 'Cannot find layouttest_grid element for window measurement.';

  winsize = el.getDimensions();
  spansize = $('layouttest_bufferspan').getDimensions();
  line1size = $('layouttest_bufferline').getDimensions();
  line2size = $('layouttest_bufferline2').getDimensions();

  metrics.buffercharheight = ($('layouttest_bufferline2').positionedOffset().top
    - $('layouttest_bufferline').positionedOffset().top);
  metrics.buffercharwidth = (spansize.width / 8);
  /* Yes, we can wind up with a non-integer charwidth value. */

  /* these values include both sides (left+right, top+bottom) */
  metrics.buffermarginx = winsize.width - spansize.width;
  metrics.buffermarginy = winsize.height - (line1size.height + line2size.height);

  /* these values come from the game interface object */
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
      retry_timer = retry_update.delay(2);
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
    windowdic.values().each(function(win) {
      if (win.inputel) {
        win.inputel.disabled = false;
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
  
  // Trigger for plugins
  jQuery( document ).trigger({
	type: 'GlkOutput',
	output: arg.content
  });
  

  /* Any buffer windows that have changed need to be scrolled down.
     Then, we take the opportunity to update topunseen. (If a buffer
     window hasn't changed, topunseen hasn't changed.) */

  windowdic.values().each(function(win) {
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
          /* Scroll all the way down. */
          frameel.scrollTop = frameel.scrollHeight;
          win.needspaging = false;
        }
        else {
          /* Scroll the unseen content to the top. */
          frameel.scrollTop = win.topunseen - current_metrics.buffercharheight;
          /* Compute the new topunseen value. */
          var frameheight = frameel.getHeight();
          var realbottom = last_line_top_offset(frameel);
          var newtopunseen = frameel.scrollTop + frameheight;
          if (newtopunseen > realbottom)
            newtopunseen = realbottom;
          if (win.topunseen < newtopunseen)
            win.topunseen = newtopunseen;
          /* The scroll-down has not touched needspaging, because it is
             currently false. Let's see if it should be true. */
          if (frameel.scrollTop + frameheight >= frameel.scrollHeight) {
            win.needspaging = false;
          }
          else {
            win.needspaging = true;
          }
        }

        /* Add or remove the more prompt, based on the new needspaging flag. */
        var moreel = $('win'+win.id+'_moreprompt');
        if (!win.needspaging) {
          if (moreel)
            moreel.remove();
        }
        else {
          if (!moreel) {
            moreel = new Element('div',
              { id: 'win'+win.id+'_moreprompt', 'class': 'MorePrompt' } );
            insert_text(moreel, 'More');
            /* 20 pixels is a cheap approximation of a scrollbar-width. */
            var morex = win.coords.right + 20;
            var morey = win.coords.bottom;
            moreel.setStyle({ bottom:morey+'px', right:morex+'px' });
            $(windowport_id).insert(moreel);
          }
        }
      }
    }
  });

  /* Set windows_paging_count. (But don't set the focus -- we'll do that
     momentarily.) */
  readjust_paging_focus(false);

  /* Disable everything, if that was requested. */
  disabled = false;
  if (arg.disable) {
    disabled = true;
    windowdic.values().each(function(win) {
      if (win.inputel) {
        win.inputel.disabled = true;
      }
    });
  }

  /* Figure out which window to set the focus to. (But not if the UI is
     disabled. We also skip this if there's paging to be done, because
     focussing might autoscroll and we want to trap keystrokes for 
     paging anyhow.) */

  var newinputwin = 0;
  if (!disabled && !windows_paging_count) {
    windowdic.values().each(function(win) {
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
      var win = windowdic.get(newinputwin);
      if (win.inputel) {
        win.inputel.focus();
      }
    };
    focusfunc.defer();
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
  windowdic.values().each(function(win) { win.inplace = false; });
  arg.map(accept_one_window);

  /* Close any windows not mentioned in the argument. */
  var closewins = windowdic.values().reject(function(win) { return win.inplace; });
  closewins.map(close_one_window);
}

/* Handle the update for a single window. Open it if it doesn't already
   exist; set its size and position, if those need to be changed.
*/
function accept_one_window(arg) {
  var frameel, win;

  if (!arg) {
    return;
  }

  win = windowdic.get(arg.id);
  if (win == null) {
    /* The window must be created. */
    win = { id: arg.id, type: arg.type, rock: arg.rock };
    windowdic.set(arg.id, win);
    var typeclass;
    if (win.type == 'grid')
      typeclass = 'GridWindow';
    if (win.type == 'buffer')
      typeclass = 'BufferWindow';
    var rockclass = 'WindowRock_' + arg.rock;
    frameel = new Element('div',
      { id: 'window'+arg.id,
        'class': 'WindowFrame ' + typeclass + ' ' + rockclass });
    frameel.winid = arg.id;
    Event.observe(frameel, 'mousedown', 
      function(ev) { evhan_window_mousedown(ev, frameel); });
    if (perform_paging && win.type == 'buffer')
      frameel.onscroll = function() { evhan_window_scroll(frameel); };
    win.frameel = frameel;
    win.gridheight = 0;
    win.gridwidth = 0;
    win.input = null;
    win.inputel = null;
    win.terminators = {};
    win.reqhyperlink = false;
    win.needscroll = false;
    win.needspaging = false;
    win.topunseen = 0;
    win.coords = { left:null, top:null, right:null, bottom:null };
    win.history = new Array();
    win.historypos = 0;
    $(windowport_id).insert(frameel);
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
        var el = new Element('div',
          { id: 'win'+win.id+'_ln'+ix, 'class': 'GridLine' });
        el.insert(NBSP);
        win.frameel.insert(el);
      }
    }
    if (arg.gridheight < win.gridheight) {
      for (ix=arg.gridheight; ix<win.gridheight; ix++) {
        var el = $('win'+win.id+'_ln'+ix);
        if (el)
          el.remove();
      }
    }
    win.gridheight = arg.gridheight;
    win.gridwidth = arg.gridwidth;
  }

  if (win.type == 'buffer') {
    /* Don't need anything? */
  }

  /* The trick is that left/right/top/bottom are measured to the outside
     of the border, but width/height are measured from the inside of the
     border. (Measured by the browser's DOM methods, I mean.) */
  var styledic;
  if (Prototype.Browser.IE) {
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
  frameel.setStyle(styledic);
}

/* Handle closing one window. */
function close_one_window(win) {
  win.frameel.remove();
  windowdic.unset(win.id);
  win.frameel = null;

  var moreel = $('win'+win.id+'_moreprompt');
  if (moreel)
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
  return (NBSP.times(len-1)) + ' ';
}

/* Handle all of the window content changes. */
function accept_contentset(arg) {
  arg.map(accept_one_content);
}

/* Handle the content changes for a single window. */
function accept_one_content(arg) {
  var win = windowdic.get(arg.id);

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
      var lineel = $('win'+win.id+'_ln'+linenum);
      if (!lineel) {
        glkote_error('Got content for nonexistent line ' + linenum + ' of window ' + arg.id + '.');
        continue;
      }
      if (!content || !content.length) {
        lineel.update(NBSP);
      }
      else {
        lineel.update();
        for (sx=0; sx<content.length; sx++) {
          var rdesc = content[sx];
          var rstyle, rtext, rlink;
          if (rdesc.length === undefined) {
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
          var el = new Element('span',
            { 'class': 'Style_' + rstyle } );
          if (rlink == undefined) {
            insert_text(el, rtext);
          }
          else {
            var ael = new Element('a',
              { 'href': '#' } );
            insert_text(ael, rtext);
            ael.onclick = build_evhan_hyperlink(win.id, rlink);
            el.insert(ael);
          }
          lineel.insert(el);
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
        win.inputel.remove();
    }

    var cursel = $('win'+win.id+'_cursor');
    if (cursel)
      cursel.remove();
    cursel = null;

    if (arg.clear) {
      win.frameel.update(); // remove all children
      win.topunseen = 0;
    }

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
        divel = last_child_of(win.frameel);
      }
      if (divel == null) {
        /* Create a new paragraph div */
        divel = new Element('div', { 'class': 'BufferLine' })
        divel.blankpara = true;
        divel.endswhite = true;
        win.frameel.insert(divel);
      }
      if (!content || !content.length) {
        if (divel.blankpara)
          divel.update(NBSP);
        continue;
      }
      if (divel.blankpara) {
        divel.blankpara = false;
        divel.update();
      }
      /* We must munge long strings of whitespace to make sure they aren't
         collapsed. (This wouldn't be necessary if "white-space: pre-wrap"
         were widely implemented. Oh well.) ### Use if available?
         The rule: if we find a block of spaces, turn all but the last one
         into NBSP. Also, if a div's last span ends with a space (or the
         div has no spans), and a new span begins with a space, turn that
         into a NBSP. */
      for (sx=0; sx<content.length; sx++) {
        var rdesc = content[sx];
        var rstyle, rtext, rlink;
        if (rdesc.length === undefined) {
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
        var el = new Element('span',
          { 'class': 'Style_' + rstyle } );
        rtext = rtext.replace(regex_long_whitespace, func_long_whitespace);
        if (divel.endswhite) {
          rtext = rtext.replace(regex_initial_whitespace, NBSP);
        }
        if (rlink == undefined) {
          insert_text(el, rtext);
        }
        else {
          var ael = new Element('a',
            { 'href': '#' } );
          insert_text(ael, rtext);
          ael.onclick = build_evhan_hyperlink(win.id, rlink);
          el.insert(ael);
        }
        divel.insert(el);
        divel.endswhite = regex_final_whitespace.test(rtext);
      }
    }

    /* Trim the scrollback. If there are more than max_buffer_length
       paragraphs, delete some. (It would be better to limit by
       character count, rather than paragraph count. But this is
       easier.) */
    var parals = win.frameel.childNodes;
    if (parals) {
      var totrim = parals.length - max_buffer_length;
      if (totrim > 0) {
        var ix, obj;
        win.topunseen -= parals[totrim].offsetTop;
        if (win.topunseen < 0)
          win.topunseen = 0;
        for (ix=0; ix<totrim; ix++) {
          obj = parals.item(0);
          if (obj)
            win.frameel.removeChild(obj);
        }
      }
    }

    /* Stick the invisible cursor-marker at the end. We use this to
       position the input box. */
    var divel = last_child_of(win.frameel);
    if (divel) {
      cursel = new Element('span',
        { id: 'win'+win.id+'_cursor', 'class': 'InvisibleCursor' } );
      insert_text(cursel, NBSP);
      divel.insert(cursel);

      if (win.inputel) {
        /* Put back the inputel that we found earlier. */
        var inputel = win.inputel;
        var pos = cursel.positionedOffset();
        /* This calculation is antsy. On Firefox, buffermarginx is too high
           (or getWidth() is too low) by the width of a scrollbar. On MSIE,
           buffermarginx is one pixel too low. We fudge for that, giving a
           result which errs on the low side. */
        var width = win.frameel.getWidth() - (current_metrics.buffermarginx + pos.left + 2);
        if (width < 1)
          width = 1;
        if (Prototype.Browser.Opera) {
          /* I swear I don't understand what Opera thinks absolute positioning
             means. We will avoid it. */
          inputel.setStyle({ position: 'relative',
            left: '0px', top: '0px', width: width+'px' });
          cursel.insert({ top:inputel });
        }
        else {
          inputel.setStyle({ position: 'absolute',
            left: '0px', top: '0px', width: width+'px' });
          cursel.insert(inputel);
        }
      }
    }
  }
}

/* Handle all necessary removal of input fields.

   A field needs to be removed if it is not listed in the input argument,
   *or* if it is listed with a later generation number than we remember.
   (The latter case means that input was cancelled and restarted.)
*/
function accept_inputcancel(arg) {
  var hasinput = new Hash();
  arg.map(function(argi) { 
    if (argi.type)
      hasinput.set(argi.id, argi); 
  });

  windowdic.values().each(function(win) {
    if (win.input) {
      var argi = hasinput.get(win.id);
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
  var hasinput = new Hash();
  var hashyperlink = new Hash();
  arg.map(function(argi) {
    if (argi.type)
      hasinput.set(argi.id, argi); 
    if (argi.hyperlink)
      hashyperlink.set(argi.id, true);
  });

  windowdic.values().each(function(win) {
    win.reqhyperlink = hashyperlink.get(win.id);

    var argi = hasinput.get(win.id);
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
      inputel = new Element('input',
        { id: 'win'+win.id+'_input',
          'class': classes, type: 'text', maxlength: maxlen });
      if (Prototype.Browser.MobileSafari)
        inputel.writeAttribute('autocapitalize', 'off');
      if (argi.type == 'line') {
        inputel.onkeypress = evhan_input_keypress;
        inputel.onkeydown = evhan_input_keydown;
        if (argi.initial)
          inputel.value = argi.initial;
        win.terminators = {};
        if (argi.terminators) {
          for (var ix=0; ix<argi.terminators.length; ix++) 
            win.terminators[argi.terminators[ix]] = true;
        }
      }
      else if (argi.type == 'char') {
        inputel.onkeypress = evhan_input_char_keypress;
        inputel.onkeydown = evhan_input_char_keydown;
      }
      /* Subtle point: the winid variable here is never reused, because we're
         inside a function being map()ed. Therefore, winid is safe to use in
         a closure. */
      var winid = win.id;
      inputel.onfocus = function() { evhan_input_focus(winid); };
      inputel.onblur = function() { evhan_input_blur(winid); };
      inputel.winid = win.id;
      win.inputel = inputel;
      win.historypos = win.history.length;
      win.needscroll = true;
    }

    if (win.type == 'grid') {
      var lineel = $('win'+win.id+'_ln'+argi.ypos);
      if (!lineel) {
        glkote_error('Window ' + win.id + ' has requested input at unknown line ' + argi.ypos + '.');
        return;
      }
      var pos = lineel.positionedOffset();
      var xpos = pos.left + Math.round(argi.xpos * current_metrics.gridcharwidth);
      var width = Math.round(maxlen * current_metrics.gridcharwidth);
      /* This calculation is antsy. See below. (But grid window line input
         is rare in IF.) */
      var maxwidth = win.frameel.getWidth() - (current_metrics.buffermarginx + xpos + 2);
      if (width > maxwidth)
        width = maxwidth;
      inputel.setStyle({ position: 'absolute',
        left: xpos+'px', top: pos.top+'px', width: width+'px' });
      win.frameel.insert(inputel);
    }

    if (win.type == 'buffer') {
      var cursel = $('win'+win.id+'_cursor');
      if (!cursel) {
        cursel = new Element('span',
          { id: 'win'+win.id+'_cursor', 'class': 'InvisibleCursor' } );
        insert_text(cursel, NBSP);
        win.frameel.insert(cursel);
      }
      var pos = cursel.positionedOffset();
      /* This calculation is antsy. On Firefox, buffermarginx is too high
         (or getWidth() is too low) by the width of a scrollbar. On MSIE,
         buffermarginx is one pixel too low. We fudge for that, giving a
         result which errs on the low side. */
      var width = win.frameel.getWidth() - (current_metrics.buffermarginx + pos.left + 2);
      if (width < 1)
        width = 1;
      if (Prototype.Browser.Opera) {
        /* I swear I don't understand what Opera thinks absolute positioning
           means. We will avoid it. */
        inputel.setStyle({ position: 'relative',
          left: '0px', top: '0px', width: width+'px' });
        cursel.insert({ top:inputel });
      }
      else {
        inputel.setStyle({ position: 'absolute',
          left: '0px', top: '0px', width: width+'px' });
        cursel.insert(inputel);
      }
    }
  });
}

/* Return the vertical offset (relative to the parent) of the top of the 
   last child of the parent.
*/
function last_line_top_offset(el) {
  var ls = el.childElements();
  if (ls.length == 0)
    return 0;
  return ls[ls.length-1].offsetTop;
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
    windowdic.values().each(function(win) {
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
      windowdic.values().each(function(win) {
          if (win.input) {
            if (!newinputwin || win.id == last_known_focus)
              newinputwin = win.id;
          }
        });
    }
    
    if (newinputwin) {
      var win = windowdic.get(newinputwin);
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

   Deliberately does not use any Prototype functionality, because this
   is called when Prototype couldn't be loaded.
*/
function glkote_error(msg) {
  var el = document.getElementById('errorcontent');
  remove_children(el);
  insert_text(el, msg);

  el = document.getElementById('errorpane');
  el.style.display = '';   /* el.show() */

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
  $('errorpane').hide();
}

/* Hide the loading pane (the spinny compass), if it hasn't already been
   hidden.

   Deliberately does not use any Prototype functionality.
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

   Deliberately does not use any Prototype functionality.
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

/* Add text to a DOM element.

   Deliberately does not use any Prototype functionality. One reason
   is that this is called in fatal errors, including the error of
   failing to find the Prototype library. Another reason, sadly, is that
   the Prototype library doesn't *have* a function to insert arbitrary
   text into an element.
*/
function insert_text(el, val) {
  var nod = document.createTextNode(val);
  el.appendChild(nod);
}

/* Remove all children from a DOM element.

   Deliberately does not use any Prototype functionality.
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
*/
function last_child_of(obj) {
  var ls = obj.childElements();
  if (!ls || !ls.length)
    return null;
  return ls[ls.length-1];
}

/* Debugging utility: return a string displaying all of an object's
   properties. */
function inspect_method() {
  var keys = Object.keys(this);
  keys.sort();
  var els = keys.map(function(key) {
      var val = this[key];
      if (val == inspect_method)
        val = '[...]';
      return key + ':' + val;
    }, this);
  return '{' + els.join(', ') + '}';
}

/* Debugging utility: return a string displaying all of an object's
   properties, recursively. (Do not call this on an object which references
   anything big!) */
function inspect_deep(res) {
  var keys = Object.keys(res);
  keys.sort();
  var els = keys.map(function(key) {
      var val = res[key];
      if (Object.isString(val))
        val = "'" + val + "'";
      else if (!Object.isNumber(val))
        val = inspect_deep(val);
      return key + ':' + val;
    }, res);
  return '{' + els.join(', ') + '}';
}

/* Add a line to the window's command history, and then submit it to
   the game. (This is a utility function used by various keyboard input
   handlers.)
*/
function submit_line_input(win, inputel, termkey) {
  var val = inputel.value;

  /* Store this input in the command history for this window, unless
     the input is blank or a duplicate. */
  if (val && val != win.history.last()) {
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
  if (disabled)
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
  else if (type == 'external') {
    res.value = val;
  }
  else if (type == 'init' || type == 'arrange') {
    res.metrics = val;
  }

  if (!(type == 'init' || type == 'refresh')) {
    windowdic.values().each(function(win) {
      var savepartial = (type != 'line' && type != 'char') 
                        || (win.id != winid);
      if (savepartial && win.input && win.input.type == 'line'
        && win.inputel && win.inputel.value) {
        var partial = res.partial;
        if (!partial) {
          partial = {};
          res.partial = partial;
        };
        partial[win.id] = win.inputel.value;
      }
    });
  }

  game_interface.accept(res);
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

  resize_timer = doc_resize_real.delay(0.5);
}

/* This executes when no new resize events have come along in the past
   0.5 seconds. (But if the UI is disabled, we delay again, because
   the game can't deal with events yet.)
   ### We really should distinguish between disabling the UI (delay
   resize events) from shutting down the UI (ignore resize events).
 */
function doc_resize_real() {
  resize_timer = null;

  if (disabled) {
    resize_timer = doc_resize_real.delay(0.5);
    return;
  }

  current_metrics = measure_window();
  send_response('arrange', null, current_metrics);
}

/* Event handler: keypress events on input fields.

   Move the input focus to whichever window most recently had it.
*/
function evhan_doc_keypress(ev) {
  if (disabled) {
    return;
  }

  var keycode = 0;
  if (Prototype.Browser.IE) { /* MSIE broken event API */
    ev = Event.extend(window.event);
    if (ev) keycode = ev.keyCode;
  }
  else {
    if (ev) keycode = ev.which;
  }

  if (ev.target.tagName.toUpperCase() == 'INPUT') {
    /* If the focus is already on an input field, don't mess with it. */
    return;
  }

  if (ev.altKey || ev.metaKey || ev.ctrlKey) {
    /* Don't mess with command key combinations. This is not a perfect
       test, since option-key combos are ordinary (accented) characters
       on Mac keyboards, but it's close enough. */
    return;
  }

  if (Prototype.Browser.Opera) {
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
    win = windowdic.get(last_known_paging);
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
      frameel.scrollTop = win.topunseen - current_metrics.buffercharheight;
      /* Compute the new topunseen value. */
      var frameheight = frameel.getHeight();
      var realbottom = last_line_top_offset(frameel);
      var newtopunseen = frameel.scrollTop + frameheight;
      if (newtopunseen > realbottom)
        newtopunseen = realbottom;
      if (win.topunseen < newtopunseen)
        win.topunseen = newtopunseen;
      if (win.needspaging) {
        /* The scroll-down might have cleared needspaging already. But 
           if not... */
        if (frameel.scrollTop + frameheight >= frameel.scrollHeight) {
          win.needspaging = false;
          var moreel = $('win'+win.id+'_moreprompt');
          if (moreel)
            moreel.remove();
          readjust_paging_focus(true);
        }
      }
      return;
    }
  }

  win = windowdic.get(last_known_focus);
  if (!win)
    return;
  if (!win.inputel)
    return;

  win.inputel.focus();

  if (win.input.type == 'line') {

    if (keycode == 13) {
      /* Grab the Return/Enter key here. This is the same thing we'd do if
         the input field handler caught it. */
      submit_line_input(win, win.inputel, null);
      /* Safari drops an extra newline into the input field unless we call
         preventDefault() here. I don't know why. */
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
        win.inputel.value = win.inputel.value + val;
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
    else if (keycode == Event.KEY_BACKSPACE)
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
function evhan_window_mousedown(ev, frameel) {
  if (!frameel.winid)
    return;
  var win = windowdic.get(frameel.winid);
  if (!win)
    return;

  if (win.inputel) {
    last_known_focus = win.id;
    if (Prototype.Browser.MobileSafari) {
      ev.stop();
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

/* Event handler: keydown events on input fields (character input)

   Detect the arrow keys, and a few other special keystrokes, for
   character input. We don't grab *all* keys here, because that would
   include modifier keys (shift, option, etc) -- we don't want to
   count those as character input.
*/
function evhan_input_char_keydown(ev) {
  var keycode = 0;
  if (!ev) { /* MSIE broken event API */
    ev = Event.extend(window.event);
  }
  if (ev) keycode = ev.keyCode;
  if (!keycode) return true;

  var res = null;

  /* We don't grab Return/Enter in this function, because Firefox lets
     it go through to the keypress handler (even if we try to block it),
     which results in a double input. */

  switch (keycode) {
    case Event.KEY_LEFT:
      res = 'left'; break;
    case Event.KEY_RIGHT:
      res = 'right'; break;
    case Event.KEY_UP:
      res = 'up'; break;
    case Event.KEY_DOWN:
      res = 'down'; break;
    case Event.KEY_BACKSPACE:
      res = 'delete'; break;
    case Event.KEY_ESC:
      res = 'escape'; break;
    case Event.KEY_TAB:
      res = 'tab'; break;
    case Event.KEY_PAGEUP:
      res = 'pageup'; break;
    case Event.KEY_PAGEDOWN:
      res = 'pagedown'; break;
    case Event.KEY_HOME:
      res = 'home'; break;
    case Event.KEY_END:
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
    if (!this.winid)
      return true;
    var win = windowdic.get(this.winid);
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
  if (!ev) { /* MSIE broken event API */
    ev = Event.extend(window.event);
    if (ev) keycode = ev.keyCode;
  }
  else {
    if (ev) keycode = ev.which;
  }
  if (!keycode) return false;

  if (keycode == 10 && Prototype.Browser.MobileSafari) {
    /* This case only occurs on old iPhones (iOS 3.1.3). */
    keycode = 13;
  }

  var res;
  if (keycode == 13)
    res = 'return';
  else
    res = String.fromCharCode(keycode);

  if (!this.winid)
    return true;
  var win = windowdic.get(this.winid);
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
  if (!ev) { /* MSIE broken event API */
    ev = Event.extend(window.event);
  }
  if (ev) keycode = ev.keyCode;
  if (!keycode) return true;

  if (keycode == Event.KEY_UP || keycode == Event.KEY_DOWN) {
    if (!this.winid)
      return true;
    var win = windowdic.get(this.winid);
    if (!win || !win.input)
      return true;

    if (keycode == Event.KEY_UP && win.historypos > 0) {
      win.historypos -= 1;
      if (win.historypos < win.history.length)
        this.value = win.history[win.historypos];
      else
        this.value = '';
    }

    if (keycode == Event.KEY_DOWN && win.historypos < win.history.length) {
      win.historypos += 1;
      if (win.historypos < win.history.length)
        this.value = win.history[win.historypos];
      else
        this.value = '';
    }

    return false;
  }
  else if (terminator_key_values[keycode]) {
    if (!this.winid)
      return true;
    var win = windowdic.get(this.winid);
    if (!win || !win.input)
      return true;

    if (win.terminators[terminator_key_values[keycode]]) {
      /* This key is listed as a current terminator for this window,
         so we'll submit the line of input. */
      submit_line_input(win, win.inputel, terminator_key_values[keycode]);
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
  if (!ev) { /* MSIE broken event API */
    ev = Event.extend(window.event);
    if (ev) keycode = ev.keyCode;
  }
  else {
    if (ev) keycode = ev.which;
  }
  if (!keycode) return true;

  if (keycode == 10 && Prototype.Browser.MobileSafari) {
    /* This case only occurs on old iPhones (iOS 3.1.3). */
    keycode = 13;
  }

  if (keycode == 13) {
    if (!this.winid)
      return true;
    var win = windowdic.get(this.winid);
    if (!win || !win.input)
      return true;

    submit_line_input(win, this, null);
    return false;
  }

  return true;
}

/* Event handler: focus events on input fields

   Notice that the focus has switched to a line/char input field.
*/
function evhan_input_focus(winid) {
  var win = windowdic.get(winid);
  if (!win)
    return;

  currently_focussed = true;
  last_known_focus = winid;
  last_known_paging = winid;
}

/* Event handler: blur events on input fields

   Notice that the focus has switched away from a line/char input field.
*/
function evhan_input_blur(winid) {
  var win = windowdic.get(winid);
  if (!win)
    return;

  currently_focussed = false;
}

function evhan_window_scroll(frameel) {
  if (!frameel.winid)
    return;
  var win = windowdic.get(frameel.winid);
  if (!win)
    return;

  if (!win.needspaging)
    return;

  var frameheight = frameel.getHeight();
  var realbottom = last_line_top_offset(frameel);
  var newtopunseen = frameel.scrollTop + frameheight;
  if (newtopunseen > realbottom)
    newtopunseen = realbottom;
  if (win.topunseen < newtopunseen)
    win.topunseen = newtopunseen;

  if (frameel.scrollTop + frameheight >= frameel.scrollHeight) {
    win.needspaging = false;
    var moreel = $('win'+win.id+'_moreprompt');
    if (moreel)
      moreel.remove();
    readjust_paging_focus(true);
    return;
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
    var win = windowdic.get(winid);
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
  version:  '1.2.2',
  init:     glkote_init, 
  update:   glkote_update,
  extevent: glkote_extevent,
  getinterface: glkote_get_interface,
  log:      glkote_log,
  error:    glkote_error
};

}();

/* End of GlkOte library. */
