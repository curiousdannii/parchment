/* Taken from:
 *
 * http://ecmanaut.blogspot.com/2007/11/javascript-base64-singleton.html
 *
 * With minor modifications to decode a b64 string to a byte array instead
 * of a string. */

var base64_tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function encode_base64(data) {
    var out = "", c1, c2, c3, e1, e2, e3, e4;
    for (var i = 0; i < data.length; ) {
        c1 = data[i++];
        c2 = data[i++];
        c3 = data[i++];
        e1 = c1 >> 2;
        e2 = ((c1 & 3) << 4) + (c2 >> 4);
        e3 = ((c2 & 15) << 2) + (c3 >> 6);
        e4 = c3 & 63;
        if (isNaN(c2))
            e3 = e4 = 64;
        else if (isNaN(c3))
            e4 = 64;
        out += (base64_tab.charAt(e1) +
                base64_tab.charAt(e2) +
                base64_tab.charAt(e3) +
                base64_tab.charAt(e4));
    }
    return out;
}

function decode_base64(data) {
    var out = [], c1, c2, c3, e1, e2, e3, e4;
    for (var i = 0; i < data.length; ) {
        e1 = base64_tab.indexOf(data.charAt(i++));
        e2 = base64_tab.indexOf(data.charAt(i++));
        e3 = base64_tab.indexOf(data.charAt(i++));
        e4 = base64_tab.indexOf(data.charAt(i++));
        c1 = (e1 << 2) + (e2 >> 4);
        c2 = ((e2 & 15) << 4) + (e3 >> 2);
        c3 = ((e3 & 3) << 6) + e4;
        out.push(c1);
        if (e3 != 64)
            out.push(c2);
        if (e4 != 64)
            out.push(c3);
    }
    return out;
}
