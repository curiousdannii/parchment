/*

Text grid (ie, status) windows
==============================

Copyright (c) 2015 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

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
		this.curheight = 0; // What the VM thinks the height is
		this.maxheight = 0; // Maximum height the window has been extended to this turn
		this.seenheight = 0; // Height the player saw last
		
		// Change the window's height to what is meant to be seen before an input event
		// Using Zarf's algorithm from http://eblong.com/zarf/glk/quote-box.html
		$doc.on( 'RequestingTextInput', function( e )
		{
			// If the player has seen the entire window we can shrink it
			if ( self.seenheight == self.maxheight )
			{
				self.maxheight = self.curheight;
			}
			
			// Set the true window height to maxheight
			self.lines.length = self.maxheight;
			self.seenheight = self.maxheight;
			self.maxheight = self.curheight;
			
			// Update the HTML
			self.write();
			$( '.main' ).css( 'padding-top', self.elem.height() );
		});
	},
	
	// Accept a stream of text grid orders
	stream: function( orders )
	{
		var order, code, i, j,
		row = this.cursor[0],
		col = this.cursor[1],
		lines = this.lines,
		styles = this.styles,
		width = this.io.env.width,
		text, temp,
		stylecode,
		oldheight;
		
		// Add a blank line or erase an existing one
		function addOrEraseLine( row )
		{
			var line = [],
			i = 0;
			row = row || lines.length;
			while ( i++ < width )
			{
				line.push( ' ' );
			}
			lines[row] = line;
			styles[row] = Array( width );
		}
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Adjust the height of the grid
			// Using Zarf's algorithm from http://eblong.com/zarf/glk/quote-box.html
			if ( code == 'height' )
			{
				oldheight = this.curheight;
				this.curheight = order.lines;
				
				// Increase what the maximum height of the window shown is
				if ( this.curheight > this.maxheight )
				{
					this.maxheight = this.curheight;
				}
				
				// If the VM thinkings it is enlarging the window but the rows already exist, erase them
				if ( this.curheight > oldheight )
				{
					j = oldheight;
					while ( j < this.curheight )
					{
						addOrEraseLine( j++ );
					}
				}
				
				// Increase the true window height to maxheight
				while ( this.maxheight > lines.length )
				{
					addOrEraseLine();
				}
			}
			
			// Empty the grid, but don't change it's size
			if ( code == 'clear' )
			{
				j = 0;
				while ( j < lines.length )
				{
					addOrEraseLine( j++ );
				}
				row = 0;
				col = 0;
			}
			
			// Set the cursor position
			// Note that our coordinates are -1 compared to the Z-Machine
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
					addOrEraseLine();
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
					addOrEraseLine();
				}
				
				// Calculate the style attribute for this set of text
				stylecode = '';
				if ( order.props )
				{
					temp = $( '<tt>', order.props )
						.appendTo( this.elem );
					
					text = temp.attr( 'style' );
					if ( text )
					{
						stylecode += ' style="' + text + '"';
					}
					text = temp.attr( 'class' );
					if ( text )
					{
						stylecode += ' class="' + text + '"';
					}
				}
				if ( stylecode === '' )
				{
					stylecode = undefined;
				}
				// The <tt> will be removed in .write()
				
				// Add the text to the arrays
				text = order.text;
				j = 0;
				while ( j < text.length )
				{
					temp = text.charAt( j++ );
					// Regular character
					if ( temp != '\r' )
					{
						lines[row][col] = temp;
						styles[row][col++] = stylecode;
					}
					// New line, or end of a line
					if ( temp == '\r' || col == width )
					{
						row++;
						col = 0;
						
						// Add a row if needed, ie. we must still have text to go
						if ( row >= lines.length && j < text.length )
						{
							addOrEraseLine();
						}
					}
				}
			}
			
			if ( code == 'eraseline' )
			{
				for ( j = col; j < width; j++ )
				{
					lines[row][j] = ' ';
					styles[row][j] = undefined;
				}
			}
		}
		
		// Update the cursor
		this.cursor = [row, col];
		
		// Update the HTML
		this.write();
		
		// Try to adjust the main window's padding - for now guess what the window's class is
		if ( lines.length != oldheight )
		{
			$( '.main' )
				.css( 'padding-top', this.elem.height() );
		}
	},
	
	// Update the HTML
	write: function()
	{
		var result = '',
		i = 0, j,
		lines = this.lines,
		styles = this.styles,
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
		this.elem.html( result );
	}
});