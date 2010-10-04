/*!
 * Parchment Z-Machine UI and Runner
 * Built: BUILDDATE
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function($){

parchment.lib.ZUI = Object.subClass({
	// Initiate this ZUI
	init: function( library, engine, logfunc )
	{
		var self = this,
		
		widthInChars = ( gIsIphone && $( document.body ).width() <= 480 ) ? 38 : 80;
		
		// Set up the HTML we need
		library.container.html( '<div id="top-window" class="buffered-window"></div><div id="buffered-windows"></div><div id="content" role="log"></div><div id="bottom"></div>' );
		
		// Defaults
		$.extend( self, {
			_size: [widthInChars, 25],
			_console: null,
			_activeWindow: 0,
			_currentCallback: null,
			_foreground: "default",
			_background: "default",
			_reverseVideo: false,
			_lastSeenY: 0,
			_currStyles: ['z-roman'],
			_expectedHash: window.location.hash,
			_isFixedWidth: false,
			_bufferMode: 0,
			
			library: library,
			engine: engine,
			
			hidden_load_indicator: 0,
			
			bottom: $("#bottom"),
			current_input: $("#current-input"),
			text_input: new parchment.lib.TextInput( '#parchment', '#content' ),
			
			_log: logfunc || $.noop,
			
			_windowHashCheck: function()
			{
				if ( window.location.hash != self._expectedHash )
				{
					self._restart();
				}
			}
		});

		self._setFixedPitchSizes();

		$("#top-window").css({width: self._pixelWidth + "px",
		lineHeight: self._pixelLineHeight + "px"});
		$("#content").css({width: self._pixelWidth + "px"});

		self._windowResize();
		self._bindEventHandlers();
		self._eraseBottomWindow();
	},

	    onConsoleRender: function() {
	      var height = $("#top-window").height();
	      $("#content").css({padding: "" + height + "px 0 0 0"});
	    },

	    _finalize: function() {
	    	var self = this;
	      if (self._console) {
	        self._console.close();
	        self._console = null;
	      }
	      //$("#content").empty();
	      self.onPrint("\n[ The game has finished. ]")
	      self._unbindEventHandlers();
	    },

		_bindEventHandlers: function() {
			var self = this;
			$(window).resize(self._windowResize);
			 self._intervalId = window.setInterval(self._windowHashCheck, 1000);
		},

		_unbindEventHandlers: function() {
			var self = this;
			$(window).unbind("resize", self._windowResize);
			window.clearInterval(self._intervalId);
			
			this.text_input.die();
			},

	    _windowResize: function() {
	      var contentLeft = $("#content").offset().left + "px";
	      $(".buffered-window").css({left: contentLeft});
	    },

	    _removeBufferedWindows: function() {
	      var windows = $("#buffered-windows > .buffered-window");
	      windows.fadeOut("slow", function() { windows.remove(); });
        // Hide load indicator
        if ( !this.hidden_load_indicator )
        {
          this.hidden_load_indicator = 1;
          this.library.load_indicator.detach();
        }
	      // A more conservative alternative to the above is:
	      // $("#buffered-windows").empty();
	    },

	    _eraseBottomWindow: function() {
	      $("#content").empty();
	      this._lastSeenY = 0;
	    },

	    _restart: function() {
	      this._finalize();
	      location.reload();
	    },

	    setVersion: function(version) {
	      this._version = version;
	    },

	    getSize: function() {
	      return this._size;
	    },

	    onLineInput: function(callback) {
	    	var self = this;
    	  if ( self.engine.m_version <= 3 ) { // Redraw status line automatically in V1-V3
    	    var oldwin = self._activeWindow;
	        var oldrev = self._reverseVideo;
	        if (!self._console)
	          self.onSplitWindow(1);
	        self._console.moveTo(0,0);
	        self._activeWindow = 1;
	        self._reverseVideo = true;
	        self.onPrint( self.engine.getStatusLine(self._console.width) );
	        self._reverseVideo = oldrev;
	        self._activeWindow = oldwin;
          }
          
          // Hide load indicator
          if ( !self.hidden_load_indicator )
          {
          	self.hidden_load_indicator = 1;
          	self.library.load_indicator.detach();
          }
          
   	      self._currentCallback = callback;
	      /*$("#content").append(
	        '<span id="current-input"><span id="cursor">_</span></span>'
	      );
	      self.current_input = $("#current-input");
	      self.current_input.attr("class", self._calcFinalStyles());*/
	      self.text_input.getLine( callback, self._calcFinalStyles() );
	    },

	    onCharacterInput: function(callback) {
	    	var self = this;
	      self._currentCallback = callback;
	      
	      // Hide load indicator
          if ( !self.hidden_load_indicator )
          {
          	self.hidden_load_indicator = 1;
          	self.library.load_indicator.detach();
          }
          
	      self.text_input.getChar( callback );
	    },

    onSave: function(data) {
      // TODO: Attempt to use other forms of local storage
      // (e.g. Google Gears, HTML 5 database storage, etc) if
      // available; if none are available, we should return false.
      var self = this,

      saveKey = this.library.url + '_saveData',
      b64data = file.base64_encode(data);

      if (window.globalStorage && location.href.slice(0, 5) != 'file:')
        window.globalStorage[location.hostname][saveKey] = b64data;
        
      // Something very strange happens with local files on windows... perhaps it's because the url has the drive letter?
	  // Anyway, we have to make our own location string
	  location = location.protocol + '//' + location.host + location.pathname + location.search + '#' + b64data;
      self._expectedHash = location.hash;
      
			self.onPrint("Your game has been saved to the URL. You may want " +
				"to bookmark this page now; just reload it at any " +
                   "time to restore your game from this point.\n");
			return true;
		},

onRestore: function()
{
	// TODO: Attempt to use other forms of local storage if
	// available; if none are available, we should return null.

	var b64data = null;

	if (location.hash)
		b64data = location.hash.slice(1);

	if (!b64data && window.globalStorage)
	{
		var saveData = globalStorage[location.hostname][this.library.url + '_saveData'];
		if (saveData)
		{
			b64data = saveData.value;
			// See comment above in onSave
			location = location.protocol + '//' + location.host + location.pathname + location.search + '#' + b64data;
			this._expectedHash = location.hash;
		}
	}

	if (b64data)
		return file.base64_decode(b64data);
	else
		return null;
},

	    onQuit: function() {
	      this._finalize();
	    },

	    onRestart: function() {
			var self = this;
			self._finalize();

			// TODO: It's not high-priority, but according to the Z-Machine
			// spec documentation for the restart opcode, we need to
			// preserve the "transcribing to printer" bit and the "use
			// fixed-pitch font" bit when restarting.

			window.location.hash = "";
			self._restart();
	    },

	    onWimpOut: function(callback) {
	      window.setTimeout(callback, 50);
	    },

	    onFlagsChanged: function(isToTranscript, isFixedWidth) {
	      if (isToTranscript)
	        // TODO: Deal with isToTranscript.
	        throw new FatalError("To transcript not yet implemented!");
	      this._isFixedWidth = isFixedWidth;
	    },

	    onSetStyle: function(textStyle, foreground, background) {
	      switch (textStyle) {
	      case -1:
	        // Don't set the style.
	        break;
	      case 0:
	        this._currStyles = ["z-roman"];
	        this._reverseVideo = false;
	        break;
	      case 1:
	        this._reverseVideo = true;
	        break;
	      case 2:
	        this._currStyles.push("z-bold");
	        break;
	      case 4:
	        this._currStyles.push("z-italic");
	        break;
	      case 8:
	        this._currStyles.push("z-fixed-pitch");
	        break;
	      default:
	        throw new FatalError("Unknown style: " + textStyle);
	      }

	      var colorTable = {0: null,
	                        1: "default",
	                        2: "black",
	                        3: "red",
	                        4: "green",
	                        5: "yellow",
	                        6: "blue",
	                        7: "magenta",
	                        8: "cyan",
	                        9: "white"};

	      if (colorTable[foreground])
	        this._foreground = colorTable[foreground];
	      if (colorTable[background])
	        this._background = colorTable[background];
	    },

	    onSetWindow: function(window) {
	    	var self = this;
	      if (window == 1) {
	        // The following isn't outlined in the Z-Spec, but Fredrik
	        // Ramsberg's "Aventyr" sets the top window shortly after
	        // collapsing its height to 0 (via erasing window -1); so
	        // we'll implicitly create a top window with height 1 now.
	        // See issue 33 for more information:
	        // http://code.google.com/p/parchment/issues/detail?id=33
	        if (!self._console)
	          self.onSplitWindow(1);
	        // From the Z-Spec, section 8.7.2.
	        self._console.moveTo(0, 0);
	      }
	      self._activeWindow = window;
	    },

	    onEraseWindow: function(window) {
	    	var self = this;
	      // Set the background color.
	      document.body.className = "bg-" + self._background;

	      if (window == -2) {
	        self._console.clear();
	        self._eraseBottomWindow();
	      } else if (window == -1) {
	        // From the Z-Spec, section 8.7.3.3.
	        self.onSplitWindow(0);

	        // TODO: Depending on the Z-Machine version, we want
	        // to move the cursor to the bottom-left or top-left.
	        self._eraseBottomWindow();
	      } else if (window == 0) {
	        self._eraseBottomWindow();
	      } else if (window == 1 && self._console) {
	        self._console.clear();
	      }
	    },

	    onSetCursor: function(x, y) {
	    	var self = this;
	      if (self._console)
	        self._console.moveTo(x - 1, y - 1);
	    },

	    onSetBufferMode: function(flag) {
	      // The way that stories use this instruction is odd; it seems to
	      // be set just after a quotation meant to overlay the current
	      // text is displayed, just before a split-window instruction.
	      // Based on this, we'll set a flag, and if it's set when we're
	      // asked to split the window, we'll leave an "imprint" of what
	      // was drawn there until the user presses a key, at which point
	      // it'll fade away.
	      this._bufferMode = flag;
	    },

	    onSplitWindow: function(numlines) {
	    	var self = this;
	      if (numlines == 0) {
	        if (self._console) {
	          self._console.close();
	          self._console = null;
	        }
	      } else {
	        if (!self._console || self._version == 3 ||
	            !self._bufferMode) {
	          self._console = new Console(self._size[0],
	                                      numlines,
	                                      $("#top-window").get(0),
	                                      self);
	        } else if (self._console.height != numlines) {
	          // Z-Machine games are peculiar in regards to the way they
	          // sometimes overlay quotations on top of the current text;
	          // we basically want to preserve any text that is already in
	          // the top window "below" the layer of the top window, so
	          // that anything it doesn't write over remains visible, at
	          // least (and this is an arbitrary decision on our part)
	          // until the user has entered some input.

	          var newDiv = document.createElement("div");
	          newDiv.className = "buffered-window";
	          newDiv.innerHTML = self._console.renderHtml();
	          $(newDiv).css({width: self._pixelWidth + "px",
	                         lineHeight: self._pixelLineHeight + "px"});
	          $("#buffered-windows").append(newDiv);

	          // Pretend the window was just resized, which will position
	          // the new buffered window properly on the x-axis.
	          self._windowResize();

	          self._console.resize(numlines);
	        }
	      }
	      self._bufferMode = 0;
	    },

	    _calcFinalStyles: function() {
	    	var self = this,
	    	fg = self._foreground,
	    	bg = self._background;

	      if (self._reverseVideo) {
	        fg = self._background;
	        bg = self._foreground;
	        if (fg == "default")
	          fg = "default-reversed";
	        if (bg == "default")
	          bg = "default-reversed";
	      }

	      var colors = ["fg-" + fg, "bg-" + bg];

	      // TODO: Also test to see if we don't already have z-fixed-pitch
	      // in self._currStyles, without using Array.indexOf(), which
	      // doesn't seem to be part of MS JScript.
	      if (self._isFixedWidth)
	        colors.push("z-fixed-pitch");

	      return colors.concat(self._currStyles).join(" ");
	    },

	    onPrint: function(output) {
	    	var self = this,
	    	styles = self._calcFinalStyles();

	      self._log("print wind: " + self._activeWindow + " output: " +
	                output.quote() + " style: " + styles);

	      if (self._activeWindow == 0) {
	        var lines = output.split("\n");
	        for (var i = 0; i < lines.length; i++) {

	          if (lines[i]) {
	            var chunk = lines[i].entityify();

	            // TODO: This isn't an ideal solution for having breaking
	            // whitespace while preserving its structure, but it
	            // deals with the most common case.
	            var singleSpace = / /g, singleSpaceBetweenWords = /(\S) (\S)/g, backToSpace = /<&>/g;
	            chunk = chunk.replace(
	              singleSpaceBetweenWords,
	              "$1<&>$2"
	            );
	            chunk = chunk.replace(singleSpace, '&nbsp;');
	            chunk = chunk.replace(
	              backToSpace,
	              "<span class=\"z-breaking-whitespace\"> </span>"
	            );

	            chunk = '<span class="' + styles + '">' + chunk + '</span>';
	            $("#content").append(chunk);
	          }

	          if (i < lines.length - 1)
	            $("#content").append("<br/>");
	        }
	      } else {
	        self._console.write(output, styles);
	      }
	    },

	    onPrintTable: function(lines) {
	      // TODO: Not sure if we should be appending newlines to
	      // these lines or not, or setting the current text style
	      // to monospace if we're displaying in the bottom window.
	      for (var i = 0; i < lines.length; i++)
	        this.onPrint(lines[i]);
	    },

	    _setFixedPitchSizes: function() {
	    	var self = this,
	    	row = document.createElement("div");
	      row.className = "buffered-window";
	      for (var i = 0; i < self._size[0]; i++)
	        row.innerHTML += "O";

	      // We have to wrap the text in a span to get an accurate line
	      // height value, for some reason...
	      row.innerHTML = "<span>" + row.innerHTML + "</span>";

	      $("#buffered-windows").append(row);
	      self._pixelWidth = $(row).width();
	      if(jQuery.browser.msie &&
	         (jQuery.browser.version.length == 1 || jQuery.browser.version.charAt(1)=='.') &&
	         jQuery.browser.version < '7') {
	      	// For MSIE versions < 7, the pixelwidth is set to the entire window width.
	      	// Instead, we estimate the needed width using the font size
	        var fwidth = -1, fsize = document.getElementById('top-window').currentStyle['fontSize'].toLowerCase();
	        if(fsize.substring(fsize.length - 2)=='px')
	          fwidth = 0.6 * parseInt(fsize);
	        else if(fsize.substring(fsize.length - 2)=='pt')
	          fwidth = 0.8 * parseInt(fsize);
	        if(fwidth > 0)
	          self._pixelWidth = self._size[0] * fwidth;
	      }
	      self._pixelLineHeight = $(row.firstChild).height();
	      $("#buffered-windows").empty();
	    }
});

})(jQuery);
