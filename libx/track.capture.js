const dotenv = require('dotenv').config();
const { HttpServer } = require("./network/http.server.js");
const { TcpServer } = require("./network/tcp.server.js");
const { UdpServer } = require("./network/udp.server.js");
const { DBManager } = require("./database/dbmanager.js");
const { KafkaGPS } = require("./network/kafka.gps.js")
const { DeviceController } = require('./tracking/device.controller.js');
const { KernoMonitor } = require('./tracking/monitor.js');

const httpServer = new HttpServer({ port: process.env.HTTP_PORT, publicFolder: "public" });
const tcpServer = new TcpServer({ port: process.env.TCP_PORT });
const udpServer = new UdpServer({ port: process.env.UDP_PORT });
const dbm = new DBManager({ name: 'tracking-capture' });
const kafkagps = new KafkaGPS({ id:'tracking-capture-1',brokers: ["172.20.50.59:9092"] });
const deviceController = new DeviceController(tcpServer, udpServer, kafkagps, dbm);
const kernoMonitor 	= new KernoMonitor({ port: 7777, app: httpServer });

class TrackCapture {
	constructor() {
	}
	start() {
		console.info("TrackCapture 3.0.0");
		httpServer.start();
		tcpServer.start();
		udpServer.start();
		kernoMonitor.setDevices(deviceController);
		kernoMonitor.start();
		tcpServer.addReceiveEvent((msg, socket) => {
			console.log('tcpServer.addReceiveEvent: ' + msg);
			deviceController.input(msg, socket, (device, timestamp) => {
				if (device != undefined) {
					device.setTcp(socket);
					kernoMonitor.updateDevice(device);

					kafkagps.send('tracking-gps', JSON.stringify(device.get()));
				} else console.log("cant'read", msg);
			});
			console.log(msg);
			
		});
		udpServer.addReceiveEvent((msg) => {
			console.log('udpServer.addReceiveEvent: ' + msg);			
			deviceController.input(msg, null, (device, timestamp) => {
			});
			console.log(msg);
			
		});
		httpServer.get('/data', (req, res) => {

			deviceController.input(req.query.msg, (device, timestamp) => {
			});
			kernoDevices.process(req.query.msg, (d, t) => {
				kernoMonitor.updateDevice(d);
			});
			if (DEBUG_LEVEL >= 5) console.log(req.query.msg);
			res.end();
		});
		/* Output Data */
		/* Common API */
		httpServer.get('/connected', (req, res) => {
			console.log('connected test');
			res.end(JSON.stringify({ result: "ok" }));
		});
		httpServer.get('/', (req, res) => {
			console.log('/ info');
			res.end(JSON.stringify({ udpServer: udpServer.getInfo(), trackServer: tcpServer.getInfo() }));
		});
		httpServer.get('/info', (req, res) => {
			console.log('info');
			res.end(JSON.stringify({ udpServer: udpServer.getInfo(), trackServer: tcpServer.getInfo() }));
		});
		httpServer.get('/readme', (req, res) => {
			fs.readFile('./README.md', 'utf8', (err, data) => {
				if (err) {
					console.error(err);
					return;
				}
				res.end(data);
			});
		});
		httpServer.get('/devices', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ "devices": deviceController.getDevices() }));
		});
		httpServer.get('/save', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ "devices": deviceController.save() }));
		});
		httpServer.get('/devicesAll', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ "devices": deviceController.getDevicesAll() }));
		});
		/* clear devices ONLY DEVELOP */
		/*httpServer.get('/devices/clear', (req, res) => {
			//console.log("/devices/clear");
			let result = kernoDevices.clearDevices();	
			res.end(`{"result":"${result}"}`);
		});*/
		httpServer.get('/device/:id', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			let device = deviceController.getDevice(req.params.id);
			if (device != null)
				res.end(JSON.stringify(device.get()));
			else
				res.end();
		});

		/* update states */

		httpServer.post('/device/:id/update/state/silence', (req, res) => {
			deviceController.processStates(req, res, (device) => {
				kernoMonitor.updateDevice(device);
				res.end(JSON.stringify(device.getAllSetup()));
			});
		});
		httpServer.post('/device/:id/update/config', (req, res) => {
			deviceController.processConfig(req, res, (device, errs) => {
				kernoMonitor.updateDevice(device);
				res.end(JSON.stringify({ "result": "ok", "errors": errs }));
			});
		});
		httpServer.post('/device/:id/update/state', (req, res) => {
			deviceController.processStatesFull(req, res, (device) => {
				kernoMonitor.updateDevice(device);
				res.end(`{"result":"ok"}`);
			});
		});
		httpServer.post('/device/:id/setup/state', (req, res) => {
			deviceController.setSetupRequest(req, res, (device) => {
				kernoMonitor.updateDevice(device);
			})
		});
		httpServer.get('/device/:id/reset', (req, res) => {
			let device = deviceController.getDevice(req.params.id);
			device.clearTrack();
			kernoMonitor.updateDevice(device);
			if (device != null) {
				res.setHeader('Content-Type', 'application/json');
				res.end(`{"result":"ok"}`);
			} else
				res.end();
		});
		httpServer.get('/device/:id/tracks', (req, res) => {
			let device = deviceController.getDevice(req.params.id);
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ "tracks": device.getTracks() }));
		});
		httpServer.get('/device/:id/trackshistory', (req, res) => {
			let device = deviceController.getDevice(req.params.id);
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ "tracks": device.getTracksHistory() }));
		});
	}
}
module.exports = { TrackCapture };