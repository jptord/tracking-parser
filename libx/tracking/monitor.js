
const { Device }   = require("./devicex.js");
const { Track }   = require("./track.js");
const { Server } = require("socket.io");
const http = require('http');

function timeToDay(timestamp){
    if (timestamp==null) return "00000000";
    let date = new Date(timestamp);
   //console.log("date " +`${date.getDate()}${date.getMonth()}${date.getFullYear()}`);
    return `${date.getDate()}${date.getMonth()}${date.getFullYear()}`
}
function getToDay(){
    return timeToDay(Date.now());
}

class KernoClient{
	constructor(socket){
		this.socket = socket;
		this.devices = [];
        this.suggestions = [];
        this.claims = [];
        this.emergencys = [];
	}
    addSuggestion(suggestion){
        this.suggestions.push(suggestion);
    }
    addClaim(claim){
        this.claims.push(claim);
    }
	addDevice(device){
		console.log('KernoClient.addDevice:',device.id);
		let deviceExist = this.devices.find(d=>d.id==device.id);
		if (deviceExist != null) return; 		 
		this.devices.push(device);
	}
	removeDevice(device){
		console.log('KernoClient.removeDevice:',device.id);	
		let deviceExist = this.devices.find(d=>d.id==device.id);
		if (deviceExist==null) return;
		this.devices.splice(this.devices.indexOf(device),1);
	}
	removeAll(){
		console.log('KernoClient.removeAll:');	
		this.devices=[];
	}
	haveDevice(device){
		return this.devices.find(d=>d.id==device.id)!=null;
	}
	emit(tag,msg){		
		this.socket.emit(tag,msg);
	}
	emitAll(tag,msg){
	}
	emitDevice(device,tag,msg){
		if(!this.haveDevice(device))return;
		this.socket.emit(tag,msg);
	}
}

class KernoMonitor{

	constructor(params = {port:8989, app: null}){
		this.port 		= params.port;
		this.server 	= http.createServer(params.app);
        this.io 		= new Server(this.server, { cors: {
			origin: "*",
			//origin: "http://172.20.50.67:4200",
			methods: ["GET", "POST"],
		  }});				 
		this.clients	= [];
    }
	
	setDevices( kernoDevices ){
		this.kernoDevices = kernoDevices;
		this.kernoDevices.addEvent({
			onNewDevice:(device)=>{
				console.log("setDevices.onNewDevice",device.id);				
				if ( timeToDay(Number(device.getState('SESSION_START')))!=getToDay())
					return;
				this.clients.forEach(client =>
					client.emit('device.new',device.get())					
				);
			},
            //TREBOL-11   registrar eventos de equipos desconectados
			onRemoveDevice:(device)=>{
				console.log("setDevices.onRemoveDevice",device.getId());
				if ( timeToDay(Number(device.getState('SESSION_START')))!=getToDay())
					return;
				this.clients.forEach(client =>
					client.emit('device.remove',{id:device.getId()})					
				);			
			}
		});
	}
	config(){
		var server 	= this.server;
		var io 		= this.io;
		io.on('connection', (socket) => {
			let client = new KernoClient(socket);
			this.clients.push(client);
			console.log('usuario conectado');		  
			socket.on('message', (msg) => {
				console.log('mensaje:',msg);
				//console.log('this.kernoDevices.getDevices()',this.kernoDevices.getDevices());
				socket.emit('devices',(this.kernoDevices.getDevices()));
			});
			/*socket.on('tracks', (id) => {
				console.log('tracks.id:',id);
				socket.emit('tracks',{id:id, tracks:this.kernoDevices.find(d => d.id == id).getTracks()} );
			});*/
			socket.on('device', (id) => {
				console.log('socket config device.id:',id);
				let device = this.kernoDevices.getDevice(id);
				if (device != null)
					socket.emit('device', device.get() );
                    //client.emit('device.new',device.get())	
			});
			 //Añadir conexión de monitores, por suscripción a dispositivos
			socket.on('device.subscribe', (idArray) => {
				console.log('device.subscribe device.id:',idArray);
				if (Array.isArray(idArray)){
					idArray.forEach(idDevice=>{
						let device = this.kernoDevices.getDevice(idDevice);
						if (device == null) return ;
						client.addDevice(device);
					})
				}
			});
             //Añadir conexión de monitores, por suscripción a dispositivos
			socket.on('device.unsubscribe', (idDevice) => {
				let device = this.kernoDevices.getDevice(idDevice);
				if (device == null) return ;
				client.removeDevice(device);
			});
             //Añadir conexión de monitores, por suscripción
			socket.on('device.unsubscribe.all', () => {
				client.removeAll();
			});
			socket.on('disconnect', () => {
				console.log('usuario desconectado');
				this.clients.splice(this.clients.indexOf(client),1);
			});
		});
	}

	start(){
		var server 	= this.server;
		var io 		= this.io;

		this.config();

		server.listen(this.port, () => {
			console.log(`escuchando puerto ws *:${this.port}`);
		});		
	}    
	sendSuggestion(device,suggestion){ 
        this.clients.forEach(client =>
            client.emit('server.suggestion.new',{deviceId:device.id, suggestion:suggestion})
        );
    }
	sendEmergency(device,emergency){ 
		device.setState("IS_EMERGENCY","1");
        this.clients.forEach(client =>
            client.emit('server.emergency.new',{deviceId:device.id, emergency:emergency})
        );
		this.updateDevice(device);
    }
	sendClaim(device,claim){ 
        this.clients.forEach(client =>
            client.emit('server.claim.new',{deviceId:device.id, claim:claim})
        );
    }
	updateDevice(device){
            if ( timeToDay(Number(device.getState('SESSION_START')))!=getToDay())
                return;
            //filtrar las conexiónes por suscripción emitDevice
			if (device.stateUpdated)
                /**
                 * TREBOL-14 Filtros por device en cada actualización de estados
                 */
                this.clients.forEach(client =>
					client.emit('device.state',{id:device.getId(),states:device.getStates()})
				);
			if (device.trackUpdated)
                /**
                 * TREBOL-14 Filtros por device en cada actualización de trayectos
                 */
				this.clients.forEach(client =>
					client.emitDevice(device,'device.tracks',{id:device.getId(),tracks:device.getTracks()})
				);
			if (device.setupUpdated)
				this.clients.forEach(client =>
					client.emitDevice(device,'device.setup',{id:device.getId(),setup:device.getSetups()})
				);
			if (device.configUpdated)
                this.clients.forEach(client =>
					client.emit('device.config',{id:device.getId(),config:device.getConfigs()})
				);
			if (device.lastUpdated)
				this.clients.forEach(client =>
					//client.emitDevice(device,'device.last',{id:device.getId(),last:device.getLast()})					
                    client.emit('device.last',{id:device.getId(),last:device.getLast()})					
				);		
            if (device.isCleared){
                this.clients.forEach(client =>
                    client.emitDevice(device,'device.cleared',{id:device.getId()})					
                );
                this.kernoDevices.removeDevice(device);
            }	
            if (device.endedTrack){
                this.clients.forEach(client =>
                    client.emitDevice(device,'device.track.end',{id:device.getId()})					
                );
                //this.kernoDevices.removeDevice(device);
                device.endTrack(false);
            }	
            if (device.endedSession){
                this.clients.forEach(client =>
                    client.emit('device.session.end',{id:device.getId()})					
                );
                console.log("--end session sended");
                //this.kernoDevices.removeDevice(device);
                device.endSession(false);
            }	
            if (device.startedSession && device.haveStates() ){
                this.clients.forEach(client =>{
                    //console.log('device.states:',device.states)	;
                    client.emit('device.session.start',device.get())					
                });
                console.log("--start session sended");
                //this.kernoDevices.removeDevice(device);
                device.startSession(false);
            }
		/*	if (device.isPaused)
				this.clients.forEach(client =>
					client.emit('device.pause',{id:device.getId(),pause_ini:device.states["PAUSE_INI"],last:device.getLastPause()})
				);*/
		/*	if (device.isDeleted){
				this.clients.forEach(client =>
					client.emitDevice(device,'device.removed',{id:device.getId()})					
				);
				this.kernoDevices.removeDevice(device);
			}*/
            
			//client.emit('deviceUpdate',device.get());
	}
}

module.exports = { KernoMonitor } ;