const dotenv = require('dotenv').config();
const {HttpServer} = require("./network/http.server.js");
const {TcpServer} = require("./network/tcp.server.js");
const {UdpServer} = require("./network/udp.server.js");
const {DBManager}  = require("./database/dbmanager.js");
const {KafkaGPS} = require("./network/kafka.gps.js")
const {DeviceController} = require('../libs/servercore/devicecontroller.js');

const httpServer        = new HttpServer({port:process.env.HTTP_PORT ,publicFolder: "public"});
const tcpServer         = new TcpServer({port:process.env.TCP_PORT});
const udpServer         = new UdpServer({port:process.env.UDP_PORT});
const dbm 		        = new DBManager({name:'tracking-capture'});
const kafkaGps 			= new KafkaGPS({brokers:["172.20.50.123:9092"]});
const deviceController	= new DeviceController(tcpServer,udpServer,kafkaGps,dbm);

class TrackCapture{
    constructor(){
    }
    start(){
        console.info("TrackCapture 3.0.0");
        httpServer.start();
        tcpServer.start();
        udpServer.start();
        
    }
}
module.exports = { TrackCapture };