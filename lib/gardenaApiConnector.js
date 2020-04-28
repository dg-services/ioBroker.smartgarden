"use strict";
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const { Headers } = require('node-fetch');

const tokenValidInterval = 3550000;

let adapter;
let user;
let passwd;
let appKey;
let accessToken;
let refreshToken;
let userID;
let grantType;
let locationID;
let apiLocationID;
let locationName;
let tokenValidUntil;

	
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
				if(response.status == 200){
					return response.clone().json().catch(() => response.text())
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
				if(response.status == 200){
					return response.clone().json().catch(() => response.text())
				} else {
					adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
					throw 'Bad Reply from API';
				}
			})
			.then(myData => {
				
				accessToken = myData.access_token;
				refreshToken = myData.refresh_token;
				tokenValidUntil = new Date(new Date().getTime() + tokenValidInterval );
				
				adapter.log.debug('Access Token: ' + accessToken);		
				adapter.log.debug('Refresh Token: ' + refreshToken);		
				adapter.log.debug('Response: ' + JSON.stringify(myData));	
				adapter.log.debug('Aktuelle Uhrzeit: '+Date() + ' Token Valid Until: ' + tokenValidUntil);	
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
				throw 'Token Refresh failed';
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
				} else {
					adapter.log.debug('Logoff failed' + JSON.stringify(response));	
					throw 'Logoff failed';
				}	
				
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
		}
	}	
	
	
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
				if(response.status == 200){
					return response.clone().json().catch(() => response.text())
				} else {
					adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
					throw 'Bad Reply from API';
				}
				//adapter.log.debug('Response: ' + response.status);
				//return response.clone().json().catch(() => response.text())
			})
			.then(myData => {
				
				apiLocationID = myData.data[0].id;
				locationID = apiLocationID;
				locationName = myData.data[0].attributes.name;
				var locationType = myData.data[0].type;
				
				//adapter.log.debug('Response: ' + JSON.stringify(myData));	
				adapter.log.debug('Location ID: ' + locationID);
				adapter.log.debug('Location Type: ' + locationType);
				adapter.log.debug('Location Name: ' + locationName);
				
				// create Channel locationID
				adapter.setObjectNotExists('OrtDesVerbrechens', {
					type: 'meta',
					role: '',
					common: {
						name: 'Location: ' + locationName
					},
					native: {'id': myData.data[0].id}
				});		
		
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
				throw 'getLocation failed';
		}
	}	
	
	async getDevices() {
		adapter.log.debug("getDevices function was called");
		
		if (new Date() > tokenValidUntil){
			adapter.log.debug('Need to refresh token');	
			this.refreshToken();
		}
		
		grantType 	 = 'refresh_token';
		const params = new URLSearchParams();
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.smart.gardena.dev/v1/locations/'+apiLocationID;
		
		
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
				if(response.status == 200){
					return response.clone().json().catch(() => response.text())
				} else {
					adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
					throw 'Bad Reply from API';
				}
				//adapter.log.debug('Response: ' + response.status);
				//return response.clone().json().catch(() => response.text())
			})
			.then(myData => {
				adapter.log.debug('Response: ' + JSON.stringify(myData));
						
				
				for (var key in myData.data.relationships.devices.data) {
					
					var obj = myData.data.relationships.devices.data[key];
					adapter.log.debug('Prozessing "Relationship "' + obj.id);
					
					var deviceID = obj.id;
					var deviceType = obj.type;
					var deviceName = "N.A.";
					
					// Default "type" ist "device"
					var devType = 'device';
					
					
					// Falls es eine Cascade gibt, wird der "type" auf "folder" gesetzt
					//for (var key in myData.included[0].relationships.services.data) {
						//var obj = myData.included[0].relationships.services.data[key];
					for (var key in myData.included) {
						var obj = myData.included[key];
						var loopID = obj.id
						adapter.log.debug('deviceID: "' + deviceID + ' loopDeviceID: ' + loopID );					
						if (loopID.includes(deviceID)){
							adapter.log.debug('Treffer' );					
							//devType = 'folder';
							devType = 'device';
						}
						
						if(obj.type == 'COMMON' && loopID.includes(deviceID)){
							deviceName = obj.attributes.modelType.value;
						}                 
					}
					
					// create folder DeviceID
					adapter.setObjectNotExists(locationID + '.' + deviceID, {
						type: devType,
						role: '',
						common: {
							name: 'Device: ' + deviceName 
						},
						native: {}
					});		
				}

				for (var key in myData.included) {
					var obj = myData.included[key];
					
					var deviceType = obj.type;
					
					switch (deviceType){
						case 'DEVICE': 
							adapter.log.debug('Prozessing "DEVICE"');
							break;
						case 'VALVE_SET': 
							adapter.log.debug('Prozessing "VALVE_SET"');
							break;
						case 'VALVE': 
							adapter.log.debug('Prozessing "VALVE"');
					
							if(String(obj.attributes.state.value) == 'UNAVAILABLE'){
								//Verarbeitung abbrechen, da Ventil nicht am System
								break;
							}
							//create tree object for single valve
							var deviceID = obj.id
							var deviceTyp = obj.type
							var modDeviceID = deviceID.replace(/:/i, ".");
							
							adapter.setObjectNotExists(locationID + '.' + modDeviceID, {
								type: 'channel',
								role: '',
								common: {
									name: 'Device: Ventil: ' + String(obj.attributes.name.value)
								},
								native: {}
							});	
			
							// create tree object name
							adapter.setObjectNotExists(locationID + '.' + modDeviceID + '.name', {
								type: 'state',
								common: {name: 'Device name', desc: 'Device name', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + modDeviceID + '.name', { val: String(obj.attributes.name.value), ack: true });
						
							// create tree object activity
							adapter.setObjectNotExists(locationID + '.' + modDeviceID + '.Activity', {
								type: 'state',
								common: {name: 'Device Activity', desc: 'Device Activity', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + modDeviceID + '.Activity', { val: String(obj.attributes.activity.value), ack: true });
							
							// create tree object deviceState
							adapter.setObjectNotExists(locationID + '.' + modDeviceID + '.State', {
								type: 'state',
								common: {name: 'Device State', desc: 'Device Styte', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + modDeviceID + '.State', { val: String(obj.attributes.state.value), ack: true });
							
							//create tree object LastErrorCode
							adapter.setObjectNotExists(locationID + '.' + modDeviceID + '.LastErrorCode', {
								type: 'state',
								common: {name: 'Device LastErrorCode', desc: 'Device LastErrorCode', type: 'string', read: true, write: true, role: 'text', states: {'START_SECONDS_TO_OVERRIDE':'START_SECONDS_TO_OVERRIDE', 'START_DONT_OVERRIDE':'START_DONT_OVERRIDE', 'PARK_UNTIL_NEXT_TASK':'PARK_UNTIL_NEXT_TASK','PARK_UNTIL_FURTHER_NOTICE':'PARK_UNTIL_FURTHER_NOTICE'}},
								native: {}
							});
							adapter.setState(locationID + '.' + modDeviceID + '.LastErrorCode', { val: String(obj.attributes.lastErrorCode.value), ack: true });
							break;
						case 'MOWER': 
							var deviceID = obj.id
							adapter.log.debug('Prozessing "MOWER"');
							// create tree object deviceState
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.State', {
								type: 'state',
								common: {name: 'Device State', desc: 'Device Styte', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.State', { val: String(obj.attributes.state.value), ack: true });
							
							// create tree object deviceState
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.Activity', {
								type: 'state',
								common: {name: 'Device Activity', desc: 'Device Activity', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.Activity', { val: String(obj.attributes.activity.value), ack: true });
							
							//	create tree object LastErrorCode
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.LastErrorCode', {
									type: 'state',
									common: {name: 'Device LastErrorCode', desc: 'Device LastErrorCode', type: 'string', read: true, write: true, role: 'text', states: {'START_SECONDS_TO_OVERRIDE':'START_SECONDS_TO_OVERRIDE', 'START_DONT_OVERRIDE':'START_DONT_OVERRIDE', 'PARK_UNTIL_NEXT_TASK':'PARK_UNTIL_NEXT_TASK','PARK_UNTIL_FURTHER_NOTICE':'PARK_UNTIL_FURTHER_NOTICE'}},
									native: {}
								});
								
							if(typeof obj.attributes.lastErrorCode != 'undefined'  ){
								adapter.log.debug('ErrorCode existiert');
								adapter.setState(locationID + '.' + deviceID + '.LastErrorCode', { val: String(obj.attributes.lastErrorCode.value), ack: true });
							} else {
								adapter.setState(locationID + '.' + deviceID + '.LastErrorCode', { val: 'NONE', ack: true });
							}
							// create tree object operatingHours
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.operatingHours', {
								type: 'state',
								common: {name: 'Device operatingHours in hours', desc: 'Device operatingHours', type: 'number', read: true, write: false, role: 'value'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.operatingHours', { val: Number.parseInt(obj.attributes.operatingHours.value), ack: true });
							break;
						case 'COMMON':	
						    var deviceID = obj.id
							adapter.log.debug('Prozessing "COMMON"');
							// create tree object modelType
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.modelType', {
								type: 'state',
								common: {name: 'Device model type', desc: 'Device model type', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.modelType', { val: String(obj.attributes.modelType.value), ack: true });
						
							// create tree object name
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.name', {
								type: 'state',
								common: {name: 'Device name', desc: 'Device name', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.name', { val: String(obj.attributes.name.value), ack: true });
						
							// create tree object batteryState
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.batteryState', {
								type: 'state',
								common: {name: 'Device battery state', desc: 'Device battery state', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.batteryState', { val: String(obj.attributes.batteryState.value), ack: true });
						
							// Batteriestatus nur wenn das Gerät auch eine Batterie hat
							if (String(obj.attributes.batteryState.value) != 'NO_BATTERY'){ 
								// create tree object batteryLevel
									adapter.setObjectNotExists(locationID + '.' + deviceID + '.batteryLevel', {
										type: 'state',
										common: {name: 'Device battery level in %', desc: 'Device battery level', type: 'number', read: true, write: false, role: 'level'},
										native: {}
									});
									adapter.setState(locationID + '.' + deviceID + '.batteryLevel', { val: Number.parseInt(obj.attributes.batteryLevel.value), ack: true });
							}
						
							// create tree object rfLinkLevel
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.rfLinkLevel', {
								type: 'state',
								common: {name: 'Device rf link level', desc: 'Device rf link level', type: 'number', read: true, write: false, role: 'level'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.rfLinkLevel', { val: Number.parseInt(obj.attributes.rfLinkLevel.value), ack: true });

							// create tree object rfLinkState
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.rfLinkState', {
								type: 'state',
								common: {name: 'Device rf link state', desc: 'Device rf link state', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.rfLinkState', { val: String(obj.attributes.rfLinkState.value), ack: true });

							// create tree object serial
							adapter.setObjectNotExists(locationID + '.' + deviceID + '.deviceSerial', {
								type: 'state',
								common: {name: 'Device serial', desc: 'Device serial', type: 'string', read: true, write: false, role: 'text'},
								native: {}
							});
							adapter.setState(locationID + '.' + deviceID + '.deviceSerial', { val: String(obj.attributes.serial.value), ack: true });													
							break;
						default: 
							adapter.log.debug('Prozessing "default"');
							adapter.log.error('Unknown Device Type '+deviceType+' <skipp processing>');
							break;
					}
				}	
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
				throw 'getDevices failed';
		}
	}	
		
	async execCommand(serviceID) {
		adapter.log.debug("execCommand  222 function was called");
		
		const params = new URLSearchParams();
		const url = 'https://api.smart.gardena.dev/v1/command/'+serviceID;
		
		var myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'Content-Type': 'application/vnd.api+json',
		};
	
		var myID = Math.floor(Math.random() * 100);
		
		var myData = {'data': {
				'type': 'MOWER_CONTROL', 
				'id': 'request-'+myID, 
				'attributes': {
					'command': 'PARK_UNTIL_NEXT_TASK',
					'seconds': 3600
				}
			}
		};
		
		// var myData = {'type': 'MOWER_CONTROL', 
						// 'id': 'request-'+myID, 
						// 'attributes': {
							// 'command': 'PARK_UNTIL_NEXT_TASK',
							// 'seconds': 3600
					// }
		// };
		
		// params.set('data[]', myData);
		
		adapter.log.debug('Url: ' + url );
		adapter.log.debug('Header: ' + JSON.stringify(myHeaders) );
		adapter.log.debug('Data: ' + JSON.stringify(myData) );
		
		try{
			const response = await fetch(url,
				{
					method: 'PUT',
					headers: myHeaders,
					body: JSON.stringify(myData),
					responseType: 'json'
				})
			.then((response) => {
				if(response.status == 200){
					return response.clone().json().catch(() => response.text())
				} else {
					adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
					throw 'Bad Reply from API';
				}
				//adapter.log.debug('Response: ' + response.status);
				//return response.clone().json().catch(() => response.text())
			})
			.then(myData => {
				adapter.log.debug('Response: ' + JSON.stringify(myData));
			});
		} catch(error){
				adapter.log.error('Error: ' + error);
				throw 'execCommand failed';
		}
	}	
	
	
}

module.exports = gardenaApiConnector;