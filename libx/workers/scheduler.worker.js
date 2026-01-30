const dotenv = require('dotenv').config();
const fs = require('fs');
const { parentPort, workerData } = require('node:worker_threads');
const { timerEach } = workerData;

let PING_INTERVAL_MS = process.env.PING_INTERVAL_MS;
let STORAGE_INTERVAL_HRS = process.env.STORAGE_INTERVAL_HRS * 60 * 60 * 1000;
let SAVE_INTERVAL_MIN = process.env.SAVE_INTERVAL_MIN * 60 * 1000;

let schedules = {};

function getToday() {
	const dateObject = new Date();
	const s = dateObject.getSeconds();
	return Math.floor(dateObject / 1000) * 1000 - s * 1000;
}
function getDay() {
	const dateObject = new Date();
	return dateObject.getDay();
}
function DateToTimestamp(dateStr, hourStr) {
	const dateString = dateStr + "T" + hourStr + ":00";//"2024-01-15T10:00:00Z";
	const dateObject = new Date(dateString);
	//return dateObject.getTime()+14400000;
	return dateObject.getTime();
}
function TimestampToHourMinDelta(timestamp) {
	/*const  dateObject = new Date(t+0);
	const h = dateObject.getHours();
	const m = dateObject.getMinutes();*/
	const t = timestamp / 1000;
	const sec = ((t) % 60);
	const min = ((t - sec) / 60) % 60;
	const hor = (((t - sec) / 60) - min) / 60;

	return hor + "h:" + min + "m:" + sec + "s";
}
function TimestampToDate(timestamp) {
	const dateObject = new Date(timestamp + 0);
	const h = dateObject.getHours();
	const m = dateObject.getMinutes();
	const s = dateObject.getSeconds();
	const D = dateObject.getDate();
	const M = dateObject.getMonth() + 1;
	const Y = dateObject.getFullYear();
	const Z = dateObject.getTimezoneOffset();
	return Y + "-" + (M + "").padStart(2, '0') + "-" + (D + "").padStart(2, '0');

	return hor + "h:" + min + "m:" + sec + "s";
}
function TimestampToDateHourMin(t) {
	const dateObject = new Date(t + 0);
	const h = dateObject.getHours();
	const m = dateObject.getMinutes();
	const s = dateObject.getSeconds();
	const D = dateObject.getDate();
	const M = dateObject.getMonth() + 1;
	const Y = dateObject.getFullYear();
	const Z = dateObject.getTimezoneOffset();
	return (D + "").padStart(2, '0') + "/" + (M + "").padStart(2, '0') + "/" + Y + " " + h + "h:" + m + "m:" + s + "s" + " Z" + Z;
}
function pad(n) {
	return (n + "").padStart(2, '0');
}
function TimestampToHourMin(t) {
	const dateObject = new Date(t + 0);
	const h = dateObject.getHours();
	const m = dateObject.getMinutes();
	const s = dateObject.getSeconds();
	const D = dateObject.getDate();
	const M = dateObject.getMonth() + 1;
	const Y = dateObject.getFullYear();
	const Z = dateObject.getTimezoneOffset();
	return pad(h) + ":" + pad(m);
}
function scanScheduleFolder() {
	//schedules = {};
	const listSchdules = fs.readdirSync(schedulePath);
	for (let i = 0; i < listSchdules.length; i++) {
		const file = listSchdules[i];
		let base = schedulePath + '/' + file;
		let nameUid = file.replace("-schedule.json", "");
		if (!fs.statSync(base).isDirectory()) {
			const content = fs.readFileSync(base, 'utf8');
			if (content == '') return;
			const schedule = JSON.parse(content);
			if (schedules[nameUid] == null) {
				schedules[nameUid] = schedule;
				schedules[nameUid]['id'] = nameUid;
			} else {
				Object.keys(schedule).forEach(k => {
					schedules[nameUid][k] = schedule[k];
				});
			}
		}
		parentPort.postMessage({ command: "schedule.load", payload: schedules });
	}
	//console.log("schedules", schedules);
}
function updateSchedule(id) {
	const schedule = schedules[id];
	return new Promise((res, rej) => {
		fs.writeFile(`./data/schedules/${id}-schedule.json`, JSON.stringify(schedule, null, '\t'), 'utf8', (err) => {
			if (err) {
				console.error('schedule.new Error writing file:', err);
				rej();
				return;
			}
			console.log('schedule.new written successfully!');
			res();
		});
	})
}

setInterval(() => {
	parentPort.postMessage({ command: "schedule.ping", payload: PING_INTERVAL_MS });
}, PING_INTERVAL_MS);

setInterval(() => {
	parentPort.postMessage({ command: "schedule.save", payload: SAVE_INTERVAL_MIN });
}, SAVE_INTERVAL_MIN);

setInterval(() => {
	parentPort.postMessage({ command: "schedule.storage", payload: STORAGE_INTERVAL_HRS });
}, STORAGE_INTERVAL_HRS);

parentPort.on("message", (message) => {
	if (message.command === 'schedule.loading') {
		scanScheduleFolder();
	}
});