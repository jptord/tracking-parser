const {Entity} = require('../database/entity.js');

class DeviceEntity extends Entity{
	constructor(db){
		super(db,'devices');
		this.addField('id','text',null,true,false);
		this.addField('type','text','apk');
		this.addField('brand','text','');
		this.addField('model','text');
		this.addField('gpsspec_id','text');
		this.addField('enabled','boolean',true);
		this._setup();
	}
}
module.exports = {DeviceEntity}