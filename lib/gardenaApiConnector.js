"use strict";
const request = require('request');
let adapter;

class gardenaApiConnector{
	
	constructor(inAdapter) {
	}

	setAdapter(inAdapter) {
	  adapter = inAdapter;
	  adapter.log.debug("Class gardenaApiConnector is ready to go");
	};
}

module.exports = gardenaApiConnector;