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
	// Note the container should be a jQuery wrapped element, not a selector
	init: function( container, classes )
	{
		var self = this,
		
		// The input element itself
		input = $( '<input>', {
			'class': classes || ''
		});
		
		// A form to contain it
		this.form = $( '<form/>', {
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
		
		
		this.input = input;
		this.container = container;
	},
	
	// Get some input
	get: function( callback )
	{
		this.callback = callback || $.noop;
		
		var container = this.container, input = this.input;
		
		// Adjust the input's width
		input.width( container.width() - container.children().last().width() );
		
		container.append( this.form );
		input.focus();
	},
	
	// Submit the input data
	submit: function()
	{
		var input = this.input,
		command = input.val();
			
		// Hide the <form> and clear the <input>
		this.form.detach();
		input.val( '' );
		
		// Copy back the command
		$( '<span class="finished-input">' + command.entityify() + '</span><br>' )
			.appendTo( this.container );
		
		this.callback( command );
	}
});

})();
