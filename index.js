'use strict';
//const scanner = require('./lib/scanner');
const db = require('./lib/db');
const Printer = require('./lib/printer');
//const TecPrinter = require('./lib/tecprinter');
//const Display = require('./lib/display');
//const Friend = require('./lib/friend');
//const WEB_PORT = 3000;

//var OPTICON = [ 0x065a, 0x0001 ];
//var TECSCAN = [ 0x08a6, 0x0044 ];
var EPSON_IPADDR = '192.168.192.168';
//var EPSON_IPADDR = null;
//var TEC_USBID = [ 0x08a6, 0x0041 ];
//var DISPLAY_PORT = '/dev/serial0';/*var DISPLAY_PORT = '/tmp/ttyS0';*/
//var FRIEND_PORT = '/dev/spidev0.0';

// Initialize
var epson = new Printer(EPSON_IPADDR);
//var tec = new TecPrinter(TEC_USBID[0], TEC_USBID[1]);
//var display = new Display(DISPLAY_PORT);
//var friend = new Friend(FRIEND_PORT);


// 何か2
function demo(count) {
	var isdn = '2784403994040';
	isdn = '4910037690579';
	var receipt = db.getReceiptData(isdn);
	var seller = JSON.parse(JSON.stringify(receipt['seller']))
	console.log(seller);
	epson.printLabel(seller);
	if (count - 1 > 0) demo(count - 1);
}
demo(2);


// Scan
/*
scanner.scan(OPTICON[0], OPTICON[1], function(isdn) {
	if (isdn === epson.DUMP_CODE) { epson.dump(); return; }

	var receipt = db.getReceiptData(isdn);
	if (receipt === null) { return; }

	epson.printReceipt(receipt);
	display.printReceipt(receipt);
	db.writeReceiptLog(receipt, 'epson');
});

scanner.scan(TECSCAN[0], TECSCAN[1], function(isdn) {
	isdn = isdn.substr(0, 13)
	var receipt = db.getReceiptData(isdn);

	tec.printReceipt(receipt);
	db.writeReceiptLog(receipt, 'tec');
});
*/

/*
// 何か
var http = require('http');
var url = require('url');
var server = http.createServer(function(req, res) {
	var parse = url.parse(req.url, true);
	if (parse.query.method && parse.query.amount) {
		var obj = {};
		obj['price'] = parse.query.amount;
		obj['isdn'] = '';
		obj['title'] = '';
		switch (parse.query.method) {
		case 'square':
			obj['title'] = 'クレジットカード決済 (Square)';
			break;
		case 'pxvpay':
			obj['title'] = 'pixiv PAY';
			break;
		case 'wechat':
			obj['title'] = 'WeChat Pay';
			break;
		}
		display.printReceipt(obj);
	}

	if (parse.query['keys[]']) {
		var sleep = 0;
		if (!Array.isArray(parse.query['keys[]'])) parse.query['keys[]'] = [ parse.query['keys[]'] ];
		parse.query['keys[]'].forEach(function(cmd) {
			if (isFinite(cmd)) {
				sleep += parseInt(cmd);
			} else {
				setTimeout(function() {
					friend.key(cmd);
				}, sleep);
			}
		});
	}

	if (parse.query.power) {
		var level = 0;
		if (parse.query.power == 'high') level = 4;
		if (parse.query.power == 'middle') level = 0;
		if (parse.query.power == 'low') level = -12;
		friend.raw('AT+BLEPOWERLEVEL=' + level);
	}

	res.writeHead(200);
	res.end('OK');
});
server.listen(WEB_PORT);


var httpProxy = require('http-proxy');
var fs = require('fs');
httpProxy.createServer({
	ssl: {
		key: fs.readFileSync('/home/pi/keys/server.key', 'utf8'),
		cert: fs.readFileSync('/home/pi/keys/server.crt', 'utf8')
	}, target: {
		host: '127.0.0.1',
		port: WEB_PORT
  }
}).listen(3443);
*/
