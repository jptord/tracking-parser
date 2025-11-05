const {Entity} = require('../database/entity.js');

class GpsspecEntity extends Entity{
	constructor(db){
		super(db,'gpsspec','code');
		this.addField('code','text',null,true,false);
		this.addField('data','json');
		this.addField('enabled','boolean','1');
		this._setup();
	}
}
module.exports = {GpsspecEntity}