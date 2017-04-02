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
var DUMP_CODE = '2222222222222';
PRINTER_IPADDR = null;
var printer = new Printer(DUMP_CODE, PRINTER_IPADDR);
var display = new Display(DISPLAY_PORT);

var message = {};
var keys = db.getBookList();
for (var i=0; i<keys.length; i++) message[keys[i]] = db.getDisplayData(keys[i]);


// Scan
scanner.scan(SCANNER_VID, SCANNER_PID, function(isdn) {
	if (isdn === DUMP_CODE) {
		printer.dump(db.getReceiptLog(new Date()));
		return;
	}

	var receipt = db.getReceiptData(isdn);
	printer.printReceipt(receipt);
	display.printReceipt(receipt);
	db.writeReceiptLog(receipt);
});
