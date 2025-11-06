const  fs = require("fs");
const { Protocol } = require("./protocol.js");
const { GpsspecEntity } = require("../entities/gpsspec.entity.js");
const { StateEntity } = require("../entities/state.entity.js");

function checkCondition(msg,c){
	if (c.type=='start') 	if (msg.startsWith(c.value)) 	return true;
	if (c.type=='end') 		if (msg.endsWith(c.value)) 		return true;
	if (c.type=='contain') 	if (msg.includes(c.value)) 		return true;
	return false;
}

class GPSSpecs{
	constructor(data){
		this.data = data;
		this.enabled = true;
		this.dataTxt = JSON.stringify(data);
		this.functions = {};
		if(this.data.functions!=undefined)
		Object.keys(this.data.functions).forEach(f_key=>{
			this.functions[f_key] = eval(this.data.functions[f_key]);
		});
		console.log("GPSSpecs.functions", this.functions);
		for(let i = 0; i < this.data.protocol.length; i++) 			
			this.data.protocol[i] = new Protocol(this.data.protocol[i],this);		
	}
	save(dbm){		
		const gpsspec = new GpsspecEntity(dbm);
		gpsspec.setCode(this.data.code);
		gpsspec.setData(JSON.stringify(this.dataTxt));
		gpsspec.setEnabled(JSON.stringify(this.enabled));
		gpsspec.save();

		this.data.protocol.forEach(protocol=>{
			protocol.states?.forEach(state=>{
				console.log("state",state);
				/*state = new StateEntity(dbm);
				state.setCode(this.data.code);
				state.setBytetype(JSON.stringify(this.dataTxt));
				state.setName(JSON.stringify(this.enabled));
				gpsspec.save();*/
			});
		});
	}
	info(){
		return {
			"name":this.data.name,
			"brand":this.data.brand,
			"model":this.data.model,
			"type":this.data.type,
		}
	}
	getProtocol(msg){
		let protocol = null;
		for(let i = 0; i < this.data.protocol.length; i++){
			//prevent setup protocol
			if (this.data.protocol.setup==true) continue;
			let reach_conditions = 0; 
			for(let j = 0; j < this.data.protocol[i].conditions.length; j++){
				const c = this.data.protocol[i].conditions[j];
				if (checkCondition(msg,c)) reach_conditions++;
			}
			if ( this.data.protocol[i].conditions.length == reach_conditions) protocol = this.data.protocol[i];
		}
		return protocol;
	}
	test(msg){
		for(let i = 0; i < this.data.protocol.length; i++){
			let reach_conditions = 0; 
			for(let j = 0; j < this.data.protocol[i].conditions.length; j++){
				const c = this.data.protocol[i].conditions[j];
				if (c.type=='start') 	if (msg.startsWith(c.value)) reach_conditions++;
				if (c.type=='end') 		if (msg.endsWith(c.value)) reach_conditions++;
			}
			return ( this.data.protocol[i].conditions.length == reach_conditions);
		}
		return false;
	}
}

module.exports = { GPSSpecs } ;