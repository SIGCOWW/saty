var VID = 1204;
var PID = 56929;
var scanner = require('./lib/scanner');
var db = require('./lib/db');

console.log(db.getBookList());
scanner.scan(VID, PID, function(isdn) {
	console.log(isdn);
	console.log(db.getReceiptData(isdn));
	console.log(db.getDisplayData(isdn));
});