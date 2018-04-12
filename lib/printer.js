'use strict';
var escpos = require('escpos');
var iconv = require('iconv-lite');
var db = require('./db');
var utils = require('./utils');

var PAPER_WIDTH = 17 * 2 + 1;
var DUMP_CODE = '2222222222222';
var DEBUG_CODE = '2222222222239';
var LOGO_IMG = null;

function getDevice(ipaddr) {
	return ipaddr ? new escpos.Network(ipaddr) : new escpos.Console();
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
	function sub(logo) {
		printer
		.print('\x1b\x52\x08')	// Japan
		.print('\x1b\x74\x01')	// Katakana
		.print('\x1c\x43\x01')	// Shift_JIS
		.align('ct').raster(logo).feed(1)
		.text(db.header(), utils.ENCODING)
		.feed(1)
		.text('ご利用ありがとうございます', utils.ENCODING)
		.close();
	}

	if (LOGO_IMG !== null) {
		sub(LOGO_IMG);
	} else {
		escpos.Image.load(db.assetsPath('logo.png'), function(logo) {
			LOGO_IMG = logo;
			sub(logo);
		});
	}
}

module.exports = function(IPADDR) {
	this.IPADDR = IPADDR;
	this.DUMP_CODE = DUMP_CODE;
	this.DEBUG_CODE = DEBUG_CODE;

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
				.barcode(isdn.substr(0, 12), 'EAN13')
				.feed(1);
			});

			printer
			.text('--- DUMP_CODE ---')
			.barcode(DUMP_CODE.substr(0, 12), 'EAN13')
			.feed(1)
			.text('--- DEBUG_CODE ---')
			.barcode(DEBUG_CODE.substr(0, 12), 'EAN13')
			.feed(1)
			.text(utils.formatDate(new Date()), utils.ENCODING)
			.feed(3)
			.cut()
			.hardware('INIT');

			header(printer);
		});
	}
	//this.dump();

	this.printReceipt = function(obj) {
		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		device.open(function() {
			printer
			//.text(utils.formatDate(obj['date']), utils.ENCODING)
			.text('2017年12月29日（金）', utils.ENCODING)
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
				if (obj['message']) this.feed(1).align('lt').text(obj['message'], utils.ENCODING);
				this.feed(1).align('rt').text('責US0800:' + obj['seller'], utils.ENCODING).feed(2).cut();
				header(this);
			});
		});
	}

	this.printLabel = function(seller) {
		// 1b 4a n ... 紙送り
		var device = getDevice(this.IPADDR);
		var printer = new escpos.Printer(device);
		device.open(function() {
			printer
			.print('\x1b\x52\x08')	// Japan
			.print('\x1b\x74\x01')	// Katakana
			.print('\x1c\x43\x01')	// Shift_JIS
			.align('lt')
			.print('\x1c\x21\x0c\x1b\x21\x30')
			.text('COSMIC L0 Vol.4', utils.ENCODING)
			.print('\x1c\x21\x00\x1b\x21\x00')
			.text('～https://sigcoww.org/book/l0-4/ に', utils.ENCODING)
			.align('rt')
			.text('電子版 DLコードを本文中に添えて～', utils.ENCODING)
			.text('17.10.22   38.01.19', utils.ENCODING)
			.print('\x1c\x21\x0c\x1b\x21\x38')
			.text('500', utils.ENCODING)
			.print('\x1c\x21\x00\x1b\x21\x00')
			.align('lt')
			.text('委託元: SIGCOWW', utils.ENCODING)
			.text('責US0800: ' + seller, utils.ENCODING)
			.feed(1)
			.close();
		});
	}
}
