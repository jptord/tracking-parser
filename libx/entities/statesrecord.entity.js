const {Entity} = require('../database/entity.js');

class StatesRecordEntity extends Entity{
	constructor(db){
		super(db,'states_record','id');
		this.addField('id','number',null,true,true);
		this.addField('device_id','text');
		this.addField('fromdate','number');
		this.addField('todate','number');
		this.addField('data','blob');
		this._setup();
	}
}
module.exports = {StatesRecordEntity}