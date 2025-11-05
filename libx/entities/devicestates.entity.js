const {Entity} = require('../database/entity.js');

class DeviceStatesEntity extends Entity{
	constructor(db){
		super(db,'device_states');
		this.addField('id','number',null,true,true);		
		this.addField('device_id','text');
		this.addField('state_id','number');
		this.addField('name','text');
		this.addField('value','text');
		this._setup();
	}
}
module.exports = {DeviceStatesEntity}