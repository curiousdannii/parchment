/*!
 * Simple JavaScript Inheritance
 * http://ejohn.org/blog/simple-javascript-inheritance/
 *
 * By John Resig
 * Released into the public domain?
 *
 * Inspired by base2 and Prototype
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);       
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();
/*!
 * Interchange File Format library
 *
 * Copyright (c) 2003-2009 The Gnusto Contributors
 * Licenced under the GPL v2
 * http://github.com/curiousdannii/gnusto
 */
(function(){

// Get a 32 bit number from a byte array, and vice versa
function num_from(s, offset)
{
	return s[offset] << 24 | s[offset + 1] << 16 | s[offset + 2] << 8 | s[offset + 3];
}

function num_to_word(n)
{
	return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

// Get a 4 byte string ID from a byte array, and vice versa
function text_from(s, offset)
{
	var fromCharCode = String.fromCharCode;
	return fromCharCode(s[offset]) + fromCharCode(s[offset + 1]) + fromCharCode(s[offset + 2]) + fromCharCode(s[offset + 3]);
}

function text_to_word(t)
{
	return [t.charCodeAt(0), t.charCodeAt(1), t.charCodeAt(2), t.charCodeAt(3)];
}

var FORM = 'FORM',

// IFF file class
// Parses an IFF file stored in a byte array
IFF = Class.extend({
	// Parse a byte array or construct an empty IFF file
	init: function parse_iff(data)
	{
		this.type = '';
		this.chunks = [];
		if (data)
		{
			// Check this is an IFF file
			if (text_from(data, 0) != FORM)
				throw new Error("Not an IFF file");

			// Parse the file
			this.type = text_from(data, 8);

			var i = 12, l = data.length;
			while (i < l)
			{
				var chunk_length = num_from(data, i + 4);
				if (chunk_length < 0 || (chunk_length + i) > l)
					// FIXME: do something sensible here
					throw new Error("IFF: Chunk out of range");

				this.chunks.push({
					type: text_from(data, i),
					offset: i,
					data: data.slice(i + 8, i + 8 + chunk_length)
				});

				i += 8 + chunk_length;
				if (chunk_length % 2) i++;
			}
		}
	},

	// Write out the IFF into a byte array
	write: function write_iff()
	{
		// Start with the IFF type
		var out = text_to_word(this.type);

		// Go through the chunks and write them out
		for (var i = 0, l = this.chunks.length; i < l; i++)
		{
			var chunk = this.chunks[i], data = chunk.data, len = data.length;
			out = out.concat(text_to_word(chunk.type), num_to_word(len), data);
			if (len % 2)
				out.push(0);
		}

		// Add the header and return
		return text_to_word(FORM).concat(num_to_word(out.length), out);
	}
});

// Expose the class and helper functions
IFF.num_from = num_from;
IFF.num_to_word = num_to_word;
IFF.text_from = text_from;
IFF.text_to_word = text_to_word;
window.IFF = IFF;

})();
/*!
 * Copyright (c) 2006 Brandon Aaron (brandon.aaron@gmail.com || http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 *
 * $LastChangedDate: 2007-12-20 09:02:08 -0600 (Thu, 20 Dec 2007) $
 * $Rev: 4265 $
 *
 * Version: 3.0
 * 
 * Requires: $ 1.2.2+
 */

(function($) {

$.event.special.mousewheel = {
	setup: function() {
		var handler = $.event.special.mousewheel.handler;
		
		// Fix pageX, pageY, clientX and clientY for mozilla
		if ( $.browser.mozilla )
			$(this).bind('mousemove.mousewheel', function(event) {
				$.data(this, 'mwcursorposdata', {
					pageX: event.pageX,
					pageY: event.pageY,
					clientX: event.clientX,
					clientY: event.clientY
				});
			});
	
		if ( this.addEventListener )
			this.addEventListener( ($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel'), handler, false);
		else
			this.onmousewheel = handler;
	},
	
	teardown: function() {
		var handler = $.event.special.mousewheel.handler;
		
		$(this).unbind('mousemove.mousewheel');
		
		if ( this.removeEventListener )
			this.removeEventListener( ($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel'), handler, false);
		else
			this.onmousewheel = function(){};
		
		$.removeData(this, 'mwcursorposdata');
	},
	
	handler: function(event) {
		var args = Array.prototype.slice.call( arguments, 1 );
		
		event = $.event.fix(event || window.event);
		// Get correct pageX, pageY, clientX and clientY for mozilla
		$.extend( event, $.data(this, 'mwcursorposdata') || {} );
		var delta = 0, returnValue = true;
		
		if ( event.wheelDelta ) delta = event.wheelDelta/120;
		if ( event.detail     ) delta = -event.detail/3;
		if ( $.browser.opera  ) delta = -event.wheelDelta;
		
		event.data  = event.data || {};
		event.type  = "mousewheel";
		
		// Add delta to the front of the arguments
		args.unshift(delta);
		// Add event to the front of the arguments
		args.unshift(event);

		return $.event.handle.apply(this, args);
	}
};

$.fn.extend({
	mousewheel: function(fn) {
		return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
	},
	
	unmousewheel: function(fn) {
		return this.unbind("mousewheel", fn);
	}
});

})(jQuery);
/*!
(c) Copyrights 2007 - 2008

Original idea by by Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
 
jQuery Plugin by Tzury Bar Yochay 
tzury.by@gmail.com
http://evalinux.wordpress.com
http://facebook.com/profile.php?id=513676303

Project's sites: 
http://code.google.com/p/js-hotkeys/
http://github.com/tzuryby/hotkeys/tree/master

License: same as jQuery license. 
*/
/*
USAGE:
    // simple usage
    $(document).bind('keydown', 'Ctrl+c', function(){ alert('copy anyone?');});
    
    // special options such as disableInIput
    $(document).bind('keydown', {combi:'Ctrl+x', disableInInput: true} , function() {});
    
Note:
    This plugin wraps the following jQuery methods: $.fn.find, $.fn.bind and $.fn.unbind
    
*/


(function (jQuery){
    // keep reference to the original $.fn.bind and $.fn.unbind
    jQuery.fn.__bind__ = jQuery.fn.bind;
    jQuery.fn.__unbind__ = jQuery.fn.unbind;
    jQuery.fn.__find__ = jQuery.fn.find;
    
    var hotkeys = {
        version: '0.7.8',
        override: /keydown|keypress|keyup/g,
        triggersMap: {},
        
        specialKeys: { 27: 'esc', 9: 'tab', 32:'space', 13: 'return', 8:'backspace', 145: 'scroll', 
            20: 'capslock', 144: 'numlock', 19:'pause', 45:'insert', 36:'home', 46:'del',
            35:'end', 33: 'pageup', 34:'pagedown', 37:'left', 38:'up', 39:'right',40:'down', 
            112:'f1',113:'f2', 114:'f3', 115:'f4', 116:'f5', 117:'f6', 118:'f7', 119:'f8', 
            120:'f9', 121:'f10', 122:'f11', 123:'f12' },
        
        shiftNums: { "`":"~", "1":"!", "2":"@", "3":"#", "4":"$", "5":"%", "6":"^", "7":"&", 
            "8":"*", "9":"(", "0":")", "-":"_", "=":"+", ";":":", "'":"\"", ",":"<", 
            ".":">",  "/":"?",  "\\":"|" },
        
        newTrigger: function (type, combi, callback) { 
            // i.e. {'keyup': {'ctrl': {cb: callback, disableInInput: false}}}
            var result = {};
            result[type] = {};
            result[type][combi] = {cb: callback, disableInInput: false};
            return result;
        }
    };
    // add firefox num pad char codes
    if (jQuery.browser.mozilla){
        hotkeys.specialKeys = jQuery.extend(hotkeys.specialKeys, { 96: '0', 97:'1', 98: '2', 99: 
            '3', 100: '4', 101: '5', 102: '6', 103: '7', 104: '8', 105: '9' });
    }
    
    // a wrapper around of $.fn.find 
    // see more at: http://groups.google.com/group/jquery-en/browse_thread/thread/18f9825e8d22f18d
    jQuery.fn.find = function( selector ) {
        this.query=selector;
        return jQuery.fn.__find__.apply(this, arguments);
	};
    
    jQuery.fn.unbind = function (type, combi, fn){
        if (jQuery.isFunction(combi)){
            fn = combi;
            combi = null;
        }
        if (combi && typeof combi === 'string'){
            var selectorId = ((this.prevObject && this.prevObject.query) || (this[0].id && this[0].id) || this[0]).toString();
            var hkTypes = type.split(' ');
            for (var x=0; x<hkTypes.length; x++){
                delete hotkeys.triggersMap[selectorId][hkTypes[x]][combi];
            }
        }
        // call jQuery original unbind
        return  this.__unbind__(type, fn);
    };
    
    jQuery.fn.bind = function(type, data, fn){
        // grab keyup,keydown,keypress
        var handle = type.match(hotkeys.override);
        
        if (jQuery.isFunction(data) || !handle){
            // call jQuery.bind only
            return this.__bind__(type, data, fn);
        }
        else{
            // split the job
            var result = null,            
            // pass the rest to the original $.fn.bind
            pass2jq = jQuery.trim(type.replace(hotkeys.override, ''));
            
            // see if there are other types, pass them to the original $.fn.bind
            if (pass2jq){
                // call original jQuery.bind()
                result = this.__bind__(pass2jq, data, fn);
            }            
            
            if (typeof data === "string"){
                data = {'combi': data};
            }
            if(data.combi){
                for (var x=0; x < handle.length; x++){
                    var eventType = handle[x];
                    var combi = data.combi.toLowerCase(),
                        trigger = hotkeys.newTrigger(eventType, combi, fn),
                        selectorId = ((this.prevObject && this.prevObject.query) || (this[0].id && this[0].id) || this[0]).toString();
                        
                    //trigger[eventType][combi].propagate = data.propagate;
                    trigger[eventType][combi].disableInInput = data.disableInInput;
                    
                    // first time selector is bounded
                    if (!hotkeys.triggersMap[selectorId]) {
                        hotkeys.triggersMap[selectorId] = trigger;
                    }
                    // first time selector is bounded with this type
                    else if (!hotkeys.triggersMap[selectorId][eventType]) {
                        hotkeys.triggersMap[selectorId][eventType] = trigger[eventType];
                    }
                    // make trigger point as array so more than one handler can be bound
                    var mapPoint = hotkeys.triggersMap[selectorId][eventType][combi];
                    if (!mapPoint){
                        hotkeys.triggersMap[selectorId][eventType][combi] = [trigger[eventType][combi]];
                    }
                    else if (mapPoint.constructor !== Array){
                        hotkeys.triggersMap[selectorId][eventType][combi] = [mapPoint];
                    }
                    else {
                        hotkeys.triggersMap[selectorId][eventType][combi][mapPoint.length] = trigger[eventType][combi];
                    }
                    
                    // add attribute and call $.event.add per matched element
                    this.each(function(){
                        // jQuery wrapper for the current element
                        var jqElem = jQuery(this);
                        
                        // element already associated with another collection
                        if (jqElem.attr('hkId') && jqElem.attr('hkId') !== selectorId){
                            selectorId = jqElem.attr('hkId') + ";" + selectorId;
                        }
                        jqElem.attr('hkId', selectorId);
                    });
                    result = this.__bind__(handle.join(' '), data, hotkeys.handler)
                }
            }
            return result;
        }
    };
    // work-around for opera and safari where (sometimes) the target is the element which was last 
    // clicked with the mouse and not the document event it would make sense to get the document
    hotkeys.findElement = function (elem){
        if (!jQuery(elem).attr('hkId')){
            if (jQuery.browser.opera || jQuery.browser.safari){
                while (!jQuery(elem).attr('hkId') && elem.parentNode){
                    elem = elem.parentNode;
                }
            }
        }
        return elem;
    };
    // the event handler
    hotkeys.handler = function(event) {
        var target = hotkeys.findElement(event.currentTarget), 
            jTarget = jQuery(target),
            ids = jTarget.attr('hkId');
        
        if(ids){
            ids = ids.split(';');
            var code = event.which,
                type = event.type,
                special = hotkeys.specialKeys[code],
                // prevent f5 overlapping with 't' (or f4 with 's', etc.)
                character = !special && String.fromCharCode(code).toLowerCase(),
                shift = event.shiftKey,
                ctrl = event.ctrlKey,            
                // patch for jquery 1.2.5 && 1.2.6 see more at:  
                // http://groups.google.com/group/jquery-en/browse_thread/thread/83e10b3bb1f1c32b
                alt = event.altKey || event.originalEvent.altKey,
                mapPoint = null;

            for (var x=0; x < ids.length; x++){
                if (hotkeys.triggersMap[ids[x]][type]){
                    mapPoint = hotkeys.triggersMap[ids[x]][type];
                    break;
                }
            }
            
            //find by: id.type.combi.options            
            if (mapPoint){ 
                var trigger;
                // event type is associated with the hkId
                if(!shift && !ctrl && !alt) { // No Modifiers
                    trigger = mapPoint[special] ||  (character && mapPoint[character]);
                }
                else{
                    // check combinations (alt|ctrl|shift+anything)
                    var modif = '';
                    if(alt) modif +='alt+';
                    if(ctrl) modif+= 'ctrl+';
                    if(shift) modif += 'shift+';
                    
                    // modifiers + special keys or modifiers + character or modifiers + shift character or just shift character
                    trigger = mapPoint[modif+special];
                    if (!trigger){
                        if (character){
                            trigger = mapPoint[modif+character] 
                                || mapPoint[modif+hotkeys.shiftNums[character]]
                                // '$' can be triggered as 'Shift+4' or 'Shift+$' or just '$'
                                || (modif === 'shift+' && mapPoint[hotkeys.shiftNums[character]]);
                        }
                    }
                }
                if (trigger){
                    var result = false;
                    for (var x=0; x < trigger.length; x++){
                        if(trigger[x].disableInInput){
                            // double check event.currentTarget and event.target
                            var elem = jQuery(event.target);
                            if (jTarget.is("input") || jTarget.is("textarea") 
                                || elem.is("input") || elem.is("textarea")) {
                                return true;
                            }
                        }
                        // call the registered callback function
                        result = result || trigger[x].cb.apply(this, [event]);
                    }
                    return result;
                }
            }
        }
    };
    // place it under window so it can be extended and overridden by others
    window.hotkeys = hotkeys;
    return jQuery;
})(jQuery);
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
/*!
 * Taken from "Remedial Javascript" by Douglas Crockford:
 * http://javascript.crockford.com/remedial.html
 */

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
};
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
/*!
 * Parchment
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */

// Don't append a timestamp to XHR requests
$.ajaxSetup({cache: true});

// The home for Parchment to live in
var parchment = {};
/*
 * File functions and classes
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// Text to byte array and vice versa
var text_to_array = function(text, array)
{
	var array = array || [], i = 0, l;
	for (l = text.length % 16; i < l; ++i)
		array.push(text.charCodeAt(i));
	for (l = text.length; i < l;)
		// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
		// and if text is cast to a String object, it's considerably slower.
		array.push(text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++));
	return array;
},

array_to_text = function(array, text)
{
	var text = text || '', i = 0, l, fromCharCode = String.fromCharCode;;
	for (l = array.length % 8; i < l; ++i)
		text += fromCharCode(array[i]);
	for (l = array.length; i < l;)
		text += (fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]));
	return text;
};

// Base64 encoding and decoding
// Use the native base64 functions if available
if (window.atob)
{
	var base64_decode = function(data, out)
	{
		var out = out || [];
		return text_to_array(atob(data), out);
	},

	base64_encode = function(data, out)
	{
		var out = out || '';
		return btoa(array_to_text(data, out));
	};
}

// Unfortunately we will have to use pure Javascript functions
// Originally taken from: http://ecmanaut.blogspot.com/2007/11/javascript-base64-singleton.html
// But so much has changed the reference the reference is hardly warranted now...
// TODO: Consider combining the eNs together first, then shifting to get the cNs (for the decoder)
else
{
	var encoder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	// Run this little function to build the decoder array
	decoder = (function(text)
	{
		var out = [], i = 0;
		for (; i < text.length; i++)
			out[text.charAt(i)] = i;
		return out;
	})(encoder),

	base64_decode = function(data, out)
	{
	    var out = out || [],
	    c1, c2, c3, e1, e2, e3, e4,
	    i = 0, l = data.length;
	    while (i < l)
	    {
	        e1 = decoder[data.charAt(i++)];
	        e2 = decoder[data.charAt(i++)];
	        e3 = decoder[data.charAt(i++)];
	        e4 = decoder[data.charAt(i++)];
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
	},

	base64_encode = function(data, out)
	{
	    var out = out || '',
	    c1, c2, c3, e1, e2, e3, e4,
	    i = 0, l = data.length;
		while (i < l)
		{
			c1 = data[i++];
			c2 = data[i++];
			c3 = data[i++];
			e1 = c1 >> 2;
			e2 = ((c1 & 3) << 4) + (c2 >> 4);
			e3 = ((c2 & 15) << 2) + (c3 >> 6);
			e4 = c3 & 63;

			// Consider other string concatenation methods?
			out += (encoder.charAt(e1) + encoder.charAt(e2) + encoder.charAt(e3) + encoder.charAt(e4));
		}
		if (isNaN(c2))
			out = out.slice(0, -2) + '==';
		else if (isNaN(c3))
			out = out.slice(0, -1) + '=';
		return out;
	};
}

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

window.file = {
	text_to_array: text_to_array,
	array_to_text: array_to_text,
	base64_decode: base64_decode,
	base64_encode: base64_encode
};
})(window);
/*
 * Parchment UI
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(){

window.gIsIphone = navigator.userAgent.match(/iPhone/i);

var topwin_element;
var topwin_dist = '0';

// Make the statusline always move to the top of the screen in MSIE < 7
$(document).ready(function() {
    topwin_element = document.getElementById('top-window');
    topwin_dist = '0';
    var ieMatch = navigator.appVersion.match(/MSIE (\d+)\./);
    if(ieMatch && +ieMatch[1]<7) {
        topwin_element.style.position = 'absolute';
        var move_element=function() {
            topwin_element.style.top = 1 * (document.documentElement.scrollTop + 1 * topwin_dist) + 'px';
        };
        window.onscroll = move_element;
        window.onresize = move_element;
    }
});

})();
/*
function Zui() {
}

Zui.prototype = {
  setVersion: function(version) {
  },

  // Returns a 2-element list containing the width and height of the
  // screen, in characters.  The width may be 255, which means
  // "infinite".

  getSize: function() {
  },
  onLineInput: function(callback) {
  },
  onCharacterInput: function(callback) {
  },
  onSave: function(data) {
  },
  onRestore: function() {
  },
  onQuit: function() {
  },
  onRestart: function() {
  },
  onWimpOut: function(callback) {
  },
  onBreakpoint: function(callback) {
  },
  onFlagsChanged: function(isToTranscript, isFixedWidth) {
  },

  // From the Z-Machine spec for set_text_style: Sets the text style
  // to: Roman (if 0), Reverse Video (if 1), Bold (if 2), Italic (4),
  // Fixed Pitch (8). In some interpreters (though this is not
  // required) a combination of styles is possible (such as reverse
  // video and bold). In these, changing to Roman should turn off all
  // the other styles currently set.

  // From section 8.3.1 of the Z-Spec:
  // -1 =  the colour of the pixel under the cursor (if any)
  // 0  =  the current setting of this colour
  // 1  =  the default setting of this colour
  // 2  =  black   3 = red       4 = green    5 = yellow
  // 6  =  blue    7 = magenta   8 = cyan     9 = white
  // 10 =  darkish grey (MSDOS interpreter number)
  // 10 =  light grey   (Amiga interpreter number)
  // 11 =  medium grey  (ditto)
  // 12 =  dark grey    (ditto)
  // Colours 10, 11, 12 and -1 are available only in Version 6.

  onSetStyle: function(textStyle, foreground, background) {
  },

  // From the Z-Machine spec for split_window: Splits the screen so
  // that the upper window has the given number of lines: or, if
  // this is zero, unsplits the screen again.

  onSplitWindow: function(numLines) {
  },
  onSetWindow: function(window) {
  },

  // From the Z-Machine spec for erase_window: Erases window with
  // given number (to background colour); or if -1 it unsplits the
  // screen and clears the lot; or if -2 it clears the screen
  // without unsplitting it.

  onEraseWindow: function(window) {
  },
  onEraseLine: function() {
  },
  onSetCursor: function(x, y) {
  },

  // From the Z-Machine spec for buffer_mode: If set to 1, text output
  // on the lower window in stream 1 is buffered up so that it can be
  // word-wrapped properly. If set to 0, it isn't.

  onSetBufferMode: function(flag) {
  },
  onSetInputStream: function() {
  },
  onGetCursor: function() {
  },
  onPrint: function(output) {
  },
  onPrintTable: function(lines) {
  }
};
*/

function EngineRunner(engine, zui, logfunc) {
  this._engine = engine;
  this._zui = zui;
  this._isRunning = false;
  this._isInLoop = false;
  this._isWaitingForCallback = false;
  this._log = logfunc;

  var self = this;

  var methods = {
    stop: function() {
      self._isRunning = false;
    },

    run: function() {
      var size = self._zui.getSize();
      self._zui.setVersion(self._engine.m_version);

      self._isRunning = true;
      self._engine.m_memory[0x20] = size[1];
      self._engine.m_memory[0x21] = size[0];
      self._continueRunning();
    },

    _continueRunning: function() {
      while (self._isRunning && !self._isWaitingForCallback) {
        self._loop();
      }
    },

    _receiveLineInput: function(input) {
      self._isWaitingForCallback = false;

      // For now we'll say that a carriage return is the
      // terminating character, because we don't actually support
      // other terminating characters.
      self._engine.answer(0, 13);

      self._engine.answer(1, input);
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _receiveCharacterInput: function(input) {
      self._isWaitingForCallback = false;
      self._engine.answer(0, input);
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _unWimpOut: function() {
      self._isWaitingForCallback = false;
      if (!self._isInLoop) {
        self._continueRunning();
      } else {
        /* We're still inside _loop(), so just return. */
      }
    },

    _loop: function() {
      if (self._isInLoop)
        throw new FatalError("Already in loop!");

      self._isInLoop = true;
      var engine = self._engine;

      engine.run();

      var text = engine.consoleText();
      if (text)
        self._zui.onPrint(text);

      var effect = '"' + engine.effect(0) + '"';

      var logString = "[ " + engine.effect(0);

      for (var i = 1; engine.effect(i) != undefined; i++) {
        var value = engine.effect(i);
        if (typeof value == "string")
          value = value.quote();
        logString += ", " + value;
      }

      self._log(logString + " ]");

      switch (effect) {
      case GNUSTO_EFFECT_INPUT:
        self._isWaitingForCallback = true;
        self._zui.onLineInput(self._receiveLineInput);
        break;
      case GNUSTO_EFFECT_INPUT_CHAR:
        self._isWaitingForCallback = true;
        self._zui.onCharacterInput(self._receiveCharacterInput);
        break;
      case GNUSTO_EFFECT_SAVE:
        engine.saveGame();
        if (self._zui.onSave(engine.saveGameData()))
          engine.answer(0, 1);
        else
          engine.answer(0, 0);
        break;
      case GNUSTO_EFFECT_RESTORE:
        var saveGameData = self._zui.onRestore();
        if (saveGameData) {
          engine.loadSavedGame(saveGameData);
        } else {
          engine.answer(0, 0);
        }
        break;
      case GNUSTO_EFFECT_QUIT:
        self.stop();
        self._zui.onQuit();
        break;
      case GNUSTO_EFFECT_RESTART:
        self.stop();
        self._zui.onRestart();
        break;
      case GNUSTO_EFFECT_WIMP_OUT:
        self._isWaitingForCallback = true;
        self._zui.onWimpOut(self._unWimpOut);
        break;
      case GNUSTO_EFFECT_BREAKPOINT:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_FLAGS_CHANGED:
        var isToTranscript = engine.m_printing_header_bits & 0x1;
        var isFixedWidth = engine.m_printing_header_bits & 0x2;
        self._zui.onFlagsChanged(isToTranscript, isFixedWidth);
        break;
      case GNUSTO_EFFECT_PIRACY:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_STYLE:
        self._zui.onSetStyle(engine.effect(1),
                             engine.effect(2),
                             engine.effect(3));
        break;
      case GNUSTO_EFFECT_SOUND:
        // TODO: Actually implement this; for now we'll just
        // ignore it since it's not a required element of 'terps
        // and we don't want the game to crash.
        break;
      case GNUSTO_EFFECT_SPLITWINDOW:
        self._zui.onSplitWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETWINDOW:
        self._zui.onSetWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASEWINDOW:
        self._zui.onEraseWindow(engine.effect(1));
        break;
      case GNUSTO_EFFECT_ERASELINE:
        throw new FatalError("Unimplemented effect: " + effect);
      case GNUSTO_EFFECT_SETCURSOR:
        self._zui.onSetCursor(engine.effect(2),
                              engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETBUFFERMODE:
        self._zui.onSetBufferMode(engine.effect(1));
        break;
      case GNUSTO_EFFECT_SETINPUTSTREAM:
      case GNUSTO_EFFECT_GETCURSOR:
        throw new FatalError("Unimplemented effect: " + effect);
        break;
      case GNUSTO_EFFECT_PRINTTABLE:
        var numLines = engine.effect(1);
        // TODO: There's probably a more concise way of doing this
        // by using some built-in array function.
        var lines = [];
        for (i = 0; i < numLines; i++)
          lines.push(engine.effect(2+i));
        self._zui.onPrintTable(lines);
        break;
      }

      self._isInLoop = false;
    }
  };
  for (name in methods)
    self[name] = methods[name];
}
function Console(width, height, element, observer) {
  this.width = width;
  this.height = height;
  this._element = element;
  this._pos = [0, 0];
  this._observer = observer;
  this._isRenderScheduled = false;
  this.clear();
}

Console.prototype = {
  resize: function(height) {
    var linesAdded = height - this.height;

    if (linesAdded == 0)
      return;

    var y;

    if (linesAdded > 0)
      for (y = 0; y < linesAdded; y++)
        this._addRow();
    else
      for (y = 0; y < -linesAdded; y++)
        this._delRow();
    this.height = height;
    this._scheduleRender();
  },

  _delRow: function() {
    this._characters.pop();
    this._styles.pop();
  },

  _addRow: function() {
    var charRow = [];
    var styleRow = [];
    for (var x = 0; x < this.width; x++) {
      charRow.push("&nbsp;");
      styleRow.push(null);
    }
    this._characters.push(charRow);
    this._styles.push(styleRow);
  },

  clear: function() {
    this._characters = [];
    this._styles = [];
    for (var y = 0; y < this.height; y++)
      this._addRow();
    this._scheduleRender();
  },

  moveTo: function(x, y) {
    this._pos = [x, y];
  },

  write: function(string, style) {
    var x = this._pos[0];
    var y = this._pos[1];
    for (var i = 0; i < string.length; i++) {
      var character = null;

      if (string.charAt(i) == " ")
        character = "&nbsp;";
      else if (string.charAt(i) == "\n") {
        x = 0;
        y += 1;
      } else
        character = string.charAt(i).entityify();

      if(y > this.height - 1)
        this.resize(y + 1);
      if (character != null) {
        this._characters[y][x] = character;
        this._styles[y][x] = style;
        x += 1;
      }
    }
    this._pos = [x, y];
    this._scheduleRender();
  },

  _scheduleRender: function() {
    if (!this._isRenderScheduled) {
      this._isRenderScheduled = true;
      var self = this;
      window.setTimeout(function() { self._doRender(); }, 0);
    }
  },

  renderHtml: function() {
    var string = "";
    for (var y = 0; y < this.height; y++) {
      var currStyle = null;
      for (var x = 0; x < this.width; x++) {
        if (this._styles[y][x] !== currStyle) {
          if (currStyle !== null)
            string += "</span>";
          currStyle = this._styles[y][x];
          if (currStyle !== null)
            string += '<span class="' + currStyle + '">';
        }
        string += this._characters[y][x];
      }
      if (currStyle !== null)
        string += "</span>";
      string += "<br/>";
    }
    return string;
  },

  _doRender: function() {
    this._element.innerHTML = this.renderHtml();
    this._isRenderScheduled = false;
    this._observer.onConsoleRender();
  },

  close: function() {
    this._element.innerHTML = "";
    this._observer.onConsoleRender();
  }
};
	var ESCAPE_KEYCODE = 27;
	var BACKSPACE_KEYCODE = 8;
	var RETURN_KEYCODE = 13;
	var SHIFT_KEYCODE = 16;
	var LEFT_KEYCODE = 37;
	var UP_KEYCODE = 38;
	var RIGHT_KEYCODE = 39;
	var DOWN_KEYCODE = 40;

	var ZSCII_UP = 129;
	var ZSCII_DOWN = 130;
	var ZSCII_LEFT = 131;
	var ZSCII_RIGHT = 132;
	var ZSCII_NEWLINE = 13;
	var ZSCII_DELETE = 8;
	var ZSCII_ESCAPE = 27;

	// We want to use named constants, but because of the way JS's object
	// literals work, our named constants will just be strings; we'll
	// convert them to their integer values at load time.
	var __origKeyCodeHandlerMap = {
	  BACKSPACE_KEYCODE  : "backwardDeleteChar",
	  LEFT_KEYCODE       : "backwardChar",
	  UP_KEYCODE         : "previousHistory",
	  RIGHT_KEYCODE      : "forwardChar",
	  DOWN_KEYCODE       : "nextHistory"
	};

	// Mapping from JS key codes to equivalent ZSCII characters, as
	// defined in section 3.8 of the Z-Machine Specification.
	var __originalKeyCodeToZSCIIMap = {
	  RETURN_KEYCODE     : ZSCII_NEWLINE,
	  BACKSPACE_KEYCODE  : ZSCII_DELETE,
	  ESCAPE_KEYCODE     : ZSCII_ESCAPE,
	  LEFT_KEYCODE       : ZSCII_LEFT,
	  UP_KEYCODE         : ZSCII_UP,
	  RIGHT_KEYCODE      : ZSCII_RIGHT,
	  DOWN_KEYCODE       : ZSCII_DOWN
	};

	function constKeysToValues(originalMap, constObj) {
	  var finalMap = {};
	  for (name in originalMap) {
	    finalMap[constObj[name]] = originalMap[name];
	  }
	  return finalMap;
	}

	var keyCodeHandlerMap = constKeysToValues(__origKeyCodeHandlerMap, this);
	var keyCodeToZSCIIMap = constKeysToValues(__originalKeyCodeToZSCIIMap, this);

	function LineEditor() {
	  this.line = "";
	  this.pos = 0;
	  this._history = [""];
	  this._savedHistory = {};
	  this._historyPos = 0;

	  var self = this;

	  this.acceptLine = function() {
	    var line = self.line;

	    self.line = "";
	    self.pos = 0;

	    for (var i in self._savedHistory) {
	      self._history[i] = self._savedHistory[i];
	    }
	    self._savedHistory = {};

	    if (line.length > 0) {
	      self._history[self._history.length-1] = line;
	      self._history.push("");
	    }
	    self._historyPos = self._history.length - 1;

	    return line;
	  };

	  this.forwardChar = function() {
	    if (self.pos < self.line.length) {
	      self.pos++;
	    }
	  };

	  this.backwardChar = function() {
	    if (self.pos > 0) {
	      self.pos--;
	    }
	  };

	  this.backwardDeleteChar = function() {
	    if (self.pos > 0) {
	      var beforeCursor = self.line.slice(0, self.pos - 1);
	      var afterCursor = self.line.slice(self.pos);

	      // Don't allow multiple spaces in a row.

	      // TODO: This is a little strange and unintuitive.  It'd be nice
	      // to find a better solution for this, e.g. one that allows the
	      // user to have multiple spaces in their input w/o using
	      // non-breaking spaces.  Some alternatives include just using a
	      // specially styled text input field and using blank images for
	      // spaces.

	      if (afterCursor.charAt(0) == " " &&
	          beforeCursor.charAt(beforeCursor.length-1) == " ") {
	        afterCursor = afterCursor.slice(1);
	      }

	      self.line = beforeCursor + afterCursor;
	      self.pos--;
	    }
	  };

	  this.selfInsert = function(c) {
	    var newChar = String.fromCharCode(c);

	    // Don't allow multiple spaces in a row.
	    if (newChar == " ") {
	      if (self.pos > 0 && self.line.charAt(self.pos-1) == " ") {
	        return;
	      } else if (self.pos < self.line.length &&
	                 self.line.charAt(self.pos) == " ") {
	        return;
	      }
	    }

	    self.line = (self.line.slice(0, self.pos) + newChar +
	                 self.line.slice(self.pos));
	    self.pos++;
	  };

	  // Save the current history entry and replace it with the current text.
	  // It will be replaced after acceptLine runs.
	  this._saveHistoryExcursion = function() {

	    // This function only has relevance if the text of the current history
	    // entry is different from the current input buffer.
	    if (self._history[self._historyPos] != self._line) {

	      // Save the current history entry if it has not already been saved.
	      if (!(self._historyPos in self._savedHistory)) {
	        self._savedHistory[self._historyPos] =
	          self._history[self._historyPos];
	      }

	      // Set the current history entry to the current input buffer.
	      self._history[self._historyPos] = self.line;
	    }
	  };

	  this.previousHistory = function() {
	    if (self._historyPos <= 0) {
	      return;
	    }
	    self._saveHistoryExcursion();
	    self._historyPos--;
	    self.line = self._history[self._historyPos];
	    self.pos = self.line.length;
	  };

	  this.nextHistory = function() {
	    if (self._historyPos+1 >= self._history.length) {
	      return;
	    }
	    self._saveHistoryExcursion();
	    self._historyPos++;
	    self.line = self._history[self._historyPos];
	    self.pos = self.line.length;
	  };
	}


function WebZui(logfunc) {
	  var widthInChars = gIsIphone ? 38 : 80;

	  this._size = [widthInChars, 25];
	  this._console = null;
	  this._activeWindow = 0;
	  this._lineEditor = new LineEditor();
	  this._currentCallback = null;
	  this._foreground = "default";
	  this._background = "default";
	  this._reverseVideo = false;
	  this._lastSeenY = 0;
	  this._currStyles = ["z-roman"];
	  this._expectedHash = window.location.hash;
	  this._isFixedWidth = false;
	  this._bufferMode = 0;

	this.bottom = $("#bottom");
	this.current_input = $("#current-input");

	  if (logfunc) {
	    this._log = logfunc;
	  } else {
	    this._log = function() {};
	  }

	  var self = this;

	  var methods = {
	    onConsoleRender: function() {
	      var height = $("#top-window").height();
	      $("#content").css({padding: "" + height + "px 0 0 0"});
	      self._scrollBottomWindow();
	    },

	    _scrollBottomWindow: function() {
	      // If we're on the iPhone, do nothing; the iPhone will handle
	      // scrolling as it likes and anything we do to stop it will
	      // just result in confusion.
	      if (!gIsIphone)
	        window.scroll(0, self._lastSeenY);
	    },

	    _finalize: function() {
	      if (self._console) {
	        self._console.close();
	        self._console = null;
	      }
	      $("#content").empty();
	      self._unbindEventHandlers();
	    },

		_bindEventHandlers: function() {
			if (gIsIphone)
				$(document).keyup(self._iphoneKeyup);
			else
			{
				$(document).bind('keydown', 'Ctrl+v', self._windowPasteHandler)
					.keypress(self._windowKeypress)
					.keyup(self._windowKeyup)
					.keydown(self._windowKeydown)
					.mousewheel(self._windowMousewheel);
			}
			$(window).resize(self._windowResize);
			 self._intervalId = window.setInterval(self._windowHashCheck, 1000);
		},

		_unbindEventHandlers: function() {
			if (gIsIphone)
				$(document).unbind("keyup", self._iphoneKeyup);
			else
			{
				$(document).unbind('keydown', 'Ctrl+v', self._windowPasteHandler)
					.unbind("keypress", self._windowKeypress)
					.unbind("keyup", self._windowKeyup)
					.unbind("keydown", self._windowKeydown)
					.unbind("mousewheel", self._windowMousewheel);
			}
			$(window).unbind("resize", self._windowResize);
			window.clearInterval(self._intervalId);
			},

	    _windowMousewheel: function(event, delta) {
	      window.scrollBy(0, -delta * 5);
	    },

	    // We want to make sure that all key events don't bubble up, so
	    // that anything listening in--such as Firefox's "Search for text
	    // when I start typing" feature--doesn't think that we're not
	    // doing anything with the keypresses.  If we don't do this, such
	    // listeners may think that they can intervene and capture
	    // keystrokes before they get to us in the future.

	    _isHotKey: function(event) {
	      return (event.altKey || event.ctrlKey || event.metaKey);
	    },

	    _iphoneKeyup: function(event) {
	      $("#iphone-text-field").val("");
	      var newEvent = new Object();
	      switch (event.keyCode) {
	      case 127:
	        newEvent.keyCode = BACKSPACE_KEYCODE;
	        break;
	      case 10:
	        newEvent.keyCode = RETURN_KEYCODE;
	        break;
	      default:
	        newEvent.charCode = event.keyCode;
	      }
	      return self._handleKeyEvent(newEvent);
	    },

	    _windowKeyup: function(event) {
			if (jQuery.browser.mozilla)
				return self._isHotKey(event);
			else
				return true;
		},

	_windowKeydown: function(event) {
	      if (jQuery.browser.mozilla)
	        return self._isHotKey(event);
	      else if (((jQuery.browser.safari || jQuery.browser.msie) &&
	                (!jQuery.browser.opera) &&
	                (event.keyCode == LEFT_KEYCODE ||
	                 event.keyCode == UP_KEYCODE ||
	                 event.keyCode == RIGHT_KEYCODE ||
	                 event.keyCode == DOWN_KEYCODE ||
	                 event.keyCode == BACKSPACE_KEYCODE)))
	          return self._handleKeyEvent(event);
	      else
	        return true;
	    },

	    _windowKeypress: function(event) {
	      if (self._isHotKey(event))
	        return true;
	      if (jQuery.browser.mozilla)
	        return self._handleKeyEvent(event);
	      else {
	        var newEvent = new Object();

	        if (jQuery.browser.opera) {
	          newEvent.charCode = event.which;
	          // Opera doesn't seem to let us distinguish between whether
	          // an arrow key was pressed vs. ', %, &, or (, so we'll play
	          // it safe and force the ASCII character instead of the
	          // arrow key, since some games are unwinnable if the user
	          // can't type such characters.
	          if (event.which != LEFT_KEYCODE &&
	              event.which != RIGHT_KEYCODE &&
	              event.which != UP_KEYCODE &&
	              event.which != DOWN_KEYCODE)
	            newEvent.keyCode = event.keyCode;
	        } else if (jQuery.browser.safari) {
	          if (event.charCode && event.keyCode != RETURN_KEYCODE)
	            newEvent.charCode = event.charCode;
	          else
	            newEvent.keyCode = event.keyCode;
	        } else if (jQuery.browser.msie) {
	          if (event.keyCode == RETURN_KEYCODE)
	            newEvent.keyCode = event.keyCode;
	          else
	            newEvent.charCode = event.keyCode;
	        }

	        return self._handleKeyEvent(newEvent);
	      }
	    },

	    _handleKeyEvent: function(event) {
	      if (event.keyCode == SHIFT_KEYCODE)
	        // This only seems to happen on Opera, but just in case it happens
	        // on some other browsers too, we're not special-casing it.
	        return false;

	      self._removeBufferedWindows();
//		$("#buffered-windows").empty();
	      self._lastSeenY = self.bottom.offset().top;

	      self._scrollBottomWindow();

	      if (self.current_input.length == 0) {
	        // We're not waiting for a line of input, but we may
	        // be waiting for a character of input.

	        // Note that we have to return a ZSCII keycode here.
	        //
	        // For more information, see:
	        //
	        //   http://www.gnelson.demon.co.uk/zspec/sect03.html
	        if (self._currentCallback) {
	          var keyCode = 0;
	          if (event.charCode)
	            keyCode = event.charCode;
	          else if (keyCodeToZSCIIMap[event.keyCode])
	              keyCode = keyCodeToZSCIIMap[event.keyCode];
	          if (keyCode != 0) {
	            var callback = self._currentCallback;

	            self._currentCallback = null;
	            callback(keyCode);
	          }
	        }
	        return false;
	      }

	      var oldInputString = self._lineEditor.line;
	      var oldPos = self._lineEditor.pos;

	      if (event.keyCode == RETURN_KEYCODE) {
	        var finalInputString = self._lineEditor.acceptLine();
	        var callback = self._currentCallback;

	        self._currentCallback = null;
	        self._lastSeenY = self.current_input.offset().top;
	        var styles = self.current_input.attr("class");
	        self.current_input.replaceWith(
	          ('<span class="finished-input ' + styles + '">' +
	           finalInputString.entityify() + '</span><br/>')
	        );
			self.current_input = $("#current-input");
	        callback(finalInputString);
	      } else if (event.keyCode in keyCodeHandlerMap) {
	          self._lineEditor[keyCodeHandlerMap[event.keyCode]]();
	      } else if (event.charCode) {
			self._lineEditor.selfInsert(event.charCode);
		}

	      if (self.current_input &&
	          (oldInputString != self._lineEditor.line ||
	           oldPos != self._lineEditor.pos)) {
	        var prefix = self._lineEditor.line.slice(0, self._lineEditor.pos);
	        var suffix;
	        var point;
	        var cursorId;
	        if (self._lineEditor.line.length <= self._lineEditor.pos) {
	          suffix = "";
	          point = "_";
	          cursorId = "cursor";
	        } else {
	          suffix = self._lineEditor.line.slice(self._lineEditor.pos+1);
	          point = self._lineEditor.line.charAt(self._lineEditor.pos);
	          cursorId = "editing-cursor";
	          if (point == " ") {
	            point = "&nbsp;";
	          } else {
	            point = point.entityify();
	          }
	        }
	        self.current_input.html(prefix.entityify() + '<span id="' +
	                                 cursorId + '">' + point + '</span>' +
	                                 suffix.entityify());
	      }
	      return false;
	    },

		// Pass focus to the textbox to accept the pasted text
		_windowPasteHandler: function(event)
		{
			if (self.current_input.length != 0)
			{
				$("#pasteinput").focus();
				window.setTimeout(self._inputPasteHandler, 10);
			}
		},

		// Add the pasted text to the LineEditor
		_inputPasteHandler: function(event)
		{
			var pasted = $("#pasteinput").val();
			$("#pasteinput").val('');
			// $("#pasteinput").blur();
			var e = {charCode: 0, keyCode: 0};
			// It would be nice if a string could be added rather than only a single character
			for (var i = 0; i < pasted.length; i++)
			{
				e.charCode = pasted.charCodeAt(i);
				self._handleKeyEvent(e);
			}
		},

	    _windowResize: function() {
	      var contentLeft = $("#content").offset().left + "px";
	      $(".buffered-window").css({left: contentLeft});
	    },

	    _windowHashCheck: function() {
	      if (window.location.hash != self._expectedHash)
	        self._restart();
	    },

	    _removeBufferedWindows: function() {
	      var windows = $("#buffered-windows > .buffered-window");
	      windows.fadeOut("slow", function() { windows.remove(); });
	      // A more conservative alternative to the above is:
	      // $("#buffered-windows").empty();
	    },

	    _eraseBottomWindow: function() {
	      $("#content").empty();
	      this._lastSeenY = 0;
	    },

	    _restart: function() {
	      self._finalize();
      window.setTimeout(_webZuiStartup, 0);
	    },

	    setVersion: function(version) {
	      self._version = version;
	    },

	    getSize: function() {
	      return self._size;
	    },

	    onLineInput: function(callback) {
    	  if(window.engine.m_version <= 3) { // Redraw status line automatically in V1-V3
    	    var oldwin = self._activeWindow;
	        var oldrev = this._reverseVideo;
	        if (!self._console)
	          self.onSplitWindow(1);
	        self._console.moveTo(0,0);
	        self._activeWindow = 1;
	        this._reverseVideo = true;
	        self.onPrint(window.engine.getStatusLine(self._console.width));
	        this._reverseVideo = oldrev;
	        self._activeWindow = oldwin;
          }

   	      self._currentCallback = callback;
	      $("#content").append(
	        '<span id="current-input"><span id="cursor">_</span></span>'
	      );
	      self.current_input = $("#current-input");
	      self.current_input.attr("class", self._calcFinalStyles());
	    },

	    onCharacterInput: function(callback) {
	      self._currentCallback = callback;
	    },

    onSave: function(data) {
      // TODO: Attempt to use other forms of local storage
      // (e.g. Google Gears, HTML 5 database storage, etc) if
      // available; if none are available, we should return false.

      var saveKey = gStory + '_saveData';
      var b64data = file.base64_encode(data);

      if (window.globalStorage && location.href.slice(0, 5) != 'file:')
        window.globalStorage[location.hostname][saveKey] = b64data;
      window.location.hash = "#" + b64data;
      self._expectedHash = window.location.hash;
			self.onPrint("Your game has been saved to the URL. You may want " +
				"to bookmark this page now; just reload it at any " +
                   "time to restore your game from this point.\n");
			return true;
		},

	    onRestore: function() {
      // TODO: Attempt to use other forms of local storage if
      // available; if none are available, we should return null.

      var b64data = null;

      if (window.location.hash)
        b64data = window.location.hash.slice(1);

      if (!b64data && window.globalStorage) {
        var saveData = globalStorage[location.hostname][gStory + '_saveData'];
        if (saveData)
          b64data = saveData.value;
      }

      if (b64data) {
        window.location.hash = "#" + b64data;
        self._expectedHash = window.location.hash;
        return file.base64_decode(b64data);
      } else
        return null;
	    },

	    onQuit: function() {
	      self._finalize();
	    },

	    onRestart: function() {
      self._finalize();

	      // TODO: It's not high-priority, but according to the Z-Machine
	      // spec documentation for the restart opcode, we need to
	      // preserve the "transcribing to printer" bit and the "use
	      // fixed-pitch font" bit when restarting.

      window.location.hash = "";
	      self._restart();
	    },

	    onWimpOut: function(callback) {
	      window.setTimeout(callback, 50);
	    },

	    onFlagsChanged: function(isToTranscript, isFixedWidth) {
	      if (isToTranscript)
	        // TODO: Deal with isToTranscript.
	        throw new FatalError("To transcript not yet implemented!");
	      self._isFixedWidth = isFixedWidth;
	    },

	    onSetStyle: function(textStyle, foreground, background) {
	      switch (textStyle) {
	      case -1:
	        // Don't set the style.
	        break;
	      case 0:
	        this._currStyles = ["z-roman"];
	        this._reverseVideo = false;
	        break;
	      case 1:
	        this._reverseVideo = true;
	        break;
	      case 2:
	        this._currStyles.push("z-bold");
	        break;
	      case 4:
	        this._currStyles.push("z-italic");
	        break;
	      case 8:
	        this._currStyles.push("z-fixed-pitch");
	        break;
	      default:
	        throw new FatalError("Unknown style: " + textStyle);
	      }

	      var colorTable = {0: null,
	                        1: "default",
	                        2: "black",
	                        3: "red",
	                        4: "green",
	                        5: "yellow",
	                        6: "blue",
	                        7: "magenta",
	                        8: "cyan",
	                        9: "white"};

	      if (colorTable[foreground])
	        this._foreground = colorTable[foreground];
	      if (colorTable[background])
	        this._background = colorTable[background];
	    },

	    onSetWindow: function(window) {
	      if (window == 1) {
	        // The following isn't outlined in the Z-Spec, but Fredrik
	        // Ramsberg's "Aventyr" sets the top window shortly after
	        // collapsing its height to 0 (via erasing window -1); so
	        // we'll implicitly create a top window with height 1 now.
	        // See issue 33 for more information:
	        // http://code.google.com/p/parchment/issues/detail?id=33
	        if (!self._console)
	          self.onSplitWindow(1);
	        // From the Z-Spec, section 8.7.2.
	        self._console.moveTo(0, 0);
	      }
	      self._activeWindow = window;
	    },

	    onEraseWindow: function(window) {
	      // Set the background color.
	      document.body.className = "bg-" + self._background;

	      if (window == -2) {
	        self._console.clear();
	        self._eraseBottomWindow();
	      } else if (window == -1) {
	        // From the Z-Spec, section 8.7.3.3.
	        self.onSplitWindow(0);

	        // TODO: Depending on the Z-Machine version, we want
	        // to move the cursor to the bottom-left or top-left.
	        self._eraseBottomWindow();
	      } else if (window == 0) {
	        self._eraseBottomWindow();
	      } else if (window == 1 && self._console) {
	        self._console.clear();
	      }
	    },

	    onSetCursor: function(x, y) {
	      if (self._console)
	        self._console.moveTo(x - 1, y - 1);
	    },

	    onSetBufferMode: function(flag) {
	      // The way that stories use this instruction is odd; it seems to
	      // be set just after a quotation meant to overlay the current
	      // text is displayed, just before a split-window instruction.
	      // Based on this, we'll set a flag, and if it's set when we're
	      // asked to split the window, we'll leave an "imprint" of what
	      // was drawn there until the user presses a key, at which point
	      // it'll fade away.
	      self._bufferMode = flag;
	    },

	    onSplitWindow: function(numlines) {
	      if (numlines == 0) {
	        if (self._console) {
	          self._console.close();
	          self._console = null;
	        }
	      } else {
	        if (!self._console || self._version == 3 ||
	            !self._bufferMode) {
	          self._console = new Console(self._size[0],
	                                      numlines,
	                                      $("#top-window").get(0),
	                                      self);
	        } else if (self._console.height != numlines) {
	          // Z-Machine games are peculiar in regards to the way they
	          // sometimes overlay quotations on top of the current text;
	          // we basically want to preserve any text that is already in
	          // the top window "below" the layer of the top window, so
	          // that anything it doesn't write over remains visible, at
	          // least (and this is an arbitrary decision on our part)
	          // until the user has entered some input.

	          var newDiv = document.createElement("div");
	          newDiv.className = "buffered-window";
	          newDiv.innerHTML = self._console.renderHtml();
	          $(newDiv).css({width: self._pixelWidth + "px",
	                         lineHeight: self._pixelLineHeight + "px"});
	          $("#buffered-windows").append(newDiv);

	          // Pretend the window was just resized, which will position
	          // the new buffered window properly on the x-axis.
	          self._windowResize();

	          self._console.resize(numlines);
	        }
	      }
	      self._bufferMode = 0;
	    },

	    _calcFinalStyles: function() {
	      var fg = self._foreground;
	      var bg = self._background;

	      if (self._reverseVideo) {
	        fg = self._background;
	        bg = self._foreground;
	        if (fg == "default")
	          fg = "default-reversed";
	        if (bg == "default")
	          bg = "default-reversed";
	      }

	      var colors = ["fg-" + fg, "bg-" + bg];

	      // TODO: Also test to see if we don't already have z-fixed-pitch
	      // in self._currStyles, without using Array.indexOf(), which
	      // doesn't seem to be part of MS JScript.
	      if (self._isFixedWidth)
	        colors.push("z-fixed-pitch");

	      return colors.concat(self._currStyles).join(" ");
	    },

	    onPrint: function(output) {
	      var styles = self._calcFinalStyles();

	      self._log("print wind: " + self._activeWindow + " output: " +
	                output.quote() + " style: " + styles);

	      if (self._activeWindow == 0) {
	        var lines = output.split("\n");
	        for (var i = 0; i < lines.length; i++) {

	          if (lines[i]) {
	            var chunk = lines[i].entityify();

	            // TODO: This isn't an ideal solution for having breaking
	            // whitespace while preserving its structure, but it
	            // deals with the most common case.
	            var singleSpace = / /g, singleSpaceBetweenWords = /(\S) (\S)/g, backToSpace = /<&>/g;
	            chunk = chunk.replace(
	              singleSpaceBetweenWords,
	              "$1<&>$2"
	            );
	            chunk = chunk.replace(singleSpace, '&nbsp;');
	            chunk = chunk.replace(
	              backToSpace,
	              "<span class=\"z-breaking-whitespace\"> </span>"
	            );

	            chunk = '<span class="' + styles + '">' + chunk + '</span>';
	            $("#content").append(chunk);
	          }

	          if (i < lines.length - 1)
	            $("#content").append("<br/>");
	        }

	        self._scrollBottomWindow();
	      } else {
	        self._console.write(output, styles);
	      }
	    },

	    onPrintTable: function(lines) {
	      // TODO: Not sure if we should be appending newlines to
	      // these lines or not, or setting the current text style
	      // to monospace if we're displaying in the bottom window.
	      for (var i = 0; i < lines.length; i++)
	        self.onPrint(lines[i]);
	    },

	    _setFixedPitchSizes: function() {
	      var row = document.createElement("div");
	      row.className = "buffered-window";
	      for (var i = 0; i < self._size[0]; i++)
	        row.innerHTML += "O";

	      // We have to wrap the text in a span to get an accurate line
	      // height value, for some reason...
	      row.innerHTML = "<span>" + row.innerHTML + "</span>";

	      $("#buffered-windows").append(row);
	      self._pixelWidth = $(row).width();
	      if(jQuery.browser.msie &&
	         (jQuery.browser.version.length == 1 || jQuery.browser.version.charAt(1)=='.') &&
	         jQuery.browser.version < '7') {
	      	// For MSIE versions < 7, the pixelwidth is set to the entire window width.
	      	// Instead, we estimate the needed width using the font size
	        var fwidth = -1, fsize = document.getElementById('top-window').currentStyle['fontSize'].toLowerCase();
	        if(fsize.substring(fsize.length - 2)=='px')
	          fwidth = 0.6 * parseInt(fsize);
	        else if(fsize.substring(fsize.length - 2)=='pt')
	          fwidth = 0.8 * parseInt(fsize);
	        if(fwidth > 0)
	          self._pixelWidth = self._size[0] * fwidth;
	      }
	      self._pixelLineHeight = $(row.firstChild).height();
	      $("#buffered-windows").empty();
	    }
	  };

	  for (name in methods)
	    self[name] = methods[name];

	  self._setFixedPitchSizes();

	  $("#top-window").css({width: self._pixelWidth + "px",
	                        lineHeight: self._pixelLineHeight + "px"});
	  $("#content").css({width: self._pixelWidth + "px"});

	  self._windowResize();
	  self._bindEventHandlers();
	  self._eraseBottomWindow();

	  if (gIsIphone) {
	    // The iPhone needs an actual text field focused in order to
	    // display the on-screen keyboard, so add a hidden one that
	    // attempts to overlap any text prompt that may be visible.
	    $(document.body).append(
	      '<textarea class="iphone-visible" ' +
	        'id="iphone-text-field" rows="1" ' +
	        'cols="20" autocapitalize="off">' +
	        'Tap here to enter text.</textarea>'
	    );
	    var itfHeight = -1 * $("#iphone-text-field").height();
	    $("#iphone-text-field").css({top: itfHeight + "px"});
	    function onClick() {
	      $(this).removeClass("iphone-visible");
	      $(this).addClass("iphone-invisible");
	      $(this).unbind("click", onClick);
	    }
	    $("#iphone-text-field").click(onClick);
	  }
	}

FatalError.prototype.onError = function(e) {
  var message = e.message;
  if (typeof e.message == "string")
    message = message.entityify();
  $("#content").append('<div class="error">An error occurred:<br/>' +
                       '<pre>' + message + '\n\n' + e.traceback +
                       '</pre></div>');
};
/*
 * The Parchment Library
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// A story file
var Story = IFF.extend({
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
		else if (IFF.text_from(data, 0) == 'FORM')
		{
			this._super(data);
			if (this.type == 'IFRS')
			{
				// We have Blorb!
//				this.images = [];
//				this.resources = [];

				// Go through the chunks and extract the useful ones
				for (var i = 0, l = this.chunks.length; i < l; i++)
				{
					var type = this.chunks[i].type;
/*
					if (type == 'RIdx')
						// The Resource Index Chunk, used by parchment for numbering images correctly
						for (var j = 0, c = IFF.num_from(this.chunks[i].data, 0); j < c; j++)
							this.resources.push({
								usage: IFF.text_from(this.chunks[i].data, 4 + j * 12),
								number: IFF.num_from(this.chunks[i].data, 8 + j * 12),
								start: IFF.num_from(this.chunks[i].data, 12 + j * 12)
							});
*/
					if (type == 'ZCOD' && !this.zcode)
						// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
						this.zcode = this.chunks[i].data;

					else if (type == 'IFmd')
					{
						// Treaty of Babel metadata
						// Will most likely break UTF-8
						this.metadata = file.array_to_text(this.chunks[i].data);
						var metadataDOM = $(this.metadata);
						if (metadataDOM)
						{
							//this.metadataDOM = metadataDOM;

							// Extract some useful info
							if ($('title', metadataDOM))
								this.title = $('title', metadataDOM).text();
							if ($('ifid', metadataDOM))
								this.ifid = $('ifid', metadataDOM).text();
							if ($('release', metadataDOM))
								this.release = $('release', metadataDOM).text();
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

					else if (type == 'Fspc')
						this.frontispiece = IFF.num_from(this.chunks[i].data, 0);
*/
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
		//window.document.title = this.title + ' - Parchment';
	}
});

// Story file cache
var StoryCache = Class.extend({
	// Add a story to the cache
	add: function(story)
	{
		this[story.ifid] = story;
		if (story.url)
			this.url[story.url] = story;
	},
	url: {}
});

// The Parchment Library class
window.Library = Class.extend({
	// Load a story or savefile
	load: function(id)
	{
		// Load from URL, or the default story
		var querystring = new Querystring(),
		url = querystring.get('story', parchment.options.default_story);

		storyName = getFilenameFromUrl(url);
		storyName = storyName ? storyName + " - Parchment" : "Parchment";
		window.document.title = storyName;

		// Check the story cache first
		if (this.stories.url[url])
			var story = this.stories.url[url];

		// We will have to download it
		else
		{
			$('#progress-text').html('Retrieving story file...');

			if (url.slice(-3).toLowerCase() == '.js')
				$.getScript(url);
			else
				$.getScript(parchment.options.zcode_appspot_url + '?url=' + escape(url) + '&jsonp=processZcodeAppspotResponse');
		}
	},

	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

function getFilenameFromUrl(url) {
  var lastSlash = url.lastIndexOf("/");
  return url.slice(lastSlash + 1);
}

window.gZcode = null;
window.gStory = '';

// JSONP callback
window.processZcodeAppspotResponse = function(content)
{
	if (content.error)
		throw new FatalError("Error loading story: " + content.error.entityify());
	processBase64Zcode(content.data);
}

window.processBase64Zcode = function(data, decodedSoFar)
{
	var CHUNK_SIZE = 50000, next_func,
	firstChunk = data.slice(0, CHUNK_SIZE),
	restOfData = data.slice(CHUNK_SIZE);

	if (typeof(decodedSoFar) == 'undefined')
		decodedSoFar = [];

	$('#progress-text').html('Decoding ' + data.length + ' more bytes...');
	file.base64_decode(firstChunk, decodedSoFar);

	if (restOfData)
		next_func = function decode_rest()
		{
			processBase64Zcode(restOfData, decodedSoFar);
		};

	else
		next_func = function finish()
		{
			gZcode = decodedSoFar;
			$('#progress-text').html('Starting interpreter...');
			_webZuiStartup();
		};

	window.setTimeout(next_func, 1);
}

function _webZuiStartup() {
  var logfunc = function() {};

	if (window.loadFirebugConsole)
		window.loadFirebugConsole();

  if (window.console)
    logfunc = function(msg) { console.log(msg); };

  window.engine = new GnustoEngine(logfunc);
  var zui = new WebZui(logfunc);
  var runner = new EngineRunner(engine, zui, logfunc);

	window.story = new Story(gZcode.slice(), storyName);
	story.load(engine);
	logfunc("Story type: " + story.filetype);

  if (window.location.hash) {
    var b64data = window.location.hash.slice(1);
    engine.loadSavedGame(file.base64_decode(b64data));
    logfunc('Loading savefile');
  }

  runner.run();
}

})(window);
/*
 * Parchment load scripts
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

var parchment = window.parchment;

// The default parchment options
parchment.options = {
	default_story: 'stories/troll.z5.js',
	zcode_appspot_url: 'http://zcode.appspot.com/'
};

// Load Parchment, start it all up!
function load_parchment()
{
	// Check for any customised options
	if (window.parchment_options)
		$.extend(parchment.options, parchment_options);

	// Load the library
	var library = new Library();
	parchment.library = library;
	library.load();

	// As we only support Zcode at the moment, preload Gnusto and its runner
	// Use this sneaky trick to load the original files for parchment.full.html
	
	
	
	$.getScript('lib/gnusto.min.js');
	

	// Add the Analytics tracker, but only if we're at parchment.googlecode.com
	if (location.href.slice(0, 31) == 'http://parchment.googlecode.com')
		$.getScript('http://www.google-analytics.com/ga.js', function(){gat._getTracker("UA-7949545-1")._trackPageview();});
}

$(load_parchment);

})(window);
