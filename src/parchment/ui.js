/*
 * Parchment UI
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(){

// Wrap document
var doc = $( document );

window.gIsIphone = navigator.userAgent.match(/iPhone|iPod|iPad|Android/i);

// Make the statusline always move to the top of the screen in MSIE < 7
if ( $.browser.msie && parseInt($.browser.version) < 7 )
{
	$(function(){
		var topwin_element = $( '#top-window' ),
		move_element = function()
		{
			topwin_element.style.top = document.documentElement.scrollTop + 'px';
		};
		topwin_element
			.css( 'position', 'absolute' )
			.resize( move_element )
			.scroll( move_element );
	});
}

// A Line and character input class
// Because of problems with the iPhone, this class will use a single <input> for both input types
// To switch between line and character input, classes will be added and removed

parchment.lib.LineCharInput = Object.subClass({
	// Set up the input editor with a container
	init: function( container )
	{	
		var self = this,
		container = $( container ),

		// The input element itself
		input = $( '<input>', {
			keydown: function( event )
			{
				var key_code = event.which;
				
				if ( self.mode == 'char' )
				{
					self.keyCode = key_code;
				}
				if ( self.mode == 'line' )
				{
					// Check for up/down to use the command history
					if ( key_code == 38 ) // up -> prev
					{
					self.prev_next( 1 );
					}
					if ( key_code == 40 ) // down -> next
					{
					self.prev_next( -1 );
					}

					// Trigger page up/down on the body
					if ( key_code == 33 || key_code == 34 )
					{
					//doc.trigger( 'keyup', event );
					}
				}
			},
			keypress: function( event )
			{
				if ( self.mode == 'char' )
				{
					self.charCode = event.which;
					self.submit_char();
					return false;
				}
			},
			keyup: function()
			{
				if ( self.mode == 'char' )
				{
					self.submit_char();
				}
			}
		})

		// A form to contain it
		self.form = $( '<form>', {
			'class': 'LineCharInput',
			 submit: function()
			{
				if ( self.mode == 'line' )
				{
					self.submit_line();
				}
				return false;
			}
		})
			.append( input )
			.appendTo( container );

		// Focus document clicks
		doc.bind( 'click.LineCharInput', function() {
			input[0].focus();
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .getLine()
		
		self.input = input;
		self.container = container;
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		doc.unbind( '.LineCharInput' );
	},
	
	// Get some line input
	get_line: function( callback )
	{
		var self = this,
		container = self.container;
		self.mode = 'line';
		self.callback = callback || $.noop;
		
		// Set up the mutable history
		self.current = 0;
		self.mutable_history = self.history.slice();
		self.mutable_history.unshift( '' );
		
		// Adjust the input's width and ensure it's empty
		self.input
			.width( container.width() - container.children().eq(-2).width() )
			.val( '' );
	},
	
	// Submit the input data
	submit_line: function()
	{
		var self = this,
		command = self.input.val();
			
		// Hide the <form>
		self.mode = 0;
		self.input.width( 0 );
		
		// Copy back the command
		$( '<span class="finished-input">' + command.entityify() + '</span><br>' )
			.insertBefore( self.form );
		
		// Add this command to the history, as long as it's not the same as the last, and not blank
		if ( command != self.history[0] && /\S/.test( command ) )
		{
			self.history.unshift( command );
		}
		
		// Trigger a custom event for anyone listening in for commands
		doc.trigger({
			type: 'LineInput',
			input: command
		});
		
		self.callback( command );
	},
	
	// Get the previous/next command from history
	// change = 1 for previous and -1 for next
	prev_next: function( change )
	{
		var self = this,
		input = self.input,
		mutable_history = self.mutable_history,
		current = self.current,
		new_current = current + change;
		
		// Check it's within range
		if ( new_current < mutable_history.length && new_current >= 0 )
		{
			mutable_history[current] = input.val();
			input.val( mutable_history[new_current] );
			self.current = new_current;
		}
	},
	
	// Get some char input
	get_char: function( callback )
	{
		var self = this;
		self.mode = 'char';
		self.callback = callback || $.noop;
		
		self.keyCode = self.charCode = 0;
	},
	
	// Submit the input data
	submit_char: function()
	{
		var self = this,
		input = {
			keyCode: self.keyCode,
			charCode: self.charCode
		};
		
		// Do we have anything to submit?
		if ( !self.keyCode )
		{
			return;
		}
		
		// Disable the input
		self.mode = 0;
		
		// Trigger a custom event for anyone listening in for key strokes
		doc.trigger({
			type: 'CharInput',
			input: input
		});
		
		self.callback( input );
	}
});

})();
