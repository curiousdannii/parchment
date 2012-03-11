/*

ZVM outro
=========

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/
;;; (function(){ 'use strict';

// Expose
;;; window.ZVM = Object.subClass( extend( ZVM_core, runtime ) );

})( this );

// eval() stream modifications
ZVM = ZVM.subClass({
	gestalt: function( id, arg )
	{
		return id == 0x30 ? 1 : this._super( id, arg );
	},
	output_stream: function( stream, addr )
	{
		var data, text;
		if ( stream == 5 )
		{
			this.streams[4].unshift( [ addr, '' ] );
		}
		else if ( stream == 65531 ) // -5
		{
			data = this.streams[4].shift();
			text = this.text.text_to_zscii( '' + window['eval']( data[1] ) );
			this.m.setUint16( data[0], text.length );
			this.m.setBuffer( data[0] + 2, text );
		}
		else
		{
			this._super( stream, addr );
		}
	},
	// We don't use _super() for performance, and because we want to do something in the middle of print()
	print: function( text )
	{
		// Stream 3 gets the text first
		if ( this.streams[2].length )
		{
			this.streams[2][0][1] += text;
		}
		// eval() stream gets it next
		else if ( this.streams[4].length )
		{
			this.streams[4][0][1] += text;
		}
		// Don't print if stream 1 was switched off (why would you do that?!)
		else if ( this.streams[0] )
		{
			// Check if the monospace font bit has changed
			// Unfortunately, even now Inform changes this bit for the font statement, even though the 1.1 standard depreciated it :(
			var fontbit = this.m.getUint8( 0x11 ) & 0x02;
			if ( fontbit != ( this.ui.mono & 0x02 ) )
			{
				// Flush if we're actually changing font (ie, the other bits are off)
				if ( !( this.ui.mono & 0xFD ) )
				{
					this.ui.flush();
				}
				this.ui.mono ^= 0x02;
			}
			this.ui.buffer += text;
		}
	},
	restart: function()
	{
		this._super();
		this.streams[4] = [];
	}
});