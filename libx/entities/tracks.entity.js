const {Entity} = require('../database/entity.js');

class TracksEntity extends Entity{
	constructor(db){
		super(db,'tracks','uid');
		this.addField('uid','number',null,true,true);
		this.addField('device_id','text');
		this.addField('fromdate','number');
		this.addField('todate','number');
		this.addField('data','blob');
		this._setup();
	}
}
module.exports = {TracksEntity}