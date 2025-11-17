const { timeStamp } = require('console');
const net = require('net');
class TcpServer {
    className = 'TCPServer';
    constructor({ port }) {
        this.port = port;
        this.address = "";
        this.family = "";
        this.ipaddr = "";
        this.server = null;
        this.events = [];
    }
    addReceiveEvent(event) {
        console.log("event added", event);
        this.events.push(event);
    }
    start() {
        const me = this;
        const server = net.createServer(function (socket) {
            socket.on('data', (data) => {
                console.log("me.events.length ", me.events.length);
                me.events.forEach(event => {
                    event(`${data.toString()}`, socket);
                });
            });
            socket.on('end', () => {
                console.info('TcpServer.createServer.end: socket client disconnected');
            });
            socket.on('error', (err) => {
                console.info('socket client error', err);
            });
        });

        server.on('error', function (error) {
            console.error('TcpServer.createServer.error: ', error.message);
            server.close();
        });

        server.listen(me.port, () => {
            console.info(`TcpServer.createServer: listen port ${me.port}`);
        });
    }
    getInfo() {
        return {
            port: this.port,
            address: this.address,
            ipaddr: this.ipaddr
        };
    }
}
module.exports = { TcpServer }