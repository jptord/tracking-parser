const { io } = require("socket.io-client");

class WSClientManager{
	className = "WSClientManager";
	constructor({port,host,instanceName}){
		this.port = port;
		this.host = host;
		this.uuid = process.env.UUID;
		this.instanceName = instanceName;
		this.events = {'data':[],'connect':[],'error':[],'close':[]};
	}
	on(ev,fn){
		if (this.events[ev]==null)
				this.events[ev] = [];
		this.events[ev].push(fn);
	}
	start(){
		const self = this;
		let latency = 0;
		const socket = io(`ws://${this.host}:${this.port}`);
		console.info(`WSClientManager[${this.className}] start connected on ws://${this.host}:${this.port}`);
				
		socket.on('connect',()=>{
			console.log("connected to server");
			console.info("WSClientManager.connect","connected");
			console.log("uuid hex", Buffer.from(self.uuid, 'hex'));
			socket.emit("COM", self.uuid);        
		});
		socket.on('ping', function(ms) {
			//console.log("ping", self.uuid, ms);
			socket.emit("pong", self.uuid, ms);
		});
		socket.onAny((ev, ...args)=>{
				if (self.events[ev]==undefined) return;
				self.events[ev].forEach((fn)=>{
					fn(socket, this.uuid,...args);
				});
		});
	}
}
module.exports = { WSClientManager };