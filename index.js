'use strict';
var SCANNER_VID = 1204;
var SCANNER_PID = 56929;
var TEC_VID = 1204;
var TEC_PID = 56929;
var PRINTER_IPADDR = '192.168.192.168';
var DISPLAY_PORT = '/dev/serial0';

var scanner = require('./lib/scanner');
var db = require('./lib/db');
var Printer = require('./lib/printer');
var TecPrinter = require('./lib/tecprinter');
var Display = require('./lib/display');
var exec = require('child_process').exec;

// Initialize
//PRINTER_IPADDR = null;
//DISPLAY_PORT = '/tmp/ttyS0';
var printer = new Printer(PRINTER_IPADDR);
var tecprinter = new TecPrinter(0x08a6, 0x0041);
var display = new Display(DISPLAY_PORT);

// Scan
scanner.scan(SCANNER_VID, SCANNER_PID, function(isdn) {
	if (isdn === printer.DUMP_CODE) { printer.dump(); return; }

	var receipt = db.getReceiptData(isdn);
	if (receipt === null) { return; }

	printer.printReceipt(receipt);
	display.printReceipt(receipt);
	db.writeReceiptLog(receipt, 'epson');
});

scanner.scan(TEC_VID, TEC_PID, function(isdn) {
	var receipt = db.getReceiptData(isdn);
	if (receipt === null) { return; }

	printer.printReceipt(receipt);
	//display.printReceipt(receipt);
	db.writeReceiptLog(receipt, 'tec');
});
