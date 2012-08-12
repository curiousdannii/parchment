/*

Text grid (ie, status) windows
==============================

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Check cursor column is correct?

*/

var TextGrid = Object.subClass({
	// Set up the class, and attach a stream handler
	init: function( elem, io )
	{
		var self = this;
		this.elem = elem
			.addClass( 'TextGrid' )
			.on( 'stream', function( e )
			{
				self.stream( e.order.data );
				return false;
			})
			.css( 'bgcolor', 'inherit' );
		this.lineheight = io.env.charheight;
		this.io = io;
		io.TextInput.statuswin = this.elem;
		this.lines = [];
		this.styles = [];
		this.cursor = [0, 0]; // row, col
	},
	
	// Accept a stream of text grid orders
	stream: function( orders )
	{
		var order, code, i, j,
		elem = this.elem,
		row = this.cursor[0],
		col = this.cursor[1],
		lines = this.lines,
		styles = this.styles,
		env = this.io.env,
		line, text, temp,
		stylecode,
		oldheight = lines.length;
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Adjust the height of the grid
			if ( code == 'height' )
			{
				// Increase the height
				while ( order.lines > lines.length )
				{
					this.addline();
				}
				
				// Decrease the height, and handle box quotations
				if ( order.lines < lines.length )
				{
					if ( order.lines != 0 )
					{
						// Fix bad heights (that would split a multi-line status) by increasing the requested height to the first blank line
						while ( order.lines < lines.length && /\S/.test( lines[order.lines].join( '' ) ) )
						{
							order.lines++;
						}
					
						// Add the floating box
						temp = $( '<div>' )
							.addClass( 'box' )
							.prependTo( this.io.target );
						// Position it where it would have been if it was part of the grid
						// Scroll to the bottom just in case
						window.scrollTo( 0, 9e9 );
						temp.css({
							top: $window.scrollTop() + this.lineheight * order.lines,
							// Account for .main's added 1px padding
							left: temp.offset().left - 1
						});
						// Fill it with the lines we'll be removing
						this.write( temp, lines.slice( order.lines ), styles.slice( order.lines ) );
					}
				
					lines.length = order.lines;
					styles.length = order.lines;
					if ( row > order.lines - 1 )
					{
						row = 0;
						col = 0;
					}
				}
			}
			
			// Empty the grid, but don't change it's size
			if ( code == 'clear' )
			{
				j = 0;
				while ( j < lines.length )
				{
					this.addline( j++ );
				}
				row = 0;
				col = 0;
			}
			
			// Set the cursor position
			// Not that our coordinates are -1 compared to the Z-Machine
			if ( code == 'cursor' )
			{
				row = order.to[0];
				col = order.to[1];
				
				// It is illegal to position the cursor outside the window, but some games do (ex, Lost Pig's Hints)
				if ( row < 0 )
				{
					row = 0;
				}
				if ( col < 0 )
				{
					col = 0;
				}
				
				// Add a row(s) if needed
				while ( row >= lines.length )
				{
					this.addline();
				}
			}
			
			if ( code == 'get_cursor' )
			{
				order.pos = [row, col];
				this.io.input( order );
			}
			
			// Add text to the grid
			if ( code == 'stream' )
			{
				// Add a row(s) if needed
				while ( row >= lines.length )
				{
					this.addline();
				}
				
				// Calculate the style attribute for this set of text
				stylecode = undefined;
				if ( order.css )
				{
					stylecode = $( '<tt>' )
						.appendTo( elem )
						.css( order.css )
						.attr( 'style' );
					if ( stylecode )
					{
						stylecode = ' style="' + stylecode + '"';
					}
				}
				// The <tt> will be removed in .write()
				
				// Add the text to the arrays
				text = order.text;
				j = 0;
				while ( j < text.length )
				{
					temp = text.charAt( j++ );
					// Regular character
					if ( temp != '\n' )
					{
						lines[row][col] = temp;
						styles[row][col++] = stylecode;
					}
					// New line, or end of a line
					if ( temp == '\n' || col == env.width )
					{
						row++;
						col = 0;
						
						// Add a row if needed, ie. we must still have text to go
						if ( row >= lines.length && j < text.length )
						{
							this.addline();
						}
					}
				}
			}
			
			if ( code == 'eraseline' )
			{
				for ( j = col; j < env.width; j++ )
				{
					lines[row][j] = ' ';
					styles[row][j] = undefined;
				}
			}
		}
		
		// Update the cursor
		this.cursor = [row, col];
		
		// Update the HTML
		this.write( elem, lines, styles );
		
		// Try to adjust the main window's padding - for now guess what the window's class is
		if ( lines.length != oldheight )
		{
			$( '.main' )
				.css( 'padding-top', elem.height() );
		}
	},
	
	// Update the HTML
	write: function( elem, lines, styles )
	{
		var result = '',
		i = 0, j,
		text,
		style;
		
		// Go through the lines and styles array, constructing a <tt> whenever the styles change
		while ( i < lines.length )
		{
			text = '';
			style = styles[i][0];
			for ( j = 0; j < lines[i].length; j++ )
			{
				if ( styles[i][j] == style )
				{
					text += lines[i][j];
				}
				else
				{
					result += '<tt' + ( style || '' ) + '>' + text + '</tt>';
					style = styles[i][j];
					text = lines[i][j];
				}
			}
			result += '<tt' + ( style || '' ) + '>' + text + '</tt>';
			if ( ++i < lines.length )
			{
				result += '<br>';
			}
		}
		elem.html( result );
	},
	
	// Add a blank line
	addline: function( row )
	{
		var width = this.io.env.width,
		line = [],
		i = 0;
		row = row || this.lines.length;
		while ( i++ < width )
		{
			line.push( ' ' );
		}
		this.lines[row] = line;
		this.styles[row] = Array( width );
	}
});