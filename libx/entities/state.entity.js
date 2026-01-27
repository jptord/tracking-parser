const {Entity} = require('../database/entity.js');

class StateEntity extends Entity{
	constructor(db){
		super(db,'states','id');
		this.addField('id','number',null,true,true);				
		this.addField('bytetype','text');
		this.addField('name','text');
		this.addField('description','text');
		this._setup();
	}
}
module.exports = {StateEntity}