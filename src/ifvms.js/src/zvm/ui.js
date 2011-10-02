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
		engine.buffer = [];
	},
	
	styles: {},
	
	// Set styles
	set_style: function( stylebyte )
	{
		var styles = this.styles,
		buffer = this.e.buffer,
		oldstyles;
		
		// If we have a buffer transfer it to the orders
		if ( buffer != '' )
		{
			oldstyles = extend( {}, this.styles );
			this.e.orders.push({
				code: 'print',
				css: oldstyles,
				text: buffer
			});
			this.e.buffer = '';
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