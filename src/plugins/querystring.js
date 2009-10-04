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
