/* Client-side access to querystring name=value pairs
	Version 1.2.4
	30 March 2008
	Adam Vandenberg
*/
function Querystring(qs) { // optionally pass a querystring to parse
	this.params = {};
	this.get=Querystring_get;

	if (qs == null);
		qs=location.search.substring(1,location.search.length);

	if (qs.length == 0)
		return;

// Turn <plus> back to <space>
// See: http://www.w3.org/TR/REC-html40/interact/forms.html#h-17.13.4.1
	qs = qs.replace(/\+/g, ' ');
	var args = qs.split('&'); // parse out name/value pairs separated via &

// split out each name=value pair
	for (var i=0;i<args.length;i++) {
		var pair = args[i].split('=');
		var name = unescape(pair[0]);

		var value = (pair.length==2)
			? unescape(pair[1])
			: name;

		this.params[name] = value;
	}
}

function Querystring_get(key, default_) {
	var value=this.params[key];
	return (value!=null) ? value : default_;
}
// Taken from "Remedial Javascript" by Douglas Crockford:
// http://javascript.crockford.com/remedial.html

function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (typeof value.length === 'number' &&
                    !(value.propertyIsEnumerable('length')) &&
                    typeof value.splice === 'function') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}


function isEmpty(o) {
    var i, v;
    if (typeOf(o) === 'object') {
        for (i in o) {
            v = o[i];
            if (v !== undefined && typeOf(v) !== 'function') {
                return false;
            }
        }
    }
    return true;
}

String.prototype.entityify = function () {
    return this.replace(/&/g, "&amp;").replace(/</g,
        "&lt;").replace(/>/g, "&gt;");
};

String.prototype.quote = function () {
    var c, i, l = this.length, o = '"';
    for (i = 0; i < l; i += 1) {
        c = this.charAt(i);
        if (c >= ' ') {
            if (c === '\\' || c === '"') {
                o += '\\';
            }
            o += c;
        } else {
            switch (c) {
            case '\b':
                o += '\\b';
                break;
            case '\f':
                o += '\\f';
                break;
            case '\n':
                o += '\\n';
                break;
            case '\r':
                o += '\\r';
                break;
            case '\t':
                o += '\\t';
                break;
            default:
                c = c.charCodeAt();
                o += '\\u00' + Math.floor(c / 16).toString(16) +
                    (c % 16).toString(16);
            }
        }
    }
    return o + '"';
};

String.prototype.supplant = function (o) {
    return this.replace(/{([^{}]*)}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "");
};
/* Taken from:
 *
 * http://ecmanaut.blogspot.com/2007/11/javascript-base64-singleton.html
 *
 * With minor modifications to decode a b64 string to a byte array instead
 * of a string. */
// Actually with some fairly major modifications to INCREASE SPEED!!
// There's rather little that resembles the original code now... is the reference still warranted?

var base64_tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var base64_tab2 = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7,
    'I': 8, 'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15,
    'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23,
    'Y': 24, 'Z': 25, 'a': 26, 'b': 27, 'c': 28, 'd': 29, 'e': 30, 'f': 31,
    'g': 32, 'h': 33, 'i': 34, 'j': 35, 'k': 36, 'l': 37, 'm': 38, 'n': 39,
    'o': 40, 'p': 41, 'q': 42, 'r': 43, 's': 44, 't': 45, 'u': 46, 'v': 47,
    'w': 48, 'x': 49, 'y': 50, 'z': 51, 0: 52, 1: 53, 2: 54, 3: 55,
    4: 56, 5: 57, 6: 58, 7: 59, 8: 60, 9: 61, '+': 62, '/': 63, '=': 64};

function encode_base64(data) {
    var out = "", c1, c2, c3, e1, e2, e3, e4;
	for (var i = 0, l = data.length; i < l; ) {
		c1 = data[i++];
		c2 = data[i++];
		c3 = data[i++];
		e1 = c1 >> 2;
		e2 = ((c1 & 3) << 4) + (c2 >> 4);
		e3 = ((c2 & 15) << 2) + (c3 >> 6);
		e4 = c3 & 63;

		// Consider other string concatenation methods?
		out += (base64_tab.charAt(e1) +
			base64_tab.charAt(e2) +
			base64_tab.charAt(e3) +
			base64_tab.charAt(e4));
	}
	if (isNaN(c2))
		out = out.slice(0, -2) + "==";
	else if (isNaN(c3))
		out = out.slice(0, -1) + "=";
	return out;
}

function decode_base64(data, out) {
    if (typeof(out) == "undefined")
      out = [];
    var c1, c2, c3, e1, e2, e3, e4;
    for (var i = 0, l = data.length; i < l; ) {
        e1 = base64_tab2[data.charAt(i++)];
        e2 = base64_tab2[data.charAt(i++)];
        e3 = base64_tab2[data.charAt(i++)];
        e4 = base64_tab2[data.charAt(i++)];
        c1 = (e1 << 2) + (e2 >> 4);
        c2 = ((e2 & 15) << 4) + (e3 >> 2);
        c3 = ((e3 & 3) << 6) + e4;
        out.push(c1, c2, c3);
    }
    if (e4 == 64)
        out.pop();
    if (e3 == 64)
        out.pop();
    return out;
}
function FatalError(message) {
  this.message = message;
  this.traceback = this._makeTraceback(arguments.callee);
  this.onError(this);
}

FatalError.prototype = {
  onError: function(e) { },

  _makeTraceback: function(procs) {
    // This function was taken from gnusto-engine.js and modified.
    var procstring = '';

    var loop_count = 0;
    var loop_max = 100;

    while (procs != null && loop_count < loop_max) {
      var name = procs.toString();

      if (!name) {
	procstring = '\n  (anonymous function)'+procstring;
      } else {
	var r = name.match(/function (\w*)/);

	if (!r || !r[1]) {
	  procstring = '\n  (anonymous function)' + procstring;
	} else {
          procstring = '\n  ' + r[1] + procstring;
	}
      }

      try {
        procs = procs.caller;
      } catch (e) {
        // A permission denied error may have just been raised,
        // perhaps because the caller is a chrome function that we
        // can't have access to.
        procs = null;
      }
      loop_count++;
    }

    if (loop_count==loop_max) {
      procstring = '...' + procstring;
    }

    return "Traceback (most recent call last):\n" + procstring;
  }
}
// -*- Mode: Java; tab-width: 2; -*-
// $Id: beret.js,v 1.22 2006/10/24 16:11:09 naltrexone42 Exp $
//
// Copyright (c) 2003 Thomas Thurman
// thomas@thurman.org.uk
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of version 2 of the GNU General Public License
// as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have be able to view the GNU General Public License at
// http://www.gnu.org/copyleft/gpl.html ; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.

////////////////////////////////////////////////////////////////
//
// iff_parse
//
// Parses an IFF file entirely contained in the array |s|.
// The return value is a list. The first element is the form type
// of the file; subsequent elements represent chunks. Each chunk is
// represented by a list whose first element is the chunk type,
// whose second element is the starting offset of the data within
// the array, and whose third element is the length.
//
function iff_parse(s) {

    function num_from(offset) {
        return s[offset]<<24 | s[offset+1]<<16 | s[offset+2]<<8 | s[offset+3];
    }

    function string_from(offset) {
        return String.fromCharCode(s[offset]) +
            String.fromCharCode(s[offset+1]) +
            String.fromCharCode(s[offset+2]) +
            String.fromCharCode(s[offset+3]);
    }

    var result = [string_from(8)];

    var cursor = 12;

    while (cursor < s.length) {
        var chunk = [string_from(cursor)];
        var chunk_length = num_from(cursor+4);

        if (chunk_length<0 || (chunk_length+cursor)>s.length) {
            // fixme: do something sensible here
            throw new FatalError('WEEBLE, panic\n');
            return [];
        }

        chunk.push(cursor+8);
        chunk.push(chunk_length);

        result.push(chunk);

        cursor += 8 + chunk_length;
        if (chunk_length % 2) cursor++;
    }

    return result;
}

function Beret(engine) {
  this.m_engine = engine;
}

Beret.prototype = {

    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////
    //                                                            //
    //   PUBLIC METHODS                                           //
    //                                                            //
    //   Documentation for these methods is in the IDL.           //
    //                                                            //
    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////

    load: function b_load(content) {

        function magic_number_is_string(str) {
            for (var ij=0; ij<str.length; ij++) {
                if (str.charCodeAt(ij)!=content[ij]) {
                    return false;
                }
            }
            return true;
        }

        if (content[0]<9) {
  			    // Infocom file, naked.

				    // FIXME: This check is way too simple. We should look at
				    // some of the other fields as well for sanity-checking.
            this.m_filetype = 'ok story naked zcode';
            this.m_engine.loadStory(content);
        } else if (magic_number_is_string('FORM')) { // An IFF file.

            var iff_details = iff_parse(content);

            if (iff_details.length==0) {

                // Invalid IFF file.

                this.m_filetype = 'invalid unknown iff';

            } else if (iff_details[0]=='IFZS') {

                // Quetzal saved file.

                // Currently, we require that a loaded Quetzal file
                // is from the same story that's currently loaded.
                // One day we'll have a way of getting the right
                // story out of the registry.

                // FIXME: We also don't check this yet. We should. We will.

                var memory = 0;
                var memory_is_compressed = 0;
                var stks = 0;
                var pc = 0;

                for (var i=1; i<iff_details.length; i++) {
                    var tag = iff_details[i][0];
                    if (tag=='IFhd') {

                        // validate that saved game release number matches loaded game
                        var release_num_location = iff_details[i][1];
                        var serial_num_location = iff_details[i][1]+2;
                        if (
                         // if no game is loaded...
                        (!this.m_engine) ||
                         // or the game has a different release number...
                        (this.m_engine.getByte(0x02) != content[release_num_location]) || (this.m_engine.getByte(0x03) != content[release_num_location+1]) ||
                         // or the game has a different serial number...
                        (this.m_engine.getByte(0x12) != content[serial_num_location]) || (this.m_engine.getByte(0x13) != content[serial_num_location+1]) ||
                        (this.m_engine.getByte(0x14) != content[serial_num_location+2]) || (this.m_engine.getByte(0x15) != content[serial_num_location+3]) ||
                        (this.m_engine.getByte(0x16) != content[serial_num_location+4]) || (this.m_engine.getByte(0x17) != content[serial_num_location+5])
                        // w\We should also validate checksum, but I don't believe we store this if a game is too old to have one.  So let's not risk it.
                        ){
                            //The save game isn't for the currently loaded game.  Bail out.
                            this.m_filetype = 'mismatch';
                            break;
                        }

                        var pc_location = iff_details[i][1]+10;
                        pc = content[pc_location]<<16 |
                            content[pc_location+1]<<8 |
                            content[pc_location+2];
                    } else if (tag=='Stks') {
                        if (stks!=0) {
                            throw new FatalError('fixme: error: multiple Stks\n');
                        }
                        stks = content.slice(iff_details[i][1],
                                             iff_details[i][2]+iff_details[i][1]);
                    } else if (tag=='CMem' || tag=='UMem') {

                        if (memory!=0) {
                            throw new FatalError('fixme: error: multiple memory segments\n');
                        }

                        memory_is_compressed = (tag=='CMem');

                        memory = content.slice(iff_details[i][1],
                                               iff_details[i][2]+iff_details[i][1]);
                    }
                }

                if (memory==0) {
                    throw new FatalError('fixme: error: no memory in quetzal\n');
                } else if (stks==0) {
                    throw new FatalError('fixme: error: no stacks in quetzal\n');
                } else if (pc==0) {
                    throw new FatalError('fixme: error: no header in quetzal\n');
                } else {
                    this.m_filetype = 'ok saved quetzal zcode';
                    this.m_engine.loadSavedGame(memory.length, memory,
                                                memory_is_compressed,
                                                stks.length, stks,
                                                pc);
                }
            } else if (iff_details[0]=='IFRS') {
								// Blorb resources file, possibly containing
								// Z-code.

								this.m_filetype = 'invalid story blorb';

								// OK, so go digging for it.	
								// The full list of executable formats, from
								// <news:82283c$uab$1@nntp9.atl.mindspring.net>, is:

								var blorb_formats = {
										'ZCOD': 'zcode',
										'GLUL': 'glulx',
										'TADG': 'tads',
										'ALAN': 'alan',
										'HUGO': 'hugo',
										'SAAI': 'scottadams', // Adventure International
										'SAII': 'scottadams', // Possibly an old error
										'MSRL': 'magneticscrolls'
								};
								
								// FIXME: It's (obviously) technically invalid if
								// a file's Blorb type signature doesn't match with its
								// magic number in the code, but should we give an error?
								// For example, what if a file marked GLUL turns out
								// to be z-code?

								for (var j=1; j<iff_details.length; j++) {

										if (iff_details[j][0] in blorb_formats) {
												var start = iff_details[j][1];
												var length = iff_details[j][2];

												this.load(content.slice(start,
																								start+length));
												this.m_filetype = 'ok story blorb '+
														blorb_formats[iff_details[j][0]];
												
												return;
										}
								}
            } else {
					      this.m_filetype = 'error unknown iff';
            }
        } else {
          // OK, just give up.
          this.m_filetype = 'error unknown general';
        }
    },

    filetype: function b_filetype() {
        return this.m_filetype;
    },

    engine: function b_engine() {
        return this.m_engine;
    },

    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////
    //                                                            //
    //   PRIVATE VARIABLES                                        //
    //                                                            //
    ////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////

    m_filetype: 'error none unseen',
    m_engine: null
};
(function(){
	// File functions and classes
	// Based largely on code by Thomas Thurman
	window.file = {};

	// A story file
	file.story = IFF.extend({
		// Parse a zblorb or naked zcode story file
		init: function parse_zblorb(data, story_name)
		{
			this.title = story_name;

			// Check for naked zcode
			// FIXME: This check is way too simple. We should look at
			// some of the other fields as well for sanity-checking.
			if (data[0] < 9)
			{
				this.filetype = 'ok story naked zcode';
				this._super();
				this.chunks.push({
					type: 'ZCOD',
					data: data
				});
				this.zcode = data;
			}
			// Check for potential zblorb
			else if (IFF.string_from(data, 0) == 'FORM')
			{
				this._super(data);
				if (this.type == 'IFRS')
				{
					// We have Blorb!
					this.images = [];
					this.resources = [];

					// Go through the chunks and extract the useful ones
					for (var i = 0, l = this.chunks.length; i < l; i++)
					{
						var type = this.chunks[i].type;
						if (type == 'RIdx')
							// The Resource Index Chunk, used by parchment for numbering images correctly
							for (var j = 0, c = IFF.num_from(this.chunks[i].data, 0); j < c; j++)
								this.resources.push({
									usage: IFF.string_from(this.chunks[i].data, 4 + j * 12),
									number: IFF.num_from(this.chunks[i].data, 8 + j * 12),
									start: IFF.num_from(this.chunks[i].data, 12 + j * 12)
								});

						else if (type == 'ZCOD' && !this.zcode)
							// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
							this.zcode = this.chunks[i].data;

						else if (type == 'IFmd')
						{
							// Treaty of Babel metadata
							// Will most likely break UTF-8
							this.metadata = String.fromCharCode.apply(this, this.chunks[i].data);
							var metadataDOM = $(this.metadata);
							if (metadataDOM)
							{
								this.metadataDOM = metadataDOM;

								// Extract some useful info
								if ($('title', metadataDOM))
									this.title = $('title', metadataDOM).text();
								if ($('ifid', metadataDOM))
									this.ifid = $('ifid', metadataDOM).text();
							}
						}
/*
						else if (type == 'PNG ' || type == 'JPEG')
							for (var j = 0, c = this.resources.length; j < c; j++)
							{
								if (this.resources[j].usage == 'Pict' && this.resources[j].start == this.chunks[i].offset)
									// A numbered image!
									this.images[this.resources[j].number] = new image(this.chunks[i]);
							}
*/
						else if (type == 'Fspc')
							this.frontispiece = IFF.num_from(this.chunks[i].data, 0);
					}

					if (this.zcode)
						this.filetype = 'ok story blorbed zcode';
					else
						this.filetype = 'error: no zcode in blorb';
				}
				// Not a blorb
				else if (this.type == 'IFZS')
					this.filetype = 'error: trying to load a Quetzal savefile';
				else
					this.filetype = 'error unknown iff';
			}
			else
				// Not a story file
				this.filetype = 'error unknown general';
		},

		// Load zcode into engine
		load: function loadIntoEngine(engine)
		{
			if (this.zcode)
				engine.loadStory(this.zcode);
			window.document.title = this.title + ' - Parchment';
		}
	});
/*
	// Images made from byte arrays
	file.image = base2.Base.extend({
		// Initialise the image with a byte array
		constructor: function init_image(chunk)
		{
			this.chunk = chunk;

			this.dataURI = function create_dataURI()
			{
				// Only create the image when first requested, the encoding could be quite slow
				// Would be good to replace with a getter if it can be done reliably
				var encoded = encode_base64(this.chunk.data);
				if (this.chunk.type == 'PNG ')
					this.URI = 'data:image/png;base64,' + encoded;
				else if (this.chunk.type == 'JPEG')
					this.URI = 'data:image/jpeg;base64,' + encoded;
				this.dataURI = function() {return this.URI;};
				return this.URI;
			};
		}
	});
*/
})();
