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

// A generic line input editor
parchment.lib.LineInput = Object.subClass({
	// Set up the line input editor with a container and styles to apply
	init: function( container, classes )
	{
		var self = this,
		container = $( container ),
		
		// The input element itself
		input = $( '<input>', {
			'class': classes || '',
			keydown: function( event )
			{
				var key_code = event.which;
				
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
		});
		
		// A form to contain it
		self.form = $( '<form>', {
			'class': 'LineInput',	
			submit: function()
			{
				self.submit();
				return false;
			}
		})
			.append( input );
		
		// Focus document clicks
		doc.bind( 'click.LineInput', function() {
			if ( $( '.LineInput' ).length )
			{
				input.focus();
			}
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .get()
		
		self.input = input;
		self.container = container;
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		doc.unbind( '.LineInput' );
	},
	
	// Get some input
	get: function( callback )
	{
		var self = this,
		container = self.container,
		input = self.input;
		
		self.callback = callback || $.noop;
		
		// Set up the mutable history
		self.current = 0;
		self.mutable_history = self.history.slice();
		self.mutable_history.unshift( '' );
		
		// Adjust the input's width and ensure it's empty
		input
			.width( container.width() - container.children().last().width() )
			.val( '' );
		
		container.append( self.form );
		setTimeout( function(){
			self.input.focus();
		}, 1 );
	},
	
	// Submit the input data
	submit: function()
	{
		var self = this,
		command = self.input.val();
			
		// Hide the <form>
		self.form.detach();
		
		// Copy back the command
		$( '<span class="finished-input">' + command.entityify() + '</span><br>' )
			.appendTo( self.container );
		
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
	}
});

// A generic character input
parchment.lib.CharInput = Object.subClass({
	// Set up the character input
	init: function()
	{
		var self = this,
		
		// The input element itself
		input = $( '<input>', {
			'class': 'CharInput',
			keydown: function( event )
			{
				self.keyCode = event.which;
			},
			keypress: function( event )
			{
				self.charCode = event.which;
				self.submit();
				return false;
			},
			keyup: function( event )
			{
				self.submit();
			}
		});
		
		// Focus document clicks
		doc.bind( 'click.CharInput', function() {
			if ( $( '.CharInput' ).length )
			{
				input.focus();
			}
		});
		
		self.input = input;
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		doc.unbind( '.CharInput' );
	},
	
	// Get some input
	get: function( callback )
	{
		var self = this;
		
		self.callback = callback || $.noop;
		
		self.keyCode = self.charCode = 0;
		
		// Add the <input> and focus
		self.input.appendTo( $( 'body' ) );
		setTimeout( function(){
			self.input.focus();
		}, 1 );
	},
	
	// Submit the input data
	submit: function()
	{
		var self = this,
		keyCode = self.keyCode, charCode = self.charCode,
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
		self.input.detach();
		
		// Trigger a custom event for anyone listening in for key strokes
		doc.trigger({
			type: 'CharInput',
			input: input
		});
		
		self.callback( input );
	}
});

})();
