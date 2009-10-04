/*
 * Quetzal Common Save-File Format
 *
 * Copyright (c) 2003-2009 The Gnusto Contributors
 * Licenced under the GPL v2
 * http://github.com/curiousdannii/gnusto
 */
(function(){

// Form and chunk type constants
var IFZS = 'IFZS', IFHD = 'IFhd', CMEM = 'CMem', UMEM = 'UMem', STKS = 'Stks';

// A savefile
window.Quetzal = IFF.extend({
	// Parse a Quetzal savefile, or make a blank one
	init: function parse_quetzal(bytes)
	{
		this._super(bytes);
		if (bytes)
		{
			// Check this is a Quetzal savefile
			if (this.type != IFZS)
				throw new Error('Not a Quetzal savefile');

			// Go through the chunks and extract the useful ones
			for (var i = 0, l = this.chunks.length; i < l; i++)
			{
				var type = this.chunks[i].type, data = this.chunks[i].data;

				// Memory and stack chunks. Overwrites existing data if more than one of each is present!
				if (type == CMEM || type == UMEM)
				{
					this.memory = data;
					this.compressed = (type == CMEM);
				}
				else if (type == STKS)
					this.stacks = data;

				// Story file data
				else if (type == IFHD)
				{
					this.release = data.slice(0, 2);
					this.serial = data.slice(2, 8);
					// The checksum isn't used, but if we throw it away we can't round-trip
					this.checksum = data.slice(8, 10);
					this.pc = data[10] << 16 | data[11] << 8 | data[12];
				}
			}
		}
	},

	// Write out a savefile
	write: function write_quetzal()
	{
		// Reset the IFF type
		this.type = IFZS;

		// Format the IFhd chunk correctly
		var pc = this.pc,
		ifhd = this.release.concat(
			this.serial,
			this.checksum,
			(pc >> 16) & 0xFF, (pc >> 8) & 0xFF, pc & 0xFF
		);

		// Add the chunks
		this.chunks = [
			{type: IFHD, data: ifhd},
			{type: (this.compressed ? CMEM : UMEM), data: this.memory},
			{type: STKS, data: this.stacks}
		];

		// Return the byte array
		return this._super();
	}
});

})();
