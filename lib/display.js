'use strict';
var INTERVAL_MS = 1000 * 60;
var SHORT_INTERVAL_MS = INTERVAL_MS / 2;
var REFRESH_INTERVAL = 60 * 4;
var iconv = require('iconv-lite');
var serialport = require('serialport');
var db = require('./db');
var utils = require('./utils');


module.exports = function(PORT) {
	var port = new serialport(PORT, { baudRate: 9600 });
	var messages = db.getDisplayMessage();
	var timer = null;
	var timeout = null;
	var scroll_obj = null;
	var scroll_count = 0;

	port.on('open', function() { timer = startDisplay(); });
	function startDisplay() {
		scroll_obj = null;
		var obj = messages.shift(); messages.push(obj);
		var buf = initial();

		// createWindow
		buf = Buffer.concat([buf, createWindow(1, 0, 0, (16*2)*2, 16*2)]);
		buf = Buffer.concat([buf, createWindow(2, 0, 16*2, (16*2)*2, 16*2)]);
		if (obj['short']) {
			buf = Buffer.concat([buf, createWindow(3, (16*2)*2, 0, 256-16*2*2, 64)]);
		} else {
			buf = Buffer.concat([buf, createWindow(3, (16*2)*2, 0, 256-16*2*2, 64-16)]);
			buf = Buffer.concat([buf, createWindow(4, (16*2)*2, 64-16, 256-16*2*2, 16)]);
		}

		// for wno-1
		buf = Buffer.concat([buf, selectWindow(1)]);
		buf = Buffer.concat([buf, setSize(2, 2)]);
		buf = Buffer.concat([buf, setReverse(1)]);
		buf = Buffer.concat([buf, iconv.encode('\n'+obj['type'], utils.ENCODING)]);

		// for wno-2
		buf = Buffer.concat([buf, selectWindow(2)]);
		buf = Buffer.concat([buf, setScroll()]);
		buf = Buffer.concat([buf, setSmall(1)]);
		buf = Buffer.concat([buf, new Buffer(obj['label'], 'ascii')]);

		// for wno-3
		buf = Buffer.concat([buf, selectWindow(3)]);
		if (obj['short']) {
			buf = Buffer.concat([buf, iconv.encode(obj['msg'], utils.ENCODING)]);
		} else {
			var width = 24;
			var n, idx;
			for (n=0, idx=0; idx<obj['msg'][0].length; idx++) {
				if (obj['msg'][0][idx] === '\n') break;
				n += utils.jpwidth(obj['msg'][0][idx]);
				if (n > width) break;
			}

			var line1 = obj['msg'][0].substring(0, idx).replace(/[\x00-\x1f]/g, '');
			var line2 = obj['msg'][0].substring(idx).replace(/[\x00-\x1f]/g, '');
			for (n=0, idx=0; idx<line2.length; idx++) {
				n += utils.jpwidth(obj['msg'][0][idx]);
				if (n > width) break;
			}
			line2 = line2.substring(0, idx);
			line2 = ' '.repeat(width - utils.jpwidth(line2)) + line2;
			buf = Buffer.concat([buf, iconv.encode(line1 + '\r\n' + line2 + '\r\n' + obj['msg'][1] + '\r\n', utils.ENCODING)]);

			// for wno-4
			buf = Buffer.concat([buf, selectWindow(4)]);
			buf = Buffer.concat([buf, setScroll()]);
			buf = Buffer.concat([buf, new Buffer(' '.repeat(width), 'ascii')]);

			scroll_obj = JSON.parse(JSON.stringify(obj));
			scroll_count = 0;
			scroll_obj['msg'][2] = ' '.repeat(width) + scroll_obj['msg'][2];
		}

		port.write(buf);
		return setInterval(function() { refresh(); }, Math.ceil(INTERVAL_MS / REFRESH_INTERVAL));
	}

	function refresh() {
		if (scroll_obj === null) {
			clearInterval(timer);
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				timer = startDisplay();
			}, SHORT_INTERVAL_MS);
			return;
		}

		if ((REFRESH_INTERVAL * scroll_count++) > INTERVAL_MS) {
			clearInterval(timer);
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				timer = startDisplay();
			}, 0);
			return;
		}

		var buf = new Buffer(0);
		if (scroll_count % 20 === 0) {
			buf = Buffer.concat([buf, selectWindow(1)]);
			buf = Buffer.concat([buf, clear()]);
			buf = Buffer.concat([buf, setSize(2, 2)]);
			buf = Buffer.concat([buf, setReverse(0)]);
			buf = Buffer.concat([buf, iconv.encode('\n'+scroll_obj['type'], utils.ENCODING)]);
		}

		var c = scroll_obj['msg'][2][0]; scroll_obj['msg'][2] = scroll_obj['msg'][2].substring(1) + c;
		buf = Buffer.concat([buf, selectWindow(4)]);
		buf = Buffer.concat([buf, iconv.encode(c, utils.ENCODING)]);

		port.write(buf);
	}

	this.printReceipt = function(obj) {
		clearInterval(timer);
		clearTimeout(timeout);

		var price = parseInt(obj['price']).toLocaleString('ja-JP');
		var width = 32;
		width -= 4; // "合計"
		width -= 2; // "円"
		width -= utils.jpwidth(price);

		var buf = initial();
		buf = Buffer.concat([buf, iconv.encode(obj['isdn'] + '\r\n' + obj['title'] + '\r\n\r\n', utils.ENCODING)]);
		buf = Buffer.concat([buf, iconv.encode('合計' + ' '.repeat(width) + price + '円', utils.ENCODING)]);
		port.write(buf);
		timeout = setTimeout(function() {
			timer = startDisplay();
		}, SHORT_INTERVAL_MS);
	}
}


function initial() {
	return new Buffer([
		0x1b, 0x40,
		0x1b, 0x52, 0x08,
		0x1b, 0x74, 0x01,
		0x1f, 0x28, 0x47, 0x02, 0x00, 0x61, 0x01
	]);
}

function createWindow(wno, x, y, w, h) {
	var buf = new Buffer([0x1f, 0x28, 0x44, 0x0d, 0x00, 0x01, wno, 0x41, 0x01, 0x02]);
	buf = Buffer.concat([buf, utils.num2byte(x, 2)]);
	buf = Buffer.concat([buf, utils.num2byte(y, 2)]);
	buf = Buffer.concat([buf, utils.num2byte(w, 2)]);
	buf = Buffer.concat([buf, utils.num2byte(h, 2)]);
	return buf;
}

function selectWindow(wno) { return new Buffer([0x1f, 0x28, 0x44, 0x03, 0x00, 0x04, wno, 0x01]); }
function setSize(x, y) { return new Buffer([0x1f, 0x28, 0x47, 0x03, 0x00, 0x20, x, y]); }
function setReverse(n) { return new Buffer([0x1f, 0x72, n]); }
function setBold(n) { return new Buffer([0x1f, 0x28, 0x47, 0x02, 0x00, 0x21, n]); }
function setBlink(n) { return new Buffer([0x1f, 0x45, n]); }
function setSmall(n) { return new Buffer([0x1f, 0x28, 0x47, 0x02, 0x00, 0x40, 0x01, n]); }
function setScroll() { return new Buffer([0x1f, 0x03]) };
function clear() { return new Buffer([0x1c]) };
