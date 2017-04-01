var fs = require('fs');
var path = require('path');

function formatDate(date) {
	return date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2);
}

function assetsPath(name) {
	return path.join(__dirname, '../assets/'+name)
}

function load() {
	var date = new Date();
	var name = formatDate(new Date());
	if (!fs.existsSync(assetsPath(name) + '.json')) name = 'default';
	return JSON.parse(fs.readFileSync(assetsPath(name) + '.json', 'utf8'));
}

module.exports.getReceiptData = function(isdn) {
	var obj = load()[isdn];

	var seller = null;
	var sellers = fs.readFileSync(assetsPath('sellers.txt'), 'utf8').split(/\r\n|\r|\n/);
	while (1) {
		seller = sellers[Math.floor(Math.random() * sellers.length)].trim();
		if (seller) break;
	}
	obj['seller'] = seller;

	var date = new Date();
	var name = formatDate(date);
	var text = Math.floor(date.getTime() / 1000) + ',' + isdn + ',' + seller + '\n';
	fs.appendFileSync(assetsPath(name + '.log'), text, 'utf-8');

	return obj;
}

module.exports.getDisplayData = function(isdn) {
	var obj = load()[isdn];

	if ('description' in obj) {
		obj['short'] = false;
	} else if ('shortdescription' in obj) {
		obj['short'] = true;
		obj['description'] = obj['shortdescription'];
	} else {
		return null;
	}

	return obj;
}

module.exports.getBookList = function() {
	var objs = load();
	return Object.keys(objs);
}
