'use strict';
// @ts-ignore
const WebSocket = require('ws');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const tokenValidInterval = 3550000;

let adapter;
let user;
let passwd;
let appKey;
let grantType;
let accessToken;
let refreshToken;
let userID;
let tokenValidUntil;


class gardenaApiWebSocket{

	constructor() {
	}

	setAdapter(inAdapter) {
		adapter = inAdapter;
		adapter.log.debug('Class gardenaApiConnector is ready to go');
	}

	heartbeat() {
		this.isAlive = true;
	}

	async getAccessToken() {
		adapter.log.debug('getAccessToken function was called');        
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
			await fetch(url,
				{
					method: 'post',
					body: params, 
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'accept': 'application/json'
					},
					// @ts-ignore
					responseType: 'json'
				})
				.then((response) => {
					if(response.status == 200){
						return response.clone().json().catch(() => response.text());
					} else {
						adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
						throw 'Bad Reply from API';
					}
				})
				.then(myData => {
					accessToken = myData.access_token;
					refreshToken = myData.refresh_token;
					userID = myData.user_id;
				
					tokenValidUntil = new Date(new Date().getTime() + tokenValidInterval );
				
					adapter.log.debug('Access Token: ' + accessToken);		
					adapter.log.debug('Refresh Token: ' + refreshToken);		
					adapter.log.debug('UserID: ' + userID);		
					adapter.log.debug('Response: ' + JSON.stringify(myData));	
					adapter.log.debug('Aktuelle Uhrzeit: '+Date() + ' Token Valid Until: ' + tokenValidUntil);	
				});
		} catch(error){
			adapter.log.error('Error: ' + error);
			throw 'Login failed';
		}
	}	

	echoClient(){ 
		const ws = new WebSocket('wss://echo.websocket.org/', {
			origin: 'https://websocket.org'
		});
           
		ws.on('open', function open() {
			adapter.log.debug('connected');
			ws.send(Date.now());
		});
           
		ws.on('close', function close() {
			adapter.log.debug('disconnected');
		});
           
		ws.on('message', function incoming(data) {
			adapter.log.debug(`Roundtrip time: ${Date.now() - data} ms`);
           
			setTimeout(function timeout() {
				ws.send(Date.now());
			}, 500);
		});
	}
   
}

module.exports = gardenaApiWebSocket;