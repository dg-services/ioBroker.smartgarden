'use strict';
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const WebSocket = require('ws');

const tokenValidInterval = 3550000;

const lastErrorCodeStates = {
	'START_SECONDS_TO_OVERRIDE':'START_SECONDS_TO_OVERRIDE', 
	'START_DONT_OVERRIDE':'START_DONT_OVERRIDE',
	'PARK_UNTIL_NEXT_TASK':'PARK_UNTIL_NEXT_TASK',
	'PARK_UNTIL_FURTHER_NOTICE':'PARK_UNTIL_FURTHER_NOTICE'
};

const activityCodeStates = {
	'CLOSED': 'CLOSED', 
	'MANUAL_WATERING': 'MANUAL_WATERING',
	'SCHEDULED_WATERING': 'SCHEDULED_WATERING'
};

const stateCodeStates = {
	'OK':'OK', 
	'WARNING':'WARNING',
	'ERROR':'ERROR',
	'UNAVAILABLE':'UNAVAILABLE'
};

const activityMowerStates =  {
	'PAUSED':'PAUSED', 
	'OK_CUTTING':'OK_CUTTING',
	'OK_CUTTING_TIMER_OVERRIDDEN':'OK_CUTTING_TIMER_OVERRIDDEN',
	'OK_SEARCHING':'OK_SEARCHING',
	'OK_LEAVING':'OK_LEAVING',
	'OK_CHARGING':'OK_CHARGING',
	'PARKED_TIMER':'PARKED_TIMER',
	'PARKED_PARK_SELECTED':'PARKED_PARK_SELECTED',
	'PARKED_AUTOTIMER':'PARKED_AUTOTIMER',
	'NONE':'NONE'
};

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
let webSocketUrl;

// create tree object name
function createIobrokerStateText(stateID, stateDeviceName, stateDeviceDesc, stateDeviceValue, stateRole, stateWriteable, statePossibleValues){
	adapter.setObjectNotExists(stateID + '.' + stateDeviceName, {
		type: 'state',
		common: {name: stateDeviceDesc, 
			desc: stateDeviceDesc, 
			type: 'string', 
			read: true, 
			write: stateWriteable, 
			role: stateRole, 
			states: statePossibleValues
		},
		native: {}
	});
	adapter.setState(stateID + '.' + stateDeviceName, { val: stateDeviceValue, ack: true });
}

//Process WebSocket recieving data
function processData(dataToProcess){
	adapter.log.debug('function processData: ' + dataToProcess);			

	let detailDeviceID = '';
	let modDeviceID = '';

	switch(dataToProcess.type){
		case 'LOCATION':
			adapter.log.debug('function processData: Found LOCATION skip');			
			break;

		case 'DEVICE':
			adapter.log.debug('function processData: Found DEVICE skip');			
			break;

		case 'VALVE_SET':
			adapter.log.debug('function processData: Found VALVE_SET skip');			
			break;

		case 'VALVE':
			adapter.log.debug('function processData: Found VALVE process');			
			if(String(dataToProcess.attributes.state.value) == 'UNAVAILABLE'){
				//Verarbeitung abbrechen, da Ventil nicht am System
				break;
			}
			detailDeviceID = dataToProcess.id;
			modDeviceID = detailDeviceID.replace(/:/i, '.');
					
			adapter.setObjectNotExists(locationID + '.' + modDeviceID, {
				type: 'channel',
				role: '',
				common: {
					name: 'Device: Ventil: ' + String(dataToProcess.attributes.name.value)
				},
				native: {}
			});	

			createIobrokerStateText(locationID + '.' + modDeviceID, 'Name', 'Device Name', String(dataToProcess.attributes.name.value), 'text', false);
			createIobrokerStateText(locationID + '.' + modDeviceID, 'Activity', 'Device Activity', String(dataToProcess.attributes.activity.value), 'text', false, activityCodeStates);	
			createIobrokerStateText(locationID + '.' + modDeviceID, 'State', 'Device State', String(dataToProcess.attributes.state.value), 'text', false, stateCodeStates);
			createIobrokerStateText(locationID + '.' + modDeviceID, 'LastErrorCode', 'Device LastErrorCode', String(dataToProcess.attributes.lastErrorCode.value), 'text', false, lastErrorCodeStates);
			break;

		case 'MOWER':
			detailDeviceID = dataToProcess.id;
			adapter.log.debug('function processData: Found MOWER process');			

			createIobrokerStateText(locationID + '.' + detailDeviceID, 'State', 'Device State',String(dataToProcess.attributes.state.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'Activity', 'Device Activity', String(dataToProcess.attributes.activity.value), 'text', true, activityMowerStates);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'operatingHours', 'Device operatingHours in hours', Number.parseInt(dataToProcess.attributes.operatingHours.value), 'value', false);

			if(typeof dataToProcess.attributes.lastErrorCode != 'undefined'  ){
				createIobrokerStateText(locationID + '.' + detailDeviceID, 'LastErrorCode', 'Device LastErrorCode', String(dataToProcess.attributes.lastErrorCode.value), 'text', false);
			} else {
				createIobrokerStateText(locationID + '.' + detailDeviceID, 'LastErrorCode', 'Device LastErrorCode', 'NONE', 'text', false);
			}
			break;
		case 'COMMON':	
			detailDeviceID = dataToProcess.id;
			adapter.log.debug('function processData: Found COMMON process');			
			
			adapter.setObjectNotExists(locationID + '.' + detailDeviceID, {
				type: 'device',
				role: '',
				common: {
					// @ts-ignore
					name: `Device: ${dataToProcess.attributes.modelType.value}` 
				},
				native: {}
			});	

			createIobrokerStateText(locationID + '.' + detailDeviceID, 'ModelType', 'Device Model Type', String(dataToProcess.attributes.modelType.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'Name', 'Device Name', String(dataToProcess.attributes.name.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'BatteryState', 'Device Battery State', String(dataToProcess.attributes.batteryState.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'RfLinkLevel', 'Device RF Link Level', String(dataToProcess.attributes.rfLinkLevel.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'RfLinkState', 'Device RF Link State', String(dataToProcess.attributes.rfLinkState.value), 'text', false);
			createIobrokerStateText(locationID + '.' + detailDeviceID, 'DeviceSerial', 'Device Serial', String(dataToProcess.attributes.serial.value), 'text', false);
			// Batteriestatus nur wenn das Gerät auch eine Batterie hat
			if (String(dataToProcess.attributes.batteryState.value) != 'NO_BATTERY'){ 
				createIobrokerStateText(locationID + '.' + detailDeviceID, 'BatteryLevel', 'Device Battery Level %', String(dataToProcess.attributes.batteryLevel.value), 'text', false);	
			}
			break;

		default: 
			adapter.log.debug('function processData: Unkown TYPE');		
			break;	
	}

	return;
}


class gardenaApiConnector{
	
	constructor() {
	}

	setAdapter(inAdapter) {
		adapter = inAdapter;
		adapter.log.debug('Class gardenaApiConnector is ready to go');
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
	
	async refreshToken(){
		adapter.log.debug('refreshToken function was called');

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
			await fetch(url,
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
						return response.clone().json().catch(() => response.text());
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
		adapter.log.debug('logout function was called');
		
		grantType 	 = 'refresh_token';
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.authentication.husqvarnagroup.dev/v1/token/'+accessToken;
		
		try{
			await fetch(url,
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
		adapter.log.debug('getLocation function was called');
	
		grantType 	 = 'refresh_token';
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.smart.gardena.dev/v1/locations';
		
		
		const myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'accept': 'application/vnd.api+json'
		};
		
		adapter.log.debug('Headers: ' + JSON.stringify(myHeaders));	
		
		try{
			await fetch(url,
				{
					method: 'GET',
					headers: myHeaders,
					responseType: 'json'
				})
				.then((response) => {
					if(response.status == 200){
						return response.clone().json().catch(() => response.text());
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
					const locationType = myData.data[0].type;
				
					//adapter.log.debug('Response: ' + JSON.stringify(myData));	
					adapter.log.debug('Location ID: ' + locationID);
					adapter.log.debug('Location Type: ' + locationType);
					adapter.log.debug('Location Name: ' + locationName);
				
					// create Channel locationID
					adapter.setObjectNotExists('OrtDesVerbrechens', {
						type: 'instance',
						role: '',
						common: {
							name: `Location: ${locationName}`,  desc: `Location: ${locationName}`
						},
						native: {'id': myData.data[0].id}
					});		
		
				});
		} catch(error){
			adapter.log.error('Error: ' + error);
			throw 'getLocation failed';
		}
	}	
	
	// getDevicesWebService wird aktuell nicht benutzt. Statdessen läuft die Kommunikation über den WebSocket
	async getDevicesWebService() {
		adapter.log.debug('getDevices function was called');
		
		if (new Date() > tokenValidUntil){
			adapter.log.debug('Need to refresh token');	
			this.refreshToken();
		}
		
		grantType 	 = 'refresh_token';
				
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.smart.gardena.dev/v1/locations/'+apiLocationID;
		
		
		const myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'accept': 'application/vnd.api+json'
		};
		
		adapter.log.debug('Headers: ' + JSON.stringify(myHeaders));	
		
		try{
			await fetch(url,
				{
					method: 'GET',
					headers: myHeaders,
					responseType: 'json'
				})
				.then((response) => {
					if(response.status == 200){
						return response.clone().json().catch(() => response.text());
					} else {
						adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
						throw 'Bad Reply from API';
					}
				//adapter.log.debug('Response: ' + response.status);
				//return response.clone().json().catch(() => response.text())
				})
				.then(myData => {
					adapter.log.debug('Response: ' + JSON.stringify(myData));
						
				
					for (const key in myData.data.relationships.devices.data) {
					
						const obj = myData.data.relationships.devices.data[key];
						adapter.log.debug('Prozessing "Relationship "' + obj.id);
					
						const deviceID = obj.id;
						let deviceName = 'N.A.';
					
						// Default "type" ist "device"
						let devType = 'device';
					
					
						// Falls es eine Cascade gibt, wird der "type" auf "folder" gesetzt
						for (const key1 in myData.included) {
							const obj = myData.included[key1];
							const loopID = obj.id;
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
								name: `Device: ${deviceName}` 
							},
							native: {}
						});		
					}

					
					for (const key in myData.included) {
						const obj = myData.included[key];
						const deviceType = obj.type;
						
						let detailDeviceID = '';
						let modDeviceID = '';

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
								detailDeviceID = obj.id;
								modDeviceID = detailDeviceID.replace(/:/i, '.');
							
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
								detailDeviceID = obj.id;
								adapter.log.debug('Prozessing "MOWER"');
								// create tree object deviceState
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.State', {
									type: 'state',
									common: {name: 'Device State', desc: 'Device Styte', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.State', { val: String(obj.attributes.state.value), ack: true });
							
								// create tree object deviceState
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.Activity', {
									type: 'state',
									common: {name: 'Device Activity', desc: 'Device Activity', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.Activity', { val: String(obj.attributes.activity.value), ack: true });
							
								//	create tree object LastErrorCode
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.LastErrorCode', {
									type: 'state',
									common: {name: 'Device LastErrorCode', desc: 'Device LastErrorCode', type: 'string', read: true, write: true, role: 'text', states: {'START_SECONDS_TO_OVERRIDE':'START_SECONDS_TO_OVERRIDE', 'START_DONT_OVERRIDE':'START_DONT_OVERRIDE', 'PARK_UNTIL_NEXT_TASK':'PARK_UNTIL_NEXT_TASK','PARK_UNTIL_FURTHER_NOTICE':'PARK_UNTIL_FURTHER_NOTICE'}},
									native: {}
								});
								
								if(typeof obj.attributes.lastErrorCode != 'undefined'  ){
									adapter.log.debug('ErrorCode existiert');
									adapter.setState(locationID + '.' + detailDeviceID + '.LastErrorCode', { val: String(obj.attributes.lastErrorCode.value), ack: true });
								} else {
									adapter.setState(locationID + '.' + detailDeviceID + '.LastErrorCode', { val: 'NONE', ack: true });
								}
								// create tree object operatingHours
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.operatingHours', {
									type: 'state',
									common: {name: 'Device operatingHours in hours', desc: 'Device operatingHours', type: 'number', read: true, write: false, role: 'value'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.operatingHours', { val: Number.parseInt(obj.attributes.operatingHours.value), ack: true });
								break;
							case 'COMMON':	
								detailDeviceID = obj.id;
								adapter.log.debug('Prozessing "COMMON"');
								// create tree object modelType
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.modelType', {
									type: 'state',
									common: {name: 'Device model type', desc: 'Device model type', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.modelType', { val: String(obj.attributes.modelType.value), ack: true });
						
								// create tree object name
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.name', {
									type: 'state',
									common: {name: 'Device name', desc: 'Device name', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.name', { val: String(obj.attributes.name.value), ack: true });
						
								// create tree object batteryState
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.batteryState', {
									type: 'state',
									common: {name: 'Device battery state', desc: 'Device battery state', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.batteryState', { val: String(obj.attributes.batteryState.value), ack: true });
						
								// Batteriestatus nur wenn das Gerät auch eine Batterie hat
								if (String(obj.attributes.batteryState.value) != 'NO_BATTERY'){ 
								// create tree object batteryLevel
									adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.batteryLevel', {
										type: 'state',
										common: {name: 'Device battery level in %', desc: 'Device battery level', type: 'number', read: true, write: false, role: 'level'},
										native: {}
									});
									adapter.setState(locationID + '.' + detailDeviceID + '.batteryLevel', { val: Number.parseInt(obj.attributes.batteryLevel.value), ack: true });
								}
						
								// create tree object rfLinkLevel
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.rfLinkLevel', {
									type: 'state',
									common: {name: 'Device rf link level', desc: 'Device rf link level', type: 'number', read: true, write: false, role: 'level'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.rfLinkLevel', { val: Number.parseInt(obj.attributes.rfLinkLevel.value), ack: true });

								// create tree object rfLinkState
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.rfLinkState', {
									type: 'state',
									common: {name: 'Device rf link state', desc: 'Device rf link state', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.rfLinkState', { val: String(obj.attributes.rfLinkState.value), ack: true });

								// create tree object serial
								adapter.setObjectNotExists(locationID + '.' + detailDeviceID + '.deviceSerial', {
									type: 'state',
									common: {name: 'Device serial', desc: 'Device serial', type: 'string', read: true, write: false, role: 'text'},
									native: {}
								});
								adapter.setState(locationID + '.' + detailDeviceID + '.deviceSerial', { val: String(obj.attributes.serial.value), ack: true });													
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
		adapter.log.debug('execCommand  222 function was called');
		
		const url = 'https://api.smart.gardena.dev/v1/command/'+serviceID;
		
		const myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'Content-Type': 'application/vnd.api+json',
		};
	
		const myID = Math.floor(Math.random() * 100);
		
		const myData = {'data': {
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
			await fetch(url,
				{
					method: 'PUT',
					headers: myHeaders,
					body: JSON.stringify(myData),
					responseType: 'json'
				})
				.then((response) => {
					if(response.status == 200){
						return response.clone().json().catch(() => response.text());
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

	async getWebSocketInfo() {
		adapter.log.debug('getWebSocketInfo function was called');
	
		adapter.log.debug('Client ID: ' + userID);
		adapter.log.debug('Access Token: ' + accessToken);
		const url = 'https://api.smart.gardena.dev/v1/websocket';
		
		const myData = {
			'data': {
				'type': 'WEBSOCKET', 
				'id': 'request-123', 
				'attributes': {
					'locationId': locationID
				}
			}
		};

		const myHeaders = {
			'Authorization': 'Bearer '+accessToken,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': appKey,
			'Content-Type': 'application/vnd.api+json',
		};

		try{
			await fetch(url,
				{
					method: 'POST',
					headers: myHeaders,
					body: JSON.stringify(myData),
					responseType: 'json'
				})
				.then((response) => {
					if(response.status == 201){
						return response.clone().json().catch(() => response.text());
					} else {
						adapter.log.error('Response Status '+ response.status + ' '+ response.statusText );
						throw 'Bad Reply from API';
					}
				//adapter.log.debug('Response: ' + response.status);
				//return response.clone().json().catch(() => response.text())
				})
				.then(myData => {
					webSocketUrl = myData.data.attributes.url;
					adapter.log.debug('Url: ' + webSocketUrl);
				});
		} catch(error){
			adapter.log.error('Error: ' + error);
			throw 'getLocation failed';
		}
	}	

	async getWebsocket(){ 
		const ws = new WebSocket(webSocketUrl, {
			origin: 'https://api.smart.gardena.dev'
		});
           
		ws.on('open', function open() {
			adapter.log.info('GardenaWebsocket connected');
			//ws.send(Date.now());
		});
           
		ws.on('close', function close() {
			adapter.log.error('GardenaWebsocket disconnected');
		});
           
		ws.on('message', function incoming(data) {
			adapter.log.debug('Erhaltene Daten' + data);
			processData(JSON.parse(data));
			
			setTimeout(function timeout() {
				ws.send(Date.now());
			}, 150);
		});
	}
}

module.exports = gardenaApiConnector;