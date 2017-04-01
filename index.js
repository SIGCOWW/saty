var VID = 1204;
var PID = 56929;
var scanner = require('./lib/scanner');

scanner.scan(VID, PID, function(isdn) {
	console.log(isdn);
});