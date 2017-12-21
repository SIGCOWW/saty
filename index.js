'use strict';
const scanner = require('./lib/scanner');
const db = require('./lib/db');
const Printer = require('./lib/printer');
const TecPrinter = require('./lib/tecprinter');
const Display = require('./lib/display');
var exec = require('child_process').exec;

var OPTICON = [ 0x065a, 0x0001 ];
var TECSCAN = [ 0x08a6, 0x0044 ];
/*var EPSON_IPADDR = '192.168.192.168';*/ var EPSON_IPADDR = null;
var TEC_USBID = [ 0x08a6, 0x0041 ];
var DISPLAY_PORT = '/dev/serial0';/*var DISPLAY_PORT = '/tmp/ttyS0';*/


// Initialize
var epson = new Printer(EPSON_IPADDR);
var tec = new TecPrinter(TEC_USBID[0], TEC_USBID[1]);
var display = new Display(DISPLAY_PORT);

// Scan
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
