const { timeStamp } = require('console');
const { TcpClient } = require("./tcp.client.js");
const net = require('net');

class TcpClientManager {
		className = 'TCClient';
		constructor({host, port, mode="enocodeUuid|raw"}){
			this.nodeTcpClient = new TcpClient({ host: host, port: port });		
			this.mode = mode;
			this.host = host;
			this.port = port;
			this.events = {'data':[],'connect':[],'error':[],'close':[]};
		}
		on(ev,fn){
			if (this.events[ev]==null)
					this.events[ev] = [];
			this.events[ev].push(fn);
		}
		start(){
				const self = this;
				const client = this.nodeTcpClient;
				client.on('connect', (client) => {
						console.info(`TcpClientManager on ${self.host}:${self.port} connected`);
						self.events['connect'].forEach(event => event(client));           
				});

				client.on('data', function(client, data) {
					if (self.mode == "enocodeUuid") {
						const uuid = Buffer.from(data.subarray(0,4)).toString('hex');
						const len = Buffer.from(data.subarray(4,5)).readUInt8(0);
						const action = Buffer.from(data.subarray(5,5+len)).toString();
						const payload = Buffer.from(data.subarray(5+len));
					/*	console.debug("data",data);
						console.debug("uuid",uuid);
						console.debug("len",len);
						console.debug("action",action);
						console.debug("dataEnd",dataEnd);*/
						
						self.events['data'].forEach(event => event(payload));
						if (self.events[action]!=null)
							self.events[action].forEach(event => event(payload,client,uuid));
					}else if (self.mode == "raw"){
						self.events['data'].forEach(event => event(data));
					}
				});

				client.on('close', function() {
						console.log(`TCPClient on ${self.host}:${self.port} closed`);
						self.events['close'].forEach(event => event(client));                        
						self.client = null;
				});
				client.on('error', function(e) {
					self.events['error'].forEach(event => event(client));
				});
				client.start();
		}
		send(message){
				const client = this.nodeTcpClient;
				if (client!=null){
						client.send(message);
				}
		}
		
		emit(event, data){
			const client = this.nodeTcpClient;
			const len = Buffer.alloc(1);
			len.writeUint8(event.length,0);
			const uuid = process.env.UUID;
			const dataBuffer = Buffer.concat([Buffer.from(uuid, 'hex'), len, Buffer.from(event), Buffer.from(data)]);
			client.send(dataBuffer);
		}
}

module.exports = { TcpClientManager }