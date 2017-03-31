var HID = require('node-hid');
var scanner = new HID.HID(1204, 56929);
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
		buffer += String(hex - 0x1d);
		break;
	case 0x27:
		buffer += '0';
		break;
	case 0x28:
		console.log(buffer);
		buffer = '';
		break;
});
