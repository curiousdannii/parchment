/*

Z-Machine opcodes
=================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Abstract out the signed conversions such that they can be eliminated if possible
	don't access memory directly
	
*/

// Common functions
var simple_func = function( a ) { return '' + a; },

// Common opcodes
alwaysbranch = opcode_builder( Brancher, function() { return 1; } ),

// Indirect storer opcodes - rather non-generic I'm afraid
// Not used for inc/dec
// @load (variable) -> (result)
// @pull (variable)
// @store (variable) value
Indirect = Storer.subClass({
	storer: 0,
	
	post: function()
	{
		var operands = this.operands,
		op0 = operands[0],
		op0isVar = op0 instanceof Variable;
		
		// Replace the indirect operand with a Variable, and set .indirect if needed
		operands[0] = new Variable( this.e, op0isVar ? op0 : op0.v );
		if ( op0isVar || op0.v == 0 )
		{
			operands[0].indirect = 1;
		}
		
		// Get the storer
		this.storer = this.code == 142 ? operands.pop() : operands.shift();
		
		// @pull needs an added stack. If for some reason it was compiled with two operands this will break!
		if ( operands.length == 0 )
		{
			operands.push( new Variable( this.e, 0 ) );
		}
	},
	
	func: simple_func
}),

Incdec = Opcode.subClass({
	func: function( variable )
	{
		var varnum = variable.v - 1,
		operator = this.code % 2 ? 1 : -1;
		
		// Fallback to the runtime function if our variable is a variable operand itself
		// Or, if it's a global
		if ( variable instanceof Variable || varnum > 14 )
		{
			return 'e.incdec(' + variable + ',' + operator + ')';
		}
		
		return ( varnum < 0 ? 'e.s[e.s.length-1]=e.S2U(e.s[e.s.length-1]+' : ( 'e.l[' + varnum + ']=e.S2U(e.l[' + varnum + ']+' ) ) + operator + ')';
	}
}),

opcodes = {
	
/* je */ 1: opcode_builder( Brancher, function() { return arguments.length == 2 ? this.args( '==' ) : 'e.jeq(' + this.args() + ')'; } ),
/* jl */ 2: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '<' + b.U2S(); } ),
/* jg */ 3: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '>' + b.U2S(); } ),
// Too many U2S/S2U for these...
/* dec_chk */ 4: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable + ',-1))<' + value.U2S(); } ),
/* inc_chk */ 5: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable + ',1))>' + value.U2S(); } ),
/* jin */ 6: opcode_builder( Brancher, function() { return 'e.jin(' + this.args() + ')'; } ),
/* test */ 7: opcode_builder( Brancher, function() { return 'e.test(' + this.args() + ')'; } ),
/* or */ 8: opcode_builder( Storer, function() { return this.args( '|' ); } ),
/* and */ 9: opcode_builder( Storer, function() { return this.args( '&' ); } ),
/* test_attr */ 10: opcode_builder( Brancher, function() { return 'e.test_attr(' + this.args() + ')'; } ),
/* set_attr */ 11: opcode_builder( Opcode, function() { return 'e.set_attr(' + this.args() + ')'; } ),
/* clear_attr */ 12: opcode_builder( Opcode, function() { return 'e.clear_attr(' + this.args() + ')'; } ),
/* store */ 13: Indirect,
/* insert_obj */ 14: opcode_builder( Opcode, function() { return 'e.insert_obj(' + this.args() + ')'; } ),
/* loadw */ 15: opcode_builder( Storer, function( array, index ) { return 'm.getUint16(e.S2U(' + array + '+2*' + index.U2S() + '))'; } ),
/* loadb */ 16: opcode_builder( Storer, function( array, index ) { return 'm.getUint8(e.S2U(' + array + '+' + index.U2S() + '))'; } ),
/* get_prop */ 17: opcode_builder( Storer, function() { return 'e.get_prop(' + this.args() + ')'; } ),
/* get_prop_addr */ 18: opcode_builder( Storer, function() { return 'e.find_prop(' + this.args() + ')'; } ),
/* get_next_prop */ 19: opcode_builder( Storer, function() { return 'e.find_prop(' + this.args( ',0,' ) + ')'; } ),
/* add */ 20: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '+' ) + ')'; } ),
/* sub */ 21: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '-' ) + ')'; } ),
/* mul */ 22: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '*' ) + ')'; } ),
/* div */ 23: opcode_builder( Storer, function( a, b ) { return 'e.S2U(parseInt(' + a.U2S() + '/' + b.U2S() + '))'; } ),
/* mod */ 24: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.U2S() + '%' + b.U2S() + ')'; } ),
/* call_2s */ 25: CallerStorer,
/* call_2n */ 26: Caller,
/* set_colour */ 27: opcode_builder( Opcode, function() { return 'e.ui.set_colour(' + this.args() + ')'; } ),
/* throw */ 28: opcode_builder( Stopper, function( value, cookie ) { return 'while(e.call_stack.length>' + cookie + '){e.call_stack.shift()}e.ret(' + value + ')'; } ),
/* jz */ 128: opcode_builder( Brancher, function( a ) { return a + '==0'; } ),
/* get_sibling */ 129: opcode_builder( BrancherStorer, function( obj ) { return 'e.get_sibling(' + obj + ')'; } ),
/* get_child */ 130: opcode_builder( BrancherStorer, function( obj ) { return 'e.get_child(' + obj + ')'; } ),
/* get_parent */ 131: opcode_builder( Storer, function( obj ) { return 'e.get_parent(' + obj + ')'; } ),
/* get_prop_length */ 132: opcode_builder( Storer, function( a ) { return 'e.get_prop_len(' + a + ')'; } ),
/* inc */ 133: Incdec,
/* dec */ 134: Incdec,
/* print_addr */ 135: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr + '))'; } ),
/* call_1s */ 136: CallerStorer,
/* remove_obj */ 137: opcode_builder( Opcode, function( obj ) { return 'e.remove_obj(' + obj + ')'; } ),
/* print_obj */ 138: opcode_builder( Opcode, function( obj ) { return 'e.print_obj(' + obj + ')'; } ),
/* ret */ 139: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a + ')'; } ),
/* jump */ 140: opcode_builder( Stopper, function( a ) { return 'e.pc=' + a.U2S() + '+' + ( this.next - 2 ); } ),
/* print_paddr */ 141: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr + '*' + this.e.addr_multipler + '))'; } ),
/* load */ 142: Indirect.subClass( { storer: 1 } ),
/* call_1n */ 143: Caller,
/* rtrue */ 176: opcode_builder( Stopper, function() { return 'e.ret(1)'; } ),
/* rfalse */ 177: opcode_builder( Stopper, function() { return 'e.ret(0)'; } ),
// Reconsider a generalised class for @print/@print_ret?
/* print */ 178: opcode_builder( Opcode, function( text ) { return 'e.print("' + text + '")'; }, { printer: 1 } ),
/* print_ret */ 179: opcode_builder( Stopper, function( text ) { return 'e.print("' + text + '\\n");e.ret(1)'; }, { printer: 1 } ),
/* nop */ 180: Opcode,
/* restart */ 183: opcode_builder( Stopper, function() { return 'e.act("restart")'; } ),
/* ret_popped */ 184: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a + ')'; }, { post: function() { this.operands.push( new Variable( this.e, 0 ) ); } } ),
/* catch */ 185: opcode_builder( Storer, function() { return 'e.call_stack.length'; } ),
/* quit */ 186: opcode_builder( Stopper, function() { return 'e.act("quit")'; } ),
/* new_line */ 187: opcode_builder( Opcode, function() { return 'e.print("\\n")'; } ),
/* verify */ 189: alwaysbranch, // Actually check??
/* piracy */ 191: alwaysbranch,
/* call_vs */ 224: CallerStorer,
/* storew */ 225: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint16(e.S2U(' + array + '+2*' + index.U2S() + '),' + value + ')'; } ),
/* storeb */ 226: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint8(e.S2U(' + array + '+' + index.U2S() + '),' + value + ')'; } ),
/* put_prop */ 227: opcode_builder( Opcode, function() { return 'e.put_prop(' + this.args() + ')'; } ),
/* aread */ 228: opcode_builder( Pauser, function() { return 'e.read(' + this.args() + ',' + this.storer.v + ')'; } ),
/* print_char */ 229: opcode_builder( Opcode, function( a ) { return 'e.print(e.text.zscii_to_text([' + a + ']))'; } ),
/* print_num */ 230: opcode_builder( Opcode, function( a ) { return 'e.print(' + a.U2S() + ')'; } ),
/* random */ 231: opcode_builder( Storer, function( a ) { return 'e.random(' + a.U2S() + ')'; } ),
/* push */ 232: opcode_builder( Storer, simple_func, { post: function() { this.storer = new Variable( this.e, 0 ); }, storer: 0 } ),
/* pull */ 233: Indirect,
/* split_window */ 234: opcode_builder( Opcode, function( lines ) { return 'e.ui.split_window(' + lines + ')'; } ),
/* set_window */ 235: opcode_builder( Opcode, function( wind ) { return 'e.ui.set_window(' + wind + ')'; } ),
/* call_vs2 */ 236: CallerStorer,
/* erase_window */ 237: opcode_builder( Opcode, function( win ) { return 'e.ui.erase_window(' + win.U2S() + ')'; } ),
/* erase_line */ 238: opcode_builder( Opcode, function( a ) { return 'e.ui.erase_line(' + a + ')'; } ),
/* set_cursor */ 239: opcode_builder( Opcode, function() { return 'e.ui.set_cursor(' + this.args() + ')'; } ),
/* get_cursor */ 240: opcode_builder( Pauser, function( addr ) { return 'e.ui.get_cursor(' + addr + ')'; } ),
/* set_text_style */ 241: opcode_builder( Opcode, function( stylebyte ) { return 'e.ui.set_style(' + stylebyte + ')'; } ),
/* buffer_mode */ 242: Opcode, // We don't support non-buffered output
/* output_stream */ 243: opcode_builder( Opcode, function() { return 'e.output_stream(' + this.args() + ')'; } ),
/* input_stream */ 244: Opcode, // We don't support changing the input stream
/* sound_effect */ 245: Opcode, // We don't support sounds
/* read_char */ 246: opcode_builder( Pauser, function() { return 'e.read_char(' + ( this.args() || '1' ) + ',' + this.storer.v + ')'; } ),
/* scan_table */ 247: opcode_builder( BrancherStorer, function() { return 'e.scan_table(' + this.args() + ')'; } ),
/* not */ 248: opcode_builder( Storer, function( a ) { return 'e.S2U(~' + a + ')'; } ),
/* call_vn */ 249: Caller,
/* call_vn2 */ 250: Caller,
/* tokenise */ 251: opcode_builder( Opcode, function() { return 'e.text.tokenise(' + this.args() + ')'; } ),
/* encode_text */ 252: opcode_builder( Opcode, function() { return 'e.encode_text(' + this.args() + ')'; } ),
/* copy_table */ 253: opcode_builder( Opcode, function() { return 'e.copy_table(' + this.args() + ')'; } ),
/* print_table */ 254: opcode_builder( Opcode, function() { return 'e.print_table(' + this.args() + ')'; } ),
/* check_arg_count */ 255: opcode_builder( Brancher, function( arg ) { return arg + '<=e.call_stack[0][4]'; } ),
/* save */ 1000: opcode_builder( Pauser, function() { return 'e.save(' + ( this.next - 1 ) + ',' + this.storer.v + ')'; } ),
/* restore */ 1001: opcode_builder( Pauser, function() { return 'e.act("restore",{storer:' + this.storer.v + '})'; } ),
/* log_shift */ 1002: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.log_shift(' + a + ',' + b.U2S() + '))'; } ),
/* art_shift */ 1003: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.art_shift(' + a.U2S() + ',' + b.U2S() + '))'; } ),
/* set_font */ 1004: opcode_builder( Storer, function( font ) { return 'e.ui.set_font(' + font + ')'; } ),
/* save_undo */ 1009: opcode_builder( Storer, function() { return 'e.save_undo(' + this.next + ',' + this.storer.v + ')'; } ),
// As the standard says calling this without a save point is illegal, we don't need to actually store anything (but it must still be disassembled)
/* restore_undo */ 1010: opcode_builder( Opcode, function() { return 'if(e.restore_undo())return'; }, { storer: 1 } ),
/* print_unicode */ 1011: opcode_builder( Opcode, function( a ) { return 'e.print(String.fromCharCode(' + a + '))'; } ),
// Assume we can print and read all unicode characters rather than actually testing
/* check_unicode */ 1012: opcode_builder( Storer, function() { return 3; } ),
/* set_true_colour */ 1013: opcode_builder( Opcode, function() { return 'e.ui.set_true_colour(' + this.args() + ')'; } ),
/* sound_data */ 1014: Opcode.subClass( { brancher: 1 } ), // We don't support sounds (but disassemble the branch address)
/* gestalt */ 1030: opcode_builder( Storer, function() { return 'e.gestalt(' + this.args() + ')'; } )
/* parchment */ //1031: opcode_builder( Storer, function() { return 'e.op_parchment(' + this.args() + ')'; } )
	
};
