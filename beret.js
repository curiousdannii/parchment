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
            throw new Error('WEEBLE, panic\n');
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

        if (magic_number_is_string('FORM')) { // An IFF file.

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
                            throw new Error('fixme: error: multiple Stks\n');
                        }
                        stks = content.slice(iff_details[i][1],
                                             iff_details[i][2]+iff_details[i][1]);
                    } else if (tag=='CMem' || tag=='UMem') {

                        if (memory!=0) {
                            throw new Error('fixme: error: multiple memory segments\n');
                        }

                        memory_is_compressed = (tag=='CMem');

                        memory = content.slice(iff_details[i][1],
                                               iff_details[i][2]+iff_details[i][1]);
                    }
                }

                if (memory==0) {
                    throw new Error('fixme: error: no memory in quetzal\n');
                } else if (stks==0) {
                    throw new Error('fixme: error: no stacks in quetzal\n');
                } else if (pc==0) {
                    throw new Error('fixme: error: no header in quetzal\n');
                } else {
                    this.m_filetype = 'ok saved quetzal zcode';
                    this.m_engine.loadSavedGame(memory.length, memory,
                                                memory_is_compressed,
                                                stks.length, stks,
                                                pc);
                }
            }
        } else {
          // OK, just give up.
          this.m_filetype = 'error unknown general';
        }
    },

    get filetype() {
        return this.m_filetype;
    },

    get engine() {
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
