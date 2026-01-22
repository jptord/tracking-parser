//const { TcpClient } = require("./tcp.client.js");
const { TcpClientManager } = require("./tcp.client.manager");
const fs = require('fs');

class NodeControllerClient{
	constructor(){
		this.nodeTcpClientManager = new TcpClientManager({ host: process.env.GATEWAY_PARSER_HOST, port: process.env.GATEWAY_PARSER_PORT, mode: 'enocodeUuid' });		
		this.uuid = process.env.UUID;
	}

	on(ev,fn){
		if (this.events[ev]==null)
				this.events[ev] = [];
		this.events[ev].push(fn);
	}
	start(){
		const self = this;
		const clientManager = self.nodeTcpClientManager;
		//const emit = this.emit;
		clientManager.on('connect',(client)=>{
			const uuid = process.env.UUID;
			console.info("NodeControllerClient.connect","connected");
			console.log("uuid hex",Buffer.from(uuid, 'hex'));
			clientManager.emit("COM",uuid);
		});
		clientManager.on('COM',(data,client,uuid)=>{
			console.info("NodeControllerClient.data COM",data.toString());
			clientManager.emit("COM",uuid);
			/*
			setTimeout(()=>{
				const filePath = 'C:\\PerfLogs\\valheim.rar';
				const fileStream = fs.createReadStream(filePath);
				const stats = fs.statSync(filePath);
				const fileSizeInBytes = stats.size;
				console.log("sending","SDATA",fileSizeInBytes);
				clientManager.emit("SDATA", fileSizeInBytes+"");
				fileStream.pipe(client, { end: false });
				fileStream.on('end', () => {					
					console.log("sended");
					clientManager.emit("EDATA",uuid);
				});
			},4000);*/

			
			setTimeout(()=>{
				const filePath = 'C:\\PerfLogs\\valheim.rar';
				const fileStream = fs.createReadStream(filePath);
				const stats = fs.statSync(filePath);
				const fileSizeInBytes = stats.size;
				console.log("sending","FDATA",fileSizeInBytes);
				clientManager.emit("FDATA", "valheim.rar");
				fileStream.pipe(client, { end: false });
				fileStream.on('end', () => {					
					console.log("sended");
				});
			},4000);

			
		});
		clientManager.on('data',(data,client)=>{
			//console.info("NodeControllerClient.data",data.toString());
			//self.nodeTcpClient.send(JSON.stringify({"a":"CON","uuid":process.env.UUID}));
		});
		clientManager.start();
	}
}

module.exports = { NodeControllerClient }