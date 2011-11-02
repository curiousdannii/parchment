/*

Z-Machine UI
============

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	default background/foreground colours
	
*/

// Standard colours
var colours = [
	-2,
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
},

UI = Object.subClass({
	init: function( engine )
	{
		this.e = engine;
		this.buffer = '';
		this.styles = {};
		this.streams = [ 1, 0, [], 0 ];
		// Bit 0 is for @set_style, bit 1 for the header, and bit 2 for @set_font
		this.mono = engine.m.getUint8( 0x11 ) & 0x02;
		
		// Upper window stuff
		this.currentwin = 0;
		this.status = []; // Status window orders
		
		// Construct the basic windows
		this.e.orders.push(
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
	
	// Actually clear a window, called by the opcode handler below
	clear_window: function( window )
	{
		this.e.orders.push({
			code: 'clear',
			name: window ? 'status' : 'main',
			css: extend( {}, this.styles )
		});
	},
	
	erase_window: function( window )
	{
		this.flush();
		if ( window == -1 )
		{
			this.split_window( 0 );
			this.clear_window( 0 );
		}
		if ( window == -2 )
		{
			this.clear_window( 0 );
			this.clear_window( 1 );
		}
		else
		{
			this.clear_window( window );
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
	
	// Manage output streams
	output_stream: function( stream, addr )
	{
		stream = U2S( stream );
		if ( stream == 1 )
		{
			this.streams[0] = 1;
		}
		if ( stream == -1 )
		{
			;;; console.info( 'Disabling stream one - it actually happened!' );
			this.streams[0] = 0;
		}
		if ( stream == 3 )
		{
			this.streams[2].unshift( [ addr, '' ] );
		}
		if ( stream == -3 )
		{
			var data = this.streams[2].shift(),
			text = this.e.text.text_to_zscii( data[1] );
			this.e.m.setUint16( data[0], text.length );
			this.e.m.setBuffer( data[0] + 2, text );
		}
	},
	
	// Print text!
	print: function( text )
	{
		// Stream 3 gets the text first
		if ( this.streams[2].length )
		{
			this.streams[2][0][1] += text;
		}
		// Don't print if stream 1 was switched off (why would you do that?!)
		else if ( this.streams[0] )
		{
			// Check if the monospace font bit has changed
			// Unfortunately, even now Inform changes this bit for the font statement, even though the 1.1 standard depreciated it :(
			var fontbit = this.e.m.getUint8( 0x11 ) & 0x02;
			if ( fontbit != ( this.mono & 0x02 ) )
			{
				// Flush if we're actually changing font (ie, the other bits are off)
				if ( !( this.mono & 0xFD ) )
				{
					this.flush();
				}
				this.mono ^= 0x02;
			}
			this.buffer += text;
		}
	},
	
	// Set basic colours
	set_colour: function( foreground, background )
	{
		this.set_true_colour( colours[foreground], colours[background] );
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
		
		this.flush();
		
		// Setting the style to Roman will clear the others
		if ( stylebyte == 0 )
		{
			styles.reverse = styles['font-weight'] = styles['font-style'] = undefined;
			this.mono &= 0xFE;
		}
		if ( stylebyte & 0x01 )
		{
			styles.reverse = 1;
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
	},
	
	// Set true colours
	set_true_colour: function( foreground, background )
	{
		var styles = this.styles,
		newforeground = styles.color,
		newbackground = styles['background-color'];
		
		this.flush();
		
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