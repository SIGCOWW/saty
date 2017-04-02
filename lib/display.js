'use strict';
var ENCODING = 'Shift_JIS';
var INTERVAL_MS = 1000 * 60;

var iconv = require('iconv-lite');
var serialport = require('serialport');
var db = require('./db');


function getMessages() {
	var messages = [];
	var books = db.getBookList();

	for (var i=0; i<books.length; i++) {
		var data = db.getDisplayData(books[i]);
		if (data === null) continue;

		var obj = {
			'type': data['isnew'] ? '新刊' : '既刊',
			'title': data['title'],
			'event': data['event'],
			'short': data['isshort']
		};

		if (data['isshort']) {
			obj['msg'] = data['description'].join('\r\n');
			messages.push(obj);
			continue;
		}

		for (var j=0; j<data['description'].length; j++) {
			var copy = JSON.parse(JSON.stringify(obj));
			copy['msg'] = [ data['description'][j]['title'] ];
			copy['msg'].push(data['description'][j]['author'] + ' 著');
			copy['msg'].push(data['description'][j]['text']);
			messages.push(copy);
		}
	}

	return messages;
}

function num2byte(n, len) {
	var buf = new Buffer(len);
	buf.writeIntLE(n, 0, len);
	return buf;
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
	buf = Buffer.concat([buf, num2byte(x, 2)]);
	buf = Buffer.concat([buf, num2byte(y, 2)]);
	buf = Buffer.concat([buf, num2byte(w, 2)]);
	buf = Buffer.concat([buf, num2byte(h, 2)]);
	return buf;
}

function selectWindow(wno) {
	return new Buffer([0x1f, 0x28, 0x44, 0x03, 0x00, 0x04, wno, 0x01]);
}

function setSize(x, y) {
	return new Buffer([0x1f, 0x28, 0x47, 0x03, 0x00, 0x20, x, y]);
}

function setReverse(n) {
	return new Buffer([0x1f, 0x72, n]);
}


module.exports = function(PORT) {
	var port = new serialport(PORT, { baudRate: 9600 });
	var messages = getMessages();
	var timer = null;

	this.display = function() {
		var obj = messages.shift();
		messages.push(obj);
		var buf = initial();

		// createWindow
		buf = Buffer.concat([buf, createWindow(1, 0, 0, 16*3*2, 16*3)]);
		buf = Buffer.concat([buf, createWindow(2, 0, 16*3, 16*3*2, 16)]);
		buf = Buffer.concat([buf, createWindow(3, 16*3*2, 0, 256-16*3*2, 64)]);

		// for wno-1
		buf = Buffer.concat([buf, selectWindow(1)]);
		buf = Buffer.concat([buf, new Buffer([0x1f, 0x28, 0x47, 0x03, 0x00, 0x20, 0x03, 0x03])]);
		buf = Buffer.concat([buf, new Buffer([0x1f, 0x72, 0x01])]);
		buf = Buffer.concat([buf, iconv.encode('\n\n'+obj['type'], ENCODING)]);

		// for wno-2
		buf = Buffer.concat([buf, selectWindow(2)]);
		buf = Buffer.concat([buf, new Buffer([0x1f, 0x03])]);
		buf = Buffer.concat([buf, new Buffer([0x1f, 0x28, 0x47, 0x02, 0x00, 0x40, 0x01])]);
		buf = Buffer.concat([buf, new Buffer(obj['type'] === '新刊' ? obj['title'] : obj['event'], 'ascii')]);

		// for wno-3
		buf = Buffer.concat([buf, selectWindow(3)]);
		if (obj['short']) {
			buf = Buffer.concat([buf, iconv.encode(obj['msg'], ENCODING)]);
		} else {
			buf = Buffer.concat([buf, iconv.encode(obj['msg'][0] + '\r\n', ENCODING)]);
			buf = Buffer.concat([buf, iconv.encode(obj['msg'][1] + '\r\n', ENCODING)]);
			buf = Buffer.concat([buf, new Buffer([0x1f, 0x03])]);
			buf = Buffer.concat([buf, iconv.encode(obj['msg'][2], ENCODING)]);
		}

		port.write(buf);
	}

	var display = this.display;
	function startDisplay() {
		display();
		return setInterval(function() { display(); }, INTERVAL_MS);
	}
	port.on('open', function() { timer = startDisplay(); });


	this.printReceipt = function(obj) {
		clearInterval(timer);

		var buf = initial();
		buf = Buffer.concat([buf, iconv.encode('\n' + obj['title'] + '\r\n合計金額', ENCODING)]);

		var price = parseInt(obj['price']).toLocaleString('ja-JP');
		var width = 32 - 8 - 2 - price.length;
		buf = Buffer.concat([buf, iconv.encode(' '.repeat(width) + price + '円', ENCODING)]);

		port.write(buf);
		setTimeout(function() {
			timer = startDisplay();
		}, INTERVAL_MS);
	}
}
