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
		// The submission handler
		var submit = function() {
			var form = $( this ),
			input = form.find( 'input' ),
			command = input.val();
			
			form.detach();
			input.val( '' );
			
			form.data().line_editor.callback( command );

			return false;
		},
		
		// The input element itself
		input = $( '<input>', {
			"class": classes || ''
		}),
		
		// A form to contain it
		form = $( '<form/>', {
			"class": 'generic-line-editor',
			data: {
				line_editor: this
			},
			submit: submit
		});
		
		form.append( input );
		this.form = form;
		this.input = input;
		this.container = container;
	},
	
	// Get some input
	get: function( callback )
	{
		this.callback = callback;
		this.form.appendTo( this.container );
		this.input.focus();
	}
});

})();
