const express       = require("express");
const cors          = require("cors");
const compression = require('compression');
const fs            = require("fs");

class HttpServer extends express{
    constructor({port, publicFolder}){
        super();
        this.port = port;
        this.publicFolder = publicFolder;
        var corsOptions = {
            origin: '*',
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
        }
        this.use(compression());
        this.use(cors(corsOptions));
        this.use(express.json({limit: '25mb'}));
        this.use(express.text({limit: '25mb'}));
        this.use(express.urlencoded({ extended: true,parameterLimit: 100000, limit: '50mb' }));
        this.use("/", express.static(this.publicFolder));
    }
    start = function(){
        this.listen(this.port, () => {  
            console.info(`HttpServer.start: listen port ${this.port}`);
        });  
    }
}
module.exports = {HttpServer};