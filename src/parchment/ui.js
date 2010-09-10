/*
 * Parchment UI
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function($){

var window = this,

// Wrap document
doc = $( document );

// window.scrollByPages() compatibility
if ( !window.scrollByPages )
{
	window.scrollByPages = function( pages )
	{
		// From Mozilla's nsGfxScrollFrame.cpp
		// delta = viewportHeight - Min( 10%, lineHeight * 2 )
		var height = doc[0].documentElement.clientHeight,
		delta = height - Math.min( height / 10, parseInt( $( 'body' ).css( 'line-height' ) ) * 2 );
		scrollBy( 0, delta * pages );
	};
}

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

// The main UI class
parchment.lib.UI = Object.subClass({

	// Stylesheet management
	// Add some stylesheets, disabled at first
	stylesheet_add: function( /* title, url, ... */ )
	{
		var args = arguments, i;
		for ( i = 1; i < args.length; i++ )
		{
			$( '<link>', {
				rel: 'alternate stylesheet',
				href: args[i],
				title: args[0]
			})
				.appendTo( 'head' )
				[0].disabled = true;
		}
	},
	// Switch on/off a stylesheet
	stylesheet_switch: function( title, enable )
	{
		$( 'link[rel*=stylesheet][title=' + title + ']' )
			.each( function(){
				this.disabled = !enable;
			});
	}

});

// A generic text input class
// Can take both line and character input, though separate <input> elements are used
parchment.lib.TextInput = Object.subClass({
	// Set up the text inputs with a container and stream
	// container is the greatest domain for which this instance should control input
	// stream is the element which the line <input> will actually be inserted into
	init: function( container, stream )
	{
		var self = this,
		container = $( container ),
		
		// The line input element
		lineInput = $( '<input>', {
			keydown: function( event )
			{
				var keyCode = event.which;
				
				// Check for up/down to use the command history
				if ( keyCode == 38 ) // up -> prev
				{
					self.prev_next( 1 );
				}
				if ( keyCode == 40 ) // down -> next
				{
					self.prev_next( -1 );
				}
				
				// Trigger page up/down on the body
				// FIX: Won't scroll repeatably
				if ( keyCode == 33 ) // Up
				{
					scrollByPages(-1);
				}
				if ( keyCode == 34 ) // Down
				{
					scrollByPages(1);
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
		
		// A form to contain it
		self.form = $( '<form>', {
			'class': 'LineInput',	
			submit: function()
			{
				self.submitLine();
				return false;
			}
		})
			.append( lineInput );
		
		// Focus clicks in the container (only)
		// To focus document clicks use UI.addTextInput()
		container.bind( 'click.TextInput', function() {
			if ( $( '.LineInput' ).length )
			{
				lineInput.focus();
			}
			if ( $( '.CharInput' ).length )
			{
				charInput.focus();
			}
		});
		
		// Command history
		self.history = [];
		// current and mutable_history are set in .get()
		
		self.container = container;
		self.stream = $( stream );
		self.lineInput = lineInput;
		self.charInput = charInput;
	},
	
	// Cleanup so we can deconstruct
	die: function()
	{
		this.container.unbind( '.TextInput' );
	},
	
	// Get some input
	getLine: function( callback, style )
	{
		var self = this,
		prompt = self.stream.children().last(),
		input = self.lineInput;
		
		self.callback = callback || $.noop;
		
		// Set up the mutable history
		self.current = 0;
		self.mutable_history = self.history.slice();
		self.mutable_history.unshift( '' );
		
		// Store the text style
		self.style = style || '';
		
		// Adjust the input's width and ensure it's empty
		input
			.width( self.stream.width() - prompt.width() )
			.val( '' )
			.addClass( self.style );
		
		prompt.append( self.form );
		setTimeout( function(){
			input.focus();
		}, 1 );
	},
	
	// Submit the input data
	submitLine: function()
	{
		var self = this,
		command = self.lineInput.val();
			
		// Hide the <form>, reset the styles
		self.form.detach();
		self.lineInput.removeClass( self.style );
		
		// Copy back the command
		$( '<span class="finished-input">' + command.entityify() + '</span><br>' )
			.appendTo( self.stream.children().last() );
		
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

})(jQuery);
