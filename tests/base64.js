/*!
 * Taken from:
 *
 * http://ecmanaut.blogspot.com/2007/11/javascript-base64-singleton.html
 *
 * With minor modifications to decode a b64 string to a byte array instead
 * of a string.
 * Actually with some fairly major modifications to INCREASE SPEED!!
 * There's rather little that resembles the original code now... is the reference still warranted?
 */

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
