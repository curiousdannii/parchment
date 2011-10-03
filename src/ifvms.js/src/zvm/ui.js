/*
 * Z-Machine UI
 *
 * Copyright (c) 2011 The ifvms.js team
 * Licenced under the BSD
 * http://github.com/curiousdannii/ifvms.js
 */

/*
	
TODO:
	
*/

var UI = Object.subClass({
	init: function( engine )
	{
		this.e = engine;
	},
	
	buffer: '',
	styles: {},
	
	// Print text!
	print: function( text )
	{
		this.buffer += text;
	},
	
	// Set styles
	set_style: function( stylebyte )
	{
		var styles = this.styles,
		oldstyles;
		
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
		
		// Setting the style to Roman will clear the others
		if ( stylebyte == 0 )
		{
			this.styles = {};
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
	}
});