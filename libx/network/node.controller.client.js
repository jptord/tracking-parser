const { TcpClient } = require("./tcp.client.js");

class NodeControllerClient{
	constructor(){
		this.nodeTcpClient = new TcpClient({ host: process.env.GATEWAY_PARSER_HOST, port: process.env.GATEWAY_PARSER_PORT, jsonmode: true });		
		this.uuid = process.env.UUID;
	}

	on(ev,fn){
		if (this.events[ev]==null)
				this.events[ev] = [];
	}
	start(){
		const self = this;
		self.nodeTcpClient.on('connect',(client)=>{
			console.info("NodeControllerClient.connect","connected");
			//self.nodeTcpClient.send(JSON.stringify({"a":"CON","uuid":"'+process.env.UUID+'"}));
			console.log("Buffer.from(process.env.UUID, 'hex')",Buffer.from(process.env.UUID, 'hex'));
			const event = "CON";
			const len = Buffer.alloc(1);
			len.writeUint8(event.length,0);
			self.nodeTcpClient.send(Buffer.concat([Buffer.from(process.env.UUID, 'hex'),len,Buffer.from(event)]));
			self.nodeTcpClient.emit("CON",uuid);
		});
		self.nodeTcpClient.on('COM',(client,data)=>{
			console.info("NodeControllerClient.data COM",data.toString());
			//self.nodeTcpClient.send(JSON.stringify({"a":"CON","uuid":process.env.UUID}));
		});
		self.nodeTcpClient.on('data',(client,data)=>{
			console.info("NodeControllerClient.data",data.toString());
			//self.nodeTcpClient.send(JSON.stringify({"a":"CON","uuid":process.env.UUID}));
		});
		self.nodeTcpClient.start();
	}
}

module.exports = { NodeControllerClient }