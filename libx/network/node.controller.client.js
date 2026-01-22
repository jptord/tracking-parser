//const { TcpClient } = require("./tcp.client.js");
const { TcpClientManager } = require("./tcp.client.manager");

class NodeControllerClient{
	constructor(){
		this.nodeTcpClientManager = new TcpClientManager({ host: process.env.GATEWAY_PARSER_HOST, port: process.env.GATEWAY_PARSER_PORT, jsonmode: true });		
		this.uuid = process.env.UUID;
	}

	on(ev,fn){
		if (this.events[ev]==null)
				this.events[ev] = [];
		this.events[ev].push(fn);
	}

	emit(event, data){
		const len = Buffer.alloc(1);
		len.writeUint8(event.length,0);
		const uuid = process.env.UUID;
		const dataBuffer = Buffer.concat([Buffer.from(uuid, 'hex'), len, Buffer.from(event)]);
		this.nodeTcpClientManager.send(dataBuffer);
	}

	start(){
		const self = this;
		const clientManager = self.nodeTcpClientManager;
		//const emit = this.emit;
		clientManager.on('connect',(client)=>{
			const uuid = process.env.UUID;
			console.info("NodeControllerClient.connect","connected");
			console.log("uuid hex",Buffer.from(uuid, 'hex'));
			self.emit("COM",uuid);
		});
		clientManager.on('COM',(client,data)=>{
			const uuid = process.env.UUID;
			console.info("NodeControllerClient.data COM",data.toString());
			self.emit("COM",uuid);
		});
		clientManager.on('data',(client,data)=>{
			console.info("NodeControllerClient.data",data.toString());
			//self.nodeTcpClient.send(JSON.stringify({"a":"CON","uuid":process.env.UUID}));
		});
		clientManager.start();
	}
}

module.exports = { NodeControllerClient }