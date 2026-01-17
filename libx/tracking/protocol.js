const fs = require("fs");

function checkCondition(msg,c){
	if (c.type=='start') 	if (msg.startsWith(c.value)) 	return true;
	if (c.type=='end') 		if (msg.endsWith(c.value)) 		return true;
	if (c.type=='contain') 	if (msg.includes(c.value)) 		return true;
	return false;
}

class Protocol{
	constructor(data,parent){
		let self = this;
		this.parent = parent;
		Object.keys(data).forEach(k=>self[k] = data[k]);
		if (data.data!=undefined)
		Object.keys(data.data).forEach(k=>{
			if (data.data[k].factor!=undefined)
				data.data[k].factor = eval(data.data[k].factor);
		});
		//console.log("Protocol.this:",this);
	}
	processData(msg){
		let msgData = msg;
		let data = {
			identifier:'',
			time:0,
			location:null,
			metadata:null,
			brand:this.parent.data.brand,
			model:this.parent.data.name + ' - ' +this.parent.data.model,
			type:this.parent.data.type,
		};
		/* REPLACE */
		for(let j = 0; j < this.conditions.length; j++){
			const c = this.conditions[j];
			if (checkCondition(msg,c) && c.replace ) msgData = msgData.replace(c.value, '');
		}		
		//console.log("msgData",msgData);
		if (this.type=="plain"){
			let split_data = msgData.split(this.splitter);
			data.identifier = this.processIdentifier(msgData,split_data);
			data.time = this.processTime(msgData,split_data);
			data.location = this.processLocation(msgData,split_data);
			data.metadata = this.processMetadata(msgData,split_data);
		//console.log("pre.data",data);
		}
		else if (this.type=="json"){
			let json_data = "";
			try{				
				json_data = JSON.parse(msgData);
			}catch(e){
				console.log("can't parse",msgData);
				return null;
			}
			data.identifier = this.processIdentifier(msgData,json_data);			
			data.time = this.processTime(msgData,json_data);
			data.location = this.processLocation(msgData,json_data);
			data.metadata = this.processMetadata(msgData,json_data);
			
		}
		
		return data;
	}
	processIdentifier(msg, data){		
		if (this.identifier==undefined) return null;
		let id = this.cryptId(Math.random() * 880000 + 100000);
		if (this.identifier.process=="encrypt")
			id = this.cryptId(data[this.identifier.indexId]);
		else
			id = data[this.identifier.indexId];
		return id;
	}
	processTime(msg, data){				
		if (this.time==undefined) return null;
		let time = 0;
		let date = '';
		if (this.time.type == "index"){
			if (this.time.indexDate >= 0 && this.time.indexTime >= 0)
				date = data[this.time.indexDate] + '' + data[this.time.indexTime];
			else if (this.time.indexDate >= 0 && this.time.indexTime <= 0)
				date = data[this.time.indexDate];
			else if (this.time.indexDate <= 0 && this.time.indexTime >= 0)
				date = data[this.time.indexTime];
		}else if (this.time.type == "attr"){
			if (this.time.indexDate != -1 && this.time.indexTime != -1)
				date = data[this.time.indexDate] + '' + data[this.time.indexTime];
			else if (this.time.indexDate != -1)
				date = data[this.time.indexDate];
			else if (this.time.indexTime != -1)
				date = data[this.time.indexTime];
			console.log("processTime:", date);
		}
		if (this.time.formatType == "format"){
			if (this.time.format == "YYMMDDhhmsss")
				time = this.YYMMDDhhmmss2stamp(date);
			if (this.time.format == "DDMMYYhhmsss")
				time = this.DDMMYYhhmsss2stamp(date);
		}else if (this.time.formatType == "timestamp"){
			time = date ;
		}		
		time += this.time.zone*60*1000;
		return time;
	}
	YYMMDDhhmmss2stamp(str){
		return (new Date("20"+str[0]+str[1]+"-"+str[2]+str[3]+"-"+str[4]+str[5]+"T"+str[6]+str[7]+":"+str[8]+str[9]+":"+str[10]+str[11])).getTime();
	}
	DDMMYYhhmsss2stamp(str){
		return (new Date("20"+str[4]+str[5]+"-"+str[2]+str[3]+"-"+str[0]+str[1]+"T"+str[6]+str[7]+":"+str[8]+str[9]+":"+str[10]+str[11])).getTime();
	}	
	cryptId(num){
  		return parseInt(num).toString(16);
	}
	ddtoDDM(latDD){	
		let d = Math.round((latDD/100));
		let f = (latDD-d*100)/60;
		return d + f;
	}
	processLocation(msg,data){
		if (this.location==undefined) return null;
		let location = {
			lat:0,
			lon:0,
			proj:''
		}
		if (this.location.type == "index"){
			if (this.location.indexLat >= 0 )
				location.lat = data[this.location.indexLat];
			if (this.location.indexLon >= 0 )
				location.lon = data[this.location.indexLon];
		}else if (this.location.type == "attr"){
			if (this.location.indexLat != -1)
				location.lat = data[this.location.indexLat];
			if (this.location.indexLon != -1)
				location.lon = data[this.location.indexLon];
		}
		if (this.location.formatType == "DMMJ"){
			if (this.location.indexNS >= 0 && this.location.indexLat >= 0)
				location.lat = (this.ddtoDDM(parseFloat(data[this.location.indexLat]))* (data[this.location.indexNS]=="S"?-1:1) ) + '';				
			if (this.location.indexWE >= 0 && this.location.indexLon >= 0)
				location.lon = (this.ddtoDDM(parseFloat(data[this.location.indexLon]))* (data[this.location.indexWE]=="W"?-1:1) ) + '';			
		}else if (this.location.formatType == "DDx"){
			if (this.location.indexNS >= 0 && this.location.indexLat >= 0)
				location.lat = (this.ddtoDDM(parseFloat(data[this.location.indexLat]))* (data[this.location.indexNS]=="S"?-1:1) ) + '';				
			if (this.location.indexWE >= 0 && this.location.indexLon >= 0)
				location.lon = (this.ddtoDDM(parseFloat(data[this.location.indexLon]))* (data[this.location.indexWE]=="W"?-1:1) ) + '';			
		}
		location.proj = this.location.format;
		return location;
	}
	processMetadata(msg,data){
		if (this.data==undefined) return null;
		let metadata = {};
		Object.keys(this.data).forEach(k=>{
			let val = data[k];
			let val_content = this.data[k].value;
			if (val != undefined){
				if (this.data[k].convert == "enum"){
					metadata[this.data[k].field] = val_content[val];
				}
				else if (this.data[k].type == "number"){
					if (this.data[k].factor!=undefined)
						metadata[this.data[k].field] = Number(val)*this.data[k].factor;
					else
						metadata[this.data[k].field] = Number(val);

					if (this.data[k].round!=undefined)
						metadata[this.data[k].field] = Math.round(metadata[this.data[k].field] * Math.pow(10, this.data[k].round)) / Math.pow(10, this.data[k].round)
				}
				else if (this.data[k].type == "substring"){
						let substring = val.split(this.data[k].split);
						metadata[this.data[k].field]={};
						
						//console.log("this.data[k]",this.data[k].value[0].name);
						//if (this.parent.data.name == "DutE"  ) console.log("---substring",substring);
						
						//if (this.parent.data.name == "DutE"  ) console.log("this.data[k].value",k , this.data[k],);
						//if(Object.keys(this.data[k].value).length==1){
						//	if (this.data.name == "DutE"  ) console.log("---this.data[k].value",k , this.data[k],);
						//	metadata[this.data[k].field] = substring[Object.keys(this.data[k].value)[0]];}
						
						//else
						for(let i=0; i<substring.length;i++) {
							if (this.data[k].value[i]==undefined) continue;
							metadata[this.data[k].field][this.data[k].value[i].name] = substring[i];
							if (this.data[k].value[i].type == "hex")
								metadata[this.data[k].field][this.data[k].value[i].name] = parseInt(metadata[this.data[k].field][this.data[k].value[i].name],16);
							if (this.data[k].value[i].type == "number")
								metadata[this.data[k].field][this.data[k].value[i].name] = Number(metadata[this.data[k].field][this.data[k].value[i].name]);							
						}

					if (this.data[k].round!=undefined)
						metadata[this.data[k].field] = Math.round(metadata[this.data[k].field] * Math.pow(10, this.data[k].round)) / Math.pow(10, this.data[k].round)					
				
				}else if (this.data[k].type == "substring_enum"){
						let substring = val.split(this.data[k].split);
						metadata[this.data[k].field]={};
						console.log("substring.length",substring.length);
						for(let i=0; i<substring.length;i++) {
							let enumField = this.data[k].enumField;
							let enumValue = this.data[k].enumValue;
							let split = this.data[k].subsplit;
							console.log("substring[i]",substring[i]);
							if(enumField!=undefined && enumValue!=undefined){
								let sstring = substring[i].split(split);
								if(this.data[k].value[sstring[enumField]]!=undefined){
									metadata[this.data[k].field][this.data[k].value[sstring[enumField]].name] = sstring[enumValue];
									if (this.data[k].value[sstring[enumField]].type == "number")
										metadata[this.data[k].field][this.data[k].value[sstring[enumField]].name] = Number(sstring[enumValue]);
								}
							}
						}

					if (this.data[k].round!=undefined)
						metadata[this.data[k].field] = Math.round(metadata[this.data[k].field] * Math.pow(10, this.data[k].round)) / Math.pow(10, this.data[k].round)					
				
				}else
					metadata[this.data[k].field] = val;
			}
		});
		console.log("metadata",metadata);
		return metadata;
	}
}

module.exports = { Protocol } ;