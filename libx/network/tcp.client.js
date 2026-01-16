const { timeStamp } = require('console');
const net = require('net');

class TcpClient {
    className = 'TCClient';
    constructor({host,port, jsonmode=true}){
        this.client = new net.Socket();
        this.host = host;
        this.port = port;
        this.jsonmode = jsonmode;
        this.events = {'data':[],'error':[],'close':[]};
    }
    on(ev,fn){
        this.events[ev].push(fn);
    }
    start(){
        const self = this;
        const client = this.client;
        client.connect(self.port, self.host, function() {
            console.info(`TCPClient on ${self.host}:${self.port} connected`);
        });

        client.on('data', function(data) {
            if(self.jsonmode){
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
                self.events['data'].forEach(event => event(client,`${data.toString()}`));
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
        if (client!=null)
            client.write(message);
    }
}

module.exports = { TcpClient }