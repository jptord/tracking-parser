const { io } = require("socket.io-client");
class WSClient{
	className = "WSSever";
	constructor({port,host}){
		this.port = port;
		this.host = host;		

	}
	start(){
		this.socket = io(`ws://${this.host}:${this.port}`);
		
	}
}