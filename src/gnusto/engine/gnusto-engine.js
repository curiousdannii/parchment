// gnusto-lib.js || -*- Mode: Javascript; tab-width: 2; -*-
// The Gnusto JavaScript Z-machine library.
// $Header: /cvs/gnusto/src/xpcom/engine/gnusto-engine.js,v 1.116 2005/04/26 01:50:32 naltrexone42 Exp $
//
// Copyright (c) 2003-2011 The Gnusto Contributors
//
// The latest code is available at http://github.com/curiousdannii/gnusto/
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

var CVS_VERSION = '$Date: 2005/04/26 01:50:32 $';
var ENGINE_DESCRIPTION  = "Gnusto's interactive fiction engine";

////////////////////////////////////////////////////////////////
//
//                        PART THE FIRST
//
//       STUFF FROM GNUSTO-LIB WHICH STILL NEEDS MERGING IN
//
////////////////////////////////////////////////////////////////

var default_unicode_translation_table = {
  155:0xe4, // a-diaeresis
  156:0xf6, // o-diaeresis
  157:0xfc, // u-diaeresis
  158:0xc4, // A-diaeresis
  159:0xd6, // O-diaeresis
  160:0xdc, // U-diaeresis
  161:0xdf, // German "sz" ligature
  162:0xbb, // right quotation marks
  163:0xab, // left quotation marks
  164:0xeb, // e-diaeresis
  165:0xef, // i-diaeresis
  166:0xff, // y-diaeresis
  167:0xcb, // E-diaeresis
  168:0xcf, // I-diaeresis
  169:0xe1, // a-acute
  170:0xe9, // e-acute
  171:0xed, // i-acute
  172:0xf3, // o-acute
  173:0xfa, // u-acute
  174:0xfd, // y-acute
  175:0xc1, // A-acute
  176:0xc9, // E-acute
  177:0xcd, // I-acute
  178:0xd3, // O-acute
  179:0xda, // U-acute
  180:0xdd, // Y-acute
  181:0xe0, // a-grave
  182:0xe8, // e-grave
  183:0xec, // i-grave
  184:0xf2, // o-grave
  185:0xf9, // u-grave
  186:0xc0, // A-grave
  187:0xc8, // E-grave
  188:0xcc, // I-grave
  189:0xd2, // O-grave
  190:0xd9, // U-grave
  191:0xe2, // a-circumflex
  192:0xea, // e-circumflex
  193:0xee, // i-circumflex
  194:0xf4, // o-circumflex
  195:0xfb, // u-circumflex
  196:0xc2, // A-circumflex
  197:0xca, // E-circumflex
  198:0xce, // I-circumflex
  199:0xd4, // O-circumflex
  200:0xdb, // U-circumflex
  201:0xe5, // a-ring
  202:0xc5, // A-ring
  203:0xf8, // o-slash
  204:0xd8, // O-slash
  205:0xe3, // a-tilde
  206:0xf1, // n-tilde
  207:0xf5, // o-tilde
  208:0xc3, // A-tilde
  209:0xd1, // N-tilde
  210:0xd5, // O-tilde
  211:0xe6, // ae-ligature
  212:0xc6, // AE-ligature
  213:0xe7, // c-cedilla
  214:0xc7, // C-cedilla
  215:0xfe, // thorn
  216:0xf0, // eth
  217:0xde, // Thorn
  218:0xd0, // Eth
  219:0xa3, // pound sterling sign
  220:0x153, // oe-ligature
  221:0x152, // OE-ligature
  222:0xa1, // inverted pling
  223:0xbf // inverted query
};
var reverse_unicode_table = {};

var isNotConst = /\D/;
var temp_var = 0;

var PARENT_REC = 0;
var SIBLING_REC = 1;
var CHILD_REC = 2;

var CALLED_FROM_INTERRUPT = 0;

// Not everywhere has "window" defined
if ( !window )
{
	this.window = {};
}

// Temporary variables used in JITspace; they need to be
// defined for QML, though browser JS would allow them to be
// properties of the global object.
var dummy;
var t;
var t2;

var PARCHMENT_SECURITY_OVERRIDE = window.PARCHMENT_SECURITY_OVERRIDE;

// Placeholder when decoding arguments for opcodes to indicate that
// an argument needs to be popped from the stack.
//var ARG_STACK_POP = "SP";

////////////////////////////////////////////////////////////////
// Effect codes, returned from run(). See the explanation below
// for |handlers|.

// Returned when we're expecting a line of keyboard input.
//
// Answer with the string the user has entered.
var GNUSTO_EFFECT_INPUT      = '"RS"';

// Returned when we're expecting a single keypress (or mouse click).
// TODO: The lowest nibble may be 1 if the Z-machine has asked
// for timed input.
//
// Answer with the ZSCII code for the key pressed (see the Z-spec).
var GNUSTO_EFFECT_INPUT_CHAR = '"RC"';

// Returned when the Z-machine requests we save the game.
// Answer as in the Z-spec: 0 if we can't save, 1 if we can, or
// 2 if we've just restored.
var GNUSTO_EFFECT_SAVE       = '"DS"';

// Returned when the Z-machine requests we load a game.
// Answer 0 if we can't load. (If we can, we won't be around to answer.)
var GNUSTO_EFFECT_RESTORE    = '"DR"';

// Returned when the Z-machine requests we quit.
// Not to be answered, obviously.
var GNUSTO_EFFECT_QUIT       = '"QU"';

// Returned when the Z-machine requests that we restart a game.
// Assumedly, we won't be around to answer it.
var GNUSTO_EFFECT_RESTART    = '"NU"';

// Returned if we've run for more than a certain number of iterations.
// This means that the environment gets a chance to do some housekeeping
// if we're stuck deep in computation, or to break an infinite loop
// within the Z-code.
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_WIMP_OUT   = '"WO"';

// Returned if we hit a breakpoint.
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_BREAKPOINT = '"BP"';

// Returned if either of the two header bits which
// affect printing have changed since last time
// (or if either of them is set on first printing).
var GNUSTO_EFFECT_FLAGS_CHANGED = '"XC"';

// Returned if the story wants to check whether it's been pirated.
// Answer 1 if it is, or 0 if it isn't.
// You probably just want to return 0.
var GNUSTO_EFFECT_PIRACY     = '"CP"';

// Returned if the story wants to set the text style.
// effect_parameters() will return a list:
//  [0] = a bitcoded text style, as in the Z-spec,
//         or -1 not to set the style.
//  [1] = the foreground colour to use, as in the Z-spec
//  [2] = the background colour to use, as in the Z-spec
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_STYLE          = '"SS"';

// Returned if the story wants to cause a sound effect.
// effect_parameters() will return a list, whose
// vales aren't fully specified at present.
// (Just go "bleep" for now.)
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_SOUND          = '"FX"';

var GNUSTO_EFFECT_SPLITWINDOW    = '"TW"';
var GNUSTO_EFFECT_SETWINDOW      = '"SW"';
var GNUSTO_EFFECT_ERASEWINDOW    = '"YW"';
var GNUSTO_EFFECT_ERASELINE      = '"YL"';

// Returned if the story wants to set the position of
// the cursor in the upper window. The upper window should
// be currently active.
//
// effect_parameters() will return a list:
//  [0] = the new Y coordinate
//  [1] = the new X coordinate
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_SETCURSOR      = '"SC"';

var GNUSTO_EFFECT_SETBUFFERMODE  = '"SB"';
var GNUSTO_EFFECT_SETINPUTSTREAM = '"SI"';
var GNUSTO_EFFECT_GETCURSOR =      '"GC"';

// Returned if the story wants to print a table, as with
// @print_table. (This is complicated enough to get its
// own effect code, rather than just using an internal buffer
// as most printing does.)
//
// effect_parameters() will return a list of lines to print.
//
// Any value may be used as an answer; it will be ignored.
var GNUSTO_EFFECT_PRINTTABLE     = '"PT"';

////////////////////////////////////////////////////////////////
//
//                       PART THE SECOND
//
// THE HANDLERS AND HANDLER ARRAYS
//
////////////////////////////////////////////////////////////////

// JavaScript seems to have a problem with pointers to methods.
// We solve this in a Pythonesque manner. Each instruction handler
// is a simple function which takes two parameters: 1) the engine
// asking the question (i.e. the value which would be "this" if
// the function was a method), and 2) the list of actual arguments
// given in the z-code for that function.

function handleZ_je(engine, a) {

    if (a.length<2) {
      return ''; // it's a no-op
    } else if (a.length==2) {
      return engine._brancher(a[0]+'=='+a[1]);
    } else {
      var condition = '';
      for (var i=1; i<a.length; i++) {
	if (i!=1) condition = condition + '||';
	condition = condition + 't=='+a[i];
      }
      return 't='+a[0]+';'+engine._brancher(condition);
    }
  }

function handleZ_jl(engine, a) {
	// Convert both arguments to signed for the comparison.
	var t1code, t2code;
	if (isNotConst.test(a[0]))
		t1code = 't=' + a[0] + ';t=((t & 0x8000 ? ~0xFFFF : 0) | t);';
	else
		t1code = 't=' + engine._unsigned2signed(a[0]) + ';';
	if (isNotConst.test(a[1]))
		t2code = 't2=' + a[1] + ';t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);';
	else
		t2code = 't2=' + engine._unsigned2signed(a[1]) + ';';
	return t1code + t2code + engine._brancher('t<t2'); 
}

function handleZ_jg(engine, a) {
	// Convert both arguments to signed for the comparison.
	var t1code, t2code;
	if (isNotConst.test(a[0]))
		t1code = 't=' + a[0] + ';t=((t & 0x8000 ? ~0xFFFF : 0) | t);';
	else
		t1code = 't=' + engine._unsigned2signed(a[0]) + ';';
	if (isNotConst.test(a[1]))
		t2code = 't2=' + a[1] + ';t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);';
	else
		t2code = 't2=' + engine._unsigned2signed(a[1]) + ';';
	return t1code + t2code + engine._brancher('t>t2'); 
}
/***
function handleZ_dec_chk(engine, a) {
    return 't='+a[0]+';t2=_varcode_get(t)-1;_varcode_set(t2,t);'+engine._brancher('t2<'+a[1]);
  }
function handleZ_inc_chk(engine, a) {
    return 't='+a[0]+';t2=_varcode_get(t)+1;_varcode_set(t2,t);'+engine._brancher('t2>'+a[1]);
  }
***/

// Increment/decrement a variable and branch
// Calls the generic function and adds a brancher to the end

function handleZ_inc_chk(engine, a)
{
	var tcode = handleZ_inc(engine, a);
	tcode += '{var t1=incdec; t1 = ((t1 & 0x8000 ? ~0xFFFF : 0) | t1); var t2=' + a[1] + '; t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);' + engine._brancher('t1 > t2') + '}';
	return tcode;
/*
	var tcode, t2code;
	tcode = handleZ_incdec(engine, a[0], '+', 1);
	// Convert both arguments to signed for the comparison.
	if (isNotConst.test(a[1]))
		t2code = 't2=' + a[1] + ';t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);';
	else
		t2code = 't2=' + engine._unsigned2signed(a[1]) + ';';
	return tcode + t2code + 'tmp_'+temp_var+'=(('+'tmp_'+temp_var+' & 0x8000 ? ~0xFFFF : 0) | '+'tmp_'+temp_var+');' + engine._brancher('tmp_'+temp_var+' > t2');
*/
}

function handleZ_dec_chk(engine, a)
{
	var tcode = handleZ_dec(engine, a);
	tcode += '{var t1=incdec; t1 = ((t1 & 0x8000 ? ~0xFFFF : 0) | t1); var t2=' + a[1] + '; t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);' + engine._brancher('t1 < t2') + '}';
	return tcode;
/*
	var tcode, t2code;
	tcode = handleZ_incdec(engine, a[0], '-', 1);
	// Convert both arguments to signed for the comparison.
	if (isNotConst.test(a[1]))
		t2code = 't2=' + a[1] + ';t2=((t2 & 0x8000 ? ~0xFFFF : 0) | t2);';
	else
		t2code = 't2=' + engine._unsigned2signed(a[1]) + ';';
	return tcode + t2code + 'tmp_'+temp_var+'=(('+'tmp_'+temp_var+' & 0x8000 ? ~0xFFFF : 0) | '+'tmp_'+temp_var+');' + engine._brancher('tmp_'+temp_var+' < t2');
*/
}

function handleZ_jin(engine, a) {
    return engine._brancher("_obj_in("+a[0]+','+a[1]+')');
  }
function handleZ_test(engine, a) {
    return 't='+a[1]+';'+engine._brancher('('+a[0]+'&t)==t');
  }
function handleZ_or(engine, a) {
    return engine._storer('('+a[0]+'|'+a[1]+')');
  }
function handleZ_and(engine, a) {
    return engine._storer('('+a[0]+'&'+a[1]+')');
  }
function handleZ_test_attr(engine, a) {
    return engine._brancher('_test_attr('+a[0]+','+a[1]+')');
  }
function handleZ_set_attr(engine, a) {
    return '_set_attr('+a[0]+','+a[1]+')';
  }
function handleZ_clear_attr(engine, a) {
    return '_clear_attr('+a[0]+','+a[1]+')';
  }
/***
function handleZ_store(engine, a) {
    return "_varcode_set("+a[1]+","+a[0]+")";
  }
***/

// Store a variable
// Rather than calling _varcode_set() this function now access the variables directly
// a[0] is interpreted as in ZSD 4.2.2:
//	0     = top of game stack
//	1-15  = local variables
//	16 up = global variables

function handleZ_store(engine, a)
{
	var code;
	if (isNaN(a[0])) { // branch at runtime
		code = '(' + a[0] + ' == 0) ? m_gamestack[m_gamestack.length - 1] = ' + a[1] + ' : (' + a[0] + ' < 0x10) ? m_locals[( ' + a[0] + ' - 1 )] = ' + a[1] + ' : setWord(' + a[1] + ', m_vars_start + ( ' + a[0] + ' - 16 ) * 2 )';
	} else {
		if (a[0] == 0) {
			code = 'm_gamestack[m_gamestack.length - 1] = ' + a[1];
		} else if (a[0] < 0x10) {
			code = 'm_locals[( ' + a[0] + ' - 1 )] = ' + a[1];
		} else {
			code = 'setWord(' + a[1] + ', m_vars_start + ( ' + a[0] + ' - 16 ) * 2 )';
		}
	}
	return code;

/*	
	;;; if (isNotConst.test(a[0])) { engine.logger('Z_store', a[0]); }	
	;;; if (a[0] == null || a[0] === true || a[0] === false || a[0] < 0 || a[0] > 0xFFFF) { engine.logger('Z_store address', a[0]); }
	;;; if (a[1] == null || a[1] === true || a[1] === false || a[1] < 0 || a[1] > 0xFFFF) { engine.logger('Z_store value', a[1]); }

	if (a[0] == 0)
		return 'm_gamestack[m_gamestack.length - 1] = ' + a[1] + ';';
	else if (a[0] < 16)
		return 'm_locals[' + (a[0]-1) + '] = ' + a[1];
	else
	{
		// If the variable is a function rather than a constant it will have to be determined at run time
		if (isNotConst.test(a[0]))
			var code = 'var high = m_vars_start + (' + a[0] + ' - 16) * 2, low = high + 1;', high = 'high', low = 'low';
		else
			var code = '', high = engine.m_vars_start + (a[0] - 16) * 2, low = high + 1;

		// If we are setting a constant get the high and low bytes at compile time
		if (!isNotConst.test(a[1]))
		{
			var value = a[1];
			return code + 'm_memory[' + high + '] = ' + ((value >> 8) & 0xFF) + ';' +
				'm_memory[' + low + '] = ' + (value & 0xFF);
		}
		else
		{
			var tmp = 'tmp_' + (++temp_var);
			return code + 'var ' + tmp + ' = ' + a[1] + ';' +
				'm_memory[' + high + '] = (' + tmp + ' >> 8) & 0xFF;' +
				'm_memory[' + low + '] = ' + tmp + ' & 0xFF;';
		}
	}*/
}

function handleZ_insert_obj(engine, a) {
    return "_insert_obj("+a[0]+','+a[1]+")";
  }

// Load an array word
function handleZ_loadw(engine, a)
{
	// Inline this getUnsignedWord call
	//return engine._storer("getUnsignedWord(("+a[0]+"+2*"+a[1]+")&0xFFFF)");

	// Calculate the address
	// BUG: fails to wrap if the address is split across addresses 0xFFFF
	// and 0x0000. I don't care. --Z
	if (isNotConst.test(a[0]) || isNotConst.test(a[1]))
		var code = 'var tmp_' + (++temp_var) + ' = (' + a[0] + ' + 2 * ' + a[1] + ') & 0xFFFF, ',
			addr = 'tmp_' + temp_var,
			addr1 = addr+'+1';
	else
		var code = 'var ',
			addr = (a[0] + 2 * a[1]) & 0xFFFF,
			addr1 = addr+1;

	// Get the value and store it
	var tmp = 'tmp_' + (++temp_var);
	return code + tmp + ' = (m_memory[' + addr + '] << 8) | m_memory[' + addr1 + '];' +
		engine._storer(tmp);
}

function handleZ_loadb(engine, a) {
    return engine._storer("m_memory[0xFFFF&("+a[0]+"+"+a[1]+")]");
  }
function handleZ_get_prop(engine, a) {
    return engine._storer("_get_prop("+a[0]+','+a[1]+')');
  }
function handleZ_get_prop_addr(engine, a) {
    return engine._storer("_get_prop_addr("+a[0]+','+a[1]+')');
  }
function handleZ_get_next_prop(engine, a) {
    return engine._storer("_get_next_prop("+a[0]+','+a[1]+')');
  }
  
// Should add/mul/div also check for overflows?

function handleZ_add(engine, a) {
    return engine._storer( '(' + a[0]+' + '+a[1] + ') & 0xFFFF'); }
/***
function handleZ_sub(engine, a) {
    return engine._storer(a[0]+'-'+a[1]); }
***/

// Subtract and store
function handleZ_sub(engine, a)
{
	return engine._storer( '(' + a[0] + ' - ' + a[1] + ') & 0xFFFF' );
}

function handleZ_mul(engine, a) {
    return engine._storer( '(' + a[0]+'*'+a[1] + ') & 0xFFFF'); }
function handleZ_div(engine, a) {
    return engine._storer('_trunc_divide('+a[0]+','+a[1]+')');
  }
function handleZ_mod(engine, a) {
    return engine._storer('_trunc_modulo('+a[0]+','+a[1]+')');
  }
function handleZ_set_colour(engine, a) {
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_STYLE+",-1,"+a[0]+','+a[1]+"];return";
  }
function handleZ_throw(engine, a) {
    engine.m_compilation_running = 0;
    return "_throw_stack_frame("+a[0]+");return";
  }
function handleZ_jz(engine, a) {
    return engine._brancher(a[0]+'==0');
  }
function handleZ_get_sibling(engine, a) {
    return "t=_get_sibling("+a[0]+");"+engine._storer("t")+";"+engine._brancher("t");
  }
function handleZ_get_child(engine, a) {
    return "t=_get_child("+a[0]+");"+
      engine._storer("t")+";"+
      engine._brancher("t");
  }
function handleZ_get_parent(engine, a) {
    return engine._storer("_get_parent("+a[0]+")");
  }
function handleZ_get_prop_len(engine, a) {
    return engine._storer("_get_prop_len("+a[0]+')');
  }
/***
function handleZ_inc(engine, a) {
    return "t="+a[0]+';_varcode_set(_varcode_get(t)+1, t)';
  }
function handleZ_dec(engine, a) {
    return "t="+a[0]+';_varcode_set(_varcode_get(t)-1, t)';
  }
***/

// Increment and decrement opcodes
// Calls the following generic function

function handleZ_inc(engine, a)
{
//	return handleZ_incdec(engine, a[0], '+');

	var code = 'var incdec; ';
	if (isNaN(a[0])) { // branch at runtime
		code += 'var incdec; if (' + a[0] + ' == 0) { incdec = m_gamestack[m_gamestack.length - 1] = (m_gamestack[m_gamestack.length - 1] + 1) & 0xFFFF; } else if (' + a[0] + ' < 0x10) { incdec = m_locals[( ' + a[0] + ' - 1 )] = (m_locals[( ' + a[0] + ' - 1 )] + 1) & 0xFFFF; } else { var val = getUnsignedWord(m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); val++; setWord(val, m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); incdec = val; }';
	} else {
		if (a[0] == 0) {
			code += 'incdec = m_gamestack[m_gamestack.length - 1] = (m_gamestack[m_gamestack.length - 1] + 1) & 0xFFFF;';
		} else if (a[0] < 0x10) {
			code += 'incdec = m_locals[( ' + a[0] + ' - 1 )] = (m_locals[( ' + a[0] + ' - 1 )] + 1) & 0xFFFF;';
		} else {
			code += '{var val = getWord(m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); val++; setWord(val, m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); incdec = val;}';
		}
	}
	return code;
}

function handleZ_dec(engine, a)
{
	//	return handleZ_incdec(engine, a[0], '-');

	var code = 'var incdec; ';
	if (isNaN(a[0])) { // branch at runtime
		code += 'if (' + a[0] + ' == 0) { incdec = m_gamestack[m_gamestack.length - 1] = (m_gamestack[m_gamestack.length - 1] - 1) & 0xFFFF; } else if (' + a[0] + ' < 0x10) { incdec = m_locals[( ' + a[0] + ' - 1 )] = (m_locals[( ' + a[0] + ' - 1 )] - 1) & 0xFFFF; } else { var val = getUnsignedWord(m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); val--; setWord(val, m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); incdec = val; }';
	} else {
		if (a[0] == 0) {
			code += 'incdec = m_gamestack[m_gamestack.length - 1] = (m_gamestack[m_gamestack.length - 1] - 1) & 0xFFFF;';
		} else if (a[0] < 0x10) {
			code += 'incdec = m_locals[( ' + a[0] + ' - 1 )] = (m_locals[( ' + a[0] + ' - 1 )] - 1) & 0xFFFF;';
		} else {
			code += '{var val = getUnsignedWord(m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); val--; setWord(val, m_vars_start + ( ' + a[0] + ' - 16 ) * 2 ); incdec = val;}';
		}
	}
	return code;
}

// Increment and decrement variables
// A generic function used by dec, dec_chk, inc and inc_chk
// Rather than calling _varcode_set() and _varcode_get() this function now accesses the variables directly
// variable is interpreted as in ZSD 4.2.2:
//	0     = top of game stack
//	1-15  = local variables
//	16 up = global variables
/*
function handleZ_incdec(engine, variable, sign, varRequired)
{
	if (isNotConst.test(variable))
		engine.logger('Z_incdec', variable);

	var tmp = 'tmp_' + (++temp_var);
	if (variable == 0)
		return (varRequired ? 'var ' + tmp + ' = ' : '') + '(m_gamestack[m_gamestack.length - 1] = (m_gamestack[m_gamestack.length - 1]'+sign+'1)&0xFFFF);';
	else if (variable < 0x10)
		return (varRequired ? 'var ' + tmp + ' = ' : '') + '(m_locals[' + (variable-1) + '] = (m_locals[' + (variable-1) + ']'+sign+'1)&0xFFFF);';
	else
	{
		// If the variable is a function rather than a constant it will have to be determined at run time
		if (isNotConst.test(variable))
			var code = 'var add = m_vars_start + (' + variable + ' - 16) * 2, ', add = 'add';
		else
			var code = 'var ', add = engine.m_vars_start + (variable - 16) * 2;

		// Get the value from memory and inc/dec it!
		return code + tmp + ' = (m_memory[' + add + '] << 8) | m_memory[' + add + ' + 1];' +
			tmp + ' = (' + tmp + ' ' + sign + ' 1) & 0xFFFF;' +
			'm_memory[' + add + '] = (' + tmp + ' >> 8) & 0xFF;' +
			'm_memory[' + add + ' + 1] = ' + tmp + ' & 0xFF;';
	}
}
*/
function handleZ_print_addr(engine, a) {
    return engine._handler_zOut('_zscii_from('+a[0]+')',0);
  }
function handleZ_remove_obj(engine, a) {
    return "_remove_obj("+a[0]+','+a[1]+")";
  }
function handleZ_print_obj(engine, a) {
    return engine._handler_zOut("_name_of_object("+a[0]+")",0);
}
function handleZ_ret(engine, a) {
    engine.m_compilation_running=0;
    return "_func_return("+a[0]+');return';
  }
function handleZ_jump(engine, a) {
    engine.m_compilation_running=0;
    if (a[0] & 0x8000) {
      a[0] = (~0xFFFF) | a[0];
    }

    var addr=(a[0] + engine.m_pc) - 2;
    return "m_pc="+addr+";return";
  }
function handleZ_print_paddr(engine, a) {
    return engine._handler_zOut("_zscii_from("+engine.m_pc_translate_for_string(a[0])+")",0);
}

function handleZ_load( engine, a )
{
	var code;
	if (isNaN(a[0])) { // branch at runtime
		code = '(' + a[0] + ' == 0) ? m_gamestack[m_gamestack.length - 1] : (' + a[0] + ' < 0x10) ? m_locals[( ' + a[0] + ' - 1 )] : getUnsignedWord( m_vars_start + ( ' + a[0] + ' - 16 ) * 2 )';
	} else {
		if (a[0] == 0) {
			code = 'm_gamestack[m_gamestack.length - 1]';
		} else if (a[0] < 0x10) {
			code = 'm_locals[( ' + a[0] + ' - 1 )]';
		} else {
			code = 'getUnsignedWord( m_vars_start + ( ' + a[0] + ' - 16 ) * 2 )';
		}
	}
	return engine._storer( code );

	//return engine._storer('_varcode_get('+a[0]+')');
/*	var code;
	if ( a[0] == 0 ) {
		code = 'm_gamestack[m_gamestack.length - 1]';
	} else if ( a[0] < 0x10 ) {
		code = 'm_locals[( ' + a[0] + ' - 1 )]';
	} else {
		code = 'getUnsignedWord( m_vars_start + ( ' + a[0] + ' - 16 ) * 2 )';
	}
	return engine._storer( code );
	*/
}

function handleZ_rtrue(engine, a) {
    engine.m_compilation_running=0;
    return "_func_return(1);return";
  }
function handleZ_rfalse(engine, a) {
    engine.m_compilation_running=0;
    return "_func_return(0);return";
}

function handleZ_print(engine, a) {
    return engine._handler_print('', 0);
}

function handleZ_print_ret(engine, a) {
    engine.m_compilation_running = 0;
    return engine._handler_print('\n', 1)+';_func_return(1);return';
}

function handleZ_nop(engine, a) {
    return "";
  }

function handleZ_restart(engine, a) {
    engine.m_compilation_running=0;
    return "m_effects=["+GNUSTO_EFFECT_RESTART+"];return";
  }

function handleZ_ret_popped(engine, a) {
    engine.m_compilation_running=0;
    return "_func_return(m_gamestack.pop());return";
  }
function handleZ_catch(engine, a) {
    // The stack frame cookie is specified by Quetzal 1.3b s6.2
    // to be the number of frames on the stack.
    return engine._storer("m_call_stack.length");
}

function handleZ_pop(engine, a) {
    return "m_gamestack.pop()";
}

function handleZ_quit(engine, a) {
    engine.m_compilation_running=0;
    return "m_effects=["+GNUSTO_EFFECT_QUIT+"];return";
  }

function handleZ_new_line(engine, a) {
    return engine._handler_zOut("'\\n'",0);
}

function handleZ_show_status(engine, a){ //(illegal from V4 onward)
    engine._handler_zOut(''); //chalk forces repaint of status bar
    return "";
}

function handleZ_verify(engine, a) {
		return engine._brancher('_verify()');
}

function handleZ_illegal_extended(engine, a) {
    // 190 can't be generated; it's the start of an extended opcode
    gnusto_error(199);
  }

function handleZ_piracy(engine, a) {
    engine.m_compilation_running = 0;

    var setter = 'm_rebound=function(){'+engine._brancher('(!0)')+'};';//m_answers[0])')+'};';
    return "m_pc="+engine.m_pc+";"+setter+"m_effects=["+GNUSTO_EFFECT_PIRACY+"];return";
}

////////////////////////////////////////////////////////////////
//
// Call handlers:
//
// Gosub-generating functions, in increasing order of
// arity (no args, one arg, many args), with the
// no-store versions first. The "*_vs2" instructions
// are conceptually identical to the corresponding
// "*_vs" instructions, and share the same handlers.
//
// naltrexone-- I've removed the VERBOSE lines
// which were rendered incorrect by this. If you need to turn
// them on again, I'll put them back in in the new form.

function handleZ_call_1n(engine, a) {
    return engine._generate_gosub(a[0], '', 0);
}

function handleZ_call_1s(engine, a) {
    return engine._generate_gosub(a[0], '', 1);
}

function handleZ_call_2n(engine, a) {
    return engine._generate_gosub(a[0], a[1], 0);
}

function handleZ_call_2s(engine, a) {
    return engine._generate_gosub(a[0], a[1], 1);
}

function handleZ_call_vn(engine, a) {
		return engine._generate_gosub(a[0], a.slice(1), 0);
}

function handleZ_call_vs(engine, a) {
    return engine._generate_gosub(a[0], a.slice(1), 1);
}

////////////////////////////////////////////////////////////////
/***
function handleZ_store_w(engine, a) {
    return "setWord("+a[2]+","+a[0]+"+2*"+a[1]+")";
  }
***/

// Store a value in an array
function handleZ_store_w(engine, a)
{
	// Calculate the address
	if (isNotConst.test(a[0]) || isNotConst.test(a[1]))
		var code = 'var tmp_' + (++temp_var) + ' = (' + a[0] + ' + 2 * ' + a[1] + ') & 0xFFFF;', addr = 'tmp_' + temp_var, addr1 = addr+'+1';
	else
		var code = '', addr = (a[0] + 2 * a[1]) & 0xFFFF, addr1 = addr+1;

	// If we are setting a constant get the high and low bytes at compile time
	if (!isNotConst.test(a[2]))
	{
    if (engine.m_value_asserts) {
      if (a[2] == null || a[2] === true || a[2] === false || a[2] < 0 || a[2] > 0xFFFF)
        engine.logger('Z_store_w value', a[2]);
    }
		return code + 'm_memory[' + addr + '] = ' + ((a[2] >> 8) & 0xFF) + ';' +
			'm_memory[' + addr1 + '] = ' + (a[2] & 0xFF);
	}
	else
	{
		var tmp = 'tmp_' + (++temp_var);
		return code + 'var ' + tmp + ' = ' + a[2] + ';' +
			'm_memory[' + addr + '] = (' + tmp + ' >> 8) & 0xFF;' +
			'm_memory[' + addr1 + '] = ' + tmp + ' & 0xFF;';
	}
}

function handleZ_storeb(engine, a) {
    return "setByte("+a[2]+",("+a[0]+"+"+a[1]+")&0xFFFF)";
  }

function handleZ_putprop(engine, a) {
    return "_put_prop("+a[0]+','+a[1]+','+a[2]+')';
  }

// read, aread, sread, whatever it's called today.
// That's something that we can't deal with within gnusto:
// ask the environment to magic something up for us.
function handleZ_read(engine, a) {

		// JS representing number of deciseconds to wait before a
		// timeout should occur, or 0 if there shouldn't be one.
		var timeout_deciseconds;

		// JS representing the address of the timeout routine,
		// or 0 if there isn't one.
		var address_of_timeout_routine;

    engine.m_compilation_running = 0;

		// Since a[0] (address of the text buffer) is referenced so often,
		// we introduce a variable |a0| into JITspace with the same value.

		// A JS string telling us what to do if there isn't a timeout.
    var rebound_for_no_timeout =
				"_aread(m_answers[0],m_rebound_args[1],"+
				"m_rebound_args[2],m_answers[1])";

		// A JS string telling how to get the number of characters to "recap".
		var recaps_getter;

		// A JS string telling us how to get the number of characters the
		// text buffer can hold.
		var char_count_getter;

		if (engine.m_version>=5) {
				// In z5-z8, @read is a store instruction.
				rebound_for_no_timeout = engine._storer(rebound_for_no_timeout);
		} // Otherwise we just leave the call to _aread() as it is.

		if (engine.m_version>=5) {
				// z5+ use two header bytes at the start of the table.
				recaps_getter = "m_memory[0xFFFF&a0+1]";
				char_count_getter = "m_memory[0xFFFF&a0]";
		} else {
				// z1-z4 only use one. (They don't have recaps.)
				recaps_getter = '0';
				char_count_getter = "m_memory[0xFFFF&a0]+1";
		}

    if (a[2] && a[3] && (engine.m_version>=4)) {

				// This is a timed routine.
				// a[3] is the routine to call after a[2] deciseconds.

				timeout_deciseconds = a[2];

				address_of_timeout_routine = engine.m_pc_translate_for_routine(a[3]);

		} else {

				// No timeout.

				timeout_deciseconds = '0';

				address_of_timeout_routine = '0';

				// Optimisation: In this case we could optimise rebound_setter
				// so that it doesn't check whether to call the interrupt
				// service routine. We haven't done this here for simplicity,
				// but we did it in the simpler @read_char.
		}

		// JS for a function to handle the answer to this effect.
		// The answer will be one integer; if the integer is zero,
		// it's a request for a timeout; if it's nonzero, it's a
		// keycode to be stored as the present instruction dictates.
		var rebound_setter = "m_rebound=function(){"+
				"var t=1*m_answers[0];" +
				"if(t<0){"+
				"_func_interrupt(m_rebound_args[0],onISRReturn_for_read);"+ // -ve: timeout
				"}else{"+
				rebound_for_no_timeout + ";" +
				"}"+
				"};";

		var rebound_args_setter =
				"m_rebound_args=["+
				address_of_timeout_routine + "," + // Where to jump on timeout
				"a0,"+ // Address of text buffer
				a[1]+","+ // Address of parse buffer
				"];";

		/****************************************************************/

    return "var a0=eval("+ a[0] + ");" +
				"m_pc=" + engine.m_pc + ";" +
				rebound_args_setter +
				rebound_setter +
				"m_effects=["+
				GNUSTO_EFFECT_INPUT + "," +
				timeout_deciseconds + "," +
				recaps_getter + "," +
				char_count_getter + "," +
				"_terminating_characters()];return";
}

function handleZ_print_char(engine, a) {
    return engine._handler_zOut('_zscii_char_to_ascii('+a[0]+')',0);
}
function handleZ_print_num(engine, a) {
    return engine._handler_zOut('""+_unsigned2signed('+a[0]+')',0);
}
function handleZ_random(engine, a) {
    return engine._storer("_random_number("+a[0]+")");
  }
function handleZ_push(engine, a) {
    return 'm_gamestack.push('+a[0]+')';
  }
function handleZ_pull(engine, a)
{
//	return '_varcode_set(m_gamestack.pop(),'+a[0]+')';
	var code = 'var pull = m_gamestack.pop(); ';
	return code += handleZ_store(engine, [a[0], 'pull']);
}

function handleZ_split_window(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_SPLITWINDOW+","+a[0]+"];return";
  }
function handleZ_set_window(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_SETWINDOW+","+a[0]+"];return";
  }
function handleZ_erase_window(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_ERASEWINDOW+","+engine._unsigned2signed(a[0])+"];return";
  }
function handleZ_erase_line(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_ERASELINE+","+a[0]+"];return";
  }
function handleZ_set_cursor(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_SETCURSOR+","+a[0]+","+a[1]+"];return";
  }

function handleZ_get_cursor(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_GETCURSOR+","+a[0]+"];return";
  }

function handleZ_set_text_style(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_STYLE+","+a[0]+",0,0];return";
  }

function handleZ_buffer_mode(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_SETBUFFERMODE+","+a[0]+"];return";
  }

function handleZ_output_stream(engine, a) {
    return '_set_output_stream('+a[0]+','+a[1]+')';
  }

function handleZ_input_stream(engine, a) {
    engine.m_compilation_running=0;
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_SETINPUTSTREAM+","+a[0]+"];return";
  }

function handleZ_sound_effect(engine, a) {
    // We're rather glossing over whether and how we
    // deal with callbacks at present.

    engine.m_compilation_running=0;
    while (a.length < 5) { a.push(0); }
    return "m_pc="+engine.m_pc+';m_effects=['+GNUSTO_EFFECT_SOUND+','+a[0]+','+a[1]+','+a[2]+','+a[3]+','+a[4]+'];return';
  }

// Maybe factor out "read" and this?
function handleZ_read_char(engine, a) {

		// JS representing number of deciseconds to wait before a
		// timeout should occur, or 0 if there shouldn't be one.
		var timeout_deciseconds;

		// JS to set m_rebound_args to show where to jump if there's
		// a timeout. If there's not going to be a timeout, this should
		// be blank.
		var rebound_args_setter;

		// JS for a function to handle the answer to this effect.
		// The answer will be one integer; if the integer is zero,
		// it's a request for a timeout; if it's nonzero, it's a
		// keycode to be stored as the present instruction dictates.
    var rebound_setter;

		// Stop the engine! We want to get off!
		engine.m_compilation_running = 0;

    // a[0] is always 1; probably not worth checking for this.

    if (a[1] && a[2] && (engine.m_version>=4)) {
				// This is a timed routine.
				// a[2] is the routine to call after a[1] deciseconds.
				timeout_deciseconds = a[1];

				rebound_args_setter = "m_rebound_args=["+
						engine.m_pc_translate_for_routine(a[2])+'];';

				rebound_setter = "m_rebound=function(){"+
						"var t=m_answers[0];" +
						"if(t<0){"+
						"_func_interrupt(m_rebound_args[0],onISRReturn_for_read_char);"+ // -ve: timeout
						"}else{"+
						engine._storer("_ascii_code_to_zscii_code(t)") + // otherwise, a result to store.
						"}"+
						"};";

		} else {

				// No timeout.
				timeout_deciseconds = '0';

				// We only set m_rebound_args when there's a timeout.
				rebound_args_setter = '';

				// A much simpler rebound function, since zero isn't
				// a magic answer.
				rebound_setter = "m_rebound=function(){"+
						engine._storer("_ascii_code_to_zscii_code(m_answers[0])") +
						"};";
		}


    return "m_pc="+engine.m_pc+";"+
				rebound_args_setter +
				rebound_setter +
				"m_effects=["+GNUSTO_EFFECT_INPUT_CHAR+
				","+timeout_deciseconds+"];return";
  }

function handleZ_scan_table(engine, a) {
    if (a.length == 4) {
      return "t=_scan_table("+a[0]+','+a[1]+"&0xFFFF,"+a[2]+"&0xFFFF," + a[3]+");" +
	engine._storer("t") + ";" +  engine._brancher('t');
    } else { // must use the default for Form, 0x82
      return "t=_scan_table("+a[0]+','+a[1]+"&0xFFFF,"+a[2]+"&0xFFFF," + 0x82 +");" +
	engine._storer("t") + ";" +  engine._brancher('t');
    }
  }

function handleZ_not(engine, a) {
    return engine._storer('~'+a[0]+'&0xffff');
}

function handleZ_tokenise(engine, a) {
    return "_tokenise("+a[0]+","+a[1]+","+a[2]+","+a[3]+")";
  }

function handleZ_encode_text(engine, a) {
    return "_encode_text("+a[0]+","+a[1]+","+a[2]+","+a[3]+")";
  }

function handleZ_copy_table(engine, a) {
    return "_copy_table("+a[0]+','+a[1]+','+a[2]+")";
  }

function handleZ_print_table(engine, a) {

    // Jam in defaults:
    if (a.length < 3) { a.push(1); } // default height
    if (a.length < 4) { a.push(0); } // default skip
    return "m_pc="+engine.m_pc+";m_effects=_print_table("+a[0]+","+a[1]+","+a[2]+","+a[3]+");return";
  }

function handleZ_check_arg_count(engine, a) {
    return engine._brancher(a[0]+'<=_param_count()');
  }

function handleZ_saveV123(engine, a) {
    engine.m_compilation_running=0;
    var setter = 'm_rebound=function(){'+
				engine._brancher('m_answers[0]')+'};';

    return "m_state_to_save=_saveable_state(1);m_pc="+engine.m_pc+";"+setter+";m_effects=["+GNUSTO_EFFECT_SAVE+"];return";
}

function handleZ_saveV45678(engine, a) {
    engine.m_compilation_running=0;

    var setter = "m_rebound=function() { " +
      engine._storer('m_answers[0]') + "};";

    return "m_state_to_save=_saveable_state("+
				(engine.m_version==4? '1': '3') +
				");m_pc="+engine.m_pc+";" +
				setter+";m_effects=["+GNUSTO_EFFECT_SAVE+"];return";
}

function handleZ_restoreV123(engine, a) {
    engine.m_compilation_running=0;
    engine._brancher(''); // Throw it away; it's never used
    return "m_pc="+engine.m_pc+";m_effects=["+GNUSTO_EFFECT_RESTORE+"];return";
}

function handleZ_restoreV45678(engine, a) {
    engine.m_compilation_running=0;
    var setter = 'm_rebound=function() { ' +
				'var t=m_answers[0]; if (t==0){' +
				engine._storer('t') + '}};';
    return "m_pc="+engine.m_pc+";" + setter +
				"m_effects=["+GNUSTO_EFFECT_RESTORE+"];return";
}

function handleZ_log_shift(engine, a) {
    // logical-bit-shift.  Right shifts are zero-padded
    return engine._storer("_log_shift("+a[0]+','+a[1]+')');
  }

function handleZ_art_shift(engine, a) {
    // arithmetic-bit-shift.  Right shifts are sign-extended
    return engine._storer("_art_shift("+a[0]+','+a[1]+')');
  }

function handleZ_set_font(engine, a) {
    // We only provide font 1.
    return engine._storer('('+a[0]+'<2?1:0)');
  }

function handleZ_save_undo(engine, a) {
		// Gnusto can't be relied upon to have the correct PC at runtime, so store it at compile time instead
    return engine._storer( '_save_undo(' + engine.m_pc + ')' );
}

function handleZ_restore_undo(engine, a) {
		// If the restore was successful, return from this block immediately
		// so that execution can continue with the new PC value. If that
		// doesn't happen, it must have failed, so store zero.
    return 'if(_restore_undo())return;'+engine._storer('0');
}

function handleZ_print_unicode(engine, a) {
    return engine._handler_zOut("String.fromCharCode(" +a[0]+")",0);
}

function handleZ_check_unicode(engine, a) {
    // We have no way of telling from JS whether we can
    // read or write a character, so let's assume we can
    // read and write all of them. We can always provide
    // methods to do so somehow (e.g. with an onscreen keyboard).
    return engine._storer('3');
}

function handleZ_gestalt( engine, a )
{
    // 1.2 Standard @gestalt
    return engine._storer('gestalt(' + a[0] + ', ' + ( a.length < 2 ? 0 : a[1] ) + ')' );
}

function handleZ_parchment( engine, a )
{
	return engine._storer('op_parchment(' + a[0] + ', ' + ( a.length < 2 ? 0 : a[1] ) + ')' ); 
}

////////////////////////////////////////////////////////////////
//
// |handlers|
//
// An array mapping opcodes to functions. Each function is passed
// a series of arguments (between zero and eight, as the Z-machine
// allows) as an array, called |a| below. It returns a string of JS,
// called |r| in these comments, which can be evaluated to do the job of that
// opcode. Note, again, that this is a string (not a function object).
//
// Extended ("EXT") opcodes are stored 1000 higher than their number.
// For example, 1 is "je", but 1001 is "restore".
//
// |r|'s code may set |engine.m_compilation_running| to 0 to stop compile() from producing
// code for any more opcodes after this one. (compile() likes to group
// code up into blocks, where it can.)
//
// |r|'s code may contain a return statement to prevent the execution of
// any further generated code before we get to take our bearings again.
// For example, |r| must cause a return if it knows that a jump occurred.
// If a handler wishes to send an effect to the environment, it should
// set |m_effects| in the engine to a non-empty list and return.

var handlers_v578 = {
    1: handleZ_je,
    2: handleZ_jl,
    3: handleZ_jg,
    4: handleZ_dec_chk,
    5: handleZ_inc_chk,
    6: handleZ_jin,
    7: handleZ_test,
    8: handleZ_or,
    9: handleZ_and,
    10: handleZ_test_attr,
    11: handleZ_set_attr,
    12: handleZ_clear_attr,
    13: handleZ_store,
    14: handleZ_insert_obj,
    15: handleZ_loadw,
    16: handleZ_loadb,
    17: handleZ_get_prop,
    18: handleZ_get_prop_addr,
    19: handleZ_get_next_prop,
    20: handleZ_add,
    21: handleZ_sub,
    22: handleZ_mul,
    23: handleZ_div,
    24: handleZ_mod,
    25: handleZ_call_2s,
    26: handleZ_call_2n,
    27: handleZ_set_colour,
    28: handleZ_throw,
    128: handleZ_jz,
    129: handleZ_get_sibling,
    130: handleZ_get_child,
    131: handleZ_get_parent,
    132: handleZ_get_prop_len,
    133: handleZ_inc,
    134: handleZ_dec,
    135: handleZ_print_addr,
    136: handleZ_call_1s,
    137: handleZ_remove_obj,
    138: handleZ_print_obj,
    139: handleZ_ret,
    140: handleZ_jump,
    141: handleZ_print_paddr,
    142: handleZ_load,
    143: handleZ_call_1n,
    176: handleZ_rtrue,
    177: handleZ_rfalse,
    178: handleZ_print,
    179: handleZ_print_ret,
    180: handleZ_nop,
    //181: save (illegal in V5)
    //182: restore (illegal in V5)
    183: handleZ_restart,
    184: handleZ_ret_popped,
    185: handleZ_catch,
    186: handleZ_quit,
    187: handleZ_new_line,
    // 188: show_status -- illegal from V4 onward
    189: handleZ_verify,
    190: handleZ_illegal_extended,
    191: handleZ_piracy,
    224: handleZ_call_vs,
    225: handleZ_store_w,
    226: handleZ_storeb,
    227: handleZ_putprop,
    228: handleZ_read,
    229: handleZ_print_char,
    230: handleZ_print_num,
    231: handleZ_random,
    232: handleZ_push,
    233: handleZ_pull,
    234: handleZ_split_window,
    235: handleZ_set_window,
    236: handleZ_call_vs, // call_vs2
    237: handleZ_erase_window,
    238: handleZ_erase_line,
    239: handleZ_set_cursor,
    240: handleZ_get_cursor,
    241: handleZ_set_text_style,
    242: handleZ_buffer_mode,
    243: handleZ_output_stream,
    244: handleZ_input_stream,
    245: handleZ_sound_effect,
    246: handleZ_read_char,
    247: handleZ_scan_table,
    248: handleZ_not,
    249: handleZ_call_vn,
    250: handleZ_call_vn, // call_vn2,
    251: handleZ_tokenise,
    252: handleZ_encode_text,
    253: handleZ_copy_table,
    254: handleZ_print_table,
    255: handleZ_check_arg_count,
    1000: handleZ_saveV45678,
    1001: handleZ_restoreV45678,
    1002: handleZ_log_shift,
    1003: handleZ_art_shift,
    1004: handleZ_set_font,
    //1005: draw_picture (V6 opcode)
    //1006: picture_dat (V6 opcode)
    //1007: erase_picture (V6 opcode)
    //1008: set_margins (V6 opcode)
    1009: handleZ_save_undo,
    1010: handleZ_restore_undo,
    1011: handleZ_print_unicode,
    1012: handleZ_check_unicode,

    //1013-1015: illegal
    //1016: move_window (V6 opcode)
    //1017: window_size (V6 opcode)
    //1018: window_style (V6 opcode)
    //1019: get_wind_prop (V6 opcode)
    //1020: scroll_window (V6 opcode)
    //1021: pop_stack (V6 opcode)
    //1022: read_mouse (V6 opcode)
    //1023: mouse_window (V6 opcode)
    //1024: push_stack (V6 opcode)
    //1025: put_wind_prop (V6 opcode)
    //1026: print_form (V6 opcode)
    //1027: make_menu (V6 opcode)
    //1028: picture_table (V6 opcode)
    1030: handleZ_gestalt,
    1031: handleZ_parchment
};

// Differences between each version and v5.
// Set a whole version to undefined if it's not implemented.
// If a version is identical to v5, use '' rather than {} to
// make the engine work with the original array rather than a copy.
// When an opcode is illegal in the given version but not in v5,
// it's marked with a zero. If you're working with a version which
// doesn't support extended opcodes (below v5), don't worry about
// zeroing out codes above 999-- they can't be accessed anyway.
var handlers_fixups = {
		1: {
				25: 0, // call_2s
				26: 0, // call_2n
				27: 0, // set_colour
				28: 0, // throw
				136: 0, // call_1s
				143: handleZ_not, // replaces call_1n
				181: handleZ_saveV123,
				182: handleZ_restoreV123,
				185: handleZ_pop, // replaces catch
				188: handleZ_show_status,
				190: 0, // extended opcodes
				191: 0, // piracy
				// 224 is shown in the ZMSD as being "call" before v4 and
				// "call_vs" thence; this appears to be simply a name change.
				// 228, similarly, is "sread" and then "aread".
				236: 0, // call_vs
				237: 0, // erase_window
				238: 0, // erase_line
				239: 0, // set_cursor
				240: 0, // get_cursor
				241: 0, // set_text_style
				242: 0, // buffer_mode
				246: 0, // read_char
				247: 0, // scan_table,
				248: 0, // not
				249: 0, // call_vn
				250: 0, // call_vn2
				251: 0, // tokenise
				252: 0, // encode_text
				253: 0, // copy_table
				254: 0, // print_table
				255: 0 // check_arg_count
		},
		2: {
				25: 0, // call_2s
				26: 0, // call_2n
				27: 0, // set_colour
				28: 0, // throw
				136: 0, // call_1s
				143: handleZ_not, // replaces call_1n
				181: handleZ_saveV123,
				182: handleZ_restoreV123,
				185: handleZ_pop, // replaces catch
				188: handleZ_show_status,
				190: 0, // extended opcodes
				191: 0, // piracy
				// 224 is shown in the ZMSD as being "call" before v4 and
				// "call_vs" thence; this appears to be simply a name change.
				// 228, similarly, is "sread" and then "aread".
				236: 0, // call_vs
				237: 0, // erase_window
				238: 0, // erase_line
				239: 0, // set_cursor
				240: 0, // get_cursor
				241: 0, // set_text_style
				242: 0, // buffer_mode
				246: 0, // read_char
				247: 0, // scan_table,
				248: 0, // not
				249: 0, // call_vn
				250: 0, // call_vn2
				251: 0, // tokenise
				252: 0, // encode_text
				253: 0, // copy_table
				254: 0, // print_table
				255: 0 // check_arg_count
		},
		3: {
				25: 0, // call_2s
				26: 0, // call_2n
				27: 0, // set_colour
				28: 0, // throw
				136: 0, // call_1s
				143: handleZ_not, // replaces call_1n
				181: handleZ_saveV123,
				182: handleZ_restoreV123,
				185: handleZ_pop, // replaces catch
				188: handleZ_show_status,
				190: 0, // extended opcodes
				191: 0, // piracy
				// 224 is shown in the ZMSD as being "call" before v4 and
				// "call_vs" thence; this appears to be simply a name change.
				// 228, similarly, is "sread" and then "aread".
				236: 0, // call_vs
				237: 0, // erase_window
				238: 0, // erase_line
				239: 0, // set_cursor
				240: 0, // get_cursor
				241: 0, // set_text_style
				242: 0, // buffer_mode
				246: 0, // read_char
				247: 0, // scan_table,
				248: 0, // not
				249: 0, // call_vn
				250: 0, // call_vn2
				251: 0, // tokenise
				252: 0, // encode_text
				253: 0, // copy_table
				254: 0, // print_table
				255: 0 // check_arg_count
		},
		4: { // z4 is fittingly somewhere between z3 and z5
				26: 0, // call_2n
				27: 0, // set_colour
				28: 0, // throw
				143: handleZ_not, // replaces call_1n
				181: handleZ_saveV45678, // was illegal in v5 (EXT used instead)
				182: handleZ_restoreV45678, // ditto
				185: handleZ_pop, // replaces catch
				190: 0, // extended opcodes
				191: 0, // piracy
				248: 0, // not
				249: 0, // call_vn
				250: 0, // call_vn2
				251: 0, // tokenise
				252: 0, // encode_text
				253: 0, // copy_table
				254: 0, // print_table
				255: 0 // check_arg_count
		},
		5: '', // The base copy *is* v5
		6: undefined, // very complicated, and not yet implemented-- see bug 3621
		7: '', // Defined to be the same as 5
		8: '' // Defined to be the same as 5
};

////////////////////////////////////////////////////////////////
//
// pc_translate_*
//
// Each of these functions returns a string of JS code to set the PC
// to the address in |packed_target|, based on the current architecture.
//
// TODO: Would be good if we could pick up when it was a constant.

function pc_translate_v123(p) { return '(('+p+')&0xFFFF)*2'; }
function pc_translate_v45(p)  { return '(('+p+')&0xFFFF)*4'; }
function pc_translate_v67R(p) { return '(('+p+')&0xFFFF)*4+'+this.m_routine_start; }
function pc_translate_v67S(p) { return '(('+p+')&0xFFFF)*4+'+this.m_string_start; }
function pc_translate_v8(p)   { return '(('+p+')&0xFFFF)*8'; }

////////////////////////////////////////////////////////////////
//
//                       PART THE THIRD
//
// THE NEW AMAZING COMPONENT WHICH PLAYS GAMES AND WASHES DISHES
// AND LAYS THE TABLE AND WALKS THE DOG AND CLEANS THE OVEN AND...
//
////////////////////////////////////////////////////////////////

function gnusto_error(number) {

		message ='Component: engine\n';
		message += 'Code: ' + number + '\n';

		for (var i=1; i<arguments.length; i++) {
				if (arguments[i] && arguments[i].toString) {
						message += '\nDetail: '+arguments[i].toString();
				}
		}

		throw new FatalError(message);
}

////////////////////////////////////////////////////////////////
//
// onISRReturn_...
//
// When a rebound function causes an interrupt, it may nominate
// another function to clear up when the interrupt's done.
// These are those functions.
//
// The PC will be reset before calling these functions; they
// only have to deal with rebounds, causing further effects and
// so on.
//
// Because these functions will be called as a result of an @return
// (or @rtrue or whatever) you can be sure they're at the end of a
// block in JITspace.
//
function onISRReturn_for_read_char(interrupt_info, result) {

		if (result) {

				// If an ISR returns true, we return as from the original
				// effect, storing zero for the keypress.

				interrupt_info.engine.m_answers[0] = 0;
				interrupt_info.rebound();

		} else {

				// If an ISR returns false, we cause the same effect again.

				interrupt_info.engine.m_effects = interrupt_info.effects;
				interrupt_info.engine.m_rebound = interrupt_info.rebound;
				interrupt_info.engine.m_rebound_args = interrupt_info.rebound_args;

		}
}

function onISRReturn_for_read(interrupt_info, result) {

		var engine = interrupt_info.engine;

		if (result) {

				// If an ISR returns true, we return as from the original
				// effect. The terminating keypress is given as zero.
				// The contents of the text buffer are set to zero.

				engine.m_answers[0] = 0;
				// From this, the rebound will save the text and
				// parse buffers correctly:
				engine.m_answers[1] = '';

				interrupt_info.rebound();

		} else {

				// This is the really tricky part:
				// XXX FIXME:
				// If the effect has printed anything... what?

				engine.m_effects = interrupt_info.effects;
				engine.m_rebound = interrupt_info.rebound;
				engine.m_rebound_args = interrupt_info.rebound_args;

		}
}

////////////////////////////////////////////////////////////////
//
// The Engine
//
// The object itself...

function GnustoEngine(logfunc) {
  if (logfunc)
    this.logger = function(a, b) {
      logfunc("gnusto-engine: " + a + ": " + b);
    };
  else
    this.logger = function() { };
}

GnustoEngine.prototype = {

  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //   PUBLIC METHODS                                           //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////

  loadStory: function ge_loadStory(sourceFile) {
			this.m_memory = sourceFile;
			this._initial_setup();
  },

	loadSavedGame: function ge_loadSavedGame(savefile)
	{
		// Load the Quetzal savefile
		var quetzal = new Quetzal(savefile);
		var mem = quetzal.memory;
		var stacks = quetzal.stacks;
		var pc = quetzal.pc;


			// FIXME: Still to do here:
			//  There's a bit which should survive restore.
			//  There are several bytes which should be reset (e.g. terp ID).

			function decodeStackInt(offset, length) {
					var result = stacks[offset++];

					for (var i=1; i<length; i++) {
							result = (result<<8)|stacks[offset++];
					}

					return result;
			}

			if (quetzal.compressed) {

					// Welcome to the decompression chamber.

					var temp = [];
					var cursor_compressed = 0;
					var cursor_original = 0;

					while (cursor_compressed < mem.length) {

							if (cursor_original >= this.m_original_memory.length) {
									// FIXME: proper error message
									gnusto_error(999, "overshoot in decompression");
							}

							var candidate = mem[cursor_compressed++];

							if (candidate == 0) {
									// Sequence of identical bytes.

									var run_length = mem[cursor_compressed++]+1;

									temp = temp.concat(this.m_original_memory.slice(cursor_original,
																																	cursor_original+run_length));

									cursor_original += run_length;

							} else {
									// One different byte, XORed with the original.
									temp.push(candidate ^
														this.m_original_memory[cursor_original++]);
							}

					}

					mem = temp;
			}

			// Firstly, zap all the important variables...
			// FIXME: Eventually we should work into copies,
			// and only move these over when we're sure everything's good.
			// Otherwise we could want to go back to how things were before.
			this.m_call_stack = [];
			this.m_gamestack = [];
			this.m_locals_stack = [];
			this.m_locals = [];
			this.m_result_targets = [];

			var evals_count = 0;

			// Pick up the amount of eval stack used by the bootstrap.
			evals_count = decodeStackInt(7, 1);

			this.m_gamestack_callbreaks = [];
			// Highest value yet pushed to m_gamestack_callbreaks
			var callbreaks_top = evals_count;

			var cursor = 8;

			for (var m=0; m<evals_count; m++) {
					this.m_gamestack.push(decodeStackInt(cursor, 2));
					cursor+=2;
			}

			while (cursor < stacks.length) {

					this.m_call_stack.push(decodeStackInt(cursor, 3));
					cursor+=3;

					////////////////////////////////////////////////////////////////

					var flags = stacks[cursor++];

					var varcode = stacks[cursor++];

					if (flags & 0x10) {
							// Flag set to show that we should throw away
							// the result of this call. We represent that
							// by a varcode of -1.
							varcode = -1;
					}

					var locals_count = flags & 0xF;
					this.m_locals_stack.unshift(locals_count);
					this.m_result_targets.push(varcode);

					var logArgs = stacks[cursor++]+1;

					var argCount = 0;
					while (logArgs>1) {
							logArgs >>= 1;
							argCount++;
					}
					this.m_param_counts.unshift(argCount);

					evals_count = decodeStackInt(cursor, 2);
					cursor += 2;

					callbreaks_top += evals_count;
					this.m_gamestack_callbreaks.push(callbreaks_top);

					var locals_temp = [];
					for (var k=0; k<locals_count; k++) {
							locals_temp.push(decodeStackInt(cursor, 2));
							cursor+=2;
					}
					this.m_locals = locals_temp.concat(this.m_locals);

					for (var m=0; m<evals_count; m++) {
							this.m_gamestack.push(decodeStackInt(cursor, 2));
							cursor+=2;
					}

			}

			// Base locals aren't saved, so restore them as zeroes.
			for (var n=0; n<16; n++) {
					this.m_locals.push(0);
			}

			// Restore the memory.
			this.m_memory = mem.concat(this.m_memory.slice(mem.length));

			var offset = (this.m_version<=4? 1: 3) + 1;
			this.m_pc = pc-offset; // rewind to before the varcode_offset

			if (this.m_version <= 3) {
					// This is pretty ugly, but then the design isn't too beautiful either.
					// The Quetzal code loads up with the PC pointing at the end of the @save
					// which saved it. The end is the half-an-instruction which gives a branch
					// address. (Ick.) But _brancher will compile that half-an-instruction into
					// JS of the form
					//     if (<condition>){m_pc=<whatever>;return;}
					// So what we do is call |_brancher()| to compile this, and then
					// immediately evaluate the result to make the jump. The condition is
					// '1'-- we always want it to make the jump. And we have to wrap the
					// whole thing in a temporary function so that the "return" doesn't
					// mess things up. (The alternative would be to special-case
					// |_brancher()|, but this case is so very, very rare and perverted
					// that that seems inelegant.)
					eval("var t=new Function('with(this){'+this._brancher('1')+'}');t.call(this);");
			} else {
					// The PC we're given is actually pointing at the varcode
					// into which the success code must be stored. It should be 2.
					// (This is specified by section 5.8 of the Quetzal document,
					// version 1.4.)
					this._varcode_set(2, this.m_memory[this.m_pc++]);
			}

	},

  resetStory: function ge_resetStory() {
      this.m_memory = this.m_original_memory.slice(); // Make a copy.
			this._initial_setup();
  },

  version: function ge_version() {
			gnusto_error(101, "'version' not implemented");
  },

  signature: function ge_signature() {
			gnusto_error(101, "'signature' not implemented");
  },

  cvsVersion: function ge_cvsVersion() {
			return CVS_VERSION.substring(7, 26);
  },

	setGoldenTrail: function ge_setGoldenTrail(value) {
			if (value) {
					this.m_goldenTrail = 1;
			} else {
					this.m_goldenTrail = 0;
			}
	},

  setCopperTrail: function ge_setCopperTrail(value) {
			if (value) {
					this.m_copperTrail = 1;
			} else {
					this.m_copperTrail = 0;
			}
	},

  effect: function ge_effect(which) {
			return this.m_effects[which];
  },

  answer: function ge_answer(which, what) {
			this.m_answers[which] = what;
  },

  // Main point of entry for gnusto. Be sure to call start_game()
  // before calling this the first time.
  run: function ge_run() {
    var start_pc = 0;
    var turns = 0;
    var jscode;
    var turns_limit = this.m_single_step? 1: 10000;

    if (this.m_rebound) {
				this.m_rebound();
				this.m_rebound = 0;
				this.m_rebound_args = [];
		}

		this.m_effects = [];

    while(this.m_effects.length == 0) {

				if (turns++ >= turns_limit) {
						// Wimp out for now.
						// Can't use GNUSTO_EFFECT_WIMP_OUT directly
						// because it has "" around it.
						this.m_effects = ['WO'];
						return 1;
				}

      start_pc = this.m_pc;

      if (this.m_jit[start_pc]) {
					jscode = this.m_jit[start_pc];
      } else {
					jscode=eval('with (this) {dummy='+this._compile()+'}');

					// Store it away, if it's in static memory (there's
					// not much point caching JIT from dynamic memory!)
					if (start_pc >= this.m_stat_start) {
							this.m_jit[start_pc] = jscode;
					}
      }

				// Some useful debugging code:
//				if (this.m_copperTrail) {
//          this.logger('pc', start_pc.toString(16));
//          this.logger('jit', jscode);
//				}

      jscode();

    }
  },

  walk: function ge_walk(answer) {
    gnusto_error(101, "'walk' not implemented");
  },

  setRandomSeed: function ge_setRandomSeed(seed) {

			// This can be done by the private function _random_number(),
			// provided we give it a negative argument. We can also
			// pass it zero, which means the same to it as it does to us:
			// that we should return to nonseeded output. (Well,
			// non-obviously seeded anyway.)

			if (seed>0) {
					this._random_number(-seed);
			} else {
					this._random_number(seed);
			}
	},

	////////////////////////////////////////////////////////////////
	//
	// saveGame
	//
	// Saves a game out to a file.
	//
	saveGame: function ge_saveGame()
	{
		// Returns an array of |bytecount| integers, each
		// representing a byte of |number| in network byte order.
		function int_to_bytes(number, bytecount)
		{
			var result = [];
			for (var i = 0; i < bytecount; i++)
			{
				result[(bytecount - i) - 1] = number & 0xFF;
				number >>= 8;
			}
			return result;
		}

		// The state we are saving
		var state = this.m_state_to_save,

		// Locals for compressing the memory
		compressed = [], same_count = 0,

		// Locals for the stack
		locals_cursor = this.m_locals.length - 16, gamestack_cursor = 0,
		stacks = [ // Firstly, the dummy first record
			0x00, 0x00, 0x00, // PC
			0x00, // flags
			0x00, // varcode
			0x00 // args
		],

		// Make a Quetzal instance
		quetzal = new Quetzal();

		quetzal.release = state.m_memory.slice(0x02, 0x04);
		quetzal.serial = state.m_memory.slice(0x12, 0x18);
		quetzal.checksum = state.m_memory.slice(0x1C, 0x1E);
		quetzal.pc = state.m_pc;
		quetzal.compressed = 1;

		//if (this.m_compress_save_files) {

		// Compress the memory
		for (var i = 0, s = this.m_stat_start; i < s; i++)
		{
			if (state.m_memory[i] == this.m_original_memory[i])
			{
				same_count++;

				if (same_count == 256)
				{
					compressed.push(0);
					compressed.push(255);
					same_count = 0;
				}
			}
			else
			{
				if (same_count != 0)
				{
					compressed.push(0);
					compressed.push(same_count - 1);
					same_count = 0;
				}

				compressed.push(state.m_memory[i] ^ this.m_original_memory[i]);
			}
		}

		if (same_count != 0)
		{
			// write out remaining same count
			compressed.push(0);
			compressed.push(same_count - 1);
		}

		// Add it to the Quetzal instance
		quetzal.memory = compressed;

		/*
		}
		else
		{
			// Not using compressed memory.
			quetzal.memory = this.m_memory.slice(0, this.m_stat_start);
		}
		*/

		////////////////////////////////////////////////////////////////

		// Write out the stacks.

		// And top it off with the amount of eval stack used.
		stacks = stacks.concat(int_to_bytes(this.m_gamestack_callbreaks[0], 2));

		for (var m = 0; m < this.m_gamestack_callbreaks[0]; m++)
			stacks = stacks.concat(int_to_bytes(this.m_gamestack[gamestack_cursor++], 2));

		for (var j = 0; j < this.m_call_stack.length; j++)
		{
			stacks = stacks.concat(int_to_bytes(this.m_call_stack[j], 3));

			// m_locals_stack is back to front so that we can always
			// refer to the current frame as m_l_s[x].
			var local_count = this.m_locals_stack[this.m_locals_stack.length - (j + 1)],
			flags = local_count,
			target = this.m_result_targets[j],
			// FIXME: This is ugly too. Why is m_p_c back to front?
			args_supplied = this.m_param_counts[this.m_param_counts.length - (j + 1)],
			eval_taken = this.m_gamestack_callbreaks[j] - gamestack_cursor;

			if (target == -1)
			{
				// This is a call-and-throw-away rather than a
				// call-and-store. We represent that with a magic
				// varcode of -1, but Quetzal sets a flag instead.

				target = 0;
				flags |= 0x10;
			}

			stacks = stacks.concat([
				flags,
				target,
				// I'm assuming that once a bit is set here,
				// all bits to its right are set too.
				// So we raise 2 to the power of the number
				// and subtract one.
				(1 << args_supplied) - 1,
				(eval_taken >> 8) & 0xFF,
				eval_taken & 0xFF
			]);

			locals_cursor -= local_count;

			for (var k = 0; k < local_count; k++)
				stacks = stacks.concat(int_to_bytes(this.m_locals[locals_cursor + k], 2));

			for (var m = 0; m < eval_taken; m++)
				stacks = stacks.concat(int_to_bytes(this.m_gamestack[gamestack_cursor++], 2));
		}

		// Write out the Quetzal
		quetzal.stacks = stacks;
		this.m_quetzal_image = quetzal.write();
		return this.m_quetzal_image.length;
	},

  saveGameData: function ge_saveGameData(len, result) {
			var temp = this.m_quetzal_image;
			this.m_quetzal_image = 0;
			return temp;
	},

  architecture: function ge_architecture() {
    return 'none';
  },

  piracy: function ge_piracy() {
    return -1;
  },

  tandy: function ge_tandy() {
    return -1;
  },

  status: function ge_status() {
    return 'this is the status, hurrah!';
  },

  getStatusLine: function ge_getStatusLine(width) {
    //fnugry
    var current_room_object_number = this.getUnsignedWord(this.m_vars_start);
    var object_properties_address = this.getUnsignedWord(this.m_property_list_addr_start+(this.m_object_size*current_room_object_number));
    var outtext = this._zscii_from(object_properties_address+1);
    if (outtext.length > width) {
    	outtext = outtext.substring(0,width-3);
    	var outtext2 = '...';
    	var spacebuffer = '';
    } else {
      if ((this.m_version > 3) && ((this.getByte(1)&0x02)==2)) { // if it is a time game
        var hours = this.getUnsignedWord(this.m_vars_start+2);
        var minutes = this.getUnsignedWord(this.m_vars_start+4);
        if (minutes < 10) {
          var outtext2 = hours + ':0' + minutes;
        } else {
          var outtext2 = hours + ':' + minutes;
        }
      } else { // if it is a score game
        var outtext2 = 'Score: ' + this.getUnsignedWord(this.m_vars_start+2) + '  Moves: ' + this.getUnsignedWord(this.m_vars_start+4);
      }
      if ((outtext.length + outtext2.length + 1) > width) {
      	outtext2 = ' S:' + this.getUnsignedWord(this.m_vars_start+2) + ' M:' + this.getUnsignedWord(this.m_vars_start+4);
        if ((outtext.length + outtext2.length + 1) > width) {
          outtext2 = ' ' + this.getUnsignedWord(this.m_vars_start+2) + '/' + this.getUnsignedWord(this.m_vars_start+4);
        }
        if ((outtext.length + outtext2.length + 1) > width) {
          outtext2 = '';
        }
      }
      var spacebuffer = '';
      while ((outtext.length + outtext2.length + spacebuffer.length) < width) {
        spacebuffer += ' ';
      }
    }

    return outtext + spacebuffer + outtext2;
  },
  
	// @gestalt selectors
	gestalt: function( id, arg )
	{
		// 1: Standard Revision
		if ( id == 1 )
			return 0x0102;
		
		// 0x20: @parchment
		if ( id == 0x20 )
		{
			if (
				arg == 0 ||
				
				// 1: Raw eval()
				arg == 1 && PARCHMENT_SECURITY_OVERRIDE
			)
				return 1;
		}
		
		return 0;
	},
	
	// @parchment
	op_parchment: function( id, arg )
	{
		var self = this;
		
		// 1: raw eval()
		if ( id == 1 && PARCHMENT_SECURITY_OVERRIDE )
		{
			// Enable raw eval() mode
			if ( arg == 1 )
			{
				self.op_parchment_data.saved_buffer = self.m_console_buffer;
				self.m_console_buffer = '';
				self.op_parchment_data.raw_eval = 1;
			}
			
			// Return to normal mode, evaluating the buffer
			else
			{
				if ( self.op_parchment_data.raw_eval )
				{
					eval( self.m_console_buffer );
					self.m_console_buffer = self.op_parchment_data.saved_buffer;
				}
				self.op_parchment_data.raw_eval = 0;
			}
			
			return 1;
		}
		
		return 0;
	},

  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //   PRIVATE METHODS                                          //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////
  // _initial_setup
  //
  // Initialises our variables.
  //
  _initial_setup: function ge_initial_setup() {

      this.m_jit = [];
      this.m_compilation_running = 0;
      this.m_gamestack = [];
      this.m_gamestack_callbreaks = [];

      this.m_call_stack = [];
      this.m_locals = [];
      this.m_locals_stack = [];
      this.m_param_counts = [];
      this.m_result_targets = [];

      this.m_goldenTrail = 0;
      this.m_copperTrail = 0;

      this.m_version     = this.m_memory[0];
      this.m_original_memory = this.m_memory.slice(); // Make a copy.

      this.m_himem       = this.getUnsignedWord(0x4);
      this.m_pc          = this.getUnsignedWord(0x6);
      this.m_dict_start  = this.getUnsignedWord(0x8);
      this.m_objs_start  = this.getUnsignedWord(0xA);
      this.m_vars_start  = this.getUnsignedWord(0xC);
      this.m_stat_start  = this.getUnsignedWord(0xE);
      this.m_abbr_start  = this.getUnsignedWord(0x18);

      if (this.m_version>=4) {
	  this.m_alpha_start = this.getUnsignedWord(0x34);
	  this.m_object_tree_start = this.m_objs_start + 112;
	  this.m_property_list_addr_start = this.m_object_tree_start + 12;
	  this.m_object_size = 14;
      } else {
	  this.m_alpha_start = 0;
	  this.m_object_tree_start = this.m_objs_start + 53;
	  this.m_property_list_addr_start = this.m_object_tree_start + 7;
	  this.m_object_size = 9;
      }

      this.m_hext_start  = this.getUnsignedWord(0x36);

      // Use the correct addressing mode for this Z-machine version...

      if (this.m_version<=3) {
	  // Versions 1 and 2 (prehistoric) and 3 ("Standard")
	  this.m_pc_translate_for_routine = pc_translate_v123;
	  this.m_pc_translate_for_string = pc_translate_v123;
      } else if (this.m_version<=5) {
	  // Versions 4 ("Plus") and 5 ("Advanced")
	  this.m_pc_translate_for_routine = pc_translate_v45;
	  this.m_pc_translate_for_string = pc_translate_v45;
      } else if (this.m_version<=7) {
	  // Versions 6 (the graphical one) and 7 (rare postInfocom extension)
	  this.m_routine_start  = this.getUnsignedWord(0x28)*8;
	  this.m_string_start   = this.getUnsignedWord(0x2a)*8;
	  this.m_pc_translate_for_routine = pc_translate_v67R;
	  this.m_pc_translate_for_string = pc_translate_v67S;
      } else if (this.m_version==8) {
	  // Version 8 (normal postInfocom extension)
	  this.m_pc_translate_for_routine = pc_translate_v8;
	  this.m_pc_translate_for_string = pc_translate_v8;
      } else {
	  gnusto_error(170, 'impossible: unknown z-version got this far');
      }
      
      // And pick up the relevant instruction set.

      if (!(this.m_version in handlers_fixups)) {
	  gnusto_error(311, 'unknown z-machine version');
      }

      var fixups = handlers_fixups[this.m_version];

      switch (typeof(fixups)) {

      case 'undefined':
	  gnusto_error(101, 'z-machine version not implemented');
	  break;

      case 'string':
	  this.m_handlers = handlers_v578;
	  break;

      case 'object':
	  this.m_handlers = {};

	  for (var original in handlers_v578) {
	      this.m_handlers[original] = handlers_v578[original];
	  }

	  for (var changed in fixups) {
	      if ((typeof fixups[changed])=='function') {
		  this.m_handlers[changed] = fixups[changed];
	      } else {
		  delete this.m_handlers[changed];
	      }
	  }
	  break;

      default:
	  gnusto_error(170, 'impossible: weird stuff in fixups table');
      }

      // Set up separators.

      this.m_separator_count = this.m_memory[this.m_dict_start];
      for (var i=0; i<this.m_separator_count; i++) {
					this.m_separators[i]=this._zscii_char_to_ascii(this.m_memory[this.m_dict_start + i+1]);
      }

      // If there is a header extension...
      if (this.m_hext_start > 0) {
	  // get start of custom unicode table, if any
	  this.m_unicode_start = this.getUnsignedWord(this.m_hext_start+6);
	  if (this.m_unicode_start > 0) { // if there is one, get the char count-- characters beyond that point are undefined.
	      this.m_custom_unicode_charcount = this.m_memory[this.m_unicode_start];
	      this.m_unicode_start += 1;
	      // Populate reverse lookup table
	      for(var i=0; i<this.m_custom_unicode_charcount; i++)
		  reverse_unicode_table[this.getUnsignedWord(this.m_unicode_start + (i*2))] = i + 155;
	  }
      }

      if(!(this.m_unicode_start>0)) {
	  // The game doesn't provide its own set of unicode characters, so
	  // now is the time to populate the reverse_unicode_table with the
	  // default unicode characters
	  for(var i in default_unicode_translation_table)
	      reverse_unicode_table[default_unicode_translation_table[i]] = i;
      }

      this.m_rebound = 0;
      this.m_rebound_args = [];

      this.m_output_to_console = 1;
      this.m_streamthrees = [];
      this.m_output_to_script = 0;

      this.m_console_buffer = '';
      this.m_transcript_buffer = '';

      this.m_zalphabet[0] = 'abcdefghijklmnopqrstuvwxyz';
      this.m_zalphabet[1] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      // T = magic ten bit flag
      if (this.m_version==1) {
	  this.m_zalphabet[2] = 'T0123456789.,!?_#\'"/\\<-:()';
      } else {
	  this.m_zalphabet[2] = 'T\n0123456789.,!?_#\'"/\\-:()';
      }

      var newchar;
      var newcharcode;
      if (this.m_alpha_start > 0) { // If there's a custom alphabet...
	  for (var alpharow=0; alpharow<3; alpharow++){
	      var alphaholder = '';
	      for (var alphacol=0; alphacol<26; alphacol++) {
		  newcharcode = this.m_memory[this.m_alpha_start + (alpharow*26) + alphacol];
		  if ((newcharcode >=155) && (newcharcode <=251)) {
		      // Yes, custom alphabets can refer to custom unicode tables.  Whee...
		      if (this.m_unicode_start == 0) {
			  alphaholder += String.fromCharCode(default_unicode_translation_table[newcharcode]);
		      } else {
			  if ((newcharcode-154)<= this.m_custom_unicode_charcount)
			      alphaholder += String.fromCharCode(this.getUnsignedWord(this.m_unicode_start + ((newcharcode-155)*2)));
			  else
			      alphaholder += ' ';
		      }
		  } else {
		      newchar = String.fromCharCode(newcharcode);
		      if (newchar == '^') newchar = '\n';  // This is hackish, but I don't know a better way.
		      alphaholder += newchar;
							}
	      }
	      this.m_zalphabet[alpharow]= alphaholder;  // Replace the current row with the newly constructed one.
	  }
      }


      // We don't also reset the debugging variables, because
      // they need to persist across re-creations of this object.
      // FIXME: Is this still true?

      // Clear the Z-engine's local variables.
      for (var i=0; i<16; i++) this.m_locals[i]=0;

      this.m_printing_header_bits = 0;

      this.m_leftovers = '';

		// Set some header variables
		this.m_memory[0x1E] = 1; // DEC
		this.m_memory[0x1F] = 0; // no letter ('F' would indicate that we're frotz, which may not be desirable)

		// set in runner.js in run();
		// this.m_memory[0x20] = 25; // screen height (255 = infinite)
		// this.m_memory[0x21] = 80; // screen width in characters ('0')
		// this.setWord(80, 0x22); // screen width in 'units'
		// this.setWord(25, 0x24);
		this.m_memory[1] |= 0x1D; // announce support for styled text and color
		this.m_memory[0x26] = 1; // font width/height (dep. version) in 'units'
		this.m_memory[0x27] = 1; // font width/height (dep. version) in 'units'
		
		// Z Machine Spec version
		// For now only set 1.2 if PARCHMENT_SECURITY_OVERRIDE is set
		this.m_memory[0x32] = 1;
		this.m_memory[0x33] = PARCHMENT_SECURITY_OVERRIDE ? 2 : 0;
  },

// Inlined some of these functions...

  _unsigned2signed: function ge_unsigned2signed(value) {
    // The argument must be between 0 and 0xFFFF!
    // The return value will be signed (-8000..7FFF).
    return ((value & 0x8000)?~0xFFFF:0)|value;
  },

  _signed2unsigned: function ge_signed2unsigned(value) {
    return value & 0xFFFF;
  },

	// Note that getByte/getWord can read any memory address. setByte/setWord
	// only work on RAM addresses.

  getByte: function ge_getbyte(address) {
    if (this.m_value_asserts) {
      if (address == null || address === true || address === false || address < 0 || address >= this.m_original_memory.length)
        this.logger('getByte addr', address);
			var val = this.m_memory[address];
      if (val == null || val === true || val === false || val < 0 || val > 0xFF)
        this.logger('getByte byte', val);
    }
    return this.m_memory[address];
  },

  setByte: function ge_setByte(value, address) {
		// The value is safely truncated, but the address must be valid
    if (this.m_value_asserts) {
      if (address == null || address === true || address === false || address < 0 || address >= this.m_stat_start)
        this.logger('setByte addr', address);
    }
    this.m_memory[address] = value & 0xFF;
  },

  getWord: function ge_getWord(address) {
    // The return value will be signed (-8000..7FFF).
    if (this.m_value_asserts) {
      if (address == null || address === true || address === false || address < 0 || address >= this.m_original_memory.length)
        this.logger('getWord addr', address);
			var val = this.m_memory[address];
      if (val == null || val === true || val === false || val < 0 || val > 0xFF)
        this.logger('getWord high byte', val);
			var val = this.m_memory[address+1];
      if (val == null || val === true || val === false || val < 0 || val > 0xFF)
        this.logger('getWord low byte', val);
    }
//    return this._unsigned2signed((this.m_memory[address]<<8)|
//																 this.m_memory[address+1]);
		var value = (this.m_memory[address] << 8) | this.m_memory[address + 1];
		return ((value & 0x8000) ? ~0xFFFF : 0) | value;
  },

  getUnsignedWord: function ge_getUnsignedWord(address) {
    if (this.m_value_asserts) {
      if (address == null || address === true || address === false || address < 0 || address >= this.m_original_memory.length)
				this.logger('getUnsignedWord addr', address);
			var val = this.m_memory[address];
      if (val == null || val === true || val === false || val < 0 || val > 0xFF)
        this.logger('getUnsignedWord high byte', val);
			var val = this.m_memory[address+1];
      if (val == null || val === true || val === false || val < 0 || val > 0xFF)
        this.logger('getUnsignedWord low byte', val);
    }
    return (this.m_memory[address]<<8)|this.m_memory[address+1];
  },

  setWord: function ge_setWord(value, address) {
		// The value is safely truncated, but the address must be valid
    if (this.m_value_asserts) {
      if (address == null || address === true || address === false || address < 0 || address >= this.m_stat_start)
        this.logger('setWord', address);
    }
//			this.setByte((value>>8) & 0xFF, address);
		this.m_memory[address] = (value >> 8) & 0xFF;
//		this.setByte((value) & 0xFF, address+1);
		this.m_memory[address + 1] = (value) & 0xFF;
  },

	// Inelegant function to load parameters according to a VAR byte (or word).
	_handle_variable_parameters: function ge_handle_var_parameters(args, types, bytecount) {
			var argcursor = 0, code = '', varcode;

			if (bytecount==1) {
					types = (types<<8) | 0xFF;
			}

			while (1) {
					var current = types & 0xC000;
					if (current==0xC000) {
							return code;
					} else if (current==0x0000) {
							args[argcursor++] = this.getUnsignedWord(this.m_pc);
							this.m_pc+=2;
					} else if (current==0x4000) {
							args[argcursor++] = this.m_memory[this.m_pc++];
					} else if (current==0x8000) {
//							args[argcursor++] = this._code_for_varcode(this.m_memory[this.m_pc++]);
							varcode = this._code_for_varcode(this.m_memory[this.m_pc++]);
							code += varcode[0];
							args[argcursor++] = varcode[1];
//					} else {
//							gnusto_error(171); // impossible
					}

					types = (types << 2) | 0x3;
			}
	},

	// _compile() returns a string of JavaScript code representing the
	// instruction at the program counter (and possibly the next few
	// instructions, too). It will change the PC to point to the end of the
	// code it's compiled.
	_compile: function ge_compile() {

			this.m_compilation_running = 1;
			var code = '', starting_pc = this.m_pc, varcode, funcname;

      // Counter for naming any temporary variables that we create.
//      var temp_var_counter = 0;
			temp_var = 0;

			do {
					// List of arguments to the opcode.
					var args = [];

					/* DEBUG */
					var this_instr_pc = this.m_pc;
					if ( this_instr_pc == null || this_instr_pc < 0 || this_instr_pc >= this.m_original_memory.length )
						gnusto_error(206, this_instr_pc);
					/* ENDDEBUG */

					// Add the touch (see bug 4687). This lets us track progress simply.
//				touch() has a huge overhead and without tracing there's no need for it. Whether this replacement is even useful is a good question...
//					code = code + '_touch('+this.m_pc+');';
//					code = code + 'm_pc = ' + this.m_pc + ';';

					// So here we go...
					// what's the opcode?
					var instr = this.m_memory[this.m_pc++];

					if (instr==0) {
							// If we just get a zero, we've probably
							// been directed off into deep space somewhere.
							gnusto_error(201); // lost in space

					} else if (instr==190) { // Extended opcode.

							instr = 1000+this.m_memory[this.m_pc++];
							code += this._handle_variable_parameters(args, this.m_memory[this.m_pc++], 1);

					} else if (instr & 0x80) {
							if (instr & 0x40) { // Variable params

									if (!(instr & 0x20))
											// This is a 2-op, despite having
											// variable parameters; reassign it.
											instr &= 0x1F;

									if (instr==250 || instr==236) {
											// We get more of them!
											var types = this.getUnsignedWord(this.m_pc);
											this.m_pc += 2;
											code += this._handle_variable_parameters(args, types, 2);
									} else
											code += this._handle_variable_parameters(args, this.m_memory[this.m_pc++], 1);

							} else { // Short. All 1-OPs except for one 0-OP.

					switch(instr & 0x30) {
						case 0x00:
							args[0] = this.getUnsignedWord(this.m_pc);
							this.m_pc+=2;
							instr = (instr & 0x0F) | 0x80;
							break;

						case 0x10:
							args[0] = this.m_memory[this.m_pc++];
							instr = (instr & 0x0F) | 0x80;
							break;

						case 0x20:
//							args[0] =	this._code_for_varcode(this.m_memory[this.m_pc++]);
							varcode = this._code_for_varcode(this.m_memory[this.m_pc++]);
							code += varcode[0];
							args[0] = varcode[1];
							instr = (instr & 0x0F) | 0x80;
							break;

						case 0x30:
							// 0-OP. We don't need to get parameters, but we
							// *do* need to translate the opcode.
							instr = (instr & 0x0F) | 0xB0;
							break;
						}
							}
					} else { // Long

							if (instr & 0x40)
							{
//								args[0] = this._code_for_varcode(this.m_memory[this.m_pc++]);
								varcode = this._code_for_varcode(this.m_memory[this.m_pc++]);
								code += varcode[0];
								args[0] = varcode[1];
							}
							else
									args[0] = this.m_memory[this.m_pc++];

							if (instr & 0x20)
							{
//								args[1] = this._code_for_varcode(this.m_memory[this.m_pc++]);
								varcode = this._code_for_varcode(this.m_memory[this.m_pc++]);
								code += varcode[0];
								args[1] = varcode[1];
							}
							else
									args[1] = this.m_memory[this.m_pc++];

							instr &= 0x1F;
					}
/***
          // We need to ensure that arguments are popped from the
          // stack in the right order, regardless of the order in
          // which code in JITspace uses them; so here we figure out
          // what arguments are taken from the stack and evaluate them
          // into temporary variables before calling the generated JIT
          // code for the instruction. See issue 43 for more information:
          //
          // http://code.google.com/p/parchment/issues/detail?id=43
          for (var i = 0; i < args.length; i++)
              if (args[i] == ARG_STACK_POP) {
                  var temp_var_name = "tmp_" + temp_var_counter++;
                  code += "var " + temp_var_name + " = m_gamestack.pop();";
                  args[i] = temp_var_name;
              }
***/

					// Output the instruction number
					//code = code + '/*' + instr + '*/';

					if (this.m_handlers[instr]) {
						code = code + this.m_handlers[instr](this, args)+';';
						// NOTE: insert this.logger here to debug a particular opcode
					} else if (instr>=1128 && instr<=1255 &&
										 "special_instruction_EXT"+(instr-1000) in this) {

							// ZMSD 14.2: We provide a hook for plug-in instructions.
							// FIXME: This will no longer work in a component.
							// Can we do anything else instead?
							// (Maybe a component named @gnusto.org/specialinstr?op=XXX.)

							code = code +
									this["special_instruction_EXT"+(instr-1000)](args)+
									';';
					} else {
							gnusto_error(200,
													 this.m_pc.toString(16)); // no handler
					}

			} while(this.m_compilation_running);

			// When we're not in debug mode, dissembly only stops at places where
			// the THIS.M_PC must be reset; but in debug mode it's perfectly possible
			// to have |code| not read or write to the PC at all. So we need to
			// set it automatically at the end of each fragment.

			if (this.m_single_step||this.m_debug_mode) {
					code = code + 'm_pc='+this.m_pc;
			}

		// Code optimisations
		// Don't push() and pop(), just set variables directly
		code = code.replace(/m_gamestack\.push\(([^;]+)\);var tmp_(\d+) = m_gamestack\.pop\(\);/, 'var tmp_$2 = $1;');

		// Name the function after the starting position, to make life easier for debuggers
		funcname = 'function JIT_' + starting_pc.toString(16) + '_' + starting_pc;
		
		// If we have function names append them
		;;; var find_func_name = function(pc) { while ( !vm_functions[pc] && pc > 0 ) { pc--; } return vm_functions[pc]; };
		;;; funcname = funcname + ( window.vm_functions ? '_' + find_func_name(starting_pc) : '' );
		
		return funcname + '(){' + code + '}';
	},

	_param_count: function ge_param_count() {
			return this.m_param_counts[0];
	},

	_set_output_stream: function ge_set_output_stream(target, address) {
 			target = this._unsigned2signed(target);
			if (target==0) {
					// then it's a no-op.
			} else if (target==1) {
					this.m_output_to_console = 1;
			} else if (target==2) {
					this.m_memory[0x11] |= 0x1;
			} else if (target==3) {

					if (this.m_streamthrees.length>15) {
							gnusto_error(202); // too many nested stream-3s
					}

					this.m_streamthrees.unshift([address, address+2]);

			} else if (target==4) {
					this.m_output_to_script = 1;
			} else if (target==-1) {
					this.m_output_to_console = 0;
			} else if (target==-2) {
					this.m_memory[0x11] &= ~0x1;
			} else if (target==-3) {

					if (this.m_streamthrees.length<1) {
							gnusto_error(203); // not enough nested stream-3s
					}

					var latest = this.m_streamthrees.shift();
					this.setWord((latest[1]-latest[0])-2, latest[0]);

			} else if (target==-4) {
					this.m_output_to_script = 0;
			} else {
					gnusto_error(204, target); // weird output stream number
			}
	},

	_trunc_divide: function ge_trunc_divide(over, under) {
			var result;
      over = this._unsigned2signed(over);
      under = this._unsigned2signed(under);

			if (under==0) {
					gnusto_error(701); // division by zero
					return 0;
			}

			result = over / under;

			if (result > 0) {
					return Math.floor(result) & 0xFFFF;
			} else {
					return Math.ceil(result) & 0xFFFF;
			}
	},

	_trunc_modulo: function ge_trunc_modulo(over, under) {
      over = this._unsigned2signed(over);
      under = this._unsigned2signed(under);

			if (under==0) {
					gnusto_error(701); // division by zero
					return 0;
			}

			return (over % under) & 0xFFFF;
	},

	_zscii_char_to_ascii: function ge_zscii_char_to_ascii(zscii_code) {
			if (zscii_code < 0) {
					gnusto_error(702, zscii_code); // illegal zscii code
			}

			var result;

			if ( zscii_code == 0 )
			{
				return '';
			}
			else if ( zscii_code == 10 || zscii_code == 13 )
			{
				return '\n';
			}
			else if ((zscii_code>=32 && zscii_code<=126) || zscii_code==0) {
					result = zscii_code;
			} else if (zscii_code>=155 && zscii_code<=251) {
					// Extra characters.

					if (this.m_unicode_start == 0)
							return String.fromCharCode(default_unicode_translation_table[zscii_code]);
					else { // if we're using a custom unicode translation table...
							if ((zscii_code-154)<= this.m_custom_unicode_charcount)
									return String.fromCharCode(this.getUnsignedWord(this.m_unicode_start + ((zscii_code-155)*2)));
							else
									gnusto_error(703, zscii_code); // unknown zscii code

					}


					// FIXME: It's not clear what to do if they request a character
					// that's off the end of the table.
			}	else {
					//let's do nothing for the release-- we'll check the spec afterwards.
					// FIXME: what release was that, and what are we doing now?
					// Is there anything in Bugzilla to track this?
					return "*";//gnusto_error(703, zscii_code); // unknown zscii code
			}

			return String.fromCharCode(result);
	},
	
	_ascii_code_to_zscii_code: function ge_ascii_char_to_zscii( ascii_code ) {

		// ZSCII code 13 must be used for the enter key
		// Correct for the arrow keys
		var ZSCII_corrections = {
			10: 13, // Enter
			13: 13,
			37: 131, // Left
			38: 129, // Up
			39: 132, // Right
			40: 130 // Down
		};
		
		// Are we converting a char input event?
		if ( isNaN( ascii_code ) )
		{		
			// Correct for some ZSCII differences
			if ( ascii_code.keyCode && ZSCII_corrections[ascii_code.keyCode] )
			{
				return ZSCII_corrections[ascii_code.keyCode];
			}
			else
			{
				var ascii_code = ascii_code.charCode;
			}
		}
		
		// Return linefeeds correctly
		if ( ascii_code == 10 || ascii_code == 13 )
			return 13;

		// Standard ASCII characters, except for the arrow keys, plus NULL
		if ( ( ascii_code > 31 && ascii_code < 127 ) || ascii_code == 0 )
		{
			// Most common case - keep it as fast as possible
			return ascii_code;
		}
		
		if (ascii_code < 0) {
			gnusto_error(702, 'Illegal unicode character:' + ascii_code); // illegal ascii code
		}
		
		// Must be among extra characters.
		var result = reverse_unicode_table[ascii_code];
		if(!result) {
			// gnusto_error(703, 'No ZSCII equivalent found for this unicode character code: ' + ascii_code); // unknown ascii code
			// Let's translate it into '*' for now. Should we raise an error instead?
			result = 42;
		}
		
		return result;
	},

	_random_number: function ge_random_number(arg) {
 			arg = this._unsigned2signed(arg);

			if (arg==0) {

					// zero returns to true random mode-- seed from system clock
					this.m_random_use_seed = this.m_random_use_sequence = 0;

					return 0;

			} else if (arg<-999) {

					// Large negative numbers cause us to enter a predictable
					// but non-sequential state. (In other words, the numbers
					// always come in the same order, but can't be trivially
					// predicted by humans.)

					this.m_random_state = Math.abs(arg);
					this.m_random_use_seed = 1;
					this.m_random_use_sequence = 0;

					return 0;

			} else if (arg<0) {

					// Small negative numbers cause us to enter a predictable sequential
					// state: according to the spec, 1, 2, 3 ... arg, 1, 2, 3...
					// (but according to Frotz, 1, 2, 3... arg-1, 1, 2, 3...)
					// BTW, the spec says "lower than 1000", but this is clearly
					// an error, because *all* negative numbers are lower than
					// 1000. We follow Frotz's lead in treating this as -1000
					// and using the absolute value of the argument as the
					// sequence wrapping point.

					this.m_random_sequence_max = Math.abs(arg)-1;
					this.m_random_state = 0;
					this.m_random_use_seed = 0;
					this.m_random_use_sequence = 1;

					return 0;

			} else {

					// Positive argument. So they actually want a random number,
					// between 1 and arg inclusive.

					// Are we using any sort of predictable seeding?
					if (this.m_random_use_seed) {
							// Yes, given a particular seed.
							this.m_random_state--;
							return 1+(Math.round(Math.abs(Math.tan(this.m_random_state))*8.71*arg)%arg);
					} else if (this.m_random_use_sequence) {
							// Yes, given a particular sequence.
							var previous = this.m_random_state;
							this.m_random_state = this.m_random_state+1;
							if (this.m_random_state > this.m_random_sequence_max) {
									this.m_random_state = 0;
							}
							return 1 + (previous % arg);
					} else {
							// No. Use JS's random numbers.
							// (Hope these are generally good enough.)
							return 1 + Math.round((arg -1) * Math.random());
					}
			}

			gnusto_error(170, 'random'); // impossible

	},

	////////////////////////////////////////////////////////////////
	//
	// _func_gosub
	//
	// Jumps to a subroutine within the Z-code, saving the current
	// state so that calling _func_return() will return to it.
	//
	//  |to_address|    -- address within the Z-code to jump to
	//  |actuals|       -- list of actual parameters
	//  |from_address|  -- source address
	//  |result_target| -- varcode for where to put the result
	//
	_func_gosub: function ge_gosub(to_address, actuals, from_address, result_target) {

			this.m_call_stack.push(from_address);
			this.m_pc = to_address;

			var count = this.m_memory[this.m_pc++];

			// Before version 5, Z-code put initial values for formal parameters
			// into the code itself. If we're running a version earlier than z5,
			// we have to interpret these.

			if (this.m_version<5) {
					var templocals = [];
					for (var i3=0; i3<count; i3++) {
							if (i3<actuals.length) {
									templocals.push(actuals[i3]);
							} else {
									templocals.push(this.getUnsignedWord(this.m_pc));
							}
							this.m_pc += 2;
					}
					this.m_locals = templocals.concat(this.m_locals);
			} else {
					for (var i5=count; i5>0; i5--) {
							if (i5<=actuals.length) {
									this.m_locals.unshift(actuals[i5-1]);
							} else {
									this.m_locals.unshift(0);
							}
					}
			}

			this.m_locals_stack.unshift(count);

			this.m_param_counts.unshift(actuals.length);
			this.m_result_targets.push(result_target);

			this.m_gamestack_callbreaks.push(this.m_gamestack.length);

			if (to_address==0) {
					// Rare special case: a call to 0 returns only false.
					this._func_return(0);
			}

	},

	////////////////////////////////////////////////////////////////
	//
	// _func_interrupt
	//
	// Like _func_gosub, except that it's used to break into a
	// running routine. This may only be called from a rebound function.
	//
	// |to_address| -- address of Z-code interrupt service routine.
	// |on_return|  -- function to call when the routine is finished.
	//
	// |on_return| will be called with two parameters:
	//   |info|  : an object containing these fields:
	//              |rebound|: saved value of m_rebound
	//              |pc|:      saved value of m_pc
	//   |result|: the value the ISR returned.
	//
	_func_interrupt: function ge_interrupt(to_address, on_return) {

			this.m_interrupt_information.push({
					'on_return': on_return,
							'rebound': this.m_rebound,
							'rebound_args': this.m_rebound_args,
							'engine': this,
							'pc': this.m_pc,
							'effects': this.m_effects
							});

			this._func_gosub(to_address, [],
											 CALLED_FROM_INTERRUPT,
											 -1);
	},

	////////////////////////////////////////////////////////////////
	//
	// Tokenises a string.
	//
	// See aread() for caveats.
	// Maybe we should allow aread() to pass in the correct value stored
	// in text_buffer, since it knows it already. It means we don't have
	// to figure it out ourselves.
	//
	_tokenise: function ge_tokenise(text_buffer, parse_buffer, dictionary, overwrite) {

			var tokenised_word_count = 0;
			var cursor = parse_buffer + 2;
			var words_count_addr = parse_buffer + 1;

			if (isNaN(dictionary)) dictionary = 0;
			if (isNaN(overwrite)) overwrite = 0;

			function look_up(engine, word, dict_addr) {

					function compare(engine, typed, mem_addr) {
							var j=0;
							var mem_char, typed_char;
							while (1) {
									if (j==typed.length) {
											// then they're the same
											return 0;
									}

									mem_char = engine.m_memory[mem_addr+j];
									typed_char = typed.charCodeAt(j);
									if (mem_char==typed_char) {
											j++;
									} else if (mem_char<typed_char) {
											// less than...
											return -1;
									} else {
											return 1;
									}
							}
					}

					var entry_length = engine.m_memory[dict_addr+engine.m_separator_count+1];
					var entries_count = engine.getWord(dict_addr+engine.m_separator_count+2);
					var entries_start = engine.m_dict_start+engine.m_separator_count+4;

					// Whether the dictionary is sorted.
					var is_sorted = 1;

					if (entries_count < 0) {

							// This should actually only happen on user dictionaries,
							// but the distinction isn't a useful one, and so we don't
							// bother to check.

							is_sorted = 0;
							entries_count = -entries_count;
					}

					var oldword = word;
					word = engine._into_zscii(word);

					if (is_sorted) {
							var low=0, high=entries_count-1;
							var median;
							var median_address;
							var comparison;

							while(1) {
									median = low + Math.round((high-low)/2);
									median_address = entries_start+median*entry_length;

									comparison = compare(engine, word, median_address);
									if (comparison<0) {
											if (low==high) { return 0; }
											low = median+1;
									} else if (comparison>0) {
											if (low==high) { return 0; }
											high = median-1;
									} else {
											return median_address;
									}

									if (low>high) {
											return 0;
									}
							}
					} else {
							// Unsorted search. Much simpler, but slower
							for (var i=0; i<entries_count; i++) {
									var address = entries_start+i*entry_length;

									if (compare(engine, word, address)==0) {
											return address;
									}
							}
					}

					return 0;
			}

			function add_to_parse_table(engine, dictionary, curword, wordpos) {
					var lexical = look_up(engine, curword, dictionary);

					if (!(overwrite && lexical==0)) {

							engine.setWord(lexical, cursor);
							cursor+=2;

							engine.setByte(curword.length, cursor++);
							engine.setByte(wordpos, cursor++);

					} else {

							// In overwrite mode, if we don't know a word, we skip
							// the corresponding record.

							cursor +=4;

					}

					tokenised_word_count++;

					return 1;
			}
			////////////////////////////////////////////////////////////////
			//
			// Prepare |source|, a string containing all the characters in
			// text_buffer. (FIXME: Why don't we just work out of text_buffer?)

			var max_chars = this.m_memory[text_buffer];
			var source = '';

			if (dictionary==0) {
					// Use the standard game dictionary.
					dictionary = this.m_dict_start;
			}

			if (this.m_version <= 4) {

					max_chars ++; // Value stored in pre-z5 is one too low.

					var copycursor = text_buffer + 1;

					while(1) {
							var ch = this.m_memory[copycursor++];
							if (ch==0) break;
							source += String.fromCharCode(ch);
					}

			} else {
					for (var i=0;i<this.m_memory[text_buffer + 1];i++) {
							source += String.fromCharCode(this.m_memory[text_buffer + 2 + i]);
					}
			}

			var words = [];
			var curword = '';
			var wordindex = 0;
			var wordpos_increment;

			if (this.m_version <= 4) {
					wordpos_increment = 1;
			} else {
					wordpos_increment = 2;
			}

			// FIXME: Do this with regexps, for goodness' sake.

			for (var cpos=0; cpos < source.length; cpos++) {

          if (source.charAt(cpos)  == ' ') {
							if (curword != '') {
									words[wordindex] = curword;
									add_to_parse_table(this, dictionary, words[wordindex],
																		 (cpos - words[wordindex].length) + wordpos_increment);
									wordindex++;
									curword = '';
							}
					} else {
              if (this._is_separator(source.charAt(cpos))) {
									if (curword != '') {
											words[wordindex] = curword;
											add_to_parse_table(this, dictionary, words[wordindex],
																				 (cpos - words[wordindex].length) + wordpos_increment);
											wordindex++;
									}
									words[wordindex] = source.charAt(cpos);
									add_to_parse_table(this, dictionary, words[wordindex],
																		 cpos + wordpos_increment);
									wordindex++;
									curword = '';
							} else {
                  curword += source.charAt(cpos);
							}
					}
			}

			if (curword != '') {
					words[wordindex] = curword;
					add_to_parse_table(this, dictionary, words[wordindex],
														 (cpos - words[wordindex].length) + wordpos_increment);
			}

			this.setByte(tokenised_word_count, words_count_addr);

	},

	// Very very very limited implementation:
	//  * Doesn't handle word separators. (FIXME: Does it yet?)
	// FIXME: Consider having no parameters; they're always filled in from
	// the same fields anyway.
	_aread: function ge_aread(terminating_keypress, text_buffer, parse_buffer, entered) {

			text_buffer &= 0xFFFF;
			parse_buffer &= 0xFFFF;

			var max_chars;
			var result;
			var storage;

			if (this.m_version <= 4) {

				// In z1-z4, the array is null-terminated.

				max_chars = this.m_memory[text_buffer]+1;
				result = entered.substring(0,max_chars).toLowerCase();
				storage = text_buffer + 1;
				this.setByte(0, text_buffer + 1 + result.length);

			} else {

				// In z5-z8, the array starts with a size byte.

				max_chars = this.m_memory[text_buffer];
				result = entered.substring(0,max_chars).toLowerCase();
				storage = text_buffer + 2;
				this.setByte(result.length, text_buffer + 1);

			}

			// Turn into ZSCII and store in text buffer
			for (var i=0;i<result.length;i++) {
				this.setByte(this._ascii_code_to_zscii_code(result.charCodeAt(i)), storage + i);
			}

			if (parse_buffer!=0 || this.m_version<5) {
					this._tokenise(text_buffer, parse_buffer, 0, 0);
			}

			if (terminating_keypress == 13) {
					return 10; // goodness knows why, but it's in the spec
			} else {
					return terminating_keypress;
			}

	},

	// Returns a list of current terminating characters.
	// ASCII 13 will always be in the list, since the Enter key
	// is always a terminating character.
	_terminating_characters: function ge_terminating_characters() {
			if (this.m_version < 5) {
					// Versions before z5 don't have terminating character tables.
					return '\r';
			} else {
					var terms_address = this.getUnsignedWord(0x2e);

					var result = '\r';
					while(1) {
							var ch = this.m_memory[terms_address++];
							if (ch==0) {
									// Zero is a terminator.
									break;
							} else if ((ch>=129 && ch<=154) || (ch>=252)) {
									// Only function-key codes make it into the string.
									result += String.fromCharCode(ch);
							}
					}
					return result;
			}
	},

	////////////////////////////////////////////////////////////////
	//
  // _func_return
	//
	// Returns from a Z-code routine.
	//
	// |value| -- the numeric result of the routine.
	//            It can also be null, in which case the store
	//            won't happen (useful for returning from @throw).
	//
	_func_return: function ge_func_return(value) {

			// Remove this function's locals
			this.m_locals = this.m_locals.slice(this.m_locals_stack.shift());

			this.m_param_counts.shift();
			this.m_pc = this.m_call_stack.pop();

			// Force the gamestack to be the length it was when this
			// routine started. (ZMSD 6.3.2.)
			this.m_gamestack.length = this.m_gamestack_callbreaks.pop();

			var target = this.m_result_targets.pop();

			if (target != -1 && value != null)
			{
				//this._varcode_set(value, target);

				// Rather than calling _varcode_set() this function now accesses the variables directly
				// target is interpreted as in ZSD 4.2.2:
				//	0     = top of game stack
				//	1-15  = local variables
				//	16 up = global variables
				if (target == 0)
					this.m_gamestack.push(value);
				else if (target < 0x10)
					this.m_locals[target - 1] = value;
				else
					this.setWord(value, this.m_vars_start + (target - 16) * 2);
			}

			if (this.m_pc == CALLED_FROM_INTERRUPT) {
					var interrupt_info = this.m_interrupt_information.pop();

					this.m_pc = interrupt_info.pc;
					interrupt_info.on_return(interrupt_info, value);
			}
	},

	_throw_stack_frame: function throw_stack_frame(cookie) {
			// The cookie is the value of call_stack.length when @catch was
			// called. It cannot be less than 1 or greater than the current
			// value of call_stack.length.

			if (cookie>this.m_call_stack.length || cookie<1) {
					gnusto_error(207, cookie);
			}

			while (this.m_call_stack.length > cookie-1) {
					this._func_return(null);
			}
	},

	_get_prop_addr: function ge_get_prop_addr(object, property) {
		        if (object==0) {return 0;}

			var result = this._property_search(object, property, -1);
			if (result[2]) {
					return result[0];
			} else {
					return 0;
			}
	},

	_get_prop_len: function ge_get_prop_len(address)
	{
		;;; if (address == null || address === true || address === false || address < 0 || address >= this.m_stat_start) { this.logger('get_prop_len', address); }

		// Spec 1.1 clarification: @get_prop_len 0 must return 0
		if ( address == 0 )
		{
			return 0;
		}

			if (this.m_version<4) {
					return 1+(this.m_memory[address-1] >> 5);
			} else {
					// The last byte before the data is either the size byte of a 2-byte
					// field, or the only byte of a 1-byte field. We can tell the
					// difference using the top bit.

					var value = this.m_memory[address-1];

					if (value & 0x80) {
							// A two-byte field, so we take the bottom five bits.
							value = value & 0x3F;

							if (value==0) {
									return 64;
							} else {
									return value;
							}
					} else {
							// A one-byte field. Our choice rests on a single bit.
							if (value & 0x40) {
									return 2;
							} else {
									return 1;
							}
					}
			}
	},

	_get_next_prop: function ge_get_next_prop(object, property) {

			if (object==0) return 0; // Kill that V0EFH before it starts.

			var result = this._property_search(object, -1, property);

			if (result[2]) {
					// There's a real property number in there;
					// return it.
					return result[3];
			} else {
					// There wasn't a valid property following the one
					// we wanted. Why not?

					if (result[4]) {
							// Because the one we wanted was the last one.
							// Tell them to go back to square one.
							return 0;
					} else {
							// Because the one we wanted didn't exist.
							// They shouldn't have asked for it: barf.
							gnusto_error(205, property);
					}
			}

			gnusto_error(173); // impossible
	},

	_get_prop: function ge_get_prop(object, property) {

			if (object==0) return 0; // Kill that V0EFH before it starts.

			var temp = this._property_search(object, property, -1);

	    if (this.m_value_asserts) {
				if (temp[0] == null || temp[0] === true || temp[0] === false || temp[0] < 0 || temp[0] >= this.m_stat_start)
			 		this.logger('get_prop', temp[0]);
			}

			if (temp[1] == 1)
				return this.m_memory[temp[0]];
			else if (temp[1] == 2)
			{
				// Inline this call to getUnsignedWord()
				//return this.getUnsignedWord(temp[0]);
				return (this.m_memory[temp[0]] << 8) | this.m_memory[temp[0] + 1];
			}
			else
			{
					// get_prop used on a property of the wrong length
					// Christminster (and perhaps others) use this vaguely
					// illegal hack to just check to see if a property exists
					// for a particular object.  Evidently, only Zinc throws an
					// error here, so we probably shouldn't either.  Also, currently
					// calling gnusto_error here tanks the browser.  Don't yet know
					// why.  So commenting it out for now.

					// gnusto_error(706, object, property);

					return this.getUnsignedWord(temp[0]);
			}

			gnusto_error(174); // impossible
	},

	// This is the function which does all searching of property lists.
	// It takes three parameters:
	//    |object| -- the number of the object you're interested in
	//
	// The next parameters allow us to specify the property in two ways.
	// If you use both, it will "or" them together.
	//    |property| -- the number of the property you're interested in,
	//                     or -1 if you don't mind.
	//    |previous_property| -- the number of the property BEFORE the one
	//                     you're interested in, or 0 if you want the first one,
	//                     or -1 if you don't mind.
	//
	// If you specify a valid property, and the property doesn't exist, this
	// function will return the default value instead (and tell you it's done so).
	//
	// The function returns an array with these elements:
	//    [0] = the property address.
	//    [1] = the property length.
	//    [2] = 1 if this property really belongs to the object, or
	//	    0 if it doesn't (and if it doesn't, and you've specified
	//          a valid |property|, then [0] and [1] will be properly
	//          set to defaults.)
	//    [3] = the number of the property.
	//          Equal to |property| if you specified it.
	//          May be -1, if |property| is -1 and [2]==0.
	//    [4] = a piece of state only useful to get_next_prop():
	//          if the object does not contain the property (i.e. if [2]==0)
	//          then this will be 1 if the final property was equal to
	//          |previous_property|, and 0 otherwise. At all other times it will
	//          be 0.
	_property_search: function ge_property_search(object, property, previous_property) {

			// Find the address of the property table.
			var props_address = this.getUnsignedWord(this.m_property_list_addr_start +
																							 object*this.m_object_size);

			// Skip the property table's header.
			props_address = props_address + this.m_memory[props_address]*2 + 1;

			// Now loop over each property and consider it.

			var previous_prop = 0;

			while(1) {
					var len = 1;
					var prop = this.m_memory[props_address++];

					if (this.m_version < 4) {
							len = (prop>>5)+1;
							prop = prop & 0x1F;
					} else {
							if (prop & 0x80) {
									// Long format.
									len = this.m_memory[props_address++] & 0x3F;
									if (len==0) len = 64;
							} else {
									// Short format.
									if (prop & 0x40) len = 2;
							}
							prop = prop & 0x3F;
					}

					if (prop==property || previous_prop==previous_property) {
							return [props_address, len, 1, prop, 0];
					} else if (prop < property) {

							// So it's not there. Can we get it from the defaults?

							if (property>0)
									// Yes, because it's a real property.
									return [this.m_objs_start + (property-1)*2,
													2, 0, property, 0];
							else
									// No: they didn't specify a particular
									// property.
									return [-1, -1, 0, property,
													previous_prop==property];
					}

					props_address += len;
					previous_prop = prop;
			}
			gnusto_error(175); // impossible
	},

	////////////////////////////////////////////////////////////////
	// Functions that modify the object tree

	_set_attr: function ge_set_attr(object, bit) {
			if (object==0) return; // Kill that V0EFH before it starts.

			var address = this.m_object_tree_start + object*this.m_object_size + (bit>>3);
			var value = this.m_memory[address];
			this.setByte(value | (128>>(bit%8)), address);
	},

	_clear_attr: function ge_clear_attr(object, bit) {
			if (object==0) return; // Kill that V0EFH before it starts.

			var address = this.m_object_tree_start + object*this.m_object_size + (bit>>3);
			var value = this.m_memory[address];
			this.setByte(value & ~(128>>(bit%8)), address);
	},

	_test_attr: function ge_test_attr(object, bit) {
			if (object==0) return 0; // Kill that V0EFH before it starts.

			if ((this.m_memory[this.m_object_tree_start + object*this.m_object_size +(bit>>3)] &
					 (128>>(bit%8)))) {
					return 1;
			} else {
					return 0;
			}
	},

	_put_prop: function put_prop(object, property, value) {

                        if (object == 0) return;

			var address = this._property_search(object, property, -1);

			if (!address[2]) {
					gnusto_error(704); // undefined property
			}

			if (address[1]==1) {
					this.setByte(value, address[0]);
			} else if (address[1]==2) {
					this.setWord(value, address[0]);
			} else {
					gnusto_error(705); // weird length
			}
	},


	_get_older_sibling: function ge_get_older_sibling(object) {

		        if (object==0) { return 0;}

			// Start at the eldest child.
			var candidate = this._get_child(this._get_parent(object));

			if (object==candidate) {
					// evidently nothing doing there.
					return 0;
			}

			while (candidate) {
					var next_along = this._get_sibling(candidate);
					if (next_along==object) {
							return candidate; // Yay! Got it!
					}
					candidate = next_along;
			}

			// We ran out, so the answer's 0.
			return 0;
	},

	_insert_obj: function ge_insert_obj(mover, new_parent) {

			// First, remove mover from wherever it is in the tree now.

			var old_parent = this._get_parent(mover);
			var older_sibling = this._get_older_sibling(mover);
			var younger_sibling = this._get_sibling(mover);

			if (old_parent && this._get_child(old_parent)==mover) {
					this._set_child(old_parent, younger_sibling);
			}

			if (older_sibling) {
					this._set_sibling(older_sibling, younger_sibling);
			}

			// Now, slip it into the new place.

			this._set_parent(mover, new_parent);

			if (new_parent) {
					this._set_sibling(mover, this._get_child(new_parent));
					this._set_child(new_parent, mover);
			}
	},

	// FIXME: Why the new_parent?!
	_remove_obj: function ge_remove_obj(mover, new_parent) {
			this._insert_obj(mover, 0);
	},

	_get_family: function ge_get_family(from, relationship) {

                        if (from==0) {return 0;}

			if (this.m_version < 4) {

					return this.m_memory[this.m_object_tree_start +
															 4+relationship +
															 from*this.m_object_size];
			} else {
					// v4 and above.

					return this.getUnsignedWord(this.m_object_tree_start +
																			6+relationship*2 +
																			from*this.m_object_size);

			}

			gnusto_error(170, 'get_family'); // impossible
	},

	_get_parent:  function ge_get_parent(from)
	{ return this._get_family(from, PARENT_REC); },

	_get_child:   function ge_get_child(from)
  { return this._get_family(from, CHILD_REC); },

  _get_sibling: function ge_get_sibling(from)
	{ return this._get_family(from, SIBLING_REC); },

	_set_family: function ge_set_family(from, to, relationship) {
			if (this.m_version < 4) {

					this.setByte(to,
											 this.m_object_tree_start +
											 4+relationship +
											 from*this.m_object_size);
			} else {
					// v4 and above.

					this.setWord(to,
											 this.m_object_tree_start +
											 6+relationship*2 +
											 from*this.m_object_size);

			}
	},

	_set_parent: function ge_set_parent(from, to)
	{ this._set_family(from, to, PARENT_REC); },

	_set_child: function ge_set_child(from, to)
	{ this._set_family(from, to, CHILD_REC); },

	_set_sibling: function ge_set_sibling(from, to)
	{ this._set_family(from, to, SIBLING_REC); },

	_obj_in: function ge_obj_in(child, parent)
	{ return this._get_parent(child) == parent; },

	////////////////////////////////////////////////////////////////

	// Implements @copy_table, as in the Z-spec.
	_copy_table: function ge_copy_table(first, second, size) {
 			size = this._unsigned2signed(size);

			if (second==0) {

					// Zero out the first |size| bytes of |first|.

					for (var i=0; i<size; i++) {
							this.setByte(0, i+first);
					}
			} else {

					// Copy |size| bytes of |first| into |second|.

					var copy_forwards = 0;

					if (size<0) {
							size = -size;
							copy_forwards = 1;
					} else {
							if (first > second) {
									copy_forwards = 1;
							} else {
									copy_forwards = 0;
							}
					}

					if (copy_forwards) {
							for (var i=0; i<size; i++) {
									this.setByte(this.m_memory[first+i], second+i);
							}
					} else {
							for (var i=size-1; i>=0; i--) {
									this.setByte(this.m_memory[first+i], second+i);
							}
					}
			}
	},


	////////////////////////////////////////////////////////////////
	// Implements @scan_table, as in the Z-spec.
	_scan_table: function ge_scan_table(target_word, target_table,
																			table_length, table_form)
	{
			// TODO: Optimise this some.

			var jumpby = table_form & 0x7F;
			var usewords = ((table_form & 0x80) == 0x80);
			var lastlocation = target_table + (table_length*jumpby);

			if (usewords) {
					//if the table is in the form of word values
					while (target_table < lastlocation) {
							if (((this.m_memory[0xFFFF&target_table]&0xFF) == ((target_word>>8)&0xFF)) &&
									((this.m_memory[0xFFFF&target_table+1]&0xFF) == (target_word&0xFF))) {

									return target_table;
							}
							target_table += jumpby;
					}
			} else {
					//if the table is in the form of byte values
					while (target_table < lastlocation) {
							if ((this.m_memory[0xFFFF&target_table]&0xFF) == (target_word&0xFFFF)) {
									return target_table;
							}
							target_table += jumpby;
					}
			}
			return 0;
	},

	////////////////////////////////////////////////////////////////
	// Returns the lines that @print_table should draw, as in
	// the Z-spec.
	//
	// It's rather poorly defined there:
	//   * How is the text in memory encoded?
	//       [Straight ZSCII, not five-bit encoded.]
	//   * What happens to the cursor? Moved?
	//       [We're guessing not.]
	//   * Is the "table" a table in the Z-machine sense, or just
	//     a contiguous block of memory?
	//       [Just a contiguous block.]
	//   * What if the width takes us off the edge of the screen?
	//   * What if the height causes a [MORE] event?
	//
	// It also goes largely un-noted that this is the only possible
	// way to draw on the lower window away from the current
	// cursor position. (If we take the view that v5 windows are
	// roughly the same thing as v6 windows, though, windows don't
	// "own" any part of the screen, so there's no such thing as
	// drawing on the lower window per se.)
	//
	// FIXME: Add note that we now start with G_E_PRINTTABLE

	_print_table: function ge_print_table(address, width, height, skip) {

			var lines = [];

			for (var y=0; y<height; y++) {

					var s='';

					for (var x=0; x<width; x++) {
						        if (address<0) { address &= 0xFFFF; }
							s=s+this._zscii_char_to_ascii(this.m_memory[address++]);
					}

					lines.push(s);

					address += skip;
			}

			var result = ['PT', lines.length];
			result = result.concat(lines);

			return result;
	},

	_zscii_from: function ge_zscii_from(address, max_length, tell_length) {

			if (address in this.m_jit) {
					// Already seen this one.

					if (tell_length)
					return this.m_jit[address];
					else
					return this.m_jit[address][0];
			}

			var temp = '';
			var running = 1;
			var start_address = address;
			var home_alph=0;
			var alph = home_alph;

			// Should be:
			//   -2 if we're not expecting a ten-bit character
			//   -1 if we are, but we haven't seen any of it
			//   n  if we've seen half of one, where n is what we've seen
			var tenbit = -2;

			// Should be:
			//    0 if we're not expecting an abbreviation
			//    z if we are, where z is the prefix
			var abbreviation = 0;

			if (!max_length) max_length = 65535;
			var stopping_place = address + max_length;

			while (running) {
					var word = this.getUnsignedWord(address);
					address += 2;

					running = ((word & 0x8000)==0) && address<stopping_place;

					for (var j=2; j>=0; j--) {
							var code = ((word>>(j*5))&0x1f);

							if (abbreviation) {
								        temp = temp + this._zscii_from(this.getUnsignedWord((32*(abbreviation-1)+code)*2+this.m_abbr_start)*2);
									abbreviation = 0;
									alph=home_alph;
						} else if (tenbit==-2) {

									if (code>5) {
											if (alph==2 && code==6)
													tenbit = -1;
											else {
                          temp = temp + this.m_zalphabet[alph].charAt(code-6);
 											                alph = home_alph;
											}
									} else {
											if (code==0) { temp = temp + ' '; alph=home_alph; }
											else if (code<4) {
											    if (this.getByte(0) > 2) {abbreviation = code;}
											    else {
											      if (code==2){
											          alph += 1;
											          if (alph > 2) {alph=0;}
											      } else if (code==3) {
											      	  alph -= 1;
											      	  if (alph < 0) {alph=2;}
											      }
											      else {
											        if (this.getByte(0)==2) {
											        	abbreviation=1;}
											        else {
											            temp = temp + '\n';  //in z-1 this is a newline
											            alph = home_alph;
											        }
											      }
											    }
											}
											else {
											  if (this.getByte(0) > 2) {alph = code-3;}
											  else {
											      if (code==4){
											          home_alph += 1;
											          if (home_alph > 2) {home_alph=0;}
											      } else {
											      	  home_alph -= 1;
											      	  if (home_alph < 0) {home_alph=2;}
											      }
											      alph=home_alph;
											  }

											}
									}

							} else if (tenbit==-1) {
									tenbit = code;
							} else {
									temp = temp + this._zscii_char_to_ascii((tenbit<<5) + code);
									tenbit = -2;
									alph=home_alph;
							}
					}
			}

			if (start_address >= this.m_stat_start) {
					this.m_jit[start_address] = [temp, address];
			}

			if (tell_length) {
					return [temp, address];
			} else {
					return temp;
			}
	},

	////////////////////////////////////////////////////////////////
	//
	// encode_text
	//
	// Implements the @encode_text opcode.
	//   |zscii_text|+|from| is the address of the unencoded text.
	//   |length|            is its length.
	//                         (It may also be terminated by a zero byte.)
	//   |coded_text|        is where to put the six bytes of encoded text.
	_encode_text: function ge_encode_text(zscii_text, length, from, coded_text) {

			zscii_text = (zscii_text + from) & 0xFFFF;
			var source = '';

			while (length>0) {
					var b = this.m_memory[zscii_text];

					if (b==0) break;

					source = source + String.fromCharCode(b);
					zscii_text++;
					length--;
			}

			var result = this._into_zscii(source);

			for (var i=0; i<result.length; i++) {
					var c = result[i].charCodeAt(0);
					this.setByte(c, coded_text++);
			}
	},

	////////////////////////////////////////////////////////////////
	//
	// Encodes the ZSCII string |str| to its compressed form,
	// and returns it.
	//
	_into_zscii: function ge_into_zscii(str) {
			var result = '';
			var buffer = [];

			var dictionary_entry_length;
			if (this.m_version < 4) {
					dictionary_entry_length = 4;
			} else {
					dictionary_entry_length = 6;
			}

			function emit(value) {

					buffer.push(value);

					if (buffer.length==3) {
							var temp = (buffer[0]<<10 | buffer[1]<<5 | buffer[2]);

							if (result.length == dictionary_entry_length-2) {
									// This'll be the last word. We need to set the stop bit.
									temp |= 0x8000;
							}

							result = result +
									String.fromCharCode(temp >> 8) +
									String.fromCharCode(temp &  0xFF);
							buffer = [];
					}
			}

		// Huge thanks to fredrik.ramsberg for fixing the following section!

		var ch, cursor = 0, z2;

		while (cursor < str.length && result.length < dictionary_entry_length)
		{
			ch = str.charCodeAt(cursor++);

			// Downcase any uppercase characters
			if (ch >= 65 && ch <= 90)
				ch += 32;
			else if (ch > 154)
			{
				if(this.m_unicode_start == 0)
				{
					// It's an extended character AND the game uses the regular
					// unicode translation table, so we know how to downcase.
					if ((ch >= 158 && ch <= 160) || (ch >= 167 && ch <= 168) || (ch >= 208 && ch <= 210))
						ch -= 3;
					else if (ch >= 175 && ch <= 180)
						ch -= 6;
					else if ((ch >= 186 && ch <= 190) || (ch >= 196 && ch <= 200))
						ch -= 5;
					else if (ch == 217 || ch == 218)
						ch -= 2;
					else if (ch == 202 || ch == 204 || ch == 212 || ch == 214 || ch == 221)
						ch -= 1;
				}
				else
				{
					// For extended characters using custom unicode translation table,
					// rely on JavaScripts downcasing function
					var cnew = this._ascii_code_to_zscii_code(this._zscii_char_to_ascii(ch).toLowerCase().charCodeAt(0));
					if(cnew > 0 && cnew <= 251 && cnew != '*'.charCodeAt(0))
						ch = cnew;
				}
			}

			// Convert ch to unicode, since alphabet tables are in unicode.
			var ch_uni = String.fromCharCode(this._zscii_char_to_ascii(ch).charCodeAt(0));

			z2 = this.m_zalphabet[0].indexOf(ch_uni);
			if (z2 != -1)
				// ch was found in alphabet A0: Just output position + 6
				emit(z2 + 6);
			else
			{
				z2=this.m_zalphabet[1].indexOf(ch_uni);
				if (z2 != -1)
				{
					// ch was found in alphabet A1. Output a shift character and ch + 6
					if (this.getByte(0) > 2)
						emit(4); // shift to A1
    			else
						emit(2); // shift is positioned differently in z1-2
    			emit(z2 + 6);
				} else {
					z2 = this.m_zalphabet[2].indexOf(ch_uni);
					if (z2 != -1)
					{
						// ch was found in alphabet A2. Output a shift character and ch + 6
						if (this.getByte(0) > 2)
							emit(5); // shift to A2
						else
							emit(3); // shift is positioned differently in in z1-2
						emit(z2 + 6);
					} else {
						if (this.getByte(0) > 2)
							emit(5);
						else
							emit(3); //shift is positioned differently in z1-2
						emit(6);
						emit(ch >> 5);
						emit(ch & 0x1F);
					}
				}
			}
		}

			while (result.length<dictionary_entry_length) {
					emit(5);
			}

			return result.substring(0, dictionary_entry_length);
	},

	_name_of_object: function ge_name_of_object(object) {

			if (object==0) {
					return "<void>";
			} else {
					var aa = this.m_property_list_addr_start + object*this.m_object_size;
					return this._zscii_from(this.getUnsignedWord(aa)+1);
			}
	},

	////////////////////////////////////////////////////////////////
	//
	// Function to print the contents of leftovers.

	_print_leftovers: function ge_print_leftovers() {

			this._zOut(this.m_leftovers);

			// May as well clear it out and save memory,
			// although we won't be called again until it's
			// set otherwise.
			this.m_leftovers = '';
	},

	////////////////////////////////////////////////////////////////
	//
	// Prints the text |text| on whatever input streams are
	// currently enabled.
	//
	// If this returns false, the text has been printed.
	// If it returns true, the text hasn't been printed, but
	// you must return the GNUSTO_EFFECT_FLAGS_CHANGED effect
	// to your caller. (There's a function handler_zOut()
	// which does all this for you.)

	_zOut: function ge_zOut(text) {
    //this.logger("_zOut", text);
			if (this.m_streamthrees.length) {

					// Stream threes disable any other stream while they're on.
					// (And they can't cause flag changes, I suppose.)

					var current = this.m_streamthrees[0];
					var address = this.m_streamthrees[0][1];

					// Argument "text" is in Unicode. For storage in Z-machine memory, we
					// need to convert it to ZSCII
					for (var i = 0; i < text.length; i++)
						this.setByte(this._ascii_code_to_zscii_code(text.charCodeAt(i)), address++);

					this.m_streamthrees[0][1] = address;
			} else {

					var bits = this.m_memory[0x11] & 0x03;
					var changed = bits != this.m_printing_header_bits;
					//var effect_parameters = this.m_printing_header_bits;
					this.m_printing_header_bits = bits;

					// OK, so should we bail?

					if (changed) {

							this.m_leftovers = text;
							this.m_rebound = this._print_leftovers;

							return 1;

					} else {

							if (this.m_output_to_console) {
									this.m_console_buffer = this.m_console_buffer + text;
							}

							if (bits & 1) {
									this.m_transcript_buffer = this.m_transcript_buffer + text;
							}
					}
			}

			return 0;
	},

	////////////////////////////////////////////////////////////////

	consoleText: function ge_console_text()
	{
		var self = this,
		temp = self.m_console_buffer.replace('\x00','','g');
		
		// Don't print anything in @parchment's raw eval() mode
		if ( self.op_parchment_data.raw_eval )
		{
			return '';
		}
		else
		{
			self.m_console_buffer = '';
			return temp;
		}
	},

	_transcript_text: function ge_transcript_text() {
			var temp = this.m_transcript_buffer.replace('\x00','','g');
			this.m_transcript_buffer = '';
			return temp;
	},

	////////////////////////////////////////////////////////////////

	_is_separator: function ge_IsSeparator(value) {
			for (var sepindex=0; sepindex < this.m_separator_count; sepindex++) {
					if (value == this.m_separators[sepindex]) return 1;
			}
			return 0;
	},

	////////////////////////////////////////////////////////////////
	//
	// code_for_varcode
	// Generates code to access variable operands
	// variable is interpreted as in ZSD 4.2.2:
	//	0     = top of game stack
	//	1-15  = local variables
	//	16 up = global variables

/***
	_code_for_varcode: function ge_code_for_varcode(varcode) {
			if (varcode==0) {
          return ARG_STACK_POP;
			} else if (varcode < 0x10) {
					return 'm_locals['+(varcode-1)+']';
			} else {
					return 'getUnsignedWord('+(this.m_vars_start+(varcode-16)*2)+')';
			}

			gnusto_error(170, 'code_for_varcode'); // impossible
	},
***/

	_code_for_varcode: function ge_code_for_varcode(variable) {
		var code = '', arg;
		if (variable == 0)
		{
			code = 'var tmp_' + (++temp_var) + ' = m_gamestack.pop();';
			arg = 'tmp_' + temp_var;
		}
		else if (variable < 0x10)
			arg = 'm_locals[' + (variable - 1) + ']';
		else
		{
			var high = this.m_vars_start + (variable - 16) * 2, low = high + 1;
			var tmp = 'tmp_' + (++temp_var);
			code = 'var ' + tmp + ' = (m_memory[' + high + '] << 8) | m_memory[' + low + '];';
			arg = tmp;
		}
		return [code, arg];
	},

	////////////////////////////////////////////////////////////////
	//
	// varcode_get
	//
	// Retrieves the value specified by |varcode|, and returns it.
	// |varcode| is interpreted as in ZSD 4.2.2:
	//    0     = pop from game stack
	//    1-15  = local variables
	//    16 up = global variables
	//
	// TODO: We need a varcode_getcode() which returns a JS string
	// which will perform the same job as this function, to save us
	// the extra call we use when encoding "varcode_get(constant)".
/***
	Not in current use... inlined in handleZ_load
	_varcode_get: function ge_varcode_get(varcode) {
			if (varcode==0) {
					return this.m_gamestack.pop();
			} else if (varcode < 0x10) {
					return this.m_locals[(varcode-1)];
			} else {
					return this.getUnsignedWord(this.m_vars_start+(varcode-16)*2);
			}

			gnusto_error(170, 'varcode_get'); // impossible
	},
***/

	////////////////////////////////////////////////////////////////
	//
	// varcode_set
	//
	// Stores the value |value| in the place specified by |varcode|.
	// |varcode| is interpreted as in ZSD 4.2.2.
	//    0     = push to game stack
	//    1-15  = local variables
	//    16 up = global variables
	//
	// TODO: We need a varcode_setcode() which returns a JS string
	// which will perform the same job as this function, to save us
	// the extra call we use when encoding "varcode_set(n, constant)".
	_varcode_set: function ge_varcode_set(value, varcode) {
			if (varcode==0) {
					this.m_gamestack.push(value);
			} else if (varcode < 0x10) {
					this.m_locals[varcode-1] = value;
			} else {
					this.setWord(value, this.m_vars_start+(varcode-16)*2);
			}
	},

	_brancher: function ge_brancher(condition) {

			var inverted = 1;
			var temp = this.m_memory[this.m_pc++];
			var target_address = temp & 0x3F;

			if (temp & 0x80) {
					inverted = 0;
			}

			if (!(temp & 0x40)) {
					target_address = (target_address << 8) | this.m_memory[this.m_pc++];
					// and it's signed...

					if (target_address & 0x2000) {
							// sign bit's set; propagate it
							target_address = (~0x1FFF) | (target_address & 0x1FFF);
					}
			}

			var if_statement = condition;

			if (inverted) {
					if_statement = 'if(!('+if_statement+'))';
			} else {
					if_statement = 'if('+if_statement+')';
			}

			// Branches to the addresses 0 and 1 are actually returns with
			// those values.

			if (target_address == 0) {
					return if_statement + '{_func_return(0);return;}';
			}

			if (target_address == 1) {
					return if_statement + '{_func_return(1);return;}';
			}

			target_address = (this.m_pc + target_address) - 2;

			// This is an optimisation that's currently unimplemented:
			// if there's no code there, we should mark that we want it later.
			//  [ if (!this.m_jit[target_address]) this.m_jit[target_address]=0; ]

			return if_statement + '{m_pc='+(target_address)+';return;}';
	},

	_storer: function ge_storer(rvalue) {
			var lvalue_varcode = this.m_memory[this.m_pc++];

			if (rvalue.substring && rvalue.substring(0,11)=='_func_gosub') {
					// Special case: the results of gosubs can't
					// be stored synchronously.

					this.m_compilation_running = 0; // just to be sure we stop here.

					if (rvalue.substring(rvalue.length-4)!=',-1)') {
							// You really shouldn't pass us gosubs with
							// the result target filled in.
							gnusto_error(100, rvalue); // can't modify gosub
					}

					return rvalue.substring(0,rvalue.length-3) +
							lvalue_varcode + ')';

					// Otherwise it must be a synchronous write, so...

			} else if (lvalue_varcode==0) {
					return 'm_gamestack.push('+rvalue+')';
			} else if (lvalue_varcode < 0x10) {
					return 'm_locals['+(lvalue_varcode-1)+']='+rvalue;
			} else {
					return 'setWord('+rvalue+','+(this.m_vars_start+(lvalue_varcode-16)*2)+')';
			}

			gnusto_error(170, 'storer'); // impossible
	},

	////////////////////////////////////////////////////////////////
	//
	// _generate_gosub
	//
	// Returns a JITstring which enters a new Zroutine (by calling
	// _func_gosub).
  //
	// |target| is the packed address to jump to. (The packing
  // algorithm varies according to the version of the Z-machine
  // we're using.
	//
	// |args| is something whose string representation is a
	// comma-delimited list of actual parameters to the function.
	// (An array is fine for this, as is a single number, as is
	// an empty string.)
	//
  // If |get_varcode| is defined and nonzero, we read one byte
	// and use that varcode as the return target of the call.
	// Otherwise the call will throw away its result.
	//
	_generate_gosub: function call_vn(target, arguments, get_varcode) {

			this.m_compilation_running = 0;

			var varcode = -1;

			if (get_varcode) {
					varcode = this.m_memory[this.m_pc++];
			}

			return '_func_gosub('+
			this.m_pc_translate_for_routine(target)+','+
			'['+arguments.toString()+'],'+
			this.m_pc+','+
			varcode+')';
	},

	////////////////////////////////////////////////////////////////
	// Returns a JS string that calls zOut() correctly to print
	// the line of text in |text|. (See zOut() for details of
	// what constitutes "correctly".)
	//
	// If |is_return| is set, the result will cause a Z-machine
	// return with a result of 1 (the same result as @rtrue).
	// If it's clear, the result will set the PC to the
	// address immediately after the current instruction.
	//
	_handler_zOut: function ge_handler_zOut(text, is_return) {

			var setter;

			if (is_return) {
					setter = '_func_return(1)';
			} else {
					setter = 'm_pc=0x'+this.m_pc.toString(16);
			}

			return 'if(_zOut('+text+')){' + setter +
			';m_effects=['+ GNUSTO_EFFECT_FLAGS_CHANGED +	'];return 1}';
	},

	////////////////////////////////////////////////////////////////
	// Returns a JS string which will print the text encoded
	// immediately after the current instruction.
	//
	// |suffix| is a string to add to the encoded string. It may
	// be null, in which case no string will be added.
	//
	// |is_return| is passed through unchanged to handler_zOut()
	// (this function is written in terms of that function).
	// See the comments for that function for details.
	_handler_print: function ge_handler_print(suffix, is_return) {

			var zf = this._zscii_from(this.m_pc,65535,1);
			var message = zf[0];

			if (suffix) message = message + suffix;

      // The quote() method is added to the String prototype by
      // Douglas Crockford's remedial.js.  It deals with edge cases
      // not anticipated by the original inline quoting function
      // that used to be here.
			message=message.quote();

			this.m_pc=zf[1];

			return this._handler_zOut(message, is_return);
	},

	_log_shift: function ge_log_shift(value, shiftbits) {
			// logical-bit-shift.  Right shifts are zero-padded
      // the arguments are unsigned, remember
			if (shiftbits & 0x8000) {
					return (value >>> (0x10000-shiftbits)) & 0xFFFF;
			} else {
					return (value << shiftbits) & 0xFFFF;
			}
	},

	_art_shift: function ge_art_shift(value, shiftbits) {
			// arithmetic-bit-shift.  Right shifts are sign-extended
      // the arguments are unsigned, remember
      value = this._unsigned2signed(value);
			if (shiftbits & 0x8000) {
					return (value >> (0x10000-shiftbits)) & 0xFFFF;
			} else {
					return (value << shiftbits) & 0xFFFF;
			}
	},

	_touch: function ge_touch(address) {

			// Check for a breakpoint.
			// Actually, don't for now: we have no plans as to what we'd do
			// if we found one.
			//			if (this.m_pc in this.m_breakpoints) {
			//					if (address in this.m_breakpoints) {
			//							if (this.m_breakpoints[address]==2) {
			//									// A breakpoint we've just reurned from.
			//									this.m_breakpoints[addr]=1; // set it ready for next time
			//									return 0; // it doesn't trigger again this time.
			//							} else if (this.m_breakpoints[addr]==1) {
			//									// a genuine breakpoint!
			//									this.m_pc = address;
			//									return 1;
			//							}
			//
			//							return 0;
			//					}
			//			}

			if (this.m_goldenTrail) {
        this.logger("pc", address.toString(16));
			}

			this.m_pc = address;
	},

	_save_undo: function ge_save_undo( pc ) {
			// Save the game state
			// As Gnusto can't be relied upon to have the correct PC at runtime, we store it at compile time
			this.m_undo.push({
					'm_call_stack': this.m_call_stack.slice(),
					'm_locals': this.m_locals.slice(),
					'm_locals_stack': this.m_locals_stack.slice(),
					'm_param_counts': this.m_param_counts.slice(),
					'm_result_targets': this.m_result_targets.slice(),
					'm_gamestack': this.m_gamestack.slice(),
          'm_gamestack_callbreaks': this.m_gamestack_callbreaks.slice(),
          'm_memory': this.m_memory.slice(0, this.m_stat_start),
					'm_resultvar': this.m_memory[pc], // move onto target varcode,
					'm_pc': pc + 1
			});
			return 1;
	},

	////////////////////////////////////////////////////////////////
	//
	// _restore_undo
	//
	// Restores the undo information saved in m_undo.
	//
	// Returns zero if the restore failed, nonzero if it succeeded.
	// (If the function returns nonzero, the caller should return
	// control immediately rather than continuing on with the current
	// block of instructions: the PC is already set up. Think of it as
	// a particularly funky kind of goto.)
	//
	_restore_undo: function ge_restore_undo() {

			if (this.m_undo.length == 0) {
					// No undo information is saved in m_undo.
					return 0;
			}

			// Get the most recent undo save data
			var undo_data = this.m_undo.pop();

			this.m_call_stack =undo_data.m_call_stack;
			this.m_locals = undo_data.m_locals;
			this.m_locals_stack = undo_data.m_locals_stack;
			this.m_param_counts = undo_data.m_param_counts;
			this.m_result_targets = undo_data.m_result_targets;
			this.m_gamestack = undo_data.m_gamestack;
      this.m_gamestack_callbreaks = undo_data.m_gamestack_callbreaks;
			var mem = undo_data.m_memory;
			this.m_memory = mem.concat(this.m_memory.slice(mem.length));

			// Set the @save_undo result var to 2, and fix the PC
			this._varcode_set(2, undo_data.m_resultvar);
			this.m_pc = undo_data.m_pc;

			return 1;
	},

	_saveable_state: function ge_saveable_state(varcode_offset) {
			var result = {
					'm_memory': this.m_memory.slice(0, this.m_stat_start),
					'm_pc': this.m_pc + varcode_offset, // move onto target varcode,
					'm_call_stack': this.m_call_stack.slice(),
					'm_locals': this.m_locals.slice(),
					'm_locals_stack': this.m_locals_stack.slice(),
					'm_param_counts': this.m_param_counts.slice(),
					'm_result_targets': this.m_result_targets.slice(),
					'm_gamestack': this.m_gamestack.slice(),
          'm_gamestack_callbreaks': this.m_gamestack_callbreaks.slice()
			};

			return result;
	},

	// Returns nonzero iff the memory verifies correctly for @verify
	// in our copy of the original file of this game, m_original_memory.
	// That is, all bytes after the header must total to the checksum
	// given in the header. We use the value in the orignal file's
	// header for comparison, not the one in the current header.

	_verify: function ge_verify() {

			var total = 0;
			var checksum = (this.m_original_memory[0x1c]<<8 |
											this.m_original_memory[0x1d]);

			for (var i=0x40; i<this.m_original_memory.length; i++) {
					total += this.m_original_memory[i];
			}

			return (total & 0xFFFF) == checksum;
	},

  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //   PRIVATE VARIABLES                                        //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////

  // This will hold the filename of the current game file (so we can
  // reset the memory from it as needed.
  // XXXFIXME: this implies things about where we get game data!
  m_local_game_file: 0,

  // These are all initialised in the function start_game().

  // The actual memory of the Z-machine, one byte per element.
  m_memory: [],

	// Hash mapping Z-code instructions to functions which return a
	// JavaScript string to handle them.
	m_handlers: 0,

  // |this.m_jit| is a cache for the results of compile(): it maps
  // memory locations to JS function objects. Theoretically,
  // executing the function associated with a given address is
  // equivalent to executing the z-code at that address.
  //
  // Note: the results of dissembly in dynamic memory should never
  // be put into this array, since the code can change.
  //
  // Planned features:
  //    1) compile() should know about this array, and should stop
  //       dissembly if its program counter reaches any key in it.
  //    2) putting a flag value (probably zero) into this array will
  //       have the effect of 1), but won't stop us replacing it with
  //       real code later.
  m_jit: [],

	// If this is nonzero, the engine will report as it passes each instruction.
	m_goldenTrail: 0,

	// When this is nonzero, we should print JIT information to the burin,
	// for debugging.
	m_copperTrail: 0,

  // In ordinary use, compile() attempts to make the functions
  // it creates as long as possible. Sometimes, though, we have to
  // stop dissembling (for example, when we reach a RETURN) or it
  // will seem a good idea (say, when we meet an unconditional jump).
  // In such cases, a subroutine anywhere along the line may set
  // |m_compilation_running| to 0, and compile() will stop after the current
  // iteration.
  m_compilation_running: 0,

  // |gamestack| is the Z-machine's stack.
  m_gamestack: 0,

  // Stack which stores the depths of |m_gamestack| at each function call
	// on the function stack. (Quetzal needs to know this.)
  m_gamestack_callbreaks: [],

  // |himem| is the high memory mark. This is rarely used in practice;
  // we might stop noting it.
  m_himem: 0,

  // |pc| is the Z-machine's program counter.
  //
	// During compilation:
  //    it points at the place in memory which we're currently decoding.
	//    This may be in the middle of an instruction. (See m_current_instr
	//    for a way not to have this problem.)
	// During execution (within or outside JITspace):
	//    it points to the next address to be executed. It gets set
  //    using _touch().
  m_pc: 0,

  // |this_instr_pc| is the address of the start of the current instruction.
	// during compilation. This is not identical to |m_pc|, because that
	// can point to addresses within the middles of instructions.
  //m_this_instr_pc: 0,

  // |dict_start| is the address of the dictionary in the Z-machine's memory.
  m_dict_start: 0,

  // |objs_start| is the address of the object table in the Z-machine's memory.
  m_objs_start: 0,

  // |vars_start| is the address of the global variables in the Z-machine's
  // memory.
  m_vars_start: 0,

  // |stat_start| is the address of the bottom of static memory.
  // Anything below this can change during the games. Anything
  // above this does not change like the shifting shadows.
  m_stat_start: 0,

  // Address of the start of the abbreviations table in memory. (Can this
  // be changed? If not, we could decode them all first.)
  m_abbr_start: 0,

  // Address of the start of the header extension table in memory.
  m_hext_start: 0,

  // Address of custom alphabet table (if any).
  m_alpha_start: 0,

  // Holder for the z-alphabet
  m_zalphabet: [],

  // Address of start of strings.
  // Only used in versions 6 and 7; otherwise undefined.
  m_string_start: 0,

  // Address of start of routines.
  // Only used in versions 6 and 7; otherwise undefined.
  m_routine_start: 0,

  // Address of Unicode Translation Table (if any).
  m_unicode_start: 0,
  m_custom_unicode_charcount: 0,

  // Information about the defined list of word separators
  m_separator_count: 0,
  m_separators: [],

  // |version| is the current Z-machine version.
  m_version: 0,

  // |call_stack| stores all the return addresses for all the functions
  // which are currently executing.
  m_call_stack: [],

  // |locals| is an array of the Z-machine's local variables.
  m_locals: [],

  // |locals_stack| is a stack of the values of |locals| for functions
  // further down the call stack than the current function.
  m_locals_stack: 0,

  // |param_counts| is an array which stores the number of parameters for
  // each of the variables on |call_stack|, and the current function (so
  // that the number of parameters to the current function is in
  // param_counts[0]). (Hmm, that's a bit inconsistent. We should change it.)
  m_param_counts: 0,

  // |result_targets| is a stack whose use parallels |call_stack|. Instead of
  // storing return addresses, though, |result_targets| stores varcodes to
  // store a function's result into as it returns. For example, if a
  // function contains:
  //
  //    b000: locals[7] = foo(locals[1])
  //    b005: something else
  //
  // and we're just now returning from the call to foo() in b000, the only
  // legitimate value we can set the PC to is b005 (b000 would cause an
  // infinite loop, after all), but we can't go on to b005 because we haven't
  // finished executing b000 yet. So on the top of |result_targets| there'll be
  // a varcode which represents locals[7]. Varcodes are as defined in ZSD 4.2.2:
	//    0     = push to game stack
	//    1-15  = local variables
	//    16 up = global variables
  //
  // Also, the magic value -1 causes the function's result to be thrown away.
  m_result_targets: [],

  // The function object to run first next time run() gets called,
  // before any other execution gets under way. Its argument will be the
  // |answer| formal parameter of run(). It can also be 0, which
  // is a no-op. run() will clear it to 0 after running it, whatever
  // happens.
  m_rebound: 0,

	// Any extra arguments for m_rebound.
  m_rebound_args: [],

  // Whether we're writing output to the ordinary screen (stream 1).
  m_output_to_console: 0,

  // Stream 2 is whether we're writing output to a game transcript,
  // but the state for that is stored in a bit in "Flags 2" in the header.

  // A list of streams writing out to main memory (collectively, stream 3).
  // The stream at the start of the list is the current one.
  // Each stream is represented as a list with two elements: [|start|, |end|].
  // |start| is the address at the start of the memory block where the length
  // of the block will be stored after the stream is closed. |end| is the
  // current end of the block.
  m_streamthrees: [],

  // Whether we're writing copies of input to a script file (stream 4).
  // fixme: This is really something we need to tell the environment about,
  // since we can't deal with it ourselves.
  m_output_to_script: 0,

  // FIXME: Clarify the distinction here
  // If this is 1, run() will "wimp out" after every opcode.
  m_single_step: 0,
  m_debug_mode: 0,
  m_parser_debugging: 0,
  // assert when any value outside 0..FFFF is written or read
  m_value_asserts: 0,

  // Hash of breakpoints. If compile() reaches one of these, it will stop
  // before executing that instruction with GNUSTO_EFFECT_BREAKPOINT, and the
  // PC set to the address of that instruction.
  //
  // The keys of the hash are opcode numbers. The values are not yet stably
  // defined; at present, all values should be 1, except that if a breakpoint's
  // value is 2, it won't trigger, but it will be reset to 1.
  m_breakpoints: {},

  // Buffer of text written to console.
  m_console_buffer: '',

  // Buffer of text written to transcript.
  m_transcript_buffer: '',

  // |effects| holds the current effect in its zeroth element, and any
	// parameters needed in the following elements.
  m_effects: [],

	// |answers| is a list of answers to an effect, given by the environment.
  m_answers: [],

  m_random_state: 0,
  m_random_use_seed: 0,
  m_random_use_sequence: 0,
	m_random_sequence_max: 0,

  // Values of the bottom two bits in Flags 2 (address 0x11),
  // used by the zOut function.
  // See http://code.google.com/p/parchment/issues/detail?id=14.
  m_printing_header_bits: 0,

  // Leftover text which should be printed next run(), since
  // we couldn't print it this time because the flags had
  // changed.
  m_leftovers: '',

  // These pointers point at the currently-selected functions:
  m_pc_translate_for_routine: pc_translate_v45,
  m_pc_translate_for_string: pc_translate_v45,

	// An array of undo save data.
	// If this is an object, it should contain copies of other
	// properties of the engine object with the same names,
	// backed up for @save_undo. These should be the same as
	// their namesakes at the moment of saving, except that:
	//    m_memory needs only to hold dynamic memory
	//    m_pc points at the } address (<z5)  { which receives the
	//                       } varcode (>=z5) { success result.
	//
	// If the array is empty, no undo information is saved.
	m_undo: [],

	// Like m_undo, but only well-defined during a save effect.
	m_state_to_save: 0,

	// Saved Quetzal image. Only well-defined between a call to saveGame()
	// and a call to saveGameData().
	m_quetzal_image: 0,

	// Original state of the story file. Used when saving to produce
	// a compressed image by comparison.
	//
	// FIXME: This should make the restart effect redundant.
	// Make it so.
	m_original_memory: [],

	// Whether to save compressed or uncompressed games. This trades
	// having small files for saving slightly faster, and isn't
	// really worth it. We may hardwire it on permanently.
	//m_compress_save_files: 1,

	// Offset of the (notional) 0th entry in the object tree from the
	// start of the object block, in bytes. (This is the size of the
	// property defaults table less m_object_size.)
	m_object_tree_start: 0,

	// Address of the property list address within the (notional) 0th
	// entry in the object block. This is m_object_tree_start plus
	// the offset within the record for that field (which varies by
	// architecture).
	m_property_list_addr_start: 0,

	// Size of an object in the objects table, in bytes.
	m_object_size: 14,

	// A stack of information about the routines that were suspended
	// for the current interrupt service routines to do their jobs.
	// Usually ISRs don't interrupt other ISRs, so this stack will have
	// either one or no elements.
	m_interrupt_information: [],
	
	// Stuff for @parchment
	op_parchment_data: {}

};

// EOF gnusto-engine.js //
