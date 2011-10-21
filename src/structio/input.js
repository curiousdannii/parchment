/*

Text Input
==========

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:

*/

(function( window, $ ){

// Wrap window, document and body
var $window = $( window ),
doc = $( document ),
body, // Set below

// window.scrollByPages() compatibility
scrollByPages = window.scrollByPages || function( pages )
{
	// From Mozilla's nsGfxScrollFrame.cpp
	// delta = viewportHeight - Min( 10%, lineHeight * 2 )
	var height = doc[0].documentElement.clientHeight,
	delta = height - Math.min( height / 10, parseInt( body.css( 'line-height' ) ) * 2 );
	scrollBy( 0, delta * pages );
},

// getSelection compatibility-ish. We only care about the text value of a selection
selection = window.getSelection ||
	( document.selection && function() { return document.selection.createRange().text; } ) ||
	function() { return ''; };

// Set the body variable once the document is loaded
$(function(){
	body = $( 'body' );
});

// A generic text input class
// Can take both line and character input, though separate <input> elements are used
window.TextInput = Object.subClass({
	// Set up the text inputs with a container and stream
	// container is the greatest domain for which this instance should control input
	// stream is the element which the line <input> will actually be inserted into
	init: function( container, statuswin )
	{
		var self = this,
		
		// The line input element
		lineInput = $( '<input>', {
			autocapitalize: 'off',
			keydown: function( event )
			{
				var keyCode = event.which,
				cancel;
				
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
				// FIX: Won't scroll repeatably
				if ( keyCode == 33 ) // Up
				{
					scrollByPages(-1);
					cancel = 1;
				}
				if ( keyCode == 34 ) // Down
				{
					scrollByPages(1);
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
			}
		}),
		
		// The character input element
		charInput = $( '<input>', {
			'class': 'CharInput',
			keydown: function( event )
			{
				self.keyCode = event.which;
			},
			keypress: function( event )
			{
				self.charCode = event.which;
				self.submitChar();
				return false;
			},
			keyup: function( event )
			{
				self.submitChar();
			}
		});
		
		// A form to contain the line input
		self.form = $( '<form>', {
			'class': 'LineInput',	
			submit: function()
			{
				self.submitLine();
				return false;
			}
		})
			.append( lineInput );
		
		// Focus document clicks and keydowns
		doc.bind( 'click.TextInput keydown.TextInput', function( ev ) {
			
			// Only intercept things that aren't inputs
			if ( ev.target.nodeName != 'INPUT' &&
			
			// Don't do anything if the user is selecting some text
				selection() == '' &&
				
			// Or if the cursor is too far below the viewport
				$window.scrollTop() + $window.height() - lineInput.offset().top > -60 )
			{
				$( '.LineInput input, .CharInput' )
					.focus()
					.trigger( ev );
			}
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .get()
		
		self.lineInput = lineInput;
		self.charInput = charInput;
		
		self.container = container;
		//self.statuswin = $( statuswin );
		
		// Find the element which we calculate scroll offsets from
		// For now just decide by browser
		self.scrollParent = $.browser.webkit ? body : $( 'html' );
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		doc.unbind( '.TextInput' );
	},
	
	// Get some input
	getLine: function( stream, callback, style )
	{
		var self = this,
		prompt = stream.children().last(),
		input = self.lineInput,
		lastInput = $( '.finished-input' ).last(),
		scrollParent = self.scrollParent;
		
		self.callback = callback || $.noop;
		
		// Set up the mutable history
		self.current = 0;
		self.mutable_history = self.history.slice();
		self.mutable_history.unshift( '' );
		
		// Store the text style
		self.style = style || '';
		
		// Adjust the input's width and ensure it's empty
		// -1 because it seems slightly too wide in FF4
		input
			//.width( stream.width() - prompt.width() - 1 )
			.val( '' )
			.addClass( self.style );
		
		prompt.append( self.form );
		
		// Scroll to the beginning of the last set of output
		if ( lastInput.length )
		{
			scrollParent.scrollTop(
				// The last input relative to the top of the document
				lastInput.offset().top
				// Minus the height of the top window
				//- this.statuswin.height()
				// Minus one further line
				- lastInput.height()
			);
		}
	},
	
	// Submit the input data
	submitLine: function()
	{
		var self = this,
		command = self.lineInput.val();
			
		// Hide the <form>, reset the styles
		self.form.detach();
		self.lineInput.removeClass( self.style );
		
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
		input = self.lineInput,
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
	
	// Get some input
	getChar: function( callback )
	{
		var self = this,
		input = self.charInput;
		
		self.callback = callback || $.noop;
		
		self.keyCode = self.charCode = 0;
		
		// Add the <input> and focus
		self.container.append( input );
		setTimeout( function(){
			input.focus();
		}, 1 );
	},
	
	// Submit the input data
	submitChar: function()
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
		self.charInput.detach();
		
		// Trigger a custom event for anyone listening in for key strokes
		doc.trigger({
			type: 'CharInput',
			input: input
		});
		
		self.callback( input );
	}
});

})( window, jQuery );