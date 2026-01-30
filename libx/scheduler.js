const { Worker } = require('node:worker_threads');

class Scheduler {
	constructor() {
		this.events = { "time.ping": [], "time.save": [], "time.storage": [] };
	}
	on(ev, fn, ...args) {
		if (this.events[ev] == undefined) this.events[ev] = [];
		this.events[ev].push(fn);
	}
	start() {
		const self = this;
		const schedulerWorker = new Worker('./libx/workers/scheduler.worker.js', {
			workerData: { timerEach: 5000 }
		});

		schedulerWorker.on("message", (message) => {
			if (message.command == "schedule.ping") {
				self.events['time.ping'].forEach(fn => fn(message.payload));
			}
			if (message.command == "schedule.save") {
				self.events['time.save'].forEach(fn => fn(message.payload));
			}
			if (message.command == "schedule.storage") {
				self.events['time.storage'].forEach(fn => fn(message.payload));
			}
		});
	}
}

module.exports = { Scheduler }