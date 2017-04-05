'use strict';
var ENCODING = 'Shift_JIS';
var iconv = require('iconv-lite');

module.exports.ENCODING = ENCODING;
module.exports.jpwidth = function(str) {
	var n = 0;

	for (var i=0; i<str.length; i++) {
		var tmp = iconv.encode(str[i], ENCODING);
		if (tmp.length === 1 && tmp[0] < 0x20) continue;
		n += tmp.length;
	}

	return n;
}

module.exports.num2byte = function(n, len) {
	var buf = new Buffer(len);
	buf.writeIntLE(n, 0, len);
	return buf;
}
