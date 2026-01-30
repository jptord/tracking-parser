//const { TcpClient } = require("./tcp.client.js");
const { TcpClientManager } = require("./tcp.client.manager");
const { WSClientManager } = require("./ws.client.manager.js");
const fs = require('fs');

class NodeControllerClient{
	constructor(){
		//this.nodeTcpClientManager = new TcpClientManager({ host: process.env.GATEWAY_PARSER_HOST, port: process.env.GATEWAY_PARSER_PORT, mode: 'enocodeUuid' });		
		this.wsClientManager = new WSClientManager({host: process.env.GATEWAY_PARSER_HOST, port:process.env.GATEWAY_PARSER_PORT});
		this.uuid = process.env.UUID;
	}

	on(ev,fn){
		if (this.events[ev]==null)
				this.events[ev] = [];
		this.events[ev].push(fn);
	}
	start(){
		const self = this;
		const wsClientManager = self.wsClientManager;
		//const emit = this.emit;
		wsClientManager.on('COM',(socket, uuid, data)=>{	
			socket.emit("devices.all",uuid, []);	
		})
		wsClientManager.start();
	}
}

module.exports = { NodeControllerClient }