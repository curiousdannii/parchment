/*
 * ZVM Bootstrapper
 *
 * Copyright (c) 2011 The ifvms.js team
 * Licenced under the BSD
 * http://github.com/curiousdannii/ifvms.js
 */

// File download - largely taken from Parchment's file.js
// Will only work with good modern browsers, and only if the file is in the same domain
function text_to_array(text, array)
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
}

function download_to_array( url, callback )
{
	// Ajax options
	var options = {
		beforeSend: function ( XMLHttpRequest )
		{
			XMLHttpRequest.overrideMimeType('text/plain; charset=x-user-defined');
		},
		error: function ( XMLHttpRequest, textStatus )
		{
			throw 'Error loading story: ' + textStatus;
		},
		success: function ( data )
		{
			callback( text_to_array( $.trim( data )));
		},
		url: url
	};
	
	// Log the options for debugging
	log( 'download_to_array: ', options );
	
	// Get the file
	$.ajax(options);
}

// A basic ZVM runner
function run( engine )
{
	var order, i, response;

	engine.run();
	
	// Process the orders
	for ( i = 0; i < engine.orders.length; i++ )
	{
		order = engine.orders[i];
		
		// Text output
		// [ 'print', styles, text ]
		if ( order.code == 'print' )
		{
			$( '<span>' )
				.css( order.css )
				.html( order.text.replace( /\n/g, '<br>' ) )
				.appendTo( '#output' );
		}
		
		// Line input
		if ( order.code == 'read' )
		{
			// Get the input
			response = prompt( 'Text input' ) || '';
			// Don't append, it is the interpreter's responsibility to send the response back
			//$( '#output' ).append( response + '<br>' );
			
			// Return the input to the VM
			order.response = response;
			order.terminator = 13; // 1.1 spec
			engine.event( order );
		}
		
		// Quit
		if ( order.code == 'quit' )
		{
			return;
		}
	}
	
	// Clear the list of orders
	engine.orders = [];
	
	setTimeout( function(){ run(engine); }, 1 );
}

// Bootstrap ZVM with a given story URL
function bootstrap_zvm( url, walkthrough )
{
	// Instantiate ZVM, load the story
	download_to_array( url, function( data )
	{
		window.engine = new ZVM();
		engine.load( data );
		engine.restart();
		run( engine );
	});
}