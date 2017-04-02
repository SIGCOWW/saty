'use strict';
var ENCODING = 'Shift_JIS';

var iconv = require('iconv-lite');
var db = require('./db');

module.exports = function(PORT) {
	this.PORT = PORT;
	this.books = db.getBookList();

	this.printReceipt = function(obj) {
		console.log(obj);
	}
}
