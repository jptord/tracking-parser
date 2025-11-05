const {overrideLog} = require('./libx/tools/logs.js') ;
const {TrackCapture} = require("./libx/track.capture.js");
overrideLog();
const trackCapture = new TrackCapture();
trackCapture.start();