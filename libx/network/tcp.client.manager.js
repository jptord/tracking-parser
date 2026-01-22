const { timeStamp } = require('console');
const { TcpClient } = require("./tcp.client.js");
const net = require('net');

class TcpClientManager {
		className = 'TCClient';
		constructor({host, port, jsonmode=true}){
			this.nodeTcpClient = new TcpClient({ host: host, port: port });		
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
				client.start();
				client.on('connect', (client) => {
						console.info(`TcpClientManager on ${self.host}:${self.port} connected`);
						self.events['connect'].forEach(event => event(client));           
				});

				client.on('data', function(client, data) {
					const uuid = Buffer.from(data.subarray(0,4)).toString('hex');
					const len = Buffer.from(data.subarray(4,5)).readUInt8(0);
					const action = Buffer.from(data.subarray(5,5+len)).toString();
					const dataEnd = Buffer.from(data.subarray(5+len));
					/*console.debug("data",data);
					console.debug("uuid",uuid);
					console.debug("len",len);
					console.debug("action",action);
					console.debug("dataEnd",dataEnd);*/
					self.events['data'].forEach(event => event(client,dataEnd));
					if (self.events[action]!=null)
						self.events[action].forEach(event => event(client,dataEnd,uuid));
						/*if(self.jsonmode){
								let jsondata;            
								try{
										jsondata = JSON.parse(data.toString());
								}catch(e){}
								if (jsondata==null)
										self.events['data'].forEach(event => event(client,{a:'ANY',data:data.toString()}));
								else
										self.events['data'].forEach(event => event(client,jsondata));
								return;
						} else       
								self.events['data'].forEach(event => event(client,`${data.toString()}`));*/
				});

				client.on('close', function() {
						console.log(`TCPClient on ${self.host}:${self.port} closed`);
						self.events['close'].forEach(event => event(client));                        
						self.client = null;
				});
				client.on('error', function(e) {
						if (e.code == 'ECONNREFUSED' || e.code == 'ECONNRESET'){
								console.log(`TCPClient on ${self.host}:${self.port} error, reconnecting`);
								self.client = null;
								setTimeout(()=>{
										self.client = new net.Socket();
										self.start();
								},3000);   
						}else
								self.events['error'].forEach(event => event(client));
				});
		}
		send(message){
				const client = this.client;
				if (client!=null){
						client.write(message);
				}
		}
}

module.exports = { TcpClientManager }