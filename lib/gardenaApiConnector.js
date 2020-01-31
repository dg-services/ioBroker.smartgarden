"use strict";
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
		
let adapter;
let user;
let passwd;
let appKey;
let accessToken;
let refreshToken;
let userID;
	
class gardenaApiConnector{
	
	constructor(inAdapter) {
	}

	setAdapter(inAdapter) {
	  adapter = inAdapter;
	  adapter.log.debug("Class gardenaApiConnector is ready to go");
	}
			
	async getAccessToken() {
		
		adapter.log.debug("getToke3");
		
		user 		 = adapter.config.user;
		passwd 		 = adapter.config.passwd;
		appKey 		 = adapter.config.appKey;
		let grantType 	 = 'password';
		const url = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
		
		adapter.log.debug('config User: ' + user);
		adapter.log.debug('config Password: ' + passwd);
		adapter.log.debug('config AppKey: ' + appKey);
		adapter.log.debug('grantType: ' + grantType);
		  
		const params = new URLSearchParams();
		params.set('client_id', appKey);
		params.set('grant_type', grantType);
		params.set('username', user);
		params.set('password', passwd);

		try{
			const response = await fetch(url,
				{
					method: 'post',
					body: params, 
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'accept': 'application/json'
					},
					responseType: 'json'
				})
			.then((response) => {
				return response.clone().json().catch(() => response.text())
			})
			.then(myData => {
				
				accessToken = myData.access_token;
				refreshToken = myData.refresh_token;
				adapter.log.debug('Access Token: ' + accessToken);		
				adapter.log.debug('Refresh Token: ' + refreshToken);		
				adapter.log.debug('Response 2: ' + JSON.stringify(myData));	
			});
		} catch(error){
				adapter.log.error('Error2: ' + error);
		}
	}			
}

module.exports = gardenaApiConnector;