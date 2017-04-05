'use strict';
var PAPER_WIDTH = 17 * 2 + 1;
var DUMP_CODE = '2222222222222';
var escpos = require('escpos');
var iconv = require('iconv-lite');
var db = require('./db');
var utils = require('./utils');


function getDevice(ipaddr) {
	return ipaddr ? new escpos.Network(ipaddr) : new escpos.Console();
}

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

function item(name, price, dw) {
	function wide(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x04, 0x1b, 0x21, 0x20])]); }
	function normal(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x00, 0x1b, 0x21, 0x00])]); }

	dw = dw ? 2 : 1;
	price = '\\' + parseInt(price).toLocaleString('ja-JP');

	var buf = new Buffer(' ', 'ascii');
	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, iconv.encode(name, utils.ENCODING)]);
	if (dw === 2) buf = normal(buf);

	var width = PAPER_WIDTH - 1;
	width -= utils.jpwidth(name) * dw;
	width -= utils.jpwidth(price) * dw;
	buf = Buffer.concat([buf, new Buffer(' '.repeat(width))]);

	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, iconv.encode(price, utils.ENCODING)]);
	if (dw === 2) buf = normal(buf);

	return Buffer.concat([buf, new Buffer('\n', 'ascii')]);
}


function header(printer) {
	escpos.Image.load(db.assetsPath('logo.png'), function(logo) {
		printer
		.print('\x1b\x52\x08')	// Japan
		.print('\x1b\x74\x01')	// Katakana
		.print('\x1c\x43\x01')	// Shift_JIS
		.align('ct').raster(logo).feed(1)
		.text(obj['header'], utils.ENCODING)
		.feed(1)
		.text('ご利用ありがとうございます', utils.ENCODING)
		.close();
	});
}

module.exports = function(IPADDR) {
	this.IPADDR = IPADDR;

	this.dump = function() {
		var str = '';
		var logs = db.getReceiptLog(new Date());
		if (logs !== null) {
			var keys = Object.keys(logs);
			for (var i=0; i<keys.length; i++) str += keys[i] + '\n' + logs[keys[i]] + '\n\n';
		}
		var books = db.getBookList();

		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		var ipaddr = this.IPADDR;
		device.open(function() {
			printer
			.print('\x1b\x52\x08\x1b\x74\x01\x1c\x43\x01')
			.align('ct').feed(1)
			.text('--- RECEIPT LOG ---\n' + str).text('--- BOOKS ---');

			books.forEach(function(isdn) {
				var book = db.getReceiptData(isdn);
				printer
				.text(book['title'] + ' \\' + book['price'], utils.ENCODING)
				.barcode(isdn, 'EAN13')
				.feed(1);
			});

			printer
			.text('--- DUMP_CODE ---')
			.barcode(DUMP_CODE, 'EAN13')
			.feed(3)
			.cut()
			.hardware('INIT');

			header(printer);
		});
	}
	this.dump();

	this.printReceipt = function(obj) {
		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		escpos.Image.load(db.assetsPath('logo.png'), function(logo) {
			device.open(function() {
				printer
				.text(formatDate(obj['date']), utils.ENCODING)
				.feed(1)
				.align('lt')
				.print(item(obj['title'], obj['price']))
				.feed(1)
				.print(item('小　　計', obj['price']))
				.print(item('合計', obj['price'], true))
				.feed(2)
				.align('ct')
				.text('電子版DLコード', utils.ENCODING)
				.qrimage('https://sigcoww.herokuapp.com/book/'+obj['short']+'/?key='+obj['key'],
				{ type: 'png', mode: 'normal' }, function(err) {
					if (obj['message'].length > 0) this.feed(1).align('lt').text(obj['message'], utils.ENCODING);
					this.feed(1).align('rt').text('責US0800:' + obj['seller'], utils.ENCODING).feed(2).cut();
					header(this);
				});
			});
		});
	}
}
