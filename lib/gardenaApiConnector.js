"use strict";
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const { Headers } = require('node-fetch');
		
let adapter;
let user;
let passwd;
let appKey;
let accessToken;
let refreshToken;
let userID;
let grantType;
	
class gardenaApiConnector{
	
	constructor(inAdapter) {
	}

	setAdapter(inAdapter) {
	  adapter = inAdapter;
	  adapter.log.debug("Class gardenaApiConnector is ready to go");
	}
			
	async getAccessToken() {
		adapter.log.debug("getAccessToken function was called");
		
		user 		 = adapter.config.user;
		passwd 		 = adapter.config.passwd;
		appKey 		 = adapter.config.appKey;
		grantType 	 = 'password';
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
				userID = myData.user_id;
				
				adapter.log.debug('Access Token: ' + accessToken);		
				adapter.log.debug('Refresh Token: ' + refreshToken);		
				adapter.log.debug('UserID: ' + userID);		
				adapter.log.debug('Response: ' + JSON.stringify(myData));	
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
		}
	}			
	
	async refreshToken(){
		adapter.log.debug("refreshToken function was called");

		grantType 	 = 'refresh_token';
	
		const params = new URLSearchParams();
		params.set('grant_type', 'refresh_token');
		params.set('client_id', appKey);
		params.set('refresh_token', refreshToken);

		adapter.log.debug('Client ID: ' + appKey);
		adapter.log.debug('Refresh Token: ' + refreshToken);
		adapter.log.debug('grantType: ' + grantType);
		const url = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
		
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
				adapter.log.debug('Response: ' + JSON.stringify(myData));	
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
		}
	}
	
	async logout() {
		adapter.log.debug("logout function was called");
		
		grantType 	 = 'refresh_token';
	
		const params = new URLSearchParams();
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.authentication.husqvarnagroup.dev/v1/token/'+accessToken;
		
		try{
			const response = await fetch(url,
				{
					method: 'DELETE',
					headers: {
						'X-Api-Key': appKey,
						'Authorization-Provider': 'husqvarna',
						'Content-Type': 'application/x-www-form-urlencoded',
						'accept': 'application/json'
					},
					responseType: 'json'
				})
			.then((response) => {
				if(response.status == '204'){
					adapter.log.debug('Logoff successfull');
					return true;					
				} else {
					adapter.log.debug('Logoff failed');	
					return false;					
				}	
				
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
		}
	}	
	
	
	// curl -X GET \
  // https://api.smart.gardena.dev/v1/locations \
  // -H 'Authorization: Bearer <ACCESS TOKEN>' \
  // -H 'Authorization-Provider: husqvarna' \
  // -H 'X-Api-Key: <APP KEY>'
	
	
	async getLocation() {
		adapter.log.debug("getLocation function was called");
		
		grantType 	 = 'refresh_token';
	
		const params = new URLSearchParams();
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.smart.gardena.dev/v1/locations';
		
		
		var myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'accept': 'application/vnd.api+json'
		};
		
		adapter.log.debug('Headers: ' + JSON.stringify(myHeaders));	
		
		try{
			const response = await fetch(url,
				{
					method: 'GET',
					headers: myHeaders,
					responseType: 'json'
				})
			.then((response) => {
				//adapter.log.debug('Response: ' + response.status);
				return response.clone().json().catch(() => response.text())
			})
			.then(myData => {
				adapter.log.debug('Response: ' + JSON.stringify(myData));	
				adapter.log.debug('Response ID: ' + myData.data[0].id);
				adapter.log.debug('Response Type: ' + myData.data[0].type);
				adapter.log.debug('Response Name: ' + myData.data[0].attributes.name);
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
		}
	}	
	
	
}

module.exports = gardenaApiConnector;