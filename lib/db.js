'use strict';
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

function getBookList() {
	var objs = load();
	return Object.keys(objs).filter(function(v) {
		return v != "header";
	}) || [];
}


module.exports.assetsPath = assetsPath;
module.exports.getBookList = getBookList;
module.exports.header = function () { return load()['header'] || '' };

module.exports.getReceiptData = function(isdn) {
	var obj = load()[isdn];

	var seller = null;
	var sellers = fs.readFileSync(assetsPath('sellers.txt'), 'utf8').split(/\r\n|\r|\n/);
	while (1) {
		seller = sellers[Math.floor(Math.random() * sellers.length)].trim();
		if (seller) break;
	}

	obj['seller'] = seller;
	obj['isdn'] = isdn;
	obj['date'] = new Date();
	return obj;
}

module.exports.writeReceiptLog = function(obj) {
	var name = formatDate(obj['date']);
	var text = Math.floor(obj['date'].getTime() / 1000) + ',' + obj['isdn'] + ',' + obj['seller'] + '\n';
	fs.appendFileSync(assetsPath(name + '.log'), text, 'utf-8');
}

module.exports.getReceiptLog = function(date) {
	var name = formatDate(date);
	if (!fs.existsSync(assetsPath(name + '.log'))) return null;
	var lines = fs.readFileSync(assetsPath(name + '.log'), 'utf8').split(/\r\n|\r|\n/);

	var sales = {};
	for (var i=0; i<lines.length; i++) {
		var tmp = lines[i].split(',');
		if (tmp.length !== 3) continue;
		if (!(tmp[1] in sales)) sales[tmp[1]] = 0;
		sales[tmp[1]] += 1;
	}

	return sales;
}

module.exports.getDisplayMessage = function() {
	var messages = [];
	var books = getBookList();

	for (var i=0; i<books.length; i++) {
		var data = load()[books[i]];
		if ('description' in data) {
			data['isshort'] = false;
		} else if ('shortdescription' in data) {
			data['isshort'] = true;
			data['description'] = data['shortdescription'];
		} else {
			continue;
		}

		var obj = {
			'type': data['isnew'] ? '新　　刊' : '既　　刊',
			'title': data['title'],
			'label': data['isnew'] ? data['title'] : data['event'],
			'short': data['isshort']
		};

		if (data['isshort']) {
			obj['msg'] = data['description'].join('\r\n');
			messages.push(obj);
			continue;
		}

		for (var j=0; j<data['description'].length; j++) {
			var copy = JSON.parse(JSON.stringify(obj));
			copy['msg'] = [ data['description'][j]['title'] ];
			copy['msg'].push(data['description'][j]['author'] + ' 著');
			copy['msg'].push(data['description'][j]['text']);
			messages.push(copy);
		}
	}

	return messages;
}
