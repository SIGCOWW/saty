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

module.exports.getWidthIdx = function(str, width) {
	var n = 0, idx = 0;
	for (idx=0; idx<str.length; idx++) {
		n += module.exports.jpwidth(str[idx]);
		if (n > width) break;
	}
	return idx;
}

module.exports.formatDate = function(date) {
	var str = '';
	str += date.getFullYear() + '年';
	str += (date.getMonth()+1) + '月';
	str += date.getDate() + '日';
	str += '（' + '日月火水木金土'[date.getDay()] + '）';
	str += ' ';
	str += ('0' + date.getHours()).slice(-2);
	str += ':';
	str += ('0' + date.getMinutes()).slice(-2);
	return str;
}
