const udp = require('dgram');
class UdpServer{
    className = 'UdpServer';
    constructor({port}){
        this.port 		= port ;
        this.address 	= "" ;
        this.family 	= "" ;
        this.ipaddr 	= "" ;
        this.server 	= null;
        this.events 	= [] ;
    }   
    addReceiveEvent(event){
        this.events.push(event);
    }
    start(){				
        const me = this;
        const server = udp.createSocket('udp4');

        server.on('error',function(error){
            console.error('Error: ' + error);
            server.close();
            });

        server.on('listening',function(){
            var address 	= server.address();
            var port 			= address.port;
            var family 		= address.family;
            var ipaddr 		= address.address;
            me.server			= server;
            me.address		= address;
            me.family			= family;
            me.ipaddr			= ipaddr;
            console.info(`UdpServer.createServer: listen port ${port}`);
            });		
            
        server.on('message', (msg, rinfo) => {
            this.events.forEach( event => {
                event(`${msg}`);
            });
        });
        server.bind(this.port);        
    }
    getInfo(){
        return {
            port: 		this.port,
            address: 	this.address,
            ipaddr: 	this.ipaddr
        };
    }
}
module.exports = { UdpServer };