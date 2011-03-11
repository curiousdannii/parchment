/* Dialog -- a Javascript load/save library for IF interfaces
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glk/glkote.html>
 * 
 * This Javascript library is copyright 2010 by Andrew Plotkin. You may
 * copy and distribute it freely, by any means and under any conditions,
 * as long as the code and documentation is not changed. You may also
 * incorporate this code into your own program and distribute that, or
 * modify this code and use and distribute the modified version, as long
 * as you retain a notice in your program or documentation which mentions
 * my name and the URL shown above.
 *
 * This library lets you open a modal dialog box to select a "file" for saving
 * or loading data. The web page must have a <div> with id "windowport" (this
 * will be greyed out during the selection process, with the dialog box as a
 * child of the div). It should also have the dialog.css stylesheet loaded.
 *
 * This library also contains utility routines to manage "files", which are
 * actually entries in the browser's localStorage object.
 *
 * The primary function to call:
 *
 * Dialog.open(tosave, usage, gameid, callback) -- open a file-choosing dialog
 *
 * The rest of the API concerns file reference objects. A fileref encodes a
 * usage and gameid (as above), along with a filename (which can be any string
 * at all). This trio specifies a "file", that is, a chunk of data in browser
 * local storage.
 *
 * (These fileref objects are not the same as the filerefs used in the Glk API.
 * A Glk fileref contains one of these filerefs, however.)
 *
 * Dialog.file_construct_ref(filename, usage, gameid) -- create a fileref
 * Dialog.file_write(ref, content, israw) -- write data to the file
 * Dialog.file_read(ref, israw) -- read data from the file
 * Dialog.file_ref_exists(ref) -- returns whether the file exists
 * Dialog.file_remove_ref(ref) -- delete the file, if it exists
 *
 *
 * The localStorage format is as follows. Each file is represented as two
 * storage keys: "dirent:usage:gameid:filename" and
 * "content:usage:gameid:filename". (The filename is last so that it can
 * validly contain colons. Since this is a user-entered string, it can contain
 * *any* typeable character.)
 *
 * The "content:" key contains the file content, as a string. (The HTML5
 * browser storage spec says that you can store any serializable data, but the
 * browsers have not yet implemented this. Thus the "israw" option in the read
 * and write functions.)
 *
 * The "dirent:" key contains directory information. Currently this looks like
 * "created:TIMESTAMP,modified:TIMESTAMP". Future version of this library may
 * add a human-readable game name, a text/binary flag, or other data.
 */

//### accept "return" keystroke for load-select box (already works in Chrome)

/* Put everything inside the Dialog namespace. */

Dialog = function() {

var dialog_el_id = 'dialog';

var is_open = false;
var dialog_callback = null;
var will_save; /* is this a save dialog? */
var confirming; /* are we in a "confirm" sub-dialog? */
var cur_usage; /* a string representing the file's category */
var cur_usage_name; /* the file's category as a human-readable string */
var cur_gameid; /* a string representing the game */
var cur_filelist; /* the files currently on display */

/* Dialog.open(tosave, usage, gameid, callback) -- open a file-choosing dialog
 *
 * The "tosave" flag should be true for a save dialog, false for a load
 * dialog.
 *
 * The "usage" and "gameid" arguments are arbitrary strings which describe the
 * file. These filter the list of files displayed; the dialog will only list
 * files that match the arguments. Pass null to either argument (or both) to
 * skip filtering.
 *
 * The "callback" should be a function. This will be called with a fileref
 * argument (see below) when the user selects a file. If the user cancels the
 * selection, the callback will be called with a null argument.
*/
function dialog_open(tosave, usage, gameid, callback) {
    if (is_open)
        throw 'Dialog: dialog box is already open.';

    if (localStorage == null)
        throw 'Dialog: your browser does not support local storage.';

    dialog_callback = callback;
    will_save = tosave;
    confirming = false;
    cur_usage = usage;
    cur_gameid = gameid;

    /* Pick a human-readable label for the usage. This will be displayed in the
       dialog prompts. (Possibly pluralized, with an "s".) */
    switch (cur_usage) {
    case 'data': 
        cur_usage_name = 'data file';
        break;
    case 'save': 
        cur_usage_name = 'save file';
        break;
    case 'transcript': 
        cur_usage_name = 'transcript';
        break;
    case 'command': 
        cur_usage_name = 'command script';
        break;
    default:
        cur_usage_name = 'file';
        break;
    }

    /* Figure out what the root div is called. The dialog box will be
       positioned in this div; also, the div will be greyed out by a 
       translucent rectangle. We use the same default as GlkOte: 
       "windowport". We also try to interrogate GlkOte to see if that
       default has been changed. */
    var root_el_id = 'windowport';
    var iface = window.Game;
    if (window.GlkOte) 
        iface = window.GlkOte.getinterface();
    if (iface && iface.windowport)
        root_el_id = iface.windowport;

    var rootel = $(root_el_id);
    if (!rootel)
        throw 'Dialog: unable to find root element #' + root_el_id + '.';

    /* Create the grey-out screen. */
    var screen = $(dialog_el_id+'_screen');
    if (!screen) {
        screen = new Element('div',
            { id: dialog_el_id+'_screen' });
        rootel.insert(screen);
    }

    /* And now, a lot of DOM creation for the dialog box. */

    var frame = $(dialog_el_id+'_frame');
    if (!frame) {
        frame = new Element('div',
            { id: dialog_el_id+'_frame' });
        rootel.insert(frame);
    }

    var dia = $(dialog_el_id);
    if (dia)
        dia.remove();

    dia = new Element('div', { id: dialog_el_id });

    var form, el, row;

    form = new Element('form');
    form.observe('submit', 
        (will_save ? evhan_accept_save_button : evhan_accept_load_button));
    dia.insert(form);

    row = new Element('div', { id: dialog_el_id+'_cap', 'class': 'DiaCaption' });
    insert_text(row, 'XXX'); // the caption will be replaced momentarily.
    form.insert(row);

    if (will_save) {
        row = new Element('div', { id: dialog_el_id+'_input', 'class': 'DiaInput' });
        form.insert(row);
        el = new Element('input', { id: dialog_el_id+'_infield', type: 'text', name: 'filename' });
        row.insert(el);
    }

    row = new Element('div', { id: dialog_el_id+'_body', 'class': 'DiaBody' });
    form.insert(row);

    row = new Element('div', { id: dialog_el_id+'_cap2', 'class': 'DiaCaption' });
    row.hide();
    form.insert(row);

    row = new Element('div', { 'class': 'DiaButtons' });
    el = new Element('button', { id: dialog_el_id+'_cancel', type: 'button' });
    insert_text(el, 'Cancel');
    el.observe('click', evhan_cancel_button);
    row.insert(el);
    el = new Element('button', { id: dialog_el_id+'_accept', type: 'submit' });
    insert_text(el, (will_save ? 'Save' : 'Load'));
    el.observe('click', 
        (will_save ? evhan_accept_save_button : evhan_accept_load_button));
    row.insert(el);
    form.insert(row);

    frame.insert(dia);
    is_open = true;

    evhan_storage_changed();

    /* Set the input focus to the input field or the selection box.

       MSIE is weird about when you can call focus(). The element has just been
       added to the DOM, and MSIE balks at giving it the focus right away. So
       we defer the call until after the javascript context has yielded control
       to the browser. 
    */
    var focusfunc;
    if (will_save) {
        focusfunc = function() {
            var el = $(dialog_el_id+'_infield');
            if (el) 
                el.focus();
        };
    }
    else {
        focusfunc = function() {
            var el = $(dialog_el_id+'_select');
            if (el) 
                el.focus();
        };
    }
    focusfunc.defer();
}

/* Close the dialog and remove the grey-out screen.
*/
function dialog_close() {
    var dia = $(dialog_el_id);
    if (dia)
        dia.remove();
    var frame = $(dialog_el_id+'_frame');
    if (frame)
        frame.remove();
    var screen = $(dialog_el_id+'_screen');
    if (screen)
        screen.remove();

    is_open = false;
    dialog_callback = null;
    cur_filelist = null;
}

/* Set the text caption in the dialog. (There are two, actually, above
   and below the selection box.)
*/
function set_caption(msg, isupper) {
    var elid = (isupper ? dialog_el_id+'_cap' : dialog_el_id+'_cap2');
    var el = $(elid);
    if (!el)
        return;

    if (!msg) {
        el.hide();
    }
    else {
        remove_children(el);
        insert_text(el, msg);
        el.show();
    }
}

/* Add text to a DOM element.
*/
function insert_text(el, val) {
    var nod = document.createTextNode(val);
    el.appendChild(nod);
}

/* Remove all children of a DOM element.
*/
function remove_children(parent) {
    var obj, ls;
    ls = parent.childNodes;
    while (ls.length > 0) {
        obj = ls.item(0);
        parent.removeChild(obj);
    }
}

/* Replace the text in a DOM element.
*/
function replace_text(el, val) {
    remove_children(el);
    insert_text(el, val);
}

/* Event handler: The user has changed which entry in the selection box is
   highlighted. 

   This is used only in save dialogs; the highlighted filename is copied to the
   input field.
*/
function evhan_select_change() {
    if (!is_open)
        return false;
    if (confirming)
        return false;

    //GlkOte.log('### select changed');
    var selel = $(dialog_el_id+'_select');
    if (!selel)
        return false;
    var pos = selel.selectedIndex;
    if (!cur_filelist || pos < 0 || pos >= cur_filelist.length)
        return false;
    var file = cur_filelist[pos];
    var fel = $(dialog_el_id+'_infield');
    if (!fel)
        return false;
    fel.value = file.dirent.filename;
    return false;
}

/* Event handler: The "Load" button.
*/
function evhan_accept_load_button(ev) {
    ev.stop();
    if (!is_open)
        return false;

    //GlkOte.log('### accept load');
    var selel = $(dialog_el_id+'_select');
    if (!selel)
        return false;
    var pos = selel.selectedIndex;
    if (!cur_filelist || pos < 0 || pos >= cur_filelist.length)
        return false;
    var file = cur_filelist[pos];
    if (!file_ref_exists(file.dirent))
        return false;

    var callback = dialog_callback;
    //GlkOte.log('### selected ' + file.dirent.dirent);
    dialog_close();
    if (callback)
        callback(file.dirent);

    return false;
}

/* Event handler: The "Save" or "Replace" button.
*/
function evhan_accept_save_button(ev) {
    ev.stop();
    if (!is_open)
        return false;

    //GlkOte.log('### accept save');
    var fel = $(dialog_el_id+'_infield');
    if (!fel)
        return false;
    var filename = fel.value;
    filename = filename.strip(); // prototype-ism
    if (!filename)
        return false;
    var dirent = file_construct_ref(filename, cur_usage, cur_gameid);

    if (file_ref_exists(dirent) && !confirming) {
        /* If the file exists, and we are not already in confirm mode, go into
           confirm mode. Yes, this is logistically messy. We change the button
           label to "Replace"; if the user really meant it, we'll wind up back
           in this event handler. */
        confirming = true;
        set_caption('You already have a ' + cur_usage_name + ' "' 
            + dirent.filename + '". Do you want to replace it?', false);
        fel.disabled = true;
        var butel = $(dialog_el_id+'_accept');
        replace_text(butel, 'Replace');
        return false;
    }

    var callback = dialog_callback;
    //GlkOte.log('### selected ' + dirent.dirent);
    dialog_close();
    if (callback)
        callback(dirent);

    return false;
}

/* Event handler: The "Cancel" button.

   This can mean either cancelling the dialog, or cancelling confirm mode on a
   "do you want to replace that?" query.
*/
function evhan_cancel_button(ev) {
    ev.stop();
    if (!is_open)
        return false;

    if (confirming) {
        confirming = false;
        set_caption(null, false);
        var fel = $(dialog_el_id+'_infield');
        fel.disabled = false;
        var butel = $(dialog_el_id+'_accept');
        butel.disabled = false;
        replace_text(butel, 'Save');
        return false;
    }

    var callback = dialog_callback;
    //GlkOte.log('### cancel');
    dialog_close();
    if (callback)
        callback(null);

    return false;
}

/* Event handler: Browser local storage has been updated. When this happens, we
   re-check the list of files, because a new one might have been added from
   another browser window.

   This function is also called manually when the dialog box is created,
   to set up the list of files in the first place.
*/
function evhan_storage_changed(ev) {
    if (!is_open)
        return false;

    var el, bodyel, ls;

    var changedkey = null;
    if (ev)
        changedkey = ev.key;
    //GlkOte.log('### noticed storage: key ' + changedkey);
    /* We could use the changedkey to decide whether it's worth redrawing 
       the field here. */

    bodyel = $(dialog_el_id+'_body');
    if (!bodyel)
        return false;

    ls = files_list(cur_usage, cur_gameid);
    /* Sort by date modified */
    ls.sort(function(f1, f2) { return f2.modified.getTime() - f1.modified.getTime(); });
    cur_filelist = ls;

    /* Adjust the contents of the selection box. */
    
    if (ls.length == 0) {
        remove_children(bodyel);
    }
    else {
        remove_children(bodyel);
        
        var selel = new Element('select', { id: dialog_el_id+'_select', name:'files', size:'5' });
        var ix, file, datestr;
        for (ix=0; ix<ls.length; ix++) {
            file = ls[ix];
            el = new Element('option', { name:'f'+ix } );
            if (ix == 0)
                el.selected = true;
            datestr = format_date(file.modified);
            insert_text(el, file.dirent.filename + ' -- ' + datestr);
            selel.insert(el);
        }
        bodyel.insert(selel);

        if (will_save)
            selel.onchange = evhan_select_change;
    }

    if (will_save) {
        set_caption('Name this ' + cur_usage_name + '.', true);
        el = $(dialog_el_id+'_accept');
        el.disabled = false;
    }
    else {
        if (ls.length == 0) {
            set_caption('You have no ' + cur_usage_name + 's for this game.', true);
            el = $(dialog_el_id+'_accept');
            el.disabled = true;
        }
        else {
            set_caption('Select a ' + cur_usage_name + ' to load.', true);
            el = $(dialog_el_id+'_accept');
            el.disabled = false;
        }
    }
}

/* Dialog.file_construct_ref(filename, usage, gameid) -- create a fileref
 *
 * Create a fileref. This does not create a file; it's just a thing you can use
 * to read an existing file or create a new one. Any unspecified arguments are
 * assumed to be the empty string.
 */
function file_construct_ref(filename, usage, gameid) {
    if (!filename)
        filename = '';
    if (!usage)
        useage = '';
    if (!gameid)
        gameid = '';
    var key = usage + ':' + gameid + ':' + filename;
    var ref = { dirent: 'dirent:'+key, content: 'content:'+key,
                filename: filename, usage: usage, gameid: gameid };
    return ref;
}

/* Create a fileref from a browser storage key (string). If the key does not
   begin with "dirent:" (ie, this key does not represent a directory entry),
   this returns null.
*/
function file_decode_ref(dirkey) {
    if (!dirkey.startsWith('dirent:'))
        return null;

    var oldpos = 7;
    var pos = dirkey.indexOf(':', oldpos);
    if (pos < 0)
        return null;
    var usage = dirkey.slice(oldpos, pos);
    oldpos = pos+1;
    
    pos = dirkey.indexOf(':', oldpos);
    if (pos < 0)
        return null;
    var gameid = dirkey.slice(oldpos, pos);
    oldpos = pos+1;

    var filename = dirkey.slice(oldpos);
    var conkey = 'cont'+dirkey.slice(3);

    var ref = { dirent: dirkey, content: conkey, 
                filename: filename, usage: usage, gameid: gameid };
    return ref;
}

/* Load directory entry information for a fileref (or key denoting a fileref).

   The dirent information includes when the file was created, and when it was
   last modified. It does not include the file content.
*/
function file_load_dirent(dirent) {
    if (typeof(dirent) != 'object') {
        dirent = file_decode_ref(dirent);
        if (!dirent)
            return null;
    }

    var statstring = localStorage.getItem(dirent.dirent);
    if (!statstring)
        return null;

    var file = { dirent: dirent };

    var ix, pos, key, val;

    var ls = statstring.toString().split(',');
    for (ix=0; ix<ls.length; ix++) {
        val = ls[ix];
        pos = val.indexOf(':');
        if (pos < 0)
            continue;
        key = val.slice(0, pos);
        val = val.slice(pos+1);

        switch (key) {
        case 'created':
            file.created = new Date(Number(val));
            break;
        case 'modified':
            file.modified = new Date(Number(val));
            break;
        }
    }

    //### binary
    //### game name?

    return file;
}

/* Dialog.file_ref_exists(ref) -- returns whether the file exists
 */
function file_ref_exists(ref) {
    var statstring = localStorage.getItem(ref.dirent);
    if (!statstring)
        return false;
    else
        return true;
}

/* Dialog.file_remove_ref(ref) -- delete the file, if it exists
 */
function file_remove_ref(ref) {
    localStorage.removeItem(ref.dirent);
    localStorage.removeItem(ref.content);
}

/* Dialog.file_write(ref, content, israw) -- write data to the file
 *
 * The "content" argument is stored to the file. If "israw" is true, the
 * content must be a string. Otherwise, the content is converted to JSON (using
 * JSON.stringify) before being stored.
 *
 * HTML's localStorage mechanism has no incremental storage API; you have to
 * store the entire chunk of data at once. Therefore, the given content
 * replaces the existing contents of the file (if any).
 */
function file_write(dirent, content, israw) {
    var val, ls;

    var file = file_load_dirent(dirent);
    if (!file) {
        /* Newly-created file. */
        file = { dirent: dirent, created: new Date() };
    }

    file.modified = new Date();

    if (!israw)
        content = encode_array(content);

    ls = [];

    if (file.created)
        ls.push('created:' + file.created.getTime());
    if (file.modified)
        ls.push('modified:' + file.modified.getTime());

    //### binary
    //### game name?

    val = ls.join(',');
    localStorage.setItem(file.dirent.dirent, val);
    localStorage.setItem(file.dirent.content, content);

    return true;
}

/* Dialog.file_read(ref, israw) -- read data from the file
 *
 * Read the (entire) content of the file. If "israw" is true, this returns the
 * string that was stored. Otherwise, the content is converted from JSON (using
 * JSON.parse) before being returned.
 *
 * As a special case, the empty string is converted to an empty array (when not
 * in israw mode).
 */
function file_read(dirent, israw) {
    var file = file_load_dirent(dirent);
    if (!file)
        return null;

    var content = localStorage.getItem(dirent.content);
    if (content == null)
        return null;

    content = content.toString();
    if (!content) {
        if (israw)
            return '';
        else
            return [];
    }

    if (israw)
        return content;
    else
        return decode_array(content);
}

/* Check whether a given fileref matches the given usage and gameid strings. If
   you don't want to check one attribute or the other, pass null for that
   argument.
*/
function file_ref_matches(ref, usage, gameid) {
    if (usage != null) {
        if (ref.usage != usage)
            return false;
    }

    if (gameid != null) {
        if (ref.gameid != gameid)
            return false;
    }

    return true;
}

/* Return the list of files (actually directory entries) matching the given
   given usage and gameid strings. If you don't want to check one attribute or
   the other, pass null for that argument.
*/
function files_list(usage, gameid) {
    var ix;
    var ls = [];

    if (!localStorage)
        return ls;

    for (ix=0; ix<localStorage.length; ix++) {
        var key = localStorage.key(ix);
        if (!key)
            continue;
        var dirent = file_decode_ref(key.toString());
        if (!dirent)
            continue;
        if (!file_ref_matches(dirent, usage, gameid))
            continue;
        var file = file_load_dirent(dirent);
        ls.push(file);
    }

    //GlkOte.log('### files_list found ' + ls.length + ' files.');
    return ls;
}

/* Convert a date object to a (short) string.
*/
function format_date(date) {
    if (!date)
        return '???';
    //### display relative dates?
    var day = (date.getMonth()+1) + '/' + date.getDate();
    var time = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return day + ' ' + time;
}

/* Define encode_array() and decode_array() functions. These would be
   JSON.stringify() and JSON.parse(), except not all browsers support those.
*/

if (window.JSON) {
    function encode_array(arr) {
        var res = JSON.stringify(arr);
        var len = res.length;
        /* Safari's JSON quotes arrays for some reason; we need to strip
           the quotes off. */
        if (res[0] == '"' && res[len-1] == '"')
            res = res.slice(1, len-1);
        return res;
    }
    function decode_array(val) { return JSON.parse(val); }
}
else {
    /* Not-very-safe substitutes for JSON in old browsers. */
    function encode_array(arr) { return '[' + arr + ']'; }
    function decode_array(val) { return eval(val); }
}

/* Locate the storage object, and set up the storage event handler, at load
   time (but after all the handlers are defined).
*/

var localStorage = null;
if (window.localStorage != null) {
    /* This is the API object for HTML5 browser storage. */
    localStorage = window.localStorage;
}
else if (window.globalStorage != null) {
    /* This is a non-standard API used in Firefox 3.0 (but not 3.5). */
    localStorage = window.globalStorage[location.hostname];
}
if (localStorage == null) {
    /* This browser doesn't support storage at all. We'll whip up a
       simple implementation. It will only last as long as the window
       does, but that's good enough for a game. */
    localStorage = {
        data: {},
        keys: [],
        length: 0,
        getItem: function(key) {
            return localStorage.data[key];
        },
        setItem: function(key, val) {
            if (localStorage.keys.indexOf(key) < 0) {
                localStorage.keys.push(key);
                localStorage.length = localStorage.keys.length;
            }
            localStorage.data[key] = val;
        },
        removeItem: function(key) {
            if (localStorage.keys.indexOf(key) >= 0) {
                localStorage.keys = localStorage.keys.without(key);
                localStorage.length = localStorage.keys.length;
                delete localStorage.data[key];
            }
        },
        key: function(index) {
            return localStorage.keys[index];
        },
        clear: function() {
            localStorage.data = {};
            localStorage.keys = [];
            localStorage.length = 0;
        }
    }
}

Event.observe(window, 'storage', evhan_storage_changed); // prototype-ism

/* End of Dialog namespace function. Return the object which will
   become the Dialog global. */
return {
    open: dialog_open,

    file_construct_ref: file_construct_ref,
    file_ref_exists: file_ref_exists,
    file_remove_ref: file_remove_ref,
    file_write: file_write,
    file_read: file_read
};

}();

/* End of Dialog library. */
