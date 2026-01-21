
const fs = require("fs");
console.log("process.env.UUID",process.env.UUID);


function generateShortHexId(length){
    let result = '';
    const characters = '0123456789abcdef';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


class AuthUuid{
	config(){
		if(process.env.UUID==undefined) { 
			fs.appendFileSync(".env","\nUUID="+generateShortHexId(8)); console.log("writting");
			const dotenv = require('dotenv').config();
		}
	}
}


module.exports = new AuthUuid()