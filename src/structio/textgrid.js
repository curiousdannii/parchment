/*

Text grid (ie, status) windows
==============================

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Needs style support
	Box support
	Check cursor is correct at end of grid

*/

var TextGrid = Object.subClass({
	// Set up the class, and attach a stream handler
	init: function( elem, io )
	{
		var self = this;
		this.elem = elem
			.addClass( 'TextGrid' )
			.bind( 'stream', function( e )
			{
				self.stream( e.order.data );
				return false;
			});
		this.io = io;
		this.io.TextInput.statuswin = this.elem;
		this.lines = [];
		this.styles = [];
		this.cursor = [0, 0]; // row, col
		this.blankline = Array( this.io.env.width + 1 ).join( ' ' );
	},
	
	// Accept a stream of text grid orders
	stream: function( orders )
	{
		var order, code, i,
		row = this.cursor[0],
		col = this.cursor[1],
		line, text, j;
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Adjust the height of the grid
			if ( code == 'height' )
			{
				// Increase the height
				while ( order.lines > this.lines.length )
				{
					this.lines.push( this.blankline );
					this.styles.push( Array( this.io.env.width ) );
				}
				
				// Decrease the height
				if ( order.lines < this.lines.length )
				{
					this.lines.length = order.lines;
					this.styles.length = order.lines;
					if ( row > order.lines - 1 )
					{
						row = 0;
						col = 0;
					}
				}
			}
			
			if ( code == 'cursor' )
			{
				row = order.to[0] - 1;
				col = order.to[1] - 1;
			}
			
			if ( code == 'get_cursor' )
			{
				order.pos = [row, col];
				this.io.input( order );
			}
			
			// Add text to the grid
			if ( code == 'stream' )
			{
				text = order.text.split( '\n' );
				j = 0;
				while ( j < text.length )
				{
					line = this.lines[row];
					this.lines[row] = line.substr( 0, col ) + text[j] + line.substr( col + text[j].length );
					col += text[j].length;
					if ( ++j < text.length )
					{
						row++;
						col = 0;
					}
				}
			}
			
			if ( code == 'eraseline' )
			{
				this.lines[row] = this.lines[row].slice( 0, col ) + this.blankline.slice( this.io.env.width - col );
			}
		}
		this.cursor = [row, col];
		
		// Update the HTML
		this.elem.html( '<tt>' + this.lines.join( '</tt><br><tt>' ) + '</tt>' );
	}
});