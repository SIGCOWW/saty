'use strict';
var HID = require('node-hid');
var readline = require('readline');

module.exports.scan = function(vid, pid, callback) {
	try {
		var scanner = new HID.HID(vid, pid);

		console.log('Read scanner');
		var buffer = '';
		scanner.on("data", function(data) {
			var hex = data[2];
			switch(hex) {
			case 0x1e:
			case 0x1f:
			case 0x20:
			case 0x21:
			case 0x22:
			case 0x23:
			case 0x24:
			case 0x25:
			case 0x26:
			case 0x27:
				buffer += String((hex - 0x1d) % 10);
				break;
			case 0x28:
				callback(buffer);
				buffer = '';
				break;
			}
		});
	} catch (e) {
		console.log('Read stdin');
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.on('line', function(line) {
			callback(line);
		});
	}
}
