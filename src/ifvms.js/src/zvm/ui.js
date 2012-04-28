/*

Z-Machine UI
============

Copyright (c) 2012 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

Note: is used by both ZVM and Gnusto. In the case of Gnusto the engine is actually GnustoRunner.
	The engine must have a StructIO modified env
	
*/

var ZVMUI = (function( undefined ){

// Utility to extend objects
var extend = function( old, add )
{
	for ( var name in add )
	{
		// Don't copy cleared styles
		if ( add[name] != undefined )
		{
			old[name] = add[name];
		}
	}
	return old;
},

// Standard colours
colours = [
	0xFFFE,
	0xFFFF,
	0x0000,
	0x001D,
	0x0340,
	0x03BD,
	0x59A0,
	0x7C1F,
	0x77A0,
	0x7FFF,
	0x5AD6,
	0x4631,
	0x2D6B
],

// Convert a 15 bit colour to RGB
convert_true_colour = function( colour )
{
	// Stretch the five bits per colour out to 8 bits
	var newcolour = Math.round( ( colour & 0x1F ) * 8.226 ) << 16
		| Math.round( ( ( colour & 0x03E0 ) >> 5 ) * 8.226 ) << 8
		| Math.round( ( ( colour & 0x7C00 ) >> 10 ) * 8.226 );
	newcolour = newcolour.toString( 16 );
	// Ensure the colour is 6 bytes long
	while ( newcolour.length < 6 )
	{
		newcolour = '0' + newcolour;
	}
	return '#' + newcolour;
};

return Object.subClass({

	colours: colours,
		
	init: function( engine, headerbit )
	{
		this.e = engine;
		this.buffer = '';
		this.styles = {};
		// Set our initial colours, or assume black on white
		this.env = {
			fgcolour: engine.env.fgcolour || '#000',
			bgcolour: engine.env.bgcolour || '#fff'
		};
		;;; this.reverse = 0;
		// Bit 0 is for @set_style, bit 1 for the header, and bit 2 for @set_font
		this.mono = headerbit;
		
		// Upper window stuff
		this.currentwin = 0;
		this.status = []; // Status window orders
		
		// Construct the basic windows
		engine.orders.push(
			{
				code: 'stream',
				name: 'status'
			},
			{
				code: 'stream',
				name: 'main'
			},
			{
				code: 'find',
				name: 'main'
			}
		);
	},
	
	// Clear the lower window
	clear_window: function()
	{
		this.e.orders.push({
			code: 'clear',
			name: 'main',
			css: extend( {}, this.styles )
		});
	},
	
	// Convert RGB to a true colour - RGB is a css colour code. Both rgb() and #000 formats are supported.
	convert_RGB: function( code )
	{
		var round = Math.round,
		data = /(\d+),\s*(\d+),\s*(\d+)|#(\w{1,2})(\w{1,2})(\w{1,2})/.exec( code ),
		result;
		
		// Nice rgb() code
		if ( data[1] )
		{
			result =  [ data[1], data[2], data[3] ];
		}
		else
		{
			// Messy CSS colour code
			result = [ parseInt( data[4], 16 ), parseInt( data[5], 16 ), parseInt( data[6], 16 ) ];
			// Stretch out compact #000 codes to their full size
			if ( code.length == 4 )
			{
				result = [ result[0] << 4 | result[0], result[1] << 4 | result[1], result[2] << 4 | result[2] ];
			}
		}
		
		// Convert to a 15bit colour
		return round( result[2] / 8.226 ) << 10 | round( result[1] / 8.226 ) << 5 | round( result[0] / 8.226 );
	},

	erase_line: function( value )
	{
		if ( value == 1 )
		{
			this.flush();
			this.status.push( { code: "eraseline" } );
		}
	},
	
	erase_window: function( window )
	{
		this.flush();
		if ( window < 1 )
		{
			this.clear_window();
		}
		if ( window == -1 )
		{
			this.split_window( 0 );
		}
		if ( window == -2 || window == 1 )
		{
			this.status.push( { code: "clear" } );
		}
	},
	
	// Flush the buffer to the orders
	flush: function()
	{
		var order;
		
		// If we have a buffer transfer it to the orders
		if ( this.buffer != '' )
		{
			order = {
				code: 'stream',
				// Copy the styles object so that we won't be affected by later style changes
				css: extend( {}, this.styles ),
				text: this.buffer
			};
			if ( this.mono )
			{
				order.node = 'tt';
			}
			( this.currentwin ? this.status : this.e.orders ).push( order );
			this.buffer = '';
		}
	},
	
	get_cursor: function( array )
	{
		// act() will flush
		this.status.push({
			code: 'get_cursor',
			addr: array
		});
		this.e.act();
	},
	
	// Set basic colours
	set_colour: function( foreground, background )
	{
		this.set_true_colour( colours[foreground], colours[background] );
	},
	
	set_cursor: function( row, col )
	{
		this.flush();
		this.status.push({
			code: 'cursor',
			to: [row - 1, col - 1]
		});
	},
	
	set_font: function( font )
	{
		// We only support fonts 1 and 4
		if ( font != 1 && font != 4 )
		{
			return 0;
		}
		var returnval = this.mono & 0x04 ? 4 : 1;
		if ( font != returnval )
		{
			this.flush();
			this.mono ^= 0x04;
		}
		return returnval;
	},
	
	// Set styles
	set_style: function( stylebyte )
	{
		var styles = this.styles;
		var doreverse;
		var temp;
		
		this.flush();
		
		// Setting the style to Roman will clear the others
		if ( stylebyte == 0 )
		{
			doreverse = this.reverse;
			this.reverse = styles['font-weight'] = styles['font-style'] = undefined;
			this.mono &= 0xFE;
		}
		if ( stylebyte & 0x01 )
		{
			doreverse = !this.reverse;
			this.reverse = 1;
		}
		if ( stylebyte & 0x02 )
		{
			styles['font-weight'] = 'bold';
		}
		if ( stylebyte & 0x04 )
		{
			styles['font-style'] = 'italic';
		}
		if ( stylebyte & 0x08 )
		{
			this.mono |= 0x01;
		}
		
		// Swap colours
		if ( doreverse )
		{
			temp = styles.color || this.env.fgcolour;
			styles.color = styles['background-color'] || this.env.bgcolour;
			styles['background-color'] = temp;
		}
	},
	
	// Set true colours
	set_true_colour: function( foreground, background )
	{
		var styles = this.styles,
		newforeground = styles.color,
		newbackground = styles['background-color'];
		var temp;
		
		this.flush();
		
		// Swap colours if reversed
		if ( this.reverse )
		{
			temp = foreground;
			foreground = background;
			background = temp;
		}
		
		if ( foreground == 0xFFFF )
		{
			newforeground = undefined;
		}
		else if ( foreground < 0x8000 )
		{
			newforeground = convert_true_colour( foreground );
		}
		
		if ( background == 0xFFFF )
		{
			newbackground = undefined;
		}
		else if ( background < 0x8000 )
		{
			newbackground = convert_true_colour( background );
		}

		// When reversed we must set colours
		if ( this.reverse )
		{
			newforeground = newforeground || this.env.bgcolour;
			newbackground = newbackground || this.env.fgcolour;
		}
		
		// Set the colours
		styles.color = newforeground;
		styles['background-color'] = newbackground;
	},
	
	set_window: function( window )
	{
		this.flush();
		this.currentwin = window;
		this.e.orders.push({
			code: 'find',
			name: window ? 'status' : 'main'
		});
		if ( window )
		{
			this.status.push({
				code: 'cursor',
				to: [0, 0]
			});
		}
	},
	
	split_window: function( lines )
	{
		this.flush();
		this.status.push({
			code: "height",
			lines: lines
		});
	}
});

})();