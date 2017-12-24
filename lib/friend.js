'use strict';
var SPI = require('pi-spi');

module.exports = function(PORT) {
	var spi = SPI.initialize(PORT);

	this.raw = function(cmd) {
		var pkts = [];
		cmd.split(/(.{16})/).filter(x=>x).forEach(function(c, i, arr) {
			var len = c.length;
			if ((arr.length - 1) != i) len |= 0x80;
			pkts.push(Buffer.concat([new Buffer([0x10, 0x00, 0x0A, len]), new Buffer(c)]));
		});

		function receive() {
			spi.read(4, function(e, d) {
				var type = d[0]
				var id = d[2] << 8 | d[1];
				var len = d[3] & 0x7f;
				var more = d[3] & 0x80;

				if (type == 0xff || type == 0xfe) return;
				spi.read(len, function(e, d) {
					if (more) receive();
				});
			});
		}

		function send(idx) {
			if (!idx) idx = 0;
			spi.write(pkts[idx], function(e, d) {
				if ((pkts.length - 1) == idx) {
					receive();
				} else {
					send(idx + 1);
				}
			});
		}

		send();
	}

	this.key = function(str) {
		this.raw('AT+BLEKEYBOARD=' + str);
	}
}
