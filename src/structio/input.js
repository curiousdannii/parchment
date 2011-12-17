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
		self.scrollParent = $.browser.webkit ? $body : $( 'html' );
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