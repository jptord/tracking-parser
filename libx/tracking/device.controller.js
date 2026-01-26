
const { Device }   	= require("./device.js")
const { Track }   	= require("./track.js")
//const { Meitrack }  = require("..../trackers/meitrack.js");
//const { C756track } = require("..../trackers/c756track.js");
const { GPSSpecs } 	= require("./gpsspecs.js");
const { StateEntity } = require('../entities/state.entity.js')
const  fs 					= require("fs");

//const meitrack    	= new Meitrack();
//const c756track   	= new C756track();

const PATH_TRACKERS 	= "./trackers/";

class DeviceController{    
	constructor(tcpServer,udpServer,kafkagps,dbm){
		this.devices 	= [];
		this.dbm 			= dbm;
		this.setup 		= {};
		this.events 	= [];
		this.specs 		= [];
		this.updateTimer(this);
		this.loadDB();
        this.responsesTimeout = 120000;
		this.loadTrackers();
    }
	loadDB(){
		const states = new StateEntity(this.dbm).all();
		console.log("states",states);
		this.statesDB = states;
	}
	loadTrackers(){
		fs.readdirSync(PATH_TRACKERS).forEach((file) => {
			console.log("loadTrackers.file", file);
			const data = fs.readFileSync(PATH_TRACKERS+'/'+file);			
			const gpsspec = new GPSSpecs(JSON.parse(data),this.dbm)
			//gpsspec.save(this.dbm);
			this.specs.push(gpsspec);			
		});
	}
	getGpsSpec(msg){
		let gpsspec = null;
		let protocol = null;
		let data = null;
		for(let i = 0 ; i < this.specs.length;i++){
			protocol = this.specs[i].getProtocol(msg);
			if (protocol!=null) 
				return [this.specs[i],protocol];
		}
		return [null,null];
	}
	getData(protocol,msg){		
		let data = null;		
		if (protocol!=null){
			data = protocol.processData(msg);
		}
		return data;
	}
	parser(msg){
		let protocol = null;
		let data = null;
		for(let i = 0 ; i < this.specs.length;i++){
			protocol = this.specs[i].getProtocol(msg);
			if (protocol!=null) break;
		}
		if (protocol!=null){
			data = protocol.processData(msg);
			console.log("parser.data ", data);
		}
		return data;
	}
	input(msg, socket, callback){
		let [gpsspec,protocol] = this.getGpsSpec(msg);
		let data = this.getData(protocol,msg);
		if ( socket!=null )
			if (socket['deviceId']!=undefined && data!=undefined)
				data['identifier'] = socket['deviceId']
		if (gpsspec==undefined) { if (callback!=null) callback(null);return;}
		if (gpsspec.data.name == "DutE"  ) console.log("gpsspec",gpsspec.data.name);
		if (gpsspec.data.name == "DutE"  ) console.log("socketdeviceId",socket['deviceId']);
		if (gpsspec.data.name == "DutE"  ) console.log("data['identifier']",data['identifier']);
		if (data == undefined) return;
		let device = this.getDevice(data.identifier, gpsspec);
		if(device!=undefined)
			device.setTcp(socket);
		if (data.location!=undefined && data.time!=undefined){
			if(data.location.lat!=NaN && data.location.lat!='NaN'  && data.location.lat!=null ){
				let track = new Track({
					t:data.time,
					lat:data.location.lat,
					lon:data.location.lon,
					bat:data.metadata['BATTERY']?data.metadata['BATTERY']:0,
					acc:data.metadata['ACCURACY']?data.metadata['ACCURACY']:0,
					stp:data.metadata['STOPS']?data.metadata['STOPS']:0,
				});
				device.addTrack(track);			
				const lasttime = device.last==undefined?0:device.last.t==undefined?0:device.last.t;
                if (lasttime < Number(data.time)){  
                    device.setLast(track); 
                }else{	
                	device.sortTracks();
                }
			}
			device.setType(gpsspec.data.type); 
		}
		this.setStates(data,device,protocol,gpsspec);
		
		if (data.location!=undefined && data.time!=undefined)
			device.recordStates(data.time, data['states'],this.statesDB);
		else
			device.recordStates(Date.now, data['states'],this.statesDB);

		this.setConfigs(data,device,protocol);
		this.process_protocol(device,gpsspec,protocol,{body:{}});
		if (gpsspec.data.name == "DutE"){
			console.log("data",data);
		}
		else console.log("data",data);
		callback(device);
	}
	setStates(data,device,protocol,gpsspec){
		if (data['states']==null) data['states'] = {};
		if(protocol.states!=undefined){
			for(let i=0;i<protocol.states.length;i++){				
				if(protocol.states[i].type=="number"){
					device.setState(protocol.states[i].name,data.metadata[protocol.states[i].metadata]);
					data.states[protocol.states[i].name] = data.metadata[protocol.states[i].metadata];
				}else if(protocol.states[i].type=="enum"){					
					for(let j = 0 ;j < protocol.states[i].values.length; j++)
						if (data.metadata[protocol.states[i].metadata]!=undefined){
							device.setState(protocol.states[i].name, protocol.states[i].values[j].name);
							data.states[protocol.states[i].name] = protocol.states[i].values[j].name;
						}
				}else if(protocol.states[i].type=="substring"){					
					if (data.metadata[protocol.states[i].metadata]!=undefined)
						if (data.metadata[protocol.states[i].metadata][protocol.states[i].value]!=undefined){
							device.setState(protocol.states[i].name, data.metadata[protocol.states[i].metadata][protocol.states[i].value]);										
							data.states[protocol.states[i].name] = data.metadata[protocol.states[i].metadata][protocol.states[i].value];
						}
				}else if(protocol.states[i].type=="submetadata"){					
					if (data.metadata[protocol.states[i].metadata]!=undefined)
						if (data.metadata[protocol.states[i].metadata][protocol.states[i].submetadata]!=undefined){
							let value = data.metadata[protocol.states[i].metadata][protocol.states[i].submetadata];
							if (protocol.states[i].function != undefined)
								if (gpsspec.functions[protocol.states[i].function] != undefined)
									value = gpsspec.functions[protocol.states[i].function](value);
							device.setState(protocol.states[i].name, value);										
							data.states[protocol.states[i].name] = value;
						}
				}
			}
		}
	}
	setConfigs(data,device,protocol){
		if(protocol.config!=undefined){
			for(let i=0;i<protocol.config.length;i++){
				if(protocol.config[i].type=="number")
					device.setConfig(protocol.config[i].name,Number(data.metadata[protocol.config[i].metadata]));
				else if(protocol.config[i].type=="string")
					device.setConfig(protocol.config[i].name,data.metadata[protocol.config[i].metadata]);
			}
		}
	}
	updateTimer(self){
		self.update();
		setTimeout(()=>{this.updateTimer(self)},5000); // controlar desconexiones cada 5 segundos
	}
	addEvent(event){
		this.events.push(event);
	}
    setSetup(key,value){
        this.setup[key] = value;
    }
    deleteSetup(key){
        delete this.setup[key];
    }  
    getAllSetup(key){
        return this.setup;  
    }
    setupClear(){
        Object.keys(this.setup).forEach( key => {
            delete this.setup[key];
        });
    }
	subscribe( device ){
		this.events.forEach(e=>e.onNewDevice(device));
		this.devices.push(device);
	}

	unsubscribe(device){
		var index = this.devices.indexOf(device);		
		if (index > -1){
			this.events.forEach(e=>e.onRemoveDevice(device));
		}
	}
	getDevices(){
		let result = [];
        let me = this;
        //let today = getToDay();
		console.log("getDevices");
        return this.devices.map(d=>d.get());
	}
	getDevicesAll(){
        return this.devices.map(d=>d.get());
	}
	clearDevices(){
		this.devices.forEach(device=>{
			this.events.forEach(e=>e.onRemoveDevice(device));
		});
		this.devices = [];
		console.log("KernoDevices.clearDevices: ", "ok");
		return "KernoDevices.clearDevices: " + "ok";
	}
    setSetupRequest(req,res,callback){
        let me = this;
        res.setHeader('Content-Type', 'application/json');
        let device = me.getDevice(req.params.id);
        let triggered = false;
            
        if(device.type=='mei-t311'){
            Object.keys(req.body).forEach(k => {
                meitrack.setSetup(device, k, req.body[k]);
            });
            let data={response:'ok'};
            res.end(JSON.stringify(data));
        }
        else if(device.type=='c756'){
            Object.keys(req.body).forEach(k => {
                c756track.setSetup(device, k, req.body[k]);
            });
            let data={response:'ok'};
            res.end(JSON.stringify(data));
        }
        else if(device.type=='apk'){
            Object.keys(req.body).forEach(k => {
                device.setSetup(k, req.body[k]);
                let _response = me.responses.find(r=>r.trigger == k);
                if(_response != null){
                    triggered = true;
                    device.addRequest({
                        timeout : me.responsesTimeout,
                        time: Date.now(),
                        process:(elapsed)=>{
                            let data = {id:device.id,states:{},response:'ok',elapsed:elapsed};
                            _response.states.forEach(r=> data.states[r] = device.getState(r) );
                            res.end(JSON.stringify(data));
                        },
                        processTimeout:()=>{
                            let data = {id:device.id,states:{},response:'timeout', elapsed: me.responsesTimeout};
                            res.end(JSON.stringify(data));
                        },
                        active : true,
                    });
                }
            });	
            if(!triggered){
                console.log("setSetupRequest testing");
                let data={response:'ok'};
                res.end(JSON.stringify(data));
            }
        }
        
        callback(device);
    }
	sendNotification(deviceId, notification = {
		title: "title",
		text: "text",
		vibrate: false,
	}){
		let device = this.devices.find( d => d.id == deviceId );
		device.addNotification(notification);
	}
	getDevice(deviceId,gpsspec){
		let device = this.devices.find( d => d.id == deviceId );
		if (device==null) {
			console.log("DeviceController.getDevice new",deviceId, device);
			device = new Device(this.dbm);
			device.setId(deviceId);
            device.recoverHistory();   // TO DO 			
			device.sortTracks();
			//DBMcreate device
			//let dbDevice = this.dbm.devices.get(setId);
			//device.setDbKey(dbDevice.getKey());
			this.subscribe(device);
		}
		if (gpsspec!=undefined)
			device.setGpsSpec(gpsspec);
		return device;
	}
	removeDevice(device){
		this.events.forEach(e=>e.onRemoveDevice(device));
		//this.devices.splice(this.devices.indexOf(device),1);
	}
	communication(){
		/*this.devices.forEach((device,index) => {
			device.communication(request,reponse);
		});*/
	}
	update(){
		let self = this;
		let currentTime = Date.now();
        this.devices.forEach(device=>{
          
		});
	}
    processCheckStates(device){
        this.checkStates.forEach(checkState=>{
            let conditions = checkState.triggers.map(t=>device.states[t.state] == t.value).includes(false);
          //  console.log(" condition " + conditions);
            if (!conditions){
                checkState.transform(device);    
            }            
        });
    }
	processStates(req,res, callback){
		let device = this.getDevice(req.params.id);
		device.updateTime();
        if(device.type=='apk'){
            //TREBOL-12 configuración global de dispositivos
            Object.keys(req.body).forEach(k => {
                if (k=="ID_USER" && req.body[k] == "") return;
                if (k=="ID_ROUTE" && req.body[k] == "") return;
                device.setState(k, req.body[k]);
            });	
            if ( device.getState("ID_SESSION") == "0" || device.getState("ID_SESSION") == "1"|| device.getState("ID_SESSION") == "" ){
                device.setSetup("REQ_UPDATE","1");
                console.log("Required session for " + device.id);
            }
            if ( !device.haveStates() ){
                device.setSetup("REQ_UPDATE","1");
                console.log("Required states for " + device.id);
            }
            //TREBOL-38 no se reciben tracks
            if ( !device.haveConfig() ){
                device.setSetup("REQ_APPS","1");
                device.setSetup("REQ_TRACK","1");
                device.setSetup("REQ_UPDATE","1");
                console.log("Required config for " + device.id);
            }
            
            //TREBOL-38 no se reciben tracks
            if ((device.elapsed > 25000 && device.getState("ON_ROUTE") == "1") || (device.getState("ON_ROUTE") == "1" && device.tracks.length == 0 )){						
                device.setSetup("REQ_TRACK","1");
                device.setSetup('REQ_UPDATE','1');	
                console.log("Required Track for " + device.id);
            }
            /*if (device.elapsed > 50000 ){			
                device.deleteDevice();
            }*/
            //TREBOL-13 Control de versiones dinámica 
            if (device.states['LAST_VERSION']!=this.setup['LAST_VERSION'] && this.setup['LAST_VERSION']!=undefined ){
                console.log("proccessing version for", device.id);
                device.setSetup("LAST_VERSION",this.setup['LAST_VERSION']);
                device.setSetup("UPDATE_URL",this.setup['UPDATE_URL']);
                device.setSetup('REQ_UPDATE','1');	
            }
            Object.keys(this.setup).forEach(k => {
                if (k == 'LAST_VERSION') return;
                if (k == 'UPDATE_URL') return;
                device.setSetup(k,this.setup[k]);
            });

            this.processCheckStates(device);

            device.processPendientRequest();
        }
		callback(device);
	}
	checkSetupParam(c,k,req,_err){
		if (c.type=="paramStatic"){
			if (c.name==k && c.value==req.body[k])
				return true;
		}			
		else if (c.type=="paramBetween"){
			if (c.name==k ){
				let num = Number(req.body[k]);
				if(!isNaN(num)){
					if (num >= c.from && num <= c.to )
						return true;
					else{
						if (_err!=undefined)
							_err(k +" must between " + c.from + " and " + c.to );
					}
				}
			}							
		}			
		return false;
	}
	/* route '/device/:id/update/config' */
	/* check protocol with setup = true condition */
	processConfig(req,res, callback){
		let device = this.getDevice(req.params.id);
		/* only for apk */
		let gpsSpec = device.getGpsSpec();
		let protocol_setup = null;
		let errs = [];
		console.log("gpsSpec",gpsSpec);
		if (gpsSpec!=undefined)
			gpsSpec.data.protocol.forEach(p=>{
				if (p.setup!=true) return;
				let conditions_count = 0;
				p.conditions.forEach(c=>{
					Object.keys(req.body).forEach(k => {
						if (this.checkSetupParam(c,k,req,(e)=>errs.push(e)))
							conditions_count++;
							
					});
				});
				if (conditions_count == p.conditions.length)
					protocol_setup = p;
			})
		console.log("protocol_setup",protocol_setup);

		if (protocol_setup!=undefined){
			/* process protocol */ 
			this.process_protocol(device,gpsSpec,protocol_setup,req);
		}

		Object.keys(req.body).forEach(k => {
			device.setConfig(k, req.body[k]);
		});
		/*for other services */

		callback(device,errs);
	}
	process_protocol(device,gpsSpec,protocol,req){
		/* if is TCP */
		if (protocol.output == "tcp"){
			let msg = protocol.sendCommand;
			if (msg == undefined) return;
			/* create parameters */
			
			let variables = [
				//{ "name": "imei",value: }
			]
			let rep_vars = (v)=>{ if (v==undefined || !isNaN(v)) return v;  for(let i=0;i<variables.length;i++) v=v.replaceAll(variables[i].n,variables[i].v); return v; };
			protocol.param.forEach(p=>{
				if (p.type=="static"){					
					variables.push({n:`{${p.name}}`,v:rep_vars(p.value)});
				}
				if (p.type=="param"){					
					variables.push({n:`{${p.name}}`,v:rep_vars(req.body[p.value])});
				}
				if (p.type=="device.state"){
					variables.push({n:`{${p.name}}`,v:rep_vars(device.getState("IMEI"))});
				}
				if (p.type=="device.config"){
					variables.push({n:`{${p.name}}`,v:rep_vars(device.getConfig("IMEI"))});
				}
				if (p.type=="function"){
					variables.push({n:`{${p.name}}`,v:rep_vars(gpsSpec.functions[p.value](rep_vars(p.params))) });
				}
			});
			console.log("rep_vars(msg)",rep_vars(msg));
			device.sendTcp(rep_vars(msg));
		}
	}
	processStatesFull(req, res, callback){
		let device = this.getDevice(req.params.id);
		Object.keys(req.body).forEach(k => {
			device.setState(k, req.body[k]);
		});
		callback(device);
	}
	save(){		
		this.devices.forEach(device => device.save(this.dbm));		
		return {result:"ok"};
	}
}

module.exports = { DeviceController } ;