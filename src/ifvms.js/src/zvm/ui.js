/*

Z-Machine UI
============

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	
*/

var UI = Object.subClass({
	init: function( engine )
	{
		this.e = engine;
		this.buffer = '';
		this.styles = {};
		this.streams = [ 1, 0, [], 0 ];
	},
	
	// Flush the buffer to the orders
	flush: function()
	{
		var oldstyles;
		
		// If we have a buffer transfer it to the orders
		if ( this.buffer != '' )
		{
			oldstyles = extend( {}, this.styles );
			this.e.orders.push({
				code: 'print',
				css: oldstyles,
				text: this.buffer
			});
			this.buffer = '';
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
			this.buffer += text;
		}
	},
	
	// Set styles
	set_style: function( stylebyte )
	{
		var styles = this.styles;
		
		this.flush();
		
		// Setting the style to Roman will clear the others
		if ( stylebyte == 0 )
		{
			styles.reverse = styles['font-weight'] = styles['font-style'] = styles['font-family'] = '';
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
			styles['font-family'] = 'monospace';
		}
	},
	
	// Manage output streams
	output_stream: function( stream, addr )
	{
		stream = this.e.U2S( stream );
		if ( stream == 1 )
		{
			this.streams[0] = 1;
		}
		if ( stream == -1 )
		{
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
	}
});