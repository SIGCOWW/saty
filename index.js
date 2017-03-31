var HID = require('node-hid');
//console.log(HID.devices());

var scanner = new HID.HID(1204, 56929);
console.log(scanner);

scanner.on("data", function(data) {
	console.log(data);
});
