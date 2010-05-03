/*
 * Parchment UI
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(){

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
parchment.lib.LineEditor = Object.subClass({
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
				// Check for up/down to use the command history
				if ( event.which == 38 ) // up -> prev
				{
					self.prev_next( 1 );
				}
				else if ( event.which == 40 ) // down -> next
				{
					self.prev_next( -1 );
				}
			}
		});
		
		// A form to contain it
		self.form = $( '<form/>', {
			'class': 'generic-line-editor',	
			submit: function()
			{
				self.submit();
				return false;
			}
		})
			.append( input );
		
		// Focus document clicks
		$( document ).click( function() {
			input.focus();
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .get()
		
		self.input = input;
		self.container = container;
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
		
		// Adjust the input's width
		input.width( container.width() - container.children().last().width() );
		
		container.append( self.form );
		input.focus();
	},
	
	// Submit the input data
	submit: function()
	{
		var self = this,
		input = self.input,
		command = input.val();
			
		// Hide the <form> and clear the <input>
		self.form.detach();
		input.val( '' );
		
		// Copy back the command
		$( '<span class="finished-input">' + command.entityify() + '</span><br>' )
			.appendTo( self.container );
		
		// Add this command to the history, as long as it's not the last command, and not blank
		if ( command != self.history[0] && /\S/.test( command ) )
		{
			self.history.unshift( command );
		}
		
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

})();
