/*

Parchment
=========

Built: 2014-04-21

Copyright (c) 2008-2014 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

/*

Simple JavaScript Inheritance
=============================

By John Resig
Released into the public domain?
http://ejohn.org/blog/simple-javascript-inheritance/

Changes from Dannii: support toString in IE8

*/
(function(){'use strict';

var initializing = 0;

// Determine if functions can be serialized
var fnTest = /xyz/.test( function() { xyz; } ) ? /\b_super\b/ : /.*/;

// Check whether for in will iterate toString
var iterate_toString, name;
for ( name in { toString: 1 } ) { iterate_toString = 1; }

// Create a new Class that inherits from this class
Object.subClass = function( prop )
{
	var _super = this.prototype,
	proto,
	name,
	Class;
	var prop_toString = !/native code/.test( '' + prop.toString ) && prop.toString;
	
	// Make the magical _super() function work
	var make_super = function( name, fn )
	{
		return function()
		{
			var tmp = this._super,
			ret;

			// Add a new ._super() method that is the same method
			// but on the super-class
			this._super = _super[name];

			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			ret = fn.apply( this, arguments );       
			this._super = tmp;

			return ret;
		};
	};
	
	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = 1;
	proto = new this;
	initializing = 0;

	// Copy the properties over onto the new prototype
	for ( name in prop )
	{
		// Check if we're overwriting an existing function
		proto[name] = typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test( prop[name] )
		? make_super( name, prop[name] ) : prop[name];
	}
	// Handle toString in IE8
	if ( !iterate_toString && prop_toString )
	{
		proto.toString = fnTest.test( prop_toString ) ? make_super( 'toString', prop_toString ) : prop_toString;
	}

	// The dummy class constructor
	Class = proto.init ? function()
	{
		// All construction is actually done in the init method
		if ( !initializing )
		{
			this.init.apply( this, arguments );
		}
	} : function(){};

	// Populate our constructed prototype object
	Class.prototype = proto;

	// Enforce the constructor to be what we expect
	Class.constructor = Class;

	// And make this class extendable
	Class.subClass = Object.subClass;

	return Class;
};

window.Class = Object;

})();
/*

Interchange File Format library
===============================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/
(function(){

// Get a 32 bit number from a byte array, and vice versa
function num_from(s, offset)
{
	return s[offset] << 24 | s[offset + 1] << 16 | s[offset + 2] << 8 | s[offset + 3];
}

function num_to_word(n)
{
	return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

// Get a 4 byte string ID from a byte array, and vice versa
function text_from(s, offset)
{
	return String.fromCharCode( s[offset], s[offset + 1], s[offset + 2], s[offset + 3] );
}

function text_to_word(t)
{
	return [t.charCodeAt(0), t.charCodeAt(1), t.charCodeAt(2), t.charCodeAt(3)];
}

// IFF file class
// Parses an IFF file stored in a byte array
var IFF = Object.subClass({
	// Parse a byte array or construct an empty IFF file
	init: function parse_iff(data)
	{
		this.type = '';
		this.chunks = [];
		if (data)
		{
			// Check this is an IFF file
			if (text_from(data, 0) != 'FORM')
				throw new Error("Not an IFF file");

			// Parse the file
			this.type = text_from(data, 8);

			var i = 12, l = data.length;
			while (i < l)
			{
				var chunk_length = num_from(data, i + 4);
				if (chunk_length < 0 || (chunk_length + i) > l)
					// FIXME: do something sensible here
					throw new Error("IFF: Chunk out of range");

				this.chunks.push({
					type: text_from(data, i),
					offset: i,
					data: data.slice(i + 8, i + 8 + chunk_length)
				});

				i += 8 + chunk_length;
				if (chunk_length % 2) i++;
			}
		}
	},

	// Write out the IFF into a byte array
	write: function write_iff()
	{
		// Start with the IFF type
		var out = text_to_word(this.type);

		// Go through the chunks and write them out
		for (var i = 0, l = this.chunks.length; i < l; i++)
		{
			var chunk = this.chunks[i], data = chunk.data, len = data.length;
			out = out.concat(text_to_word(chunk.type), num_to_word(len), data);
			if (len % 2)
				out.push(0);
		}

		// Add the header and return
		return text_to_word('FORM').concat(num_to_word(out.length), out);
	}
});

// Expose the class and helper functions
IFF.num_from = num_from;
IFF.num_to_word = num_to_word;
IFF.text_from = text_from;
IFF.text_to_word = text_to_word;
window.IFF = IFF;

})();

/*

StructIO intro
==============

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Calculate bodylineheight with the rest of the metrics?

*/

(function( window, $, undefined ){

;;; })();

var extend = function( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
},

rBadBackground = /inh|tra|(\d+, ?){3}0/,

$window = $( window ),
$doc = $( document ),
$body,
bodylineheight;

$(function()
{
	$body = $( 'body' );
	
	// Calculate the body line-height
	var elem = $( '<span>&nbsp;</span>' ).appendTo( $body );
	bodylineheight = elem.height();
	elem.remove();
});

extend( $.cssHooks, {

	// Hooks for messing around with background colours
	bgcolor: {
		// Get the resolved colour - no inherits or transparents allowed!
		get: function( elem )
		{
			var $elem = $( elem ),
			background = $elem.css( 'background-color' );
			// Getting the current background colour is hard: go through the parent elements until one with a real colour is found
			if ( rBadBackground.test( background ) )
			{
				return $elem.parent().css( 'bgcolor' );
			}
			return background;
		},
		// Set the background colour of all elements up the tree until one is found with a proper colour
		set: function( elem, value )
		{
			var $elem = $( elem ),
			parent = $elem.parent();
			$elem.css( 'background-color', value );
			// Recurse up the tree
			if ( rBadBackground.test( parent.css( 'background-color' ) ) )
			{
				parent.css( 'bgcolor', value );
			}
		}
	}

});
/*

Text Input
==========

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Add labels to prompts for screen readers?
	Is an input actually needed for char input? Just listen on the doc?
		-> mobiles might need one.
	Page up/down doesn't work in Chrome
	Support input when some is given already
	Adjust styles so that the padding belongs to the input and the window scrolls all the way to the bottom when focused
	Cache @window.height - let StructIO update it for us

*/

// window.scrollByPages() compatibility
var scrollPages = window.scrollByPages || function( pages )
{
	// From Mozilla's nsGfxScrollFrame.cpp
	// delta = viewportHeight - Min( 10%, lineHeight * 2 )
	var height = document.documentElement.clientHeight,
	delta = height - Math.min( height / 10, bodylineheight * 2 );
	scrollBy( 0, delta * pages );
},

// getSelection compatibility-ish. We only care about the text value of a selection
selection = window.getSelection ||
	function() { return document.selection ? document.selection.createRange().text : '' },

// A generic text input class
// Will handle both line and character input
TextInput = Object.subClass({
	// Set up the text inputs with a container
	// container is the greatest domain for which this instance should control input
	init: function( container )
	{
		var self = this,
		
		// The input element
		input = $( '<input>', {
			'class': 'TextInput',
			autocapitalize: 'off',
			keydown: function( event )
			{
				var keyCode = self.keyCode = event.which,
				cancel;
				
				if ( self.mode != 'line' )
				{
					return;
				}
				
				// Check for up/down to use the command history
				if ( keyCode == 38 ) // up -> prev
				{
					self.prev_next( 1 );
					cancel = 1;
				}
				if ( keyCode == 40 ) // down -> next
				{
					self.prev_next( -1 );
					cancel = 1;
				}
				
				// Trigger page up/down on the body
				if ( keyCode == 33 ) // Up
				{
					scrollPages(-1);
					cancel = 1;
				}
				if ( keyCode == 34 ) // Down
				{
					scrollPages(1);
					cancel = 1;
				}
				
				// Accept line input
				if ( keyCode == 13 )
				{
					self.submitLine();
					cancel = 1;
				}
				
				// Don't propagate the event
				event.stopPropagation();
				
				// Don't do the default browser action
				// (For example in Mac OS pressing up will force the cursor to the beginning of a line)
				if ( cancel )
				{
					return false;
				}
			},
			// Submit a character input event
			keypress: function( event )
			{
				if ( self.mode == 'char' )
				{
					self.charCode = event.which;
					self.submitChar();
					return false;
				}
			},
			// Backup for browsers like Chrome which don't send keypress events for non-characters
			keyup: function()
			{
				if ( self.mode == 'char' )
				{
					self.submitChar();
				}
			}
		});
		
		// A marker for the last input
		self.lastinput = $( '<span class="lastinput"/>' )
			.appendTo( container );
		
		// Focus document clicks and keydowns
		$doc.on( 'click.TextInput keydown.TextInput', function( ev )
		{
			// Only intercept on things that aren't inputs and if the user isn't selecting text
			if ( ev.target.nodeName != 'INPUT' && selection() == '' )
			{
				// If the input box is close to the viewport then focus it
				if ( $window.scrollTop() + $window.height() - input.offset().top > -60 )
				{
					window.scrollTo( 0, 9e9 );
					// Manually reset the target incase focus/trigger don't - we don't want the trigger to recurse
					ev.target = input[0];
					input.focus()
						.trigger( ev );
					// Stop propagating after re-triggering it, so that the trigger will work for all keys
					ev.stopPropagation();
				}
				// Intercept the backspace key if not
				else if ( ev.type == 'keydown' && ev.which == 8 )
				{
					return false;
				}
			}
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .get()
		
		self.input = input;
		
		self.container = container;
		self.statuswin = $( '<div>' );
		
		// Find the element which we calculate scroll offsets from
		// For now just decide by browser
		self.scrollParent = /webkit/i.test( navigator.userAgent ) ? $body : $( 'html' );
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		$doc.off( '.TextInput' );
	},
	
	// Scroll to the beginning of the last set of output
	scroll: function()
	{
		this.scrollParent.scrollTop(
			// The last input relative to the top of the document
			this.lastinput.offset().top
			// Minus the height of the top window
			- this.statuswin.height()
			// Minus one further line
			- bodylineheight
		);
	},
	
	// Get some input
	getLine: function( order )
	{
		var laststruct = order.target.children().last(),
		input = this.input,
		prompt;
		
		this.order = order;
		this.mode = 'line';
		
		// Set up the mutable history
		this.current = 0;
		this.mutable_history = this.history.slice();
		this.mutable_history.unshift( '' );
		
		// Extract the prompt
		prompt = /^([\s\S]+<br>)(.+?)$/.exec( laststruct.html() );
		if ( prompt )
		{
			laststruct.html( prompt[1] );
			prompt = laststruct.clone()
				.html( prompt[2] )
				.appendTo( laststruct );
		}
		else
		{
			prompt = laststruct;
		}
		
		// Adjust the input's width and ensure it's empty
		input
			.width( 20 )
			.val( '' )
			.appendTo( prompt )
			.width( order.target.offset().left + order.target.width() - input.offset().left );
		
		this.scroll();
	},
	
	// Submit the input data
	submitLine: function()
	{
		var command = this.input.val();
		
		// Attach the last input marker
		this.lastinput.appendTo( this.input.parent() );
		
		// Hide the <input>
		this.input.detach();
		
		// Add this command to the history, as long as it's not the same as the last, and not blank
		if ( command != this.history[0] && /\S/.test( command ) )
		{
			this.history.unshift( command );
		}
		
		// Trigger a custom event for anyone listening in for commands
		$doc.trigger({
			type: 'TextInput',
			mode: 'line',
			input: command
		});
		
		this.mode = 0;
		this.order.response = command;
		this.order.terminator = 13;
		this.callback( this.order );
	},
	
	// Get the previous/next command from history
	// change = 1 for previous and -1 for next
	prev_next: function( change )
	{
		var input = this.input,
		mutable_history = this.mutable_history,
		current = this.current,
		new_current = current + change;
		
		// Check it's within range
		if ( new_current < mutable_history.length && new_current >= 0 )
		{
			mutable_history[current] = input.val();
			input.val( mutable_history[new_current] );
			this.current = new_current;
		}
	},
	
	// Get some input
	getChar: function( order )
	{
		this.order = order;
		this.mode = 'char';
		
		this.keyCode = this.charCode = 0;
		
		// Add the <input>
		this.input.addClass( 'CharInput' )
			.appendTo( this.container );
		
		this.scroll();
	},
	
	// Submit the input data
	submitChar: function()
	{
		var keyCode = this.keyCode,
		charCode = this.charCode,
		input = {
			keyCode: keyCode,
			charCode: charCode
		};
		
		// Do we have anything to submit?
		if ( !keyCode && !charCode )
		{
			return;
		}
		
		// Hide the <input>
		this.input.detach()
			.removeClass( 'CharInput' );
		
		// Trigger a custom event for anyone listening in for key strokes
		$doc.trigger({
			type: 'TextInput',
			mode: 'char',
			input: input
		});
		
		this.mode = 0;
		this.order.response = input;
		this.callback( this.order );
	}
});
/*

Text grid (ie, status) windows
==============================

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Check cursor column is correct?

*/

var TextGrid = Object.subClass({
	// Set up the class, and attach a stream handler
	init: function( elem, io )
	{
		var self = this;
		this.elem = elem
			.addClass( 'TextGrid' )
			.on( 'stream', function( e )
			{
				self.stream( e.order.data );
				return false;
			})
			.css( 'bgcolor', 'inherit' );
		this.lineheight = io.env.charheight;
		this.io = io;
		io.TextInput.statuswin = this.elem;
		this.lines = [];
		this.styles = [];
		this.cursor = [0, 0]; // row, col
	},
	
	// Accept a stream of text grid orders
	stream: function( orders )
	{
		var order, code, i, j,
		elem = this.elem,
		row = this.cursor[0],
		col = this.cursor[1],
		lines = this.lines,
		styles = this.styles,
		env = this.io.env,
		line, text, temp,
		stylecode,
		oldheight = lines.length;
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Adjust the height of the grid
			if ( code == 'height' )
			{
				// Increase the height
				while ( order.lines > lines.length )
				{
					this.addline();
				}
				
				// Decrease the height, and handle box quotations
				if ( order.lines < lines.length )
				{
					if ( order.lines != 0 )
					{
						// Fix bad heights (that would split a multi-line status) by increasing the requested height to the first blank line
						while ( order.lines < lines.length && /\S/.test( lines[order.lines].join( '' ) ) )
						{
							order.lines++;
						}
					
						// Add the floating box
						temp = $( '<div>' )
							.addClass( 'box' )
							.prependTo( this.io.target );
						// Position it where it would have been if it was part of the grid
						// Scroll to the bottom just in case
						window.scrollTo( 0, 9e9 );
						temp.css({
							top: $window.scrollTop() + this.lineheight * order.lines,
							// Account for .main's added 1px padding
							left: temp.offset().left - 1
						});
						// Fill it with the lines we'll be removing
						this.write( temp, lines.slice( order.lines ), styles.slice( order.lines ) );
					}
				
					lines.length = order.lines;
					styles.length = order.lines;
					if ( row > order.lines - 1 )
					{
						row = 0;
						col = 0;
					}
				}
			}
			
			// Empty the grid, but don't change it's size
			if ( code == 'clear' )
			{
				j = 0;
				while ( j < lines.length )
				{
					this.addline( j++ );
				}
				row = 0;
				col = 0;
			}
			
			// Set the cursor position
			// Not that our coordinates are -1 compared to the Z-Machine
			if ( code == 'cursor' )
			{
				row = order.to[0];
				col = order.to[1];
				
				// It is illegal to position the cursor outside the window, but some games do (ex, Lost Pig's Hints)
				if ( row < 0 )
				{
					row = 0;
				}
				if ( col < 0 )
				{
					col = 0;
				}
				
				// Add a row(s) if needed
				while ( row >= lines.length )
				{
					this.addline();
				}
			}
			
			if ( code == 'get_cursor' )
			{
				order.pos = [row, col];
				this.io.input( order );
			}
			
			// Add text to the grid
			if ( code == 'stream' )
			{
				// Add a row(s) if needed
				while ( row >= lines.length )
				{
					this.addline();
				}
				
				// Calculate the style attribute for this set of text
				stylecode = '';
				if ( order.props )
				{
					temp = $( '<tt>', order.props )
						.appendTo( elem );
					
					text = temp.attr( 'style' );
					if ( text )
					{
						stylecode += ' style="' + text + '"';
					}
					text = temp.attr( 'class' );
					if ( text )
					{
						stylecode += ' class="' + text + '"';
					}
				}
				if ( stylecode === '' )
				{
					stylecode = undefined;
				}
				// The <tt> will be removed in .write()
				
				// Add the text to the arrays
				text = order.text;
				j = 0;
				while ( j < text.length )
				{
					temp = text.charAt( j++ );
					// Regular character
					if ( temp != '\r' )
					{
						lines[row][col] = temp;
						styles[row][col++] = stylecode;
					}
					// New line, or end of a line
					if ( temp == '\r' || col == env.width )
					{
						row++;
						col = 0;
						
						// Add a row if needed, ie. we must still have text to go
						if ( row >= lines.length && j < text.length )
						{
							this.addline();
						}
					}
				}
			}
			
			if ( code == 'eraseline' )
			{
				for ( j = col; j < env.width; j++ )
				{
					lines[row][j] = ' ';
					styles[row][j] = undefined;
				}
			}
		}
		
		// Update the cursor
		this.cursor = [row, col];
		
		// Update the HTML
		this.write( elem, lines, styles );
		
		// Try to adjust the main window's padding - for now guess what the window's class is
		if ( lines.length != oldheight )
		{
			$( '.main' )
				.css( 'padding-top', elem.height() );
		}
	},
	
	// Update the HTML
	write: function( elem, lines, styles )
	{
		var result = '',
		i = 0, j,
		text,
		style;
		
		// Go through the lines and styles array, constructing a <tt> whenever the styles change
		while ( i < lines.length )
		{
			text = '';
			style = styles[i][0];
			for ( j = 0; j < lines[i].length; j++ )
			{
				if ( styles[i][j] == style )
				{
					text += lines[i][j];
				}
				else
				{
					result += '<tt' + ( style || '' ) + '>' + text + '</tt>';
					style = styles[i][j];
					text = lines[i][j];
				}
			}
			result += '<tt' + ( style || '' ) + '>' + text + '</tt>';
			if ( ++i < lines.length )
			{
				result += '<br>';
			}
		}
		elem.html( result );
	},
	
	// Add a blank line
	addline: function( row )
	{
		var width = this.io.env.width,
		line = [],
		i = 0;
		row = row || this.lines.length;
		while ( i++ < width )
		{
			line.push( ' ' );
		}
		this.lines[row] = line;
		this.styles[row] = Array( width );
	}
});
/*

StructIO
========

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Timed input
	input terminators
	Listen for the window being resized to smaller than the current width
	Allow the window to be drag-resized
	Detect that position: fixed doesn't work

*/

// Root stream handler. Some structures (like text grids) could have alternative handlers
var basic_stream_handler = function( e )
{
	var order = e.order,
	struct = e.io.structures[order.name] || { node: 'span' },
	node = order.node || ( order.props && order.props.node ) || struct.node,
	
	// Create the new element and set everything that needs to be set
	elem = $( '<' + node + '>', order.props || {} )
		.appendTo( e.target );
	if ( order.name )
	{
		elem.addClass( order.name );
	}
	if ( order.text )
	{
		elem.text( order.text.replace( /\r/g, '\n' ) );
	}
	
	// If we have a custom function to run, do so
	if ( struct.func )
	{
		struct.func( elem, e.io );
	}
		
	return false;
};

// The public API
// .input() must be set by whatever uses StructIO
StructIO = Object.subClass({
	
	init: function( env )
	{
		env = extend( {}, env );
		this.env = env;
		var element = $( env.container ),
		
		// Calculate the width we want
		measureelem = $( '<tt>00000</tt>' )
			.appendTo( element ),
		charheight = measureelem.height(),
		charwidth = measureelem.width() / 5,
		widthinchars = Math.min( Math.floor( element.width() / charwidth ), env.width || 80 );
		measureelem.remove();
		
		extend( env, {
			charheight: charheight,
			charwidth: charwidth,
			width: widthinchars,
			fgcolour: element.css( 'color' ),
			bgcolour: element.css( 'bgcolor' )
		});
		// Set the container's width: +2 to account for the 1px of padding the structures inside will receive to hide obnoxious serifs
		element.width( widthinchars * charwidth + 2 );
		
		this.container = element
		this.target = element;
		element.on( 'stream', basic_stream_handler );
		this.TextInput = new TextInput( element );
		
		// Default structures
		this.structures = {
			main: {
				node: 'div'
			},
			status: {
				node: 'div',
				func: function( elem, io ) { new TextGrid( elem, io ); }
			}
		};
	},
	
	// Process some output events
	event: function( orders )
	{
		var order, code, i,
		target = this.target,
		TextInput = this.TextInput,
		temp;
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Specify the elements to use for various structures
			// All structures must specify at least the node to use
			if ( code == 'structures' )
			{
				order.code = undefined;
				$.extend( this.structures, order );
			}
			
			// Find a new target element
			if ( code == 'find' )
			{
				this.target = target = $( '.' + order.name );
			}
			
			// Add a structure
			if ( code == 'stream' )
			{
				// .to will let you temporarily stream to something else
				( order.to ? $( '.' + order.to ) : target )
					.trigger({
						type: 'stream',
						io: this,
						order: order
					});
			}
			
			if ( code == 'clear' )
			{
				var oldbg,
				bg = order.bg,
				temp = order.name ? $( '.' + order.name ) : target;
				temp.empty();
				
				// Set the background colour
				if ( typeof bg !== 'undefined' )
				{
					// If we're clearing the main window, then change <body> instead
					if ( order.name == 'main' )
					{
						temp = $body;
					}
					// First remove an old background colour class
					oldbg = /zvm-bg-\d+/.exec( temp.attr( 'class' ) );
					if ( oldbg )
					{
						temp.removeClass( oldbg[0] );
					}
					// Add style
					if ( isNaN( bg ) )
					{
						temp.css( 'background-color', bg );
					}
					else
					{
						temp.addClass( 'zvm-bg-' + bg );
					}
				}
			}
			
			// Line input
			if ( code == 'read' )
			{
				order.target = target;
				TextInput.getLine( order );
			}
			
			// Character input
			if ( code == 'char' )
			{
				TextInput.getChar( order );
			}
			
			// When quitting, scroll to the bottom in case something was printed since the last input
			if ( code == 'quit' )
			{
				TextInput.scroll();
			}
		}
	}
});
/*

StructIO outro
==============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

;;; (function( window, $, undefined ){

// Expose
window.StructIO = StructIO;
StructIO.TextInput = TextInput;

})( window, jQuery );
/*

StructIO runner
===============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

Runners are Parchment's glue: they connect an engine to it's IO system and to the Library
Not all runners are subclassed from Runner - there might be too little common code to make that worthwhile
All runners do however need to support the same basic API:
	init( env, engine )
		env = parchment.options
		engine = the VM class's name, if given in the definition
	fromParchment( event )
		Needs to handle these events: load, restart, save, restore
	toParchment( event ) -> Will be added by the Parchment Library

TODO:
	Support Workers
	Support errors in the Worker-like protocol

*/

// A basic StructIO runner
var Runner = Object.subClass({

	init: function( env, engine )
	{
		var self = this;
		// engine is only a class name, so make an instance now
		engine = window.engine = this.e = new window[engine]();
		this.io = new StructIO( env );
		
		// Set the appropriate event handlers
		this.toEngine = this.io.TextInput.callback = function( event ) { engine.inputEvent( event ); };
		engine.outputEvent = function( event ) { self.fromEngine( event ); };
	},
	
	// Handler for events from Parchment
	fromParchment: function( event )
	{
		var code = event.code;
		
		// Load the story file
		if ( code == 'load' )
		{
			event.env = this.io.env;
		}

		// Restart, save, restore -> just return to the engine

		this.toEngine( event );
	},
	
	// Handler for output events from the VM
	fromEngine: function( orders )
	{
		var	engine = this.e,
		i = 0,
		order, code,
		sendevent;
		
		// Send the orders to StructIO
		this.io.event( orders );
		
		// Go through the orders for anything non-StructIO
		for ( ; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			if ( code == 'quit' )
			{
				return;
			}
			
			if ( code == 'save' || code == 'restore' )
			{
				this.toParchment( order );
			}
			
			if ( code == 'restart' )
			{
				// Reset the IO structures
				this.io.target = this.io.container.empty();
				sendevent = 1;
			}
			
			// Tick - ie, do nothing
			if ( code == 'tick' )
			{
				sendevent = 1;
			}
		}
		
		if ( sendevent )
		{
			this.toEngine( order );
		}
	}

});
/*

Parchment
=========

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

if ( typeof DEBUG === 'undefined' )
{
	DEBUG = true;
}

// Wrap all of Parchment in a closure/namespace, and enable strict mode
(function( window, $ ){ 'use strict';

// Don't append a timestamp to XHR requests
// Converter for use with the binary dataType prefilter in file.js
jQuery.ajaxSetup({
	cache: 1,
	converters: {
		'* binary': true
    }
});

// Don't use XHR for local files
// Limit to Chrome?
jQuery.ajaxPrefilter( 'script', function( options /*, originalOptions, jqXHR*/ )
{
	if ( options.isLocal )
	{
		options.crossDomain = 1;
	}
});

// The home for Parchment to live in
window.parchment = {

	// The default parchment options
	options: {
		// A selector for the top HTML element which we will have complete control over
		container: '#parchment',
		
		// Should no ?story= be given, run this
		// May be an array, in which case [0] is the .z5/.zblorb and [1] is a backup legacy .js file
		//default_story: [ 'stories/troll.z5', 'stories/troll.z5.js' ],
		
		// Where shall we find the lib .js files?
		lib_path: 'lib/',
		
		// Don't allow people to specify additional options in the query string
		//lock_options: 0,
		
		// Lock Parchment so it will only run the default story, which must be provided!
		//lock_story: 0,
		
		// Set to 0 if you don't want Parchment to overwrite your <title>		
		page_title: 1,
		
		// Front page panels to display if no default story
		panels: [ 'search', 'url', 'about' ],
		
		// URL of proxy server to use for files we can't directly load
		proxy_url: 'http://zcode.appspot.com/proxy/'
	},

	// Classes etc
	lib: {}
};

// Isolate the query string options we have
var urloptions = (function( options ) {
	var i = 0, result = {}, temp;
	if ( options[0] == '' )
	{
		i++;
	}
	while ( i < options.length )
	{
		temp = /([^=]+)(=(.*))?/.exec( options[i++] );
		result[temp[1]] = temp[3] ? unescape( temp[3] ) : true;
	}
	return result;
} )( location.search.slice(1).split( /[&;]/g ) );
(function($){

window.FatalError = function(message) {
  this.message = message;
  this.traceback = ''; //this._makeTraceback(arguments.callee);
  this.onError(this);
  
	// Hide load indicator
	if ( $('.load').length > 0 )
	{
		//self.hidden_load_indicator = 1;
		//self.library.load_indicator.detach();
		$('.load').detach();
	}
};

FatalError.prototype = {
  onError: function(e) {
  var message = e.message;
  //if (typeof e.message == "string")
  //  message = message.entityify();
  $( '#parchment' ).append('<div class="error">An error occurred:<br/>' +
                       '<pre>' + message + '\n\n' + e.traceback +
                       '</pre></div>');
	if ( window.console )
	{
		console.error( message );
	}
},

  _makeTraceback: function(procs) {
    // This function was taken from gnusto-engine.js and modified.
    var procstring = '';

    var loop_count = 0;
    var loop_max = 100;

    while (procs != null && loop_count < loop_max) {
      var name = procs.toString();

      if (!name) {
	procstring = '\n  (anonymous function)'+procstring;
      } else {
	var r = name.match(/function (\w*)/);

	if (!r || !r[1]) {
	  procstring = '\n  (anonymous function)' + procstring;
	} else {
          procstring = '\n  ' + r[1] + procstring;
	}
      }

      try {
        procs = procs.caller;
      } catch (e) {
        // A permission denied error may have just been raised,
        // perhaps because the caller is a chrome function that we
        // can't have access to.
        procs = null;
      }
      loop_count++;
    }

    if (loop_count==loop_max) {
      procstring = '...' + procstring;
    }

    return "Traceback (most recent call last):\n" + procstring;
  }
};

})(jQuery);

/*

File functions and classes
==========================

Copyright (c) 2008-2014 The Parchment Contributors
Licenced under the BSD
http://code.google.com/p/parchment

*/

/*

TODO:
	Consider whether it's worth having cross domain requests to things other than the proxy
	
	Add transport for XDR
	
	Access buffer if possible (don't change encodings)
	
	Is the native base64_decode function still useful?
	If such a time comes when everyone has native atob(), then always expose the decoded text in process_binary_XHR()
	
	If we know we have a string which is latin1 (say from atob()), would it be faster to have a separate text_to_array() that doesn't need to &0xFF?
	
	Consider combining the eNs together first, then shifting to get the cNs (for the base64 decoder)

*/
 
(function(window, $){

// VBScript code
if ( window.execScript )
{
	execScript(
		
		// Idea from http://stackoverflow.com/questions/1919972/#3050364
		
		// Convert a byte array (xhr.responseBody) into a 16-bit characters string
		// Javascript code will separate the characters back into 8-bit numbers again
		'Function VBCStr(x)\n' +
			'VBCStr=CStr(x)\n' +
		'End Function\n' +
		
		// If the byte array has an odd length, this function is needed to get the last byte
		'Function VBLastAsc(x)\n' +
			'Dim l\n' +
			'l=LenB(x)\n' +
			'If l mod 2 Then\n' +
				'VBLastAsc=AscB(MidB(x,l,1))\n' +
			'Else\n' +
				'VBLastAsc=-1\n' +
			'End If\n' +
		'End Function'
	
	, 'VBScript' );
}

var chrome = /chrome\/(\d+)/i.exec( navigator.userAgent ),
chrome_no_file = chrome && parseInt( chrome[1] ) > 4,

// Turn Windows-1252 into ISO-8859-1
// There are only 27 differences, so this is an reasonable strategy
// If only we could override with ISO-8859-1...
fixWindows1252 = function( string )
{
	return string
		.replace( /\u20ac/g, '\x80' ).replace( /\u201a/g, '\x82' ).replace( /\u0192/g, '\x83' )
		.replace( /\u201e/g, '\x84' ).replace( /\u2026/g, '\x85' ).replace( /\u2020/g, '\x86' )
		.replace( /\u2021/g, '\x87' ).replace( /\u02c6/g, '\x88' ).replace( /\u2030/g, '\x89' )
		.replace( /\u0160/g, '\x8a' ).replace( /\u2039/g, '\x8b' ).replace( /\u0152/g, '\x8c' )
		.replace( /\u017d/g, '\x8e' ).replace( /\u2018/g, '\x91' ).replace( /\u2019/g, '\x92' )
		.replace( /\u201c/g, '\x93' ).replace( /\u201d/g, '\x94' ).replace( /\u2022/g, '\x95' )
		.replace( /\u2013/g, '\x96' ).replace( /\u2014/g, '\x97' ).replace( /\u02dc/g, '\x98' )
		.replace( /\u2122/g, '\x99' ).replace( /\u0161/g, '\x9a' ).replace( /\u203a/g, '\x9b' )
		.replace( /\u0153/g, '\x9c' ).replace( /\u017e/g, '\x9e' ).replace( /\u0178/g, '\x9f' );
},

// Text to byte array and vice versa
text_to_array = function(text, array)
{
	var array = array || [], i = 0, l;
	for (l = text.length % 8; i < l; ++i)
		array.push(text.charCodeAt(i) & 0xff);
	for (l = text.length; i < l;)
		// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
		// and if text is cast to a String object, it's considerably slower.
		array.push(text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff,
			text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff);
	return array;
},

array_to_text = function(array, text)
{
	// String.fromCharCode can be given an array of numbers if we call apply on it!
	return ( text || '' ) + String.fromCharCode.apply( 1, array );
},

// Base64 encoding and decoding
// Use the native base64 functions if available

// Run this little function to build the decoder array
encoder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
decoder = (function()
{
	var out = [], i = 0;
	for (; i < encoder.length; i++)
		out[encoder.charAt(i)] = i;
	return out;
})(),

base64_decode = function(data, out)
{
	if ( window.atob )
	{
		return text_to_array( atob( data ), out );
	}
	
	var out = out || [],
	c1, c2, c3, e1, e2, e3, e4,
	i = 0, l = data.length;
	while (i < l)
	{
		e1 = decoder[data.charAt(i++)];
		e2 = decoder[data.charAt(i++)];
		e3 = decoder[data.charAt(i++)];
		e4 = decoder[data.charAt(i++)];
		c1 = (e1 << 2) + (e2 >> 4);
		c2 = ((e2 & 15) << 4) + (e3 >> 2);
		c3 = ((e3 & 3) << 6) + e4;
		out.push(c1, c2, c3);
	}
	if (e4 == 64)
		out.pop();
	if (e3 == 64)
		out.pop();
	return out;
},

base64_encode = function(data, out)
{
	if ( window.btoa )
	{
		return btoa( array_to_text( data, out ) );
	}
	
	var out = out || '',
	c1, c2, c3, e1, e2, e3, e4,
	i = 0, l = data.length;
	while (i < l)
	{
		c1 = data[i++];
		c2 = data[i++];
		c3 = data[i++];
		e1 = c1 >> 2;
		e2 = ((c1 & 3) << 4) + (c2 >> 4);
		e3 = ((c2 & 15) << 2) + (c3 >> 6);
		e4 = c3 & 63;

		// Consider other string concatenation methods?
		out += (encoder.charAt(e1) + encoder.charAt(e2) + encoder.charAt(e3) + encoder.charAt(e4));
	}
	if (isNaN(c2))
		out = out.slice(0, -2) + '==';
	else if (isNaN(c3))
		out = out.slice(0, -1) + '=';
	return out;
},

// Convert IE's byte array to an array we can use
bytearray_to_array = function( bytearray )
{
	// VBCStr will convert the byte array into a string, with two bytes combined into one character
	var text = VBCStr( bytearray ),
	// VBLastAsc will return the last character, if the string is of odd length
	last = VBLastAsc( bytearray ),
	result = [],
	i = 0,
	l = text.length % 4,
	thischar;
	
	while ( i < l )
	{
		result.push(
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8
		);
	}
	
	l = text.length;
	while ( i < l )
	{
		result.push(
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8
		);
	}
	
	if ( last > -1 )
	{
		result.push( last );
	}
	
	return result;
},

// XMLHttpRequest feature support
xhr = jQuery.ajaxSettings.xhr(),
support = {
	binary: xhr.overrideMimeType ? 'charset' : ( 'responseBody' in xhr ? 'responseBody' : 0 )
},

// Process a binary XHR
process_binary_XHR = function( data, textStatus, jqXHR )
{
	var array, buffer, text;
	
	data = $.trim( data );
	
	// Decode base64
	if ( jqXHR.mode == 'base64' )
	{
		if ( window.atob )
		{
			text = atob( data );
			array = text_to_array( text );
		}
		else
		{
			array = base64_decode( data );
		}
	}
	
	// Binary support through charset=windows-1252
	else if ( jqXHR.mode == 'charset' )
	{
		text = fixWindows1252( data );
		array = text_to_array( text );
	}
	
	// Access responseBody
	else
	{
		array = bytearray_to_array( jqXHR.xhr.responseBody );
	}
	
	jqXHR.responseArray = array;
	jqXHR.responseText = text;
};

// Clean-up the temp XHR used above
xhr = undefined;

// Prefilters for binary ajax
$.ajaxPrefilter( 'binary', function( options, originalOptions, jqXHR )
{
	// Chrome > 4 doesn't allow file:// to file:// XHR
	// It should however work for the rest of the world, so we have to test here, rather than when first checking for binary support
	var binary = options.isLocal && !options.crossDomain && chrome_no_file ? 0 : support.binary,
	
	// Expose the real XHR object onto the jqXHR
	XHRFactory = options.xhr;
	options.xhr = function()
	{
		return jqXHR.xhr = XHRFactory.apply( options );
	};
	
	// Set up the options and jqXHR
	options.binary = binary;
	jqXHR.done( process_binary_XHR );
	
	// Options for jsonp, which may not be used if we redirect to 'text'
	options.jsonp = false;
	options.jsonpCallback = 'processBase64Zcode';
	jqXHR.mode = 'base64';
	
	// Load a legacy file
	if ( options.url.slice( -3 ).toLowerCase() == '.js' )
	{
		return 'jsonp';
	}
	
	// Binary support and same domain: use a normal text handler
	// Encoding stuff is done in the text prefilter below
	if ( binary && !options.crossDomain )
	{
		return 'text';
	}
	
	// Use a backup legacy file if provided
	if ( options.legacy )
	{
		options.url = options.legacy;
		return 'jsonp';
	}
	
	// Use the proxy when no binary support || cross domain request
	options.data = 'url=' + options.url;
	options.url = parchment.options.proxy_url;
	
	if ( binary && $.support.cors )
	{
		return 'text';
	}
	
	options.data += '&encode=base64&callback=pproxy';
	options.jsonpCallback = 'pproxy';
	return 'jsonp';
});

// Set options for binary requests
$.ajaxPrefilter( 'text', function( options, originalOptions, jqXHR )
{
	jqXHR.mode = options.binary;
	
	if ( jqXHR.mode == 'charset' )
	{
		options.mimeType = 'text/plain; charset=windows-1252';
	}
});

// Converters are set in intro.js

/* DEBUG */

// Download a file to a byte array
// Note: no longer used by library.js
function download_to_array( url, callback )
{
	// Request the file with the binary type
	$.ajax( url, { dataType: 'binary' } )
		.success(function( data, textStatus, jqXHR )
		{
			callback( jqXHR.responseArray );
		});
}

/* ENDDEBUG */

/*
	// Images made from byte arrays
	file.image = base2.Base.extend({
		// Initialise the image with a byte array
		constructor: function init_image(chunk)
		{
			this.chunk = chunk;

			this.dataURI = function create_dataURI()
			{
				// Only create the image when first requested, the encoding could be quite slow
				// Would be good to replace with a getter if it can be done reliably
				var encoded = encode_base64(this.chunk.data);
				if (this.chunk.type == 'PNG ')
					this.URI = 'data:image/png;base64,' + encoded;
				else if (this.chunk.type == 'JPEG')
					this.URI = 'data:image/jpeg;base64,' + encoded;
				this.dataURI = function() {return this.URI;};
				return this.URI;
			};
		}
	});
*/

// Expose

window.file = {
	text_to_array: text_to_array,
	array_to_text: array_to_text,
	base64_decode: base64_decode,
	base64_encode: base64_encode,
	support: support
};
;;; window.file.download_to_array = download_to_array;

})(window, jQuery);
/*

Parchment UI
============

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Fix the stylesheets implementation to actually allow enabling/disabling in IE

*/

(function($){

var window = this,

// Map results callback
results_link = '<p><a href="' + location.href + '?story=http://mirror.ifarchive.org/',
map_results_callback = function( story )
{
	return results_link + story.path + '">' + story.desc + '</a></p>';
};

// The main UI class
parchment.lib.UI = Object.subClass({
	init: function( library )
	{
		this.library = library;
		this.panels = {};
		
		// Load indicator
		this.load_indicator = $( '<div class="dialog load"><p>Parchment is loading.<p>&gt; <blink>_</blink></div>' );
	},

	// Stylesheet management
	// Add some stylesheets, disabled at first
	stylesheet_add: function( /* title, url, ... */ )
	{
		var args = arguments, i;
		for ( i = 1; i < args.length; i++ )
		{
			// The IE way...
			if ( document.createStyleSheet )
			{
				document.createStyleSheet( args[i] );
			}
			// The better way
			else
			{
				$( '<link>', {
					rel: 'alternate stylesheet',
					href: args[i],
					title: args[0],
					type: 'text/css'
				})
					.appendTo( 'head' )
					[0].disabled = true;
			}
		}
	},
	// Switch on/off a stylesheet
	stylesheet_switch: function( title, enable )
	{
		$( 'link[rel*="stylesheet"][title="' + title + '"]' )
			.each( function(){
				this.disabled = !enable;
			}); 
	},
	
	// Load panels for the front page
	load_panels: function()
	{
		var panels = parchment.options.panels,
		search_data, search_input, search_results,
		
		// Perform a search of the archive
		dosearch = function()
		{
			// Filter the archive
			var key = RegExp( search_input.val().replace( ' ', '( )?' ), 'i' ),
			results = $.grep( search_data, function( story ){
				return key.test( story.path + story.desc );
			});
			// Limit to 30 results
			results = results.slice( 0, 30 );
			// Fill the results div
			search_results.html( $.map( results, map_results_callback ).join('') );
		};
		
		// A search box
		if ( $.inArray( 'search', panels ) != -1 )
		{
			this.panels.search = $( '<div class="panel search"><label for="panel_search">Search the IF Archive for games you can play with Parchment. You might also like to search the <a href="http://ifdb.tads.org">IFDB</a> or the <a href="http://ifwiki.org">IF Wiki</a>.</label><input id="panel_search"><div></div></div>' );
			
			search_input = this.panels.search.find( 'input' );
			search_results = search_input.next();
				
			// Load the archive json file
			search_input.keydown(function(){
				search_input.unbind( 'keydown' );
				$.getJSON( 'stories/if-archive.json' )
					.done(function( data ){
						search_data = data;
						// Attach the real handler once the archive's been downloaded, and then run it once
						search_input.keyup( dosearch );
						dosearch();
					});
			});
		}
		
		// A form to load any story file
		if ( $.inArray( 'url', panels ) != -1 )
		{
			this.panels.url = $( '<form class="panel url"><label for="panel_url">You may use Parchment to play any story file on the internet, simply copy its address here:</label><input id="panel_url" name="story"></form>' );
		}
		
		this.library.container.append( this.panels[ panels[0] ] );
		this.panels.active = panels[0];
	}

});

})(jQuery);
/*

The Parchment Library
=====================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Display a more specific error if one was given by the proxy

*/

(function(window, $){

var rtitle = /([-\w\s_]+)(\.[\w]+(\.js)?)?$/,
rjs = /\.js$/,

// Callback to show an error when the story file wasn't loaded
story_get_fail = function(){
	throw new FatalError( 'Parchment could not load the story. Check your connection, and that the URL is correct.' );
},

// Launcher. Will be run by jQuery.when(). jqXHR is args[2]
launch_callback = function( args )
{
	// Hide the load indicator
	$( '.load' ).detach();
	
	// Create a runner
	var runner = window.runner = new ( window[args[2].vm.runner] || Runner )(
		parchment.options,
		args[2].vm.engine
	),
	
	savefile = location.hash;
	
	// Add the callback
	runner.toParchment = function( event ) { args[2].library.fromRunner( runner, event ); };
	
	// Load it up!
	runner.fromParchment({
		code: 'load',
		data: ( new parchment.lib.Story( args[2].responseArray ) ).data
	});
	
	// Restore if we have a savefile
	if ( savefile && savefile != '#' ) // IE will set location.hash for an empty fragment, FF won't
	{
		runner.fromParchment({
			code: 'restore',
			data: file.base64_decode( savefile.slice( 1 ) )
		});
	}
	// Restart if we don't
	else
	{
		runner.fromParchment({ code: 'restart' });
	}
};

// Callback to show an error if a VM's dependant scripts could be successfully loaded
// Currently not usable as errors are not detected :(
/*scripts_fail = function(){
	throw new FatalError( 'Parchment could not load everything it needed to run this story. Check your connection and try refreshing the page.' );
};*/

// A story file
parchment.lib.Story = IFF.subClass({
	// Parse a zblorb or naked zcode story file
	init: function parse_zblorb(data, story_name)
	{
		this.title = story_name;

		// Check for naked zcode
		// FIXME: This check is way too simple. We should look at
		// some of the other fields as well for sanity-checking.
		if (data[0] < 9)
		{
			//this.filetype = 'zcode';
			this._super();
			this.chunks.push({
				type: 'ZCOD',
				data: data
			});
			this.data = data;
		}
		
		// Check for naked glulx
		else if (IFF.text_from(data, 0) == 'Glul')
		{
			//this.filetype = 'glulx';
			this._super();
			this.chunks.push({
				type: 'GLUL',
				data: data
			});
			this.data = data;
		}
		
		// Check for potential zblorb
		else if (IFF.text_from(data, 0) == 'FORM')
		{
			this._super(data);
			if (this.type == 'IFRS')
			{
				// We have Blorb!
//				this.images = [];
//				this.resources = [];

				// Go through the chunks and extract the useful ones
				for (var i = 0, l = this.chunks.length; i < l; i++)
				{
					var type = this.chunks[i].type;
/*
					if (type == 'RIdx')
						// The Resource Index Chunk, used by parchment for numbering images correctly
						for (var j = 0, c = IFF.num_from(this.chunks[i].data, 0); j < c; j++)
							this.resources.push({
								usage: IFF.text_from(this.chunks[i].data, 4 + j * 12),
								number: IFF.num_from(this.chunks[i].data, 8 + j * 12),
								start: IFF.num_from(this.chunks[i].data, 12 + j * 12)
							});
*/
					// Parchment uses the first ZCOD/GLUL chunk it finds, but the Blorb spec says the RIdx chunk should be used
					if ( type == 'ZCOD' && !this.zcode )
					{
						this.data = this.chunks[i].data;
					}
					else if ( type == 'GLUL' && !this.glulx )
					{
						this.data = this.chunks[i].data;
					}
						
					else if (type == 'IFmd')
					{
						// Treaty of Babel metadata
						// Will most likely break UTF-8
						this.metadata = file.array_to_text(this.chunks[i].data);
						var metadataDOM = $(this.metadata);
						if (metadataDOM)
						{
							//this.metadataDOM = metadataDOM;

							// Extract some useful info
							if ($('title', metadataDOM))
								this.title = $('title', metadataDOM).text();
							if ($('ifid', metadataDOM))
								this.ifid = $('ifid', metadataDOM).text();
							if ($('release', metadataDOM))
								this.release = $('release', metadataDOM).text();
						}
					}
/*
					else if (type == 'PNG ' || type == 'JPEG')
						for (var j = 0, c = this.resources.length; j < c; j++)
						{
							if (this.resources[j].usage == 'Pict' && this.resources[j].start == this.chunks[i].offset)
								// A numbered image!
								this.images[this.resources[j].number] = new image(this.chunks[i]);
						}

					else if (type == 'Fspc')
						this.frontispiece = IFF.num_from(this.chunks[i].data, 0);
*/
				}

/*				if (this.zcode)
					this.filetype = 'ok story blorbed zcode';
				else
					this.filetype = 'error: no zcode in blorb';
*/			}
/*			// Not a blorb
			else if (this.type == 'IFZS')
				this.filetype = 'error: trying to load a Quetzal savefile';
			else
				this.filetype = 'error unknown iff';
*/		}
/*		else
			// Not a story file
			this.filetype = 'error unknown general';
*/	}
});

// Story file cache
var StoryCache = Object.subClass({
	// Add a story to the cache
	add: function(story)
	{
		this[story.ifid] = story;
		if (story.url)
			this.url[story.url] = story;
	},
	url: {}
}),

// The Parchment Library class
Library = Object.subClass({
	// Set up the library
	init: function()
	{
		// Keep a reference to our container
		this.container = $( parchment.options.container );
		
		this.ui = new parchment.lib.UI( this );
	},
	
	// Load a story or savefile
	load: function( id )
	{
		var self = this,
		
		options = parchment.options,
		
		storyfile = urloptions.story,
		storyName,
		url,
		vm = urloptions.vm,
		i = 0;
		
		// Run the default story only
		if ( options.lock_story )
		{
			// Locked to the default story
			storyfile = options.default_story;

			if ( !storyfile )
			{
				throw new FatalError( 'Story file not specified' );
			}
		}
		// Load the requested story or the default story
		else if ( options.default_story || storyfile )
		{
			// Load from URL, or the default story
			storyfile = storyfile || options.default_story;
		}
		// Show the library
		else
		{
			return this.ui.load_panels();
		}
		
		// Hide the #about, until we can do something more smart with it
		$('#about').remove();
		
		// Show the load indicator
		$( 'body' ).append( self.ui.load_indicator );
		
		// Normalise the storyfile array
		if ( !$.isArray( storyfile ) )
		{
			storyfile = [ storyfile, 0 ];
		}
		url = storyfile[0];
		self.url = url;

		storyName = rtitle.exec( url );
		storyName = storyName ? storyName[1] + " - Parchment" : "Parchment";
		
		// Change the page title
		if ( options.page_title )
		{
			window.document.title = storyName;
		}
		
		// Check the story cache first
		//if ( self.stories.url[url] )
		//	var story = self.stories.url[url];

		// We will have to download it
		//else
		//{
			// If a VM was explicitly specified, use it
			if ( vm )
			{
				vm = parchment.vms[ vm ];
			}
			// Otherwise test each in turn
			else
			{
				for ( ; i < parchment.vms.length; i++ )
				{
					if ( parchment.vms[i].match.test( url ) )
					{
						vm = parchment.vms[i];
						break;
					}
				}
			}
			// Raise an error if we have no VM
			if ( !vm )
			{
				throw new FatalError( 'File type is not supported!' );
			}
			
			// Launch the story with the VM
			try
			{
				this.launch( vm, storyfile );
			}
			catch (e)
			{
				throw new FatalError( e );
			}
		//}
	},
	
	// Get all the required files and launch the VM
	launch: function( vm, storyfile )
	{
		var self = this,
		
		// Load the story file
		actions = [
			
			$.ajax( storyfile[0], { dataType: 'binary', legacy: storyfile[1] } )
				// Attach the library for the launcher to use (yay for chaining)
				.done( function( data, textStatus, jqXHR )
				{
					jqXHR.library = self;
					jqXHR.vm = vm;
				})
				// Some error in downloading
				.fail( story_get_fail )
			
		],
		
		// Get the scripts if they haven't been loaded already
		/* DEBUG */
			scripts = [$.Deferred()],
			script_callback = function()
			{
				if ( vm.files.length == 0 )
				{
					scripts[0].resolve();
					return;
				}
				var dependency = parchment.options.lib_path + vm.files.shift();
				if ( rjs.test( dependency ) )
				{
					$.getScript( dependency, script_callback );
				}
				// CSS
				else
				{
					parchment.library.ui.stylesheet_add( vm.id, dependency );
					script_callback();
				}
			},
		/* ELSEDEBUG
			scripts = [],
		/* ENDDEBUG */
		i = 0,
		dependency;
		
		if ( !vm.loaded )
		{
			vm.loaded = 1;
			
			/* DEBUG */
				script_callback();
			/* ELSEDEBUG
				while ( i < vm.files.length )
				{
					dependency = parchment.options.lib_path + vm.files[i++];
					// JS
					if ( rjs.test( dependency ) )
					{
						scripts.push( $.getScript( dependency ) );
					}
					// CSS
					else
					{
						this.ui.stylesheet_add( vm.id, dependency );
					}
				}
			/* ENDDEBUG */

			// Use jQuery.when() to get a promise for all of the scripts
			actions[1] = $.when.apply( 1, scripts );
				//.fail( scripts_fail );
		}
		
		// Add the launcher callback
		$.when.apply( 1, actions )
			.done( launch_callback );
	},
	
	// An event from a runner
	fromRunner: function( runner, event )
	{
		var code = event.code,
		savefile = location.hash;
		
		if ( code == 'save' )
		{
			location.hash = file.base64_encode( event.data );
		}
		
		if ( code == 'restore' )
		{
			if ( savefile && savefile != '#' )
			{
				event.data = file.base64_decode( savefile.slice( 1 ) );
			}
		}
		
		runner.fromParchment( event );
	},
	
	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

parchment.lib.Library = Library;

// VM definitions
parchment.vms = [];
parchment.add_vm = function( defn )
{
	parchment.vms.push( defn );
	parchment.vms[defn.id] = defn;
};

})(window, jQuery);
/*

Quixe definition
================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'quixe',
	
	// File pattern
	match: /(ulx|glb|(g|glulx.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: DEBUG ? [
		'../src/quixe/prototype-1.6.1.js',
		'glkote.debug.js',
		'quixe.debug.js',
		'glkote.debug.css'
	] : [
		'prototype.min.js',
		'glkote.min.js',
		'quixe.min.js',
		'glkote.min.css'
	],
	
	runner: 'QuixeRunner'
});
/*

The ifvms.js VM definitions
===========================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'zvm',
	
	// File pattern
	match: /(z[58]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: DEBUG ? [ 'zvm.debug.js' ] : [ 'zvm.min.js' ],
	
	engine: 'ZVM'
});
/*

Gnusto definition
=================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'gnusto',
	
	// File pattern
	match: /(z[1-8]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: DEBUG ? [ 'gnusto.debug.js' ] : [ 'gnusto.min.js' ],
	
	runner: 'GnustoRunner'
});
/*

Parchment load scripts
======================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

// Load Parchment, start it all up!
$(function()
{
	var library;
	
	// Check for any customised options
	if ( window.parchment_options )
	{
		$.extend( parchment.options, parchment_options );
	}
	
	// Load additional options from the query string
	// Is a try/catch needed?
	if ( !parchment.options.lock_options && urloptions.options )
	{
		$.extend( parchment.options, $.parseJSON( urloptions.options ) );
	}
	
	// Some extra debug options
	/* DEBUG */
	parchment.options.debug = urloptions.debug;
	/* ENDDEBUG */
	
	// Load the library
	library = new parchment.lib.Library();
	parchment.library = library;
	library.load();

	// Add the Analytics tracker, but only if we're at iplayif.com
	if ( location.href.indexOf( 'iplayif.com' ) != -1 )
	{
		$.getScript( 'http://google-analytics.com/ga.js', function(){_gat._getTracker( 'UA-7949545-3' )._trackPageview();} );
	}
});

})( this, jQuery );