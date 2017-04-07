'use strict';
var SCANNER_VID = 1204;
var SCANNER_PID = 56929;
var PRINTER_IPADDR = '192.168.192.168';
var DISPLAY_PORT = '/dev/serial0';

var scanner = require('./lib/scanner');
var db = require('./lib/db');
var Printer = require('./lib/printer');
var Display = require('./lib/display');


// Initialize
PRINTER_IPADDR = null;
//DISPLAY_PORT = '/tmp/ttyS0';
var printer = new Printer(PRINTER_IPADDR);
var display = new Display(DISPLAY_PORT);

// Scan
scanner.scan(SCANNER_VID, SCANNER_PID, function(isdn) {
	if (isdn === printer.DUMP_CODE) {
		console.log("DUMP!");
		printer.dump();
		return
	}

	var receipt = db.getReceiptData(isdn);
	printer.printReceipt(receipt);
	display.printReceipt(receipt);
	db.writeReceiptLog(receipt);
});
