/* GiLoad -- a game-file loader for Quixe
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glulx/quixe/>
 * 
 * This Javascript library is copyright 2010-2016 by Andrew Plotkin.
 * It is distributed under the MIT license; see the "LICENSE" file.
 *
 * This library loads a game image (by one of several possible methods)
 * and then starts up the display layer and game engine. It also extracts
 * data from a Blorb image, if that's what's provided.
 *
 * (This code makes use of the jQuery library, which therefore must be
 * available.)
 *
 * When you are putting together a Quixe installation page, you call
 * GiLoad.load_run() to get the game started. You should do this in the
 * document's "onload" handler, or later. (If you call it before "onload" 
 * time, it may not work.)
 *
 * You can do this in a couple of different ways:
 *
 * GiLoad.load_run(OPTIONS) -- load and run the game using the options
 *   passed as the argument. If OPTIONS is null or not provided, the
 *   global "game_options" object is considered. (The various options are
 *   described below.)
 *
 * GiLoad.load_run(OPTIONS, IMAGE, IMAGE_FORMAT) -- run the game with the
 *   given options. The IMAGE argument should be the game file itself
 *   (a glulx or blorb file). IMAGE_FORMAT describes how the game file
 *   is encoded:
 *     "base64": a base64-encoded binary file
 *     "raw": a binary file stored in a string
 *     "array": an array of (numeric) byte values
 *   Again, if OPTIONS is null, the global "game_options" object is
 *   considered.
 *
 * These are the game options. Most have default values, so you only have
 * to declare the ones you want to change.
 *
 *   use_query_story: If this is true, you (or the player) can use a
 *     "?story=..." URL parameter to load any game file. If it is false,
 *     this parameter is ignored. (default: true)
 *   set_page_title: If true, the loader will change the document title
 *     to describe the game being loaded. If false, the document title
 *     will be left alone. (default: true)
 *   default_page_title: A default label for the game, if none could be
 *     extracted from the metadata or URL. (default: "Game")
 *   default_story: The URL of the game file to load, if not otherwise
 *     provided.
 *   proxy_url: The URL of the web-app service which is used to convert
 *     binary data to Javascript, if the browser needs that. (default:
 *     http://zcode.appspot.com/proxy/)
 *   image_info_map: An object which describes all the available
 *     images, if they are provided as static URL data. (If this is not
 *     provided, we rely on Blorb resources.) This can be an object
 *     or a string; in the latter case, we look up a global object with
 *     that name.
 *   exit_warning: A message to display (in a blue warning pane) when
 *     the game exits. If empty or null, no message is displayed.
 *     (default: "The game session has ended.")
 *   do_vm_autosave: If set, the VM will check for a snapshot when
 *     launching, and load it if present. The VM will also save a snapshot
 *     after every move. (default: false)
 *   clear_vm_autosave: If set, the VM will clear any snapshot at launch
 *     (so will not load one even if do_vm_autosave is set). (default:
 *     false)
 *   vm: The game engine interface object. (default: Quixe)
 *   io: The display layer interface object. (default: Glk)
 *
 *   You can also include any of the display options used by the GlkOte
 *   library, such as gameport, windowport, spacing, ...
 *   And also the interpreter options used by the Quixe library, such as
 *   rethrow_exceptions, ...
 *
 * GiLoad.find_data_chunk(NUM) -- this finds the Data chunk of the
 *   given number from the Blorb file. The returned object looks like
 *   { data:[...], type:"..." } (where the type is TEXT or BINA).
 *   If there was no such chunk, or if the game was loaded from a non-
 *   Blorb file, this returns undefined.
 *
 * GiLoad.get_metadata(FIELD) -- this returns a metadata field (a
 *   string) from the iFiction <bibliographic> section. If there is
 *   no such field, or if the game was loaded from a non-Blorb
 *   file, this returns undefined.
 *
 * GiLoad.get_image_info(NUM) -- returns an object describing an image,
 *   or undefined.
 *
 * GiLoad.get_image_url(NUM) -- returns a URL describing an image, or
 *   undefined.
 */

/* Put everything inside the GiLoad namespace. */
GiLoad = function() {

/* Start with the defaults. These can be modified later by the game_options
   defined in the HTML file.

   Note that the "vm" and "io" entries are not filled in here, because
   we don't know whether the Quixe or Glk libraries were loaded before
   this one. We'll fill them in at load_run() time.
*/
var all_options = {
    vm: null,              // default game engine (Quixe)
    io: null,              // default display layer (Glk)
    spacing: 4,            // default spacing between windows
    use_query_story: true, // use the ?story= URL parameter (if provided)
    default_story: null,   // story URL to use if not otherwise set
    set_page_title: true,  // set the window title to the game name
    default_page_title: 'Game', // fallback game name to use for title
    exit_warning: 'The game session has ended.',
    image_info_map: null,  // look for images in Blorb data
    proxy_url: 'http://zcode.appspot.com/proxy/'
};

var gameurl = null;  /* The URL we are loading. */
var metadata = {}; /* Title, author, etc -- loaded from Blorb */
var blorbchunks = {}; /* Indexed by "USE:NUMBER" -- loaded from Blorb */
var alttexts = {}; /* Indexed by "USE:NUMBER" -- loaded from Blorb */

/* Begin the loading process. This is what you call to start a game;
   it takes care of starting the Glk and Quixe modules, when the game
   file is available.
*/
function load_run(optobj, image, image_format) {

    /* Set the default entries for the interface objects that come from
       other libraries. (If no such libraries have been loaded, then
       these do nothing, but game_options can still supply these entries.) */
    all_options.vm = window.Quixe;
    all_options.io = window.Glk;
    
    if (!optobj)
        optobj = window.game_options;
    if (optobj)
        jQuery.extend(all_options, optobj);

    /* If the image_info_map is a string, look for a global object of
       that name. If there isn't one, delete that option. (The 
       image_info_map could also be an object already, in which case
       we leave it as is.) */
    if (all_options.image_info_map != undefined) {
        if (jQuery.type(all_options.image_info_map) === 'string') {
            if (window[all_options.image_info_map])
                all_options.image_info_map = window[all_options.image_info_map];
            else
                delete all_options.image_info_map;
        }
    }

    /* The first question is, what's the game file URL? */

    gameurl = null;

    if (all_options.use_query_story) {
        /* Use ?story= URL parameter, if present and accepted. */
        var qparams = get_query_params();
        gameurl = qparams['story'];
    }

    if (!gameurl && image) {
        /* The story data is already loaded -- it's not an a URL at all. 
           Decode it, and then fire it off. */
        GlkOte.log('GiLoad: trying pre-loaded load (' + image_format + ')...');
        switch (image_format) {
        case 'base64':
            image = decode_base64(image);
            break;
        case 'raw':
            image = decode_text(image);
            break;
        case 'array':
            /* Leave image alone */
            break;
        default:
            all_options.io.fatal_error("Could not decode story file data: " + image_format);
            return;
        }

        start_game(image);
        return;
    }

    if (!gameurl) {
        /* Go with the "default_story" option parameter, if present. */
        gameurl = all_options.default_story;
    }

    if (!gameurl) {
        all_options.io.fatal_error("No story file specified!");
        return;
    }

    //GlkOte.log('GiLoad: gameurl: ' + gameurl);
    /* The gameurl is now known. (It should not change after this point.)
       The next question is, how do we load it in? */

    /* If an image file was passed in, we didn't use it. So we might as
       well free its memory at this point. */
    image = null;
    image_format = null;

    /* The logic of the following code is adapted from Parchment's
       file.js. It's probably obsolete at this point -- I suspect
       that binary_supported and crossorigin_supported will wind up
       true in all modern browsers. Why throw away code, though... */

    var xhr = new XMLHttpRequest(); /* ### not right on IE? */
    var binary_supported = (xhr.overrideMimeType !== undefined);
    /* I'm told that Opera's overrideMimeType() doesn't work, but
       I'm not inclined to worry about it these days. */
    var crossorigin_supported = (xhr.withCredentials !== undefined);
    xhr = null;

    var regex_urldomain = /^(file:|(\w+:)?\/\/[^\/?#]+)/;
    var page_domain = regex_urldomain.exec(location)[0];
    var data_exec = regex_urldomain.exec(gameurl);
    var is_relative = data_exec ? false : true;
    var data_domain = data_exec ? data_exec[0] : page_domain;

    var same_origin = (page_domain == data_domain);
    if (navigator.userAgent.match(/chrome/i) && data_domain == 'file:') {
        /* Chrome enforces a stricter same-origin policy for file: URLs --
           it doesn't want to trawl your hard drive for random files.
           Other browsers may pick this up someday, but for now, it's
           only Chrome. */
        same_origin = false;
    }

    /* Crude test for whether the URL is a Javascript file -- just
       check for a ".js" suffix. */
    var old_js_url = gameurl.match(/[.]js$/i);

    GlkOte.log('GiLoad: is_relative=' + is_relative + ', same_origin=' + same_origin + ', binary_supported=' + binary_supported + ', crossorigin_supported=' + crossorigin_supported);

    if (old_js_url && same_origin) {
        /* Old-fashioned Javascript file -- the output of Parchment's
           zcode2js tool. When loaded and eval'ed, this will call
           a global function processBase64Zcode() with base64 data
           as the argument. */
        GlkOte.log('GiLoad: trying old-fashioned load...');
        window.processBase64Zcode = function(val) { 
            start_game(decode_base64(val));
        };
        jQuery.ajax(gameurl, {
                'type': 'GET',
                dataType: 'script',
                cache: true,
                error: function(jqxhr, textstatus, errorthrown) {
                    all_options.io.fatal_error("The story could not be loaded. (" + gameurl + "): Error " + textstatus + ": " + errorthrown);
                }
        });
        return;
    }

    if (old_js_url) {
        /* Javascript file in a different domain. We'll insert it as a <script>
           tag; that will force it to load, and invoke a processBase64Zcode()
           function as above. */
        GlkOte.log('GiLoad: trying script load...');
        window.processBase64Zcode = function(val) { 
            start_game(decode_base64(val));
        };
        var headls = $('head');
        if (!headls.length) {
            all_options.io.fatal_error("This page has no <head> element!");
            return;
        }
        var script = $('<script>', 
            { src:gameurl, 'type':"text/javascript" });
        /* jQuery is now sensitive about this, and will not allow it as
          a Chrome work-around. We use a raw DOM method instead. */
        // headls.append(script);
        headls.get(0).appendChild(script.get(0));
        return;
    }

    if (binary_supported && same_origin) {
        /* We can do an Ajax GET of the binary data. */
        GlkOte.log('GiLoad: trying binary load...');
        jQuery.ajax(gameurl, {
                'type': 'GET',
                    beforeSend: function(jqxhr, settings) {
                    /* This ensures that the data doesn't get decoded or
                       munged in any way. */
                    jqxhr.overrideMimeType('text/plain; charset=x-user-defined');
                },
                success: function(response, textstatus, errorthrown) {
                    start_game(decode_raw_text(response));
                },
                error: function(jqxhr, textstatus, errorthrown) {
                    all_options.io.fatal_error("The story could not be loaded. (" + gameurl + "): Error " + textstatus + ": " + errorthrown);
                }
        });
        return;
    }

    if (data_domain == 'file:') {
        /* All the remaining options go through the proxy. But the proxy
           can't get at the local hard drive, so it's hopeless.
           (This case occurs only on Chrome, with its restrictive
           same-origin-file: policy.) */
        all_options.io.fatal_error("The story could not be loaded. (" + gameurl + "): A local file cannot be sent to the proxy.");
        return;
    }

    /* All the remaining options go through the proxy. But the proxy doesn't
       understand relative URLs, so we absolutize it if necessary. */
    var absgameurl = gameurl;
    if (is_relative) {
        absgameurl = absolutize(gameurl);
        GlkOte.log('GiLoad: absolutize ' + gameurl + ' to ' + absgameurl);
    }

    if (crossorigin_supported) {
        /* Either we can't load binary data, or the data is on a different
           domain. Either way, we'll go through the proxy, which will
           convert it to base64 for us. The proxy gives the right headers
           to make cross-origin Ajax work. */
        GlkOte.log('GiLoad: trying proxy load... (' + all_options.proxy_url + ')');
        jQuery.ajax(all_options.proxy_url, {
                'type': 'GET',
                data: { encode: 'base64', url: absgameurl },
                error: function(jqxhr, textstatus, errorthrown) {
                    /* I would like to display the responseText here, but
                       most servers return a whole HTML page, and that doesn't
                       fit into fatal_error. */
                    all_options.io.fatal_error("The story could not be loaded. (" + gameurl + "): Error " + textstatus + ": " + errorthrown);
                },
                success: function(response, textstatus, errorthrown) {
                    start_game(decode_base64(response));
                }
        });
        return;
    }

    if (true) {
        /* Cross-origin Ajax isn't available. We can still use the proxy,
           but we'll have to insert a <script> tag to do it. */
        var fullurl = all_options.proxy_url + '?encode=base64&callback=processBase64Zcode&url=' + absgameurl;
        GlkOte.log('GiLoad: trying proxy-script load... (' + fullurl + ')');
        window.processBase64Zcode = function(val) { 
            start_game(decode_base64(val));
        };
        var headls = $('head');
        if (!headls.length) {
            all_options.io.fatal_error("This page has no <head> element!");
            return;
        }
        var script = $('<script>', 
            { src:fullurl, 'type':"text/javascript" });
        headls.append(script);
        return;
    }

    all_options.io.fatal_error("The story could not be loaded. (" + gameurl + "): I don't know how to load this data.");
}

/* Take apart the query string of the current URL, and turn it into
   an object map.
   (Adapted from querystring.js by Adam Vandenberg.)
*/
function get_query_params() {
    var map = {};

    var qs = location.search.substring(1, location.search.length);
    if (qs.length) {
        var args = qs.split('&');

        qs = qs.replace(/\+/g, ' ');
        for (var ix = 0; ix < args.length; ix++) {
            var pair = args[ix].split('=');
            var name = decodeURIComponent(pair[0]);
            
            var value = (pair.length==2)
                ? decodeURIComponent(pair[1])
                : name;
            
            map[name] = value;
        }
    }

    return map;
}

/* I learned this terrible trick for turning a relative URL absolute. 
   It's supposed to work on all browsers, if you don't go mad.
   (This uses DOM methods rather than jQuery.)
*/
function absolutize(url) {
    /* I don't know if this is slow (or safe) for data URLs. Might as
       well skip out of the easy cases first, anyhow. */
    if (url.match(/^(file|data|http|https):/i)) {
        return url;
    }

    var div = document.createElement('div');
    div.innerHTML = '<a></a>';
    div.firstChild.href = url;
    div.innerHTML = div.innerHTML;
    return div.firstChild.href;
}

/* Return a metadata field, or undefined if there is no such field
   (or if no metadata was loaded).
*/
function get_metadata(val) {
    return metadata[val];
}

/* Return information describing an image. This might be loaded from static
   data or from a Blorb file.
   
   The return value will be null or an object:
   { image:VAL, type:STRING, alttext:STRING, width:NUMBER, height:NUMBER }

   (The alttext and type may be absent if not supplied.)
*/
function get_image_info(val) {
    if (all_options.image_info_map != undefined) {
        var img = all_options.image_info_map[val];
        if (img)
            return img;
    }

    var chunk = blorbchunks['Pict:'+val];
    if (chunk) {
        var img = { image:val };
        if (chunk.type == 'JPEG')
            img.type = 'jpeg';
        else if (chunk.type == 'PNG ')
            img.type = 'png';
        else
            img.type = '????';

        /* Extract the image size, if we don't have it cached already.
           We could do this by creating an Image DOM element and measuring
           it, but that could be slow. Instead, we'll parse the PNG or
           JPEG data directly. It's easier than it sounds! */
        if (chunk.imagesize === undefined) {
            var imgsize = undefined;
            if (chunk.type == 'JPEG') {
                imgsize = find_dimensions_jpeg(chunk.content);
            }
            else if (chunk.type == 'PNG ') {
                imgsize = find_dimensions_png(chunk.content);
            }
            if (imgsize)
                chunk.imagesize = imgsize;
        }
        if (chunk.imagesize) {
            img.width = chunk.imagesize.width;
            img.height = chunk.imagesize.height;
        }

        /* Extract the alt-text, if available. */
        var rdtext = alttexts['Pict:'+val];
        if (rdtext)
            img.alttext = rdtext;
        return img;
    }

    return undefined;
}

/* Return a URL representing an image. This might be loaded from static
   data or from a Blorb file.

   The return value will be null or a URL. It might be a "data:..." URL.
*/
function get_image_url(val) {
    if (all_options.image_info_map) {
        var img = all_options.image_info_map[val];
        if (img && img.url)
            return absolutize(img.url);
    }

    var chunk = blorbchunks['Pict:'+val];
    if (chunk) {
        if (chunk.dataurl)
            return chunk.dataurl;

        var info = get_image_info(val);
        if (info && chunk.content) {
            var mimetype = 'application/octet-stream';
            if (chunk.type == 'JPEG')
                mimetype = 'image/jpeg';
            else if (chunk.type == 'PNG ')
                mimetype = 'image/png';
            var b64dat = encode_base64(chunk.content);
            chunk.dataurl = 'data:'+mimetype+';base64,'+b64dat;
            return chunk.dataurl;
        }
    }

    return undefined;
}

/* Return the Data chunk with the given number, or undefined if there
   is no such chunk. (This is used by the glk_stream_open_resource()
   functions.)
*/
function find_data_chunk(val) {
    var chunk = blorbchunks['Data:'+val];
    if (!chunk)
        return null;

    var returntype = chunk.type;
    if (returntype == 'FORM')
        returntype = 'BINA';

    return { data:chunk.content, type:returntype };
}

/* Look through a Blorb file (provided as a byte array) and return the
   Glulx game file chunk (ditto). If no such chunk is found, returns 
   null.

   This also loads the IFID metadata into the metadata object, and
   caches DATA chunks where we can reach them later.
*/
function unpack_blorb(image) {
    var len = image.length;
    var ix;
    var rindex = [];
    var result = null;
    var pos = 12;

    while (pos < len) {
        var chunktype = String.fromCharCode(image[pos+0], image[pos+1], image[pos+2], image[pos+3]);
        pos += 4;
        var chunklen = (image[pos+0] << 24) | (image[pos+1] << 16) | (image[pos+2] << 8) | (image[pos+3]);
        pos += 4;

        if (chunktype == "RIdx") {
            var npos = pos;
            var numchunks = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
            npos += 4;
            for (ix=0; ix<numchunks; ix++) {
                var chunkusage = String.fromCharCode(image[npos+0], image[npos+1], image[npos+2], image[npos+3]);
                npos += 4;
                var chunknum = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
                npos += 4;
                var chunkpos = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
                npos += 4;
                rindex.push( { usage:chunkusage, num:chunknum, pos:chunkpos } );
            }
        }
        if (chunktype == "IFmd") {
            var arr = image.slice(pos, pos+chunklen);
            var dat = encode_utf8_text(arr);
            var met = $('<metadata>').html(dat);
            var bibels = met.find('bibliographic').children();
            if (bibels.length) {
                var el;
                for (ix=0; ix<bibels.length; ix++) {
                    el = bibels[ix];
                    metadata[el.tagName.toLowerCase()] = el.textContent;
                }
            }
        }
        if (chunktype == "RDes") {
            var npos = pos;
            var numentries = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
            npos += 4;
            for (ix=0; ix<numentries; ix++) {
                var rdusage = String.fromCharCode.apply(this, image.slice(npos, npos+4));
                npos += 4;
                var rdnumber = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
                npos += 4;
                var rdlen = (image[npos+0] << 24) | (image[npos+1] << 16) | (image[npos+2] << 8) | (image[npos+3]);
                npos += 4;
                var rdtext = encode_utf8_text(image.slice(npos, npos+rdlen));
                npos += rdlen;
                alttexts[rdusage+':'+rdnumber] = rdtext;
            }
        }

        pos += chunklen;
        if (pos & 1)
            pos++;
    }

    /* We don't want to retain the original Blorb image in memory; it's
       enormous. We'll split out the addressable chunks (those with
       usages) and retain those individually. Still enormous, but less
       so.

       (It's probably a waste to save the cover image -- that probably
       won't ever be used by the game. But it might be.) 
    */

    for (ix=0; ix<rindex.length; ix++) {
        var el = rindex[ix];
        pos = el.pos;
        var chunktype = String.fromCharCode(image[pos+0], image[pos+1], image[pos+2], image[pos+3]);
        pos += 4;
        var chunklen = (image[pos+0] << 24) | (image[pos+1] << 16) | (image[pos+2] << 8) | (image[pos+3]);
        pos += 4;

        el.type = chunktype;
        el.len = chunklen;
        el.content = null;

        if (el.usage == "Exec" && el.num == 0 && chunktype == "GLUL") {
            result = image.slice(pos, pos+chunklen);
        }
        else {
            if (chunktype == "FORM") {
                el.content = image.slice(pos-8, pos+chunklen);
            }
            else {
                el.content = image.slice(pos, pos+chunklen);
            }
            blorbchunks[el.usage+':'+el.num] = el;
        }
    }

    return result;
}

/* In the following functions, "decode" means turning native string data
   into an array of numbers; "encode" is the other direction. That's weird,
   I know. It's because an array of byte values is the natural data format
   of Glulx code.
*/

/* Convert a byte string into an array of numeric byte values. */
function decode_raw_text(str) {
    var arr = Array(str.length);
    var ix;
    for (ix=0; ix<str.length; ix++) {
        arr[ix] = str.charCodeAt(ix) & 0xFF;
    }
    return arr;
}

/* Convert an array of numeric byte values (containing UTF-8 encoded text)
   into a string.
*/
function encode_utf8_text(arr) {
    var res = [];
    var ch;
    var pos = 0;

    while (pos < arr.length) {
        var val0, val1, val2, val3;
        if (pos >= arr.length)
            break;
        val0 = arr[pos];
        pos++;
        if (val0 < 0x80) {
            ch = val0;
        }
        else {
            if (pos >= arr.length)
                break;
            val1 = arr[pos];
            pos++;
            if ((val1 & 0xC0) != 0x80)
                break;
            if ((val0 & 0xE0) == 0xC0) {
                ch = (val0 & 0x1F) << 6;
                ch |= (val1 & 0x3F);
            }
            else {
                if (pos >= arr.length)
                    break;
                val2 = arr[pos];
                pos++;
                if ((val2 & 0xC0) != 0x80)
                    break;
                if ((val0 & 0xF0) == 0xE0) {
                    ch = (((val0 & 0xF)<<12)  & 0x0000F000);
                    ch |= (((val1 & 0x3F)<<6) & 0x00000FC0);
                    ch |= (((val2 & 0x3F))    & 0x0000003F);
                }
                else if ((val0 & 0xF0) == 0xF0) {
                    if (pos >= arr.length)
                        break;
                    val3 = arr[pos];
                    pos++;
                    if ((val3 & 0xC0) != 0x80)
                        break;
                    ch = (((val0 & 0x7)<<18)   & 0x1C0000);
                    ch |= (((val1 & 0x3F)<<12) & 0x03F000);
                    ch |= (((val2 & 0x3F)<<6)  & 0x000FC0);
                    ch |= (((val3 & 0x3F))     & 0x00003F);
                }
                else {
                    break;
                }
            }
        }
        res.push(ch);
    }

    return String.fromCharCode.apply(this, res);
}

/* Convert a base64 string into an array of numeric byte values. Some
   browsers supply an atob() function that does this; on others, we
   have to implement decode_base64() ourselves. 
*/
if (window.atob) {
    decode_base64 = function(base64data) {
        var data = atob(base64data);
        var image = Array(data.length);
        var ix;
        
        for (ix=0; ix<data.length; ix++)
            image[ix] = data.charCodeAt(ix);
        
        return image;
    }
}
else {
    /* No atob() in Internet Explorer, so we have to invent our own.
       This implementation is adapted from Parchment. */
    var b64decoder = (function() {
            var b64encoder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var out = [];
            var ix;
            for (ix=0; ix<b64encoder.length; ix++)
                out[b64encoder.charAt(ix)] = ix;
            return out;
        })();
        
    decode_base64 = function(base64data) {
        var out = [];
        var c1, c2, c3, e1, e2, e3, e4;
        var i = 0, len = base64data.length;
        while (i < len) {
            e1 = b64decoder[base64data.charAt(i++)];
            e2 = b64decoder[base64data.charAt(i++)];
            e3 = b64decoder[base64data.charAt(i++)];
            e4 = b64decoder[base64data.charAt(i++)];
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
}

var encode_base64;
var decode_base64;

/* Convert an array of numeric byte values into a base64 string. (Converse
   of the above.)
*/
if (window.btoa) {
    encode_base64 = function(image) {
        /* There's a limit on how much can be piped into .apply() at a 
           time -- that is, JS interpreters choke on too many arguments
           in a function call. 16k is a conservative limit. */
        var blocks = [];
        var imglen = image.length;
        for (var ix = 0; ix < imglen; ix += 16384) {
            blocks.push(String.fromCharCode.apply(String, image.slice(ix, ix + 16384)));
        }

        return btoa(blocks.join(''));
    };
}
else {
    encode_base64 = function(arr) {
        var coder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var res = [];
        var byte0, byte1, byte2;
        for (var ix=0; ix<arr.length; ix += 3) {
            byte0 = arr[ix];
            byte1 = arr[ix+1];
            byte2 = arr[ix+2];
            res.push(coder.charAt((byte0 >> 2) & 0x3F));
            res.push(coder.charAt(((byte0 << 4) & 0x30) | ((byte1 >> 4) & 0x0F)));
            res.push(coder.charAt(((byte1 << 2) & 0x3C) | ((byte2 >> 6) & 0x03)));
            res.push(coder.charAt((byte2) & 0x3F));
        }
        if (byte1 === undefined && res.length >= 2) {
            res[res.length-2] = '=';
        }
        if (byte2 === undefined && res.length >= 1) {
            res[res.length-1] = '=';
        }
        return res.join('');
    }
}

/* Given a PNG file, extract its dimensions. Return a {width,height}
   object, or undefined on error. 
*/
function find_dimensions_png(arr) {
    var pos = 0;
    if (arr[0] != 0x89 || String.fromCharCode.apply(this, arr.slice(1,4)) != 'PNG') {
        GlkOte.log('find_dimensions_png: PNG signature does not match');
        return undefined;
    }
    pos += 8;
    while (pos < arr.length) {
        var chunklen = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
        pos += 4;
        var chunktype = String.fromCharCode.apply(this, arr.slice(pos,pos+4));
        pos += 4;
        if (chunktype == 'IHDR') {
            var res = {};
            res.width  = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
            pos += 4;
            res.height = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
            pos += 4;
            return res;
        }
        pos += chunklen;
        pos += 4; /* skip CRC */
    }

    GlkOte.log('find_dimensions_png: no PNG header block found');
    return undefined;
}

/* Given a JPEG file, extract its dimensions. Return a {width,height}
   object, or undefined on error. 
*/
function find_dimensions_jpeg(arr) {
    var pos = 0;
    while (pos < arr.length) {
        if (arr[pos] != 0xFF) {
            GlkOte.log('find_dimensions_jpeg: marker is not 0xFF');
            return undefined;
        }
        while (arr[pos] == 0xFF) 
            pos += 1;
        var marker = arr[pos];
        pos += 1;
        if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
            /* marker type has no data */
            continue;
        }
        var chunklen = (arr[pos+0] << 8) | (arr[pos+1]);
        if (marker >= 0xC0 && marker <= 0xCF && marker != 0xC8) {
            if (chunklen < 7) {
                GlkOte.log('find_dimensions_jpeg: SOF block is too small');
                return undefined;
            }
            var res = {};
            res.height = (arr[pos+3] << 8) | (arr[pos+4]);
            res.width  = (arr[pos+5] << 8) | (arr[pos+6]);
            return res;
        }
        pos += chunklen;
    }

    GlkOte.log('find_dimensions_jpeg: no SOF marker found');
    return undefined;
}

/* Start the game (after de-blorbing, if necessary).
   This is invoked by whatever callback received the loaded game file.
*/
function start_game(image) {
    if (image.length == 0) {
        all_options.io.fatal_error("No game file was loaded. (Zero-length response.)");
        return;
    }

    if (image[0] == 0x46 && image[1] == 0x4F && image[2] == 0x52 && image[3] == 0x4D) {
        var formtype = String.fromCharCode(image[8], image[9], image[10], image[11]);

        if (formtype == 'IFZS') {
            all_options.io.fatal_error("This is a saved-game file, not a Glulx game file. You must launch the game first, then restore your save.");
            return;
        }

        if (formtype != 'IFRS') {
            all_options.io.fatal_error("This IFF file is not a Blorb file!");
            return;
        }

        try {
            image = unpack_blorb(image);
        }
        catch (ex) {
            all_options.io.fatal_error("Blorb file could not be parsed: " + ex);
            return;
        }
        if (!image) {
            all_options.io.fatal_error("Blorb file contains no Glulx game!");
            return;
        }
    }

    {
        var title = null;
        if (metadata)
            title = metadata.title;
        if (!title && gameurl) 
            title = gameurl.slice(gameurl.lastIndexOf("/") + 1);
        if (!title)
            title = all_options.default_page_title;
        if (!title)
            title = 'Game';

        if (!all_options.recording_label)
            all_options.recording_label = title;

        if (all_options.set_page_title)
            document.title = title + " - Quixe";
    }

    /* Pass the game image file along to the VM engine. */
    all_options.vm.prepare(image, all_options);

    /* Now fire up the display library. This will take care of starting
       the VM engine, once the window is properly set up. */
    all_options.io.init(all_options);
}

/* End of GiLoad namespace function. Return the object which will
   become the GiLoad global. */
return {
    load_run: load_run,
    find_data_chunk: find_data_chunk,
    get_metadata: get_metadata,
    get_image_info: get_image_info,
    get_image_url: get_image_url
};

}();

/* End of GiLoad library. */
