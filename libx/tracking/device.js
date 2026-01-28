
const fs 							= require('node:fs');
const decompress 			= require('decompress');
const { DeviceEntity } 	= require('../entities/device.entity.js');
const { bytesToState, bytesToStates, stateToBytes, statesToBytes, trackToBytes, tracksToBytes, bytesToTrack, bytesToTracks } = require("atx-bconverter");
//const { EncoderDevice } 	= require('../encoderdevice.js');
const { Track }   		= require("./track.js");
const { StatesRecordEntity } = require('../entities/statesrecord.entity.js');
const { TracksEntity } = require('../entities/tracks.entity.js');

const HISTORY_MAX_TIME    = 86400000*5;
const TRACKS_MAX_TIME     = 57600000*5;
function formatValue(value, bytetype){
	if (bytetype == 0 || bytetype == 1 || bytetype == 6 || bytetype == 7 ){
			return isNaN(value)?0:parseInt(value);
		} else if (bytetype == 2){
			return isNaN(value)?0:parseFloat(value);
		} else if (bytetype == 3 || bytetype == 4 || bytetype == 5 ){
			return value;
		} else if (bytetype == 8){
			return value=='true';
		} else
			return value;
}
class Device {    
	constructor(){
		this.id 						= '0';
		this.uid						= 0;
		this.type						= 'apk'; //'app' 'gps' 'mei'
		this.brand 					= '0';
		this.model 					= '0';
		this.enabled				= true;
		this.elapsed				= 0;
		this.lasttime				= Date.now();
		this.socket					= null;
		this.notifications 	= [];
		this.tracks 				= []; 
		this.tracksRecords  = [];
		this.tracksHistory  = [];
		this.last						= {};
		this.states 				= {};
		this.statesRecords  = [];
		this.stateOffset 		= -1;
		this.trackOffset 		= -1;
		this.statesRecOffset	= Math.round(Date.now()/1000);
		this.tracksRecOffset	= Math.round(Date.now()/1000);
		this.setup 					= {};
		this.extra					= {};
		this.config 				= {};
		this.apps           = [];
		this.lastAppend     = -1;
		this.appsHistory    = [];
		this.needUpdate			= false;
		this.configUpdated	= false;
		this.trackUpdated		= false;
		this.lastUpdated		= false;
		this.stateUpdated		= false;
		this.setupUpdated		= false;
		this.appsUpdated  	= false;
		this.route					= {};
		this.personal				= {};		
		this.isDeleted			= false;
		this.isCleared			= false;
		this.isSorted				= false;
		this.endedTrack     = false;
		this.endedSession   = false;
		this.startedSession = false;
		this.connected			= true;
		this.gpsspec				= null;
		this.request        = [];
		this.events         = {
				getLast : [],
		};
	}
	
	setType(type){
		this.type = type;
	}
	setGpsSpec(gpsspec){
		this.gpsspec = gpsspec;
	}
	getGpsSpec(){
		return this.gpsspec;
	}
	setTcp(socket){
		this.socket = socket;
		socket['deviceId'] = this.id;
	}
	getTcp(){
		return this.socket;
	}
	sendTcp(msg){
		if (this.socket==null){ console.error("error","no socket"); return; }
		//Cuidado aca si no se cierra el socket
		console.log("device.sendTcp",msg);
		this.socket.write(Buffer.from(msg));
		this.socket.pipe(this.socket);
	}

	processPendientRequest() {
		//console.log("process pendients");
		if (this.setupUpdated) return;
		this.request.forEach((request, i) => {
			//console.log("process pendient " + i);
			if (request.active)
				request.process(Date.now() - request.time);
			request.active = false;
		});
		this.request = [];
	}
	addRequest(request) {
		//console.log("request added");
		setTimeout(() => {
			//console.log("setTimeout check");
			if (request.active) {
				request.active = false;
				request.processTimeout();
				//console.log("setTimeout active ended");
				this.request.splice(this.request.indexOf(request), 1);
			}
		}, request.timeout);
		this.request.push(request);
	}
	recordTrack(time,track) {
		this.tracksRecords.push({
			t: Math.round(time/1000),
			lat: track.lat,
			lon: track.lon,
			bat: track.bat,
			acc: track.acc,
			stp: track.stp,
		});
		this.tracksRecords.sort((a,b)=> a.t-b.t );
	}
	recordStates(time, states, statesDB) {
		const self = this;
		const chunk={
			t: Math.round(time/1000),
			states:[],
		}
		Object.keys(states).forEach(name=>{
			const state = statesDB.find(s=>s.name===name);
			if (state==undefined) return;
			console.log("self.states[name] == states[name]",self.states[name], "==", states[name]);
			if (self.states[name] == states[name]) return;
			chunk.states.push({
					state: state.id,
					type: state.bytetype,
					value: formatValue(states[name],state.bytetype)
				});
		});	
		if (time!=undefined && chunk.states.length>0)
			this.statesRecords.push(chunk);
		
		this.statesRecords.sort((a,b)=> a.t-b.t );
		//console.log("recordState",chunk);
	}
	getStatesRecords() {
		return this.statesRecords;
	}
	getTracksRecords() {
		return this.tracksRecords;
	}
	getStatesRecordsCurrent() {
		const currentRecords = this.statesRecords.filter(s=>s.t > this.statesRecOffset);
		return currentRecords;
	}
	getTracksRecordsCurrent() {
		const currentRecords = this.tracksRecords.filter(s=>s.t > this.tracksRecOffset);
		return currentRecords;
	}
	getStatesRecordsBytes() {
		return statesToBytes(this.statesRecords);
	}
	getTracksRecordsBytes() {
		return tracksToBytes(this.tracksRecords);
	}
	getStatesRecordsBytesCurrent() {
		const currentRecords = this.statesRecords.filter(s=>s.t > this.statesRecOffset);
		return statesToBytes(currentRecords);
	}
	getTracksRecordsBytesCurrent() {
		const currentRecords = this.tracksRecords.filter(s=>s.t > this.tracksRecOffset);
		return tracksToBytes(currentRecords);
	}
	//TREBOL-45 Agregar tiempo de retención de datos de servidor
	createRecords(tracks) {
		this.records.push({
			date: Date.now(),
			track: track,
		});
	}
	haveStates() {
		if (Object.keys(this.states).length > 0) return true;
		return false;
	}
	haveConfig() {
		if (Object.keys(this.config).length > 0) return true;
		return false;
	}
	getSetups(){ 
		this.setupUpdated=false;
		return this.setup;
	}
	getStates(){ 
		this.stateUpdated=false;
		return this.states;
	}
	getConfigs(){ 
		this.configUpdated=false;
		return this.config;
	}
	deleteDevice(){
		this.isDeleted = true;		
	}
	clearDevice(){
		this.isCleared = true;
	}
	endTrack(value) {
		this.endedTrack = value;
	}
	endSession(value) {
		this.endedSession = value;
	}
	startSession(value) {
		this.startedSession = value;
	}
	get() {
		if (Object.keys(this.last).length == 0) {
			let tracksTrim = this.trimTrack(this.tracks);
			if (tracksTrim.length > 0) {
				this.last = tracksTrim[tracksTrim.length - 1];
			}
		}
		return { 	"id": this.getId(), 
							"spec": this.gpsspec?.info(),
							"config": this.config, 
							type: this.type, 
							"elapsed": this.elapsed, 
							"setup": this.setup, 
							"states": this.states, 
							"tracks": this.tracks.length, 
							"statesRecords": this.statesRecords.length, 
							last: this.last };
	}
	getApps() {
		return { "apps": this.apps, "history": this.appsHistory };
	}
	getAllSetup() {
		let setup = JSON.parse(JSON.stringify(this.setup));
		this.setup = {};
		this.setupUpdated = false;
		return setup;
	}

	updateTime() {
		this.elapsed = Date.now() - this.lasttime;
		this.lasttime = Date.now();
	}

	getLast() {
		this.lastUpdated = false;
		return this.last;
	}
	getLastPause() {
		this.lastUpdated = false;
		this.last.t = Date.now();
		return this.last;
	}
	trimTrack(tracks) {
		let tempTracks = [];
		if (tracks == null) return tempTracks;
		let fromTrack = Number(this.states['TRACK_INI']);
		let toTrack = Number(this.states['TRACK_END']) > 0 ? Number(this.states['TRACK_END']) : 4102448461000;
		for (let i = 0; i < tracks.length; i++) {
			if (tracks[i].t >= fromTrack && tracks[i].t <= toTrack)
				tempTracks.push(tracks[i]);
		}
		//console.log("trimHistory trimed to:",tempHistory.length);
		return tempTracks;
	}
	getTracksAll() {
		this.trackUpdated = false;
		return this.tracks;
		//return this.tracks;
	}
	getTracks() {
		this.trackUpdated = false;
		//return this.trimTrack(this.tracks);
		return this.tracks;
	}
	getTracksHistory() {
		return this.tracksHistory;
	}

	setApps(b64, type = "base64") {
		let me = this;
		if (type == 'base64') {
			//fs.writeFile(`tracks/apps-${this.id}.txt`, b64, err => {}); ONLY FOR DEBUG
			const decoded = Buffer.from(b64, "base64");
			//console.log("device.setApps: ",`tracks/apps-${this.id}.zip`);
			fs.writeFile(`tracks/apps-${this.id}.zip`, decoded, err => { });
			decompress(decoded, 'dist').then(files => {
				let content = "";
				files.forEach(f => {
					const rowString = Buffer.from(f.data);
					me.apps = [];
					let lines = rowString.toString().split('\n');
					lines.forEach(line => {
						let [t, s, c, p, n] = line.split('\t');
						if (t != "")
							me.addApp({
								t: t, sta: s, cha: c, pak: p, nam: n
							});
					});
					me.appsUpdated = true;
				})
			});
		}
	}
	setAppsHistory(b64, type = "base64") {
		let me = this;
		if (type == 'base64') {
			//fs.writeFile(`tracks/apps-history-${this.id}.txt`, b64, err => {}); ONLY FOR DEBUG

			const decoded = Buffer.from(b64, "base64");
			//console.log("device.setAppsHistory: ",`tracks/apps-history-${this.id}.zip`);
			fs.writeFile(`tracks/apps-history-${this.id}.zip`, decoded, err => { });
			decompress(decoded, 'dist').then(files => {
				let content = "";
				files.forEach(f => {
					const rowString = Buffer.from(f.data);
					me.appsHistory = [];
					let lines = rowString.toString().split('\n');
					lines.forEach(line => {
						let [t, s, c, p, n] = line.split('\t');
						if (t != "")
							me.addAppHistory({
								t: t, sta: s, cha: c, pak: p, nam: n
							});
					});
					me.appsUpdated = true;
				})
			});
		}
	}
	setTracks(b64, type = "base64") {
		let me = this;
		if (type == 'base64') {
			fs.writeFile(`tracks/track-${this.id}.txt`, b64, err => { });

			const decoded = Buffer.from(b64, "base64");
			//console.log("device.setTracks: ",`tracks/track-${this.id}.zip`);
			fs.writeFile(`tracks/track-${this.id}.zip`, decoded, err => { });
			decompress(decoded, 'dist').then(files => {
				let content = "";
				files.forEach(f => {
					const rowString = Buffer.from(f.data);
					//console.log(rowString.toString());
					me.tracks = [];
					let lines = rowString.toString().split('\n');
					lines.forEach(line => {
						let [t, lat, lon, b, int, acc, stp] = line.split('\t');
						if (t != "")
							me.addTrack(new Track({
								t: t,
								lat: lat,
								lon: lon,
								bat: b,
								acc: acc,
								stp: stp,
							}));
					});
					if (me.states['ON_ROUTE'] != 1) {
						console.log("setTracks me.states['ON_ROUTE']", me.states['ON_ROUTE']);
						me.clearTrack();
					}

					me.trackUpdated = true;
				})
			});
		}
	}
	getId() {
		return this.id;
	}
	setId(id) {
		this.id = id;
	}
	update() {
		this.needUpdate = true;
	}
	addNotification(notification) {
		this.notifications.push(notification);
	}
	addApp(app) {
		this.apps.push(app);
	}
	addAppHistory(app) {
		this.appsHistory.push(app);
	}
	parseTrack(track) {
		return { t: Number(track.t), lat: Number(track.lat), lon: Number(track.lon), bat: Number(track.bat), acc: Number(track.acc), stp: Number(track.stp) }
	}
	addTrack(track) {
		this.tracks.push(this.parseTrack(track));
		//this.trackUpdated = true;
	}
	sortTracks() {
		console.log("sorted");
		this.tracks = this.tracks.sort((a, b) => {
			return a.t - b.t;
		});
		this.isSorted = true;
		this.setState('SORTED', true);
	}
	save(dbm) {
		const self = this;
		const deviceEntity = new DeviceEntity(dbm);
		deviceEntity.setId(this.id);
		deviceEntity.setType(this.type);
		deviceEntity.setBrand(this.brand);
		deviceEntity.setModel(this.model);
		deviceEntity.setGpsspecId(this.gpsspec?.code);
		deviceEntity.setEnabled(this.enabled);
		deviceEntity.save();
		
		const start = this.start;
		const time = Math.round(Date.now()/1000);

		//statesRecordEntity.setId(this.id);
		this.statesRecords.sort((a,b)=> a.t-b.t );
		if (this.statesRecords.length>0){
			const minDate = this.statesRecords[0].t;
			const maxDate = this.statesRecords[this.statesRecords.length-1].t;
			const pastRecords = this.statesRecords.filter(s=>s.t > self.statesRecOffset && s.t < time);
			const currentRecords = this.statesRecords.filter(s=>s.t > time);
			console.log("state.pastRecords",pastRecords.length);
			console.log("state.currentRecords",currentRecords.length);
			if(pastRecords.length>0){
				const statesRecordEntityPast = new StatesRecordEntity(dbm);
				statesRecordEntityPast.setDeviceId(this.id);
				statesRecordEntityPast.setFromdate(minDate);
				statesRecordEntityPast.setTodate(self.statesRecOffset);
				statesRecordEntityPast.setData(statesToBytes(pastRecords));
				statesRecordEntityPast.save();
			}
			if(currentRecords.length>0){
				const statesRecordEntity = new StatesRecordEntity(dbm);
				statesRecordEntity.setDeviceId(this.id);
				statesRecordEntity.setFromdate(self.statesRecOffset);
				statesRecordEntity.setTodate(maxDate);
				statesRecordEntity.setData(statesToBytes(currentRecords));
				statesRecordEntity.save();
			}
			self.statesRecOffset = time;
		}
		this.tracksRecords.sort((a,b)=> a.t-b.t );
		if (this.tracksRecords.length>0){
			const minDate = this.tracksRecords[0].t;
			const maxDate = this.tracksRecords[this.tracksRecords.length-1].t;
			const pastRecords = this.tracksRecords.filter(s=>s.t > self.tracksRecOffset && s.t < time);
			const currentRecords = this.tracksRecords.filter(s=>s.t > time);
			console.log("tracks.pastRecords",pastRecords.length);
			console.log("tracks.currentRecords",currentRecords.length);
			if(pastRecords.length>0){
				const tracksRecordEntityPast = new TracksEntity(dbm);
				tracksRecordEntityPast.setDeviceId(this.id);
				tracksRecordEntityPast.setFromdate(minDate);
				tracksRecordEntityPast.setTodate(self.tracksRecOffset);
				tracksRecordEntityPast.setData(tracksToBytes(pastRecords));
				tracksRecordEntityPast.save();
			}
			if(currentRecords.length>0){
				const tracksEntity = new TracksEntity(dbm);
				tracksEntity.setDeviceId(this.id);
				tracksEntity.setFromdate(self.tracksRecOffset);
				tracksEntity.setTodate(maxDate);
				tracksEntity.setData(tracksToBytes(currentRecords));
				tracksEntity.save();
			}
			self.tracksRecOffset = time;
		}
	}
	setLast(track) {
		this.last = track;
		//if (this.states['ON_ROUTE'] != "1")	{
		let trimTracks = this.trimTrack(this.tracks);

		if (trimTracks.length > 0) {
			let lastTrack = trimTracks[trimTracks.length - 1];
			this.last.lat = lastTrack.lat;
			this.last.lon = lastTrack.lon;
		}
		//}
		this.lastUpdated = true;
	}
	trimHistory(time) {
		let tempHistory = [];
		let fromTime = Date.now() - time; //16hrs
		for (let i = 0; i < this.tracksHistory.length; i++) {
			if (this.tracksHistory[i].t > fromTime)
				tempHistory.push(this.tracksHistory[i]);
		}
		tempHistory = tempHistory.sort((a, b) => {
			return Number(a.t) > Number(b.t);
		});
		//console.log("trimHistory trimed to:",tempHistory.length);
		return tempHistory;
	}
	swapHistory() {
		if (!fs.existsSync(`tracks/track-history-${this.id}.txt`)) {
			return;
		}
		this.sortTracks();
		var stats = fs.statSync(`tracks/track-history-${this.id}.txt`);
		var fileSizeInBytes = stats.size;
		var fileSizeInKBytes = stats.size / 1024;
		//var fileSizeInMegabytes = fileSizeInBytes / (1024*1024);
		if (fileSizeInKBytes > 500) { //if > 500k  swap history
			//  console.log("swap history");
			let dateString = new Date().toISOString().replaceAll(':', '').replaceAll('-', '');
			fs.rename(`tracks/track-history-${this.id}.txt`, `tracks/track-history-${this.id}-${dateString}.txt`, () => { })
			fs.writeFile(`tracks/track-history-${this.id}.txt`, "", err => { });
		}

	}
	appendTrack() {
		//console.log("appendTrack start");
		//console.log("appendTrack this.tracks ", this.tracks.length);
		this.tracksHistory.push(...this.tracks);
		let me = this;
		let content = "";
		this.tracks.forEach(t => {
			if (t.t < me.lastAppend) return;
			content += `${t.t}\t${t.lat}\t${t.lon}\t${t.bat}\t1\t${t.acc}\t${t.stp}\n`;
		});
		fs.appendFile(`tracks/track-history-${this.id}.txt`, content, err => { });
		this.tracksHistory = this.trimHistory(HISTORY_MAX_TIME);
		this.swapHistory();
		//console.log("appendTrack ended");
		this.lastAppend = Date.now();
	}
	recoverHistory() {
		//history + currentTracks        
		let me = this;
		console.log("recoverHistory recovering tracks ");
		let existFile = fs.existsSync(`tracks/track-history-${this.id}.txt`);
		if (!existFile) {
			fs.writeFile(`tracks/track-history-${this.id}.txt`, "", err => { });
			//console.log("recoverHistory no exist history" );
			return;
		}
		const data = fs.readFileSync(`tracks/track-history-${this.id}.txt`, "utf8");

		let lines = data.trim().split('\n');
		me.tracksHistory = [];
		lines.forEach(line => {
			let [t, lat, lon, b, int, acc, stp] = line.split('\t');
			if (t != "")
				me.tracksHistory.push(new Track({ t: t, lat: lat, lon: lon, bat: b, acc: acc, stp: stp, }));
		});
		me.tracksHistory = me.trimHistory(HISTORY_MAX_TIME);
		me.tracks = me.trimHistory(TRACKS_MAX_TIME);
		console.log("recoverHistory recovered " + me.tracks.length + " tracks");

		this.lastAppend = Date.now();
	}
	clearTrack() {
		//if (this.states['ON_ROUTE']=="0")
		this.appendTrack();
		this.tracks = [];
		this.tracks.push(...this.trimHistory(TRACKS_MAX_TIME));
		this.trackUpdated = true;
	}
	setConfig(key, value) {
		if (value == undefined) return;
		if (this.config[key] != value) this.configUpdated = true;
		this.config[key] = value;
	}
	getConfig(key) {
		this.configUpdated = false;
		return this.config[key];
	}
	setState(key, value) {
		if (this.states[key] != value) this.stateUpdated = true;
		if (key == 'IS_PAUSE') {
			this.isPaused = value == "1";
		}
		this.states[key] = value;
		/* TREBOL-37 Verificación de pausas en base al último trayecto  */
		if (key == 'IS_PAUSE') {
			this.states['IS_PAUSE'] = this.last.stp;
		}
	}
	getState(key) {
		return this.states[key];
	}
	setSetup(key, value) {
		if (value == undefined) return;
		if (this.setup[key] != value) this.setupUpdated = true;
		this.setup[key] = value;
		this.setupUpdated = true;
	}
	getSetup(key) {
		return this.setup[key];
	}
	communication(request, response, callback) {

	}
}

module.exports = { Device } ;