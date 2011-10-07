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
var simple_func = function( a ) { return a.write(); },

// Common opcodes
alwaysbranch = opcode_builder( Brancher, function() { return 1; } ),

// Indirect variable operand
IndirectVariable = Variable.subClass({
	write: function( value )
	{
		var havevalue = arguments.length,
		variable = this.v;
		if ( variable.write || variable == 0 )
		{
			value = value && value.write ? value.write() : value;
			variable = variable.write ? variable.write() : variable;
			return 'e.indirect(' + variable + ( havevalue ? ',' + value : '' ) + ')';
		}
		return this._super( value );
	}
}),

// Indirect storer opcodes - rather non-generic I'm afraid
// Not used for inc/dec
// @load (variable) -> (result)
// @pull (variable)
// @store (variable) value
Indirect = Storer.subClass({
	storer: 0,
	
	post: function()
	{
		var operands = this.operands;
		
		// If the indirect operand is a variable we replace it with a new variable whose value is the first
		operands[0] = new IndirectVariable( this.e, operands[0] instanceof Variable ? operands[0] : operands[0].v );
		
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

opcodes = {
	
/* je */ 1: opcode_builder( Brancher, function() { return arguments.length == 2 ? this.args( '==' ) : 'e.jeq(' + this.args() + ')'; } ),
/* jl */ 2: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '<' + b.U2S(); } ),
/* jg */ 3: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '>' + b.U2S(); } ),
// Too many U2S/S2U for these...
/* dec_chk */ 4: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable.write() + ',-1))<' + value.U2S(); } ),
/* inc_chk */ 5: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable.write() + ',1))>' + value.U2S(); } ),
/* jin */ 6: opcode_builder( Brancher, function() { return 'e.jin(' + this.args() + ')'; } ),
/* test */ 7: opcode_builder( Brancher, function() { return 'e.test(' + this.args() + ')'; } ),
/* or */ 8: opcode_builder( Storer, function() { return this.args( '|' ); } ),
/* and */ 9: opcode_builder( Storer, function() { return this.args( '&' ); } ),
/* test_attr */ 10: opcode_builder( Brancher, function() { return 'e.test_attr(' + this.args() + ')'; } ),
/* set_attr */ 11: opcode_builder( Opcode, function() { return 'e.set_attr(' + this.args() + ')'; } ),
/* clear_attr */ 12: opcode_builder( Opcode, function() { return 'e.clear_attr(' + this.args() + ')'; } ),
/* store */ 13: Indirect,
/* insert_obj */ 14: opcode_builder( Opcode, function() { return 'e.insert_obj(' + this.args() + ')'; } ),
/* loadw */ 15: opcode_builder( Storer, function( array, index ) { return 'm.getUint16(' + array.write() + '+2*' + index.U2S() + ')'; } ),
/* loadb */ 16: opcode_builder( Storer, function( array, index ) { return 'm.getUint8(' + array.write() + '+' + index.U2S() + ')'; } ),
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
/* set_colour */
/* throw */
/* jz */ 128: opcode_builder( Brancher, function( a ) { return a.write() + '==0'; } ),
/* get_sibling */ 129: opcode_builder( BrancherStorer, function( obj ) { return this.storer.write( 'e.get_lilsis(' + obj.write() + ')' ); } ),
/* get_child */ 130: opcode_builder( BrancherStorer, function( obj ) { return this.storer.write( 'e.get_child(' + obj.write() + ')' ); } ),
/* get_parent */ 131: opcode_builder( Storer, function( obj ) { return 'e.get_parent(' + obj.write() + ')'; } ),
/* get_prop_length */ 132: opcode_builder( Storer, function( a ) { return 'e.get_prop_len(' + a.write() + ')'; } ),
/* inc */ 133: opcode_builder( Opcode, function( a ) { return 'e.incdec(' + a.write() + ',1)'; } ),
/* dec */ 134: opcode_builder( Opcode, function( a ) { return 'e.incdec(' + a.write() + ',-1)'; } ),
/* print_addr */ 135: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr.write() + '))'; } ),
/* call_1s */ 136: CallerStorer,
/* remove_obj */ 137: opcode_builder( Opcode, function( obj ) { return 'e.remove_obj(' + obj.write() + ')'; } ),
/* print_obj */ 138: opcode_builder( Opcode, function( a ) { return 'e.print(e.text.decode(m.getUint16(e.objects+14*' + a.write() + '+13)))'; } ),
/* ret */ 139: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a.write() + ')'; } ),
/* jump */ 140: opcode_builder( Stopper, function( a ) { return 'e.pc=' + a.U2S() + '+' + (this.next - 2) + ''; } ),
/* print_paddr */ 141: opcode_builder( Opcode, function( addr ) { return 'e.print(e.text.decode(' + addr.write() + '*' + this.e.packing_multipler + '))'; } ),
/* load */ 142: Indirect.subClass( { storer: 1 } ),
/* call_1n */ 143: Caller,
/* rtrue */ 176: opcode_builder( Stopper, function() { return 'e.ret(1)'; } ),
/* rfalse */ 177: opcode_builder( Stopper, function() { return 'e.ret(0)'; } ),
// Reconsider a generalised class for @print/@print_ret?
/* print */ 178: opcode_builder( Opcode, function( text ) { return 'e.print("' + text + '")'; }, { printer: 1 } ),
/* print_ret */ 179: opcode_builder( Stopper, function( text ) { return 'e.print("' + text + '");e.ret(1)'; }, { printer: 1 } ),
/* nop */ 180: Opcode,
/* restart */ 183: opcode_builder( Stopper, function() { return 'e.act("restart")'; } ), // !!!
/* ret_popped */ 184: opcode_builder( Stopper, function( a ) { return 'e.ret(' + a.write() + ')'; }, { post: function() { this.operands.push( new Variable( this.e, 0 ) ); } } ),
/* catch */
/* quit */ 186: opcode_builder( Stopper, function() { return 'e.act("quit")'; } ),
/* new_line */ 187: opcode_builder( Opcode, function() { return 'e.print("\\n")'; } ),
/* verify */ 189: alwaysbranch, // Actually check??
/* piracy */ 191: alwaysbranch,
/* call_vs */ 224: CallerStorer,
/* storew */ 225: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint16(' + array.write() + '+2*' + index.U2S() + ',' + value.write() + ')'; } ),
/* storeb */ 226: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint8(' + array.write() + '+' + index.U2S() + ',' + value.write() + ')'; } ),
/* put_prop */ 227: opcode_builder( Opcode, function() { return 'e.put_prop(' + this.args() + ')'; } ),
/* aread */ 228: opcode_builder( Stopper, function() { var storer = this.operands.pop(); return 'e.read(' + this.args() + ',' + storer.v + ');e.pc=' + this.next; }, { storer: 1 } ),
/* print_char */ 229: opcode_builder( Opcode, function( a ) { return 'e.print(e.text.zscii_to_text([' + a.write() + ']))'; } ),
/* print_num */ 230: opcode_builder( Opcode, function( a ) { return 'e.print(' + a.U2S() + ')'; } ),
/* random */ 231: opcode_builder( Storer, function( a ) { return 'e.random(' + a.U2S() + ')'; } ),
/* push */ 232: opcode_builder( Storer, simple_func, { post: function() { this.storer = new Variable( this.e, 0 ); }, storer: 0 } ),
/* pull */ 233: Indirect,
/* split_window */
/* set_window */
/* call_vs2 */ 236: CallerStorer,
/* erase_window */
/* erase_line */
/* set_cursor */
/* get_cursor */
/* set_text_style */ 241: opcode_builder( Opcode, function( stylebyte ) { return 'e.ui.set_style(' + stylebyte.write() + ')'; } ),
/* buffer_mode */
/* output_stream */ 243: opcode_builder( Opcode, function() { return 'e.ui.output_stream(' + this.args() + ')'; } ),
/* input_stream */
/* sound_effect */
/* read_char */ 246: opcode_builder( Stopper, function() { return 'e.act("quit")'; } ), // !!!
/* scan_table */
/* not */ 248: opcode_builder( Storer, function( a ) { return 'e.S2U(~' + a.write() + ')'; } ),
/* call_vn */ 249: Caller,
/* call_vn2 */ 250: Caller,
/* tokenise */
/* encode_text */
/* copy_table */
/* print_table */
/* check_arg_count */ 255: opcode_builder( Brancher, function( arg ) { return arg.write() + '<=e.call_stack[0][4]'; } ),
/* save */
/* restore */
/* log_shift */ 1002: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.log_shift(' + a.write() + ',' + b.U2S() + '))'; } ),
/* art_shift */ 1003: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.art_shift(' + a.U2S() + ',' + b.U2S() + '))'; } ),
/* set_font */
/* save_undo */ 1009: opcode_builder( Storer, function() { return 'e.save_undo(' + this.next + ',' + this.storer.v + ')'; } ),
// As the standard says calling this without a save point is illegal, we don't need to actually store the result (but it must still be disassembled)
/* restore_undo */ 1010: opcode_builder( Opcode, function() { return 'if(e.restore_undo())return'; }, { storer: 1 } ),
/* print_unicode */ 1011: opcode_builder( Opcode, function( a ) { return 'e.print(String.fromCharCode(' + a.write() + '))'; } ),
/* check_unicode */
// Assume we can print and read all unicode characters rather than actually testing
1012: opcode_builder( Storer, function() { return 3; } ),
/* gestalt */ 1030: opcode_builder( Storer, function() { return 'e.gestalt(' + this.args() + ')'; } ),
/* parchment */ 1031: opcode_builder( Storer, function() { return 'e.op_parchment(' + this.args() + ')'; } )
	
};
