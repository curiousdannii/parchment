/*

ZVM Glk dispatch layer
======================

Copyright (c) 2017 The ifvms.js team
MIT licenced
https://github.com/curiousdannii/ifvms.js

*/

const dummyArgInt = {
	serialize: () => ({}),
}

class ZVMDispatch
{
	constructor()
	{
		this.class_map = {
			'fileref': {},
			'stream': {},
			'window': {},
		}
		this.last_used_id = 101
	}

	check_autosave()
	{
		return !this.vm.glk_blocking_call
	}

	class_obj_from_id( clas, val )
	{
		return this.class_map[clas][val]
	}

	class_register( clas, obj, usedisprock )
	{
		if ( usedisprock )
		{
			if ( obj.disprock !== usedisprock )
			{
				throw new Error( 'class_register: object is not already registered' )
			}
			if ( this.last_used_id <= usedisprock )
			{
				this.last_used_id = usedisprock + 1
			}
		}
		else
		{
			if ( obj.disprock )
			{
				throw new Error( 'class_register: object is already registered' )
			}
			obj.disprock = this.last_used_id++
		}
		this.class_map[clas][obj.disprock] = obj
	}

	class_unregister( clas, obj )
	{
		if ( !obj.disprock || this.class_map[clas][obj.disprock] == null )
		{
			throw new Error( 'class_unregister: object is not registered' )
		}
		delete this.class_map[clas][obj.disprock]
		obj.disprock = null
	}

	get_retained_array( arr )
	{
		return {
			arg: dummyArgInt,
			arr: arr.slice(),
			len: arr.length,
		}
	}

	prepare_resume()
	{}

	retain_array()
	{}

	set_vm( vm )
	{
		this.vm = vm
	}

	unretain_array()
	{}
}

// Export the class and an instance
if ( typeof module === 'object' && module.exports )
{
	module.exports = ZVMDispatch
}
if ( typeof window !== 'undefined' )
{
	window.GiDispa = new ZVMDispatch()
}