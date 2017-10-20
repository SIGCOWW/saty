'use strict';
var escpos = require('escpos');
const qr = require('qr-image');
const getPixels    = require('get-pixels');
const Iconv = require('iconv').Iconv;
const iconv = new Iconv('UTF-8', 'ISO-2022-JP//IGNORE');
const iconvlite = require('iconv-lite');
var db = require('./db');
var utils = require('./utils');

var PAPER_WIDTH = 31;


escpos.Printer.prototype.tecimage = function(image) {
	var header = '\x1b\x2a\x21';
	var bitmap = image.toBitmap(24);
	this.lineSpace(48);
	var self = this;
	self.buffer.write('\x1b\x33\x30')
	bitmap.data.forEach(function (line) {
		self.buffer.write(header);
		self.buffer.writeUInt16LE(line.length / 3);
		self.buffer.write(line);
		self.buffer.write('\n');
	});
	return this.lineSpace();
}

escpos.Printer.prototype.tecqrimage = function(content, options, callback) {
	var self = this;
	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	options = options || { type: 'png', mode: 'dhdw' };
	var buffer = qr.imageSync(content, options);
	var type = [ 'image', options.type ].join('/');
	getPixels(buffer, type, function (err, pixels) {
		if(err) return callback && callback(err);
		self.tecimage(new escpos.Image(pixels));
		callback && callback.call(self, null, self);
	});

	return this;
}

function jptext(str) {
	var buf = new Buffer([]);

	for (let c of str) {
		var sjis = iconvlite.encode(c, 'Shift_JIS');
		if (sjis.length == 1) {
			buf = Buffer.concat([buf, sjis]);
			continue;
		}

		var jis = iconv.convert(new Buffer(c));
		if (jis.length == 0) continue;
		buf = Buffer.concat([buf, new Buffer([0x1c, 0x26])]);
		buf = Buffer.concat([buf, new Buffer([jis[3], jis[4]])]);
		buf = Buffer.concat([buf, new Buffer([0x1c, 0x2e])]);
	}

	return buf;
}


function item(name, price, dw) {
	function wide(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x04, 0x1b, 0x21, 0x20])]); }
	function normal(buf) { return Buffer.concat([buf, new Buffer([0x1c, 0x21, 0x00, 0x1b, 0x21, 0x00])]); }

	dw = dw ? 2 : 1;
	price = '\\' + parseInt(price).toLocaleString('ja-JP');

	var buf = new Buffer(' ', 'ascii');
	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, jptext(name)]);
	if (dw === 2) buf = normal(buf);

	var width = PAPER_WIDTH - 1;
	width -= utils.jpwidth(name) * dw;
	width -= utils.jpwidth(price) * dw;
	buf = Buffer.concat([buf, new Buffer(' '.repeat(width))]);

	if (dw === 2) buf = wide(buf);
	buf = Buffer.concat([buf, jptext(price)]);
	if (dw === 2) buf = normal(buf);

	return Buffer.concat([buf, new Buffer('\n', 'ascii')]);
}


module.exports = function(PID, VID) {
	this.PID = PID;
	this.VID = VID;
	this.logo = null;

	var self = this;
	escpos.Image.load(db.assetsPath('tec.png'), function(logo) { self.logo = logo; });

	this.printReceipt = function(obj) {
		var device = new escpos.USB(this.PID, this.VID);
		var printer = new escpos.Printer(device);
		device.open(function() {
			printer
			.print('\x1b\x52\x08\x1b\x74\x01')
			.align('ct').tecimage(self.logo)
			.print(jptext('\n' + db.header() + '\n'))
			.print(jptext('ご利用ありがとうございます\n\n'))
			.print(jptext(utils.formatDate(obj['date']) + '\n\n'))
			.align('lt')
			.print(item(obj['title'], obj['price']))
			.feed(1)
			.print(item('小　　計', obj['price']))
			.print(item('合計', obj['price'], true))
			.feed(2)
			.align('ct')
			.print(jptext('電子版DLコード\n'))
			.tecqrimage('https://sigcoww.herokuapp.com/book/'+obj['short']+'/?key='+obj['key'],
			{ type: 'png', mode: 'normal' }, function(err) {
				if (obj['message']) this.feed(1).align('lt').print(jptext(obj['message'] + '\n'));
				this.align('rt').print(jptext('責US0800:' + obj['seller'] + '\n\n\n\n\n')).close();
			})
		});
	}
}
