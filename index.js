'use strict';
var SCANNER_VID = 1204;
var SCANNER_PID = 56929;
var PRINTER_IPADDR = '192.168.192.168';
var DISPLAY_PORT = '/dev/serial0';

var scanner = require('./lib/scanner');
var db = require('./lib/db');
var Printer = require('./lib/printer');
var Display = require('./lib/display');
var exec = require('child_process').exec;

// Initialize
//PRINTER_IPADDR = null;
//DISPLAY_PORT = '/tmp/ttyS0';
var printer = new Printer(PRINTER_IPADDR);
var display = new Display(DISPLAY_PORT);

// Scan
scanner.scan(SCANNER_VID, SCANNER_PID, function(isdn) {
	if (isdn === printer.DUMP_CODE) {
		printer.dump();
		return;
	}

	if (isdn === printer.DATE_CODE) {
		exec('sudo date -s "2017/08/11 09:55:00"');
		return;
	}

	var receipt = db.getReceiptData(isdn);
	if (receipt === null) {
		return;
	}
	printer.printReceipt(receipt);
	display.printReceipt(receipt);
	db.writeReceiptLog(receipt);
});

/*
// Test
var counter = 75;
function ppp() {
	counter--;
	console.log('Ato: ' + counter);
	var code = '2784403994033';
	var receipt = db.getReceiptData(code);
	printer.printReceipt(receipt);
	var id = setTimeout(ppp, 1000);
	if (counter < 0) clearTimeout(id);
}
ppp();
*/
