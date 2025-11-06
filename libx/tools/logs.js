const clc = require('cli-color');

function dateNow(){
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;
}
function trace (){	
    //return new Error().stack.match(/(?<=at [a-zA-Z]+\.\<[a-zA-Z].+\> \().*(?=\)\n)/gm)[0];
	return new Error().stack.match(/(?<=at ((?!console).).[a-zA-Z]+\.(\<)?((?!error).).[a-zA-Z].+(\>)? \().*(?=\)\n)/gm)[0];
}
function overrideLog(){
    const originalConsoleLog = console.log;
    console.log = function() {
        originalConsoleLog.apply(console, [`${dateNow()} [DEBUG]`, ...Array.from(arguments)]); 
    };
    console.info = function() {        
        originalConsoleLog.apply(console, [clc.blue(`${dateNow()} [INFO]`), ...Array.from(arguments)]); 
    };
    console.error = function() {        
        originalConsoleLog.apply(console, [clc.red(`${dateNow()} [ERROR] (${trace()})`), ...Array.from(arguments)]); 
    };
    console.warn = function() {        
        originalConsoleLog.apply(console, [clc.yellow(`${dateNow()} [WARN]`), ...Array.from(arguments)]); 
    };    
}

module.exports = { overrideLog };