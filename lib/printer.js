'use strict';
var PAPER_WIDTH = 17 * 2 + 1;
var ENCODING = 'Shift_JIS';

var escpos = require('escpos');
var iconv = require('iconv-lite');
var db = require('./db');


function formatDate(date) {
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

function jpwidth(str) {
	var n = 0;
	for (var i=0; i<str.length; i++) {
		var tmp = iconv.encode(str[i], 'Shift_JIS');

		if (tmp.length === 2) {
			n += 2;
		} else if (tmp.length === 1) {
			if (tmp[0] >= 0x20) n += 1;
		}
	}
	return n;
}

function item(name, price, dw) {
	function wide(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x04, 0x1b, 0x21, 0x20])]); }
	function normal(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x00, 0x1b, 0x21, 0x00])]); }

	dw = dw ? 2 : 1;
	price = '\\' + parseInt(price).toLocaleString('ja-JP');

	var buf = new Buffer(' ', 'ascii');
	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, iconv.encode(name, ENCODING)]);
	if (dw === 2) buf = normal(buf);

	var width = PAPER_WIDTH - 1;
	width -= jpwidth(name) * dw;
	width -= jpwidth(price) * dw;
	buf = Buffer.concat([buf, new Buffer(' '.repeat(width))]);

	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, iconv.encode(price, ENCODING)]);
	if (dw === 2) buf = normal(buf);

	return Buffer.concat([buf, new Buffer('\n', 'ascii')]);
}

function getDevice(ipaddr) {
	return ipaddr ? new escpos.Network(ipaddr) : new escpos.Console();
}


module.exports = function(dump_code, IPADDR) {
	this.IPADDR = IPADDR;

	var device = getDevice(IPADDR);
	var printer = new escpos.Printer(device);
	device.open(function() {
		printer
		.align('ct')
		.feed(1)
		.text('DUMP_CODE')
		.barcode(dump_code, 'EAN13')
		.feed(3)
		.cut()
		.close()
	});

	this.dump = function(obj) {
		var str = '';
		var keys = Object.keys(obj);
		for (var i=0; i<keys.length; i++) str += keys[i] + '\n' + obj[keys[i]] + '\n\n';

		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		device.open(function() {
			printer
			.align('ct')
			.feed(1)
			.text('DUMP')
			.feed(1)
			.text(str)
			.cut()
			.close()
		});
	}

	this.printReceipt = function(obj) {
		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		escpos.Image.load(db.assetsPath('logo.png'), function(logo) {
			device.open(function() {
				printer
				.print('\x1b\x52\x08')	// Japan
				.print('\x1b\x74\x01')	// Katakana
				.print('\x1c\x43\x01')	// Shift_JIS
				.align('ct')
				.raster(logo)
				.feed(1)
				.text(obj['header'], ENCODING)
				.feed(1)
				.text('ご利用ありがとうございます', ENCODING)
				.text(formatDate(obj['date']), ENCODING)
				.feed(1)
				.align('lt')
				.print(item(obj['title'], obj['price']))
				.feed(1)
				.print(item('小　　計', obj['price']))
				.print(item('小　　計', obj['price']))
				.print(item('合計', obj['price'], true))
				.feed(2)
				.align('ct')
				.text('電子版DLコード', ENCODING)
				.qrimage('https://sigcoww.herokuapp.com/book/'+obj['short']+'/?key='+obj['key'],
						{ type: 'png', mode: 'normal' }, function(err) {
					this.feed(1);
					this.align('rt');
					this.text('責US0800:' + obj['seller'], ENCODING);
					this.feed(2);
					this.cut();
					this.close();
				});
			});
		});
	}
}
