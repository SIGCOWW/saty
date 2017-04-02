'use strict';
var SCANNER_VID = 1204;
var SCANNER_PID = 56929;
var PRINTER_IPADDR = '192.168.192.168';

var scanner = require('./lib/scanner');
var db = require('./lib/db');
var printer = require('./lib/printer');

console.log(db.getBookList());
scanner.scan(SCANNER_VID, SCANNER_PID, function(isdn) {
	console.log('ISDN', isdn);

	var receipt = db.getReceiptData(isdn);
	printer.printReceipt(receipt, PRINTER_IPADDR);
	db.writeReceiptLog(receipt);

	console.log(db.getDisplayData(isdn));
});
