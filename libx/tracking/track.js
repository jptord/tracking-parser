
class Track{
    
	constructor(data={t:0,lat:0,lon:0,bat:0,acc:0,stp:0}){
		this.t = Number(data.t);
		this.lat = Number(data.lat);
		this.lon = Number(data.lon);
		this.bat = Number(data.bat);
		this.acc = Number(data.acc);
		this.stp = Number(data.stp);
    }
	set(data={t:0,lat:0,lon:0,bat:0,acc:0,stp:0}){
		this.t = data.t;
		this.lat = data.lat;
		this.lon = data.lon;
		this.bat = data.bat;
		this.stp = data.stp;
	}
}

module.exports = { Track } ;