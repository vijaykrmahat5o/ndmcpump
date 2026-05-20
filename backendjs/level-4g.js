var net = require('net');
var moment = require("moment");
var empty = require('is-empty');
var mysql = require('mysql');
var dateFormat = require('dateformat');
var HOST = '216.10.247.24';
var PORT = 32294;

var interval = '';


var connection = mysql.createConnection({
	multipleStatements: true,
	host     : 'localhost',
	user     : 'wlms_usr',
	password : 'anavvytozn81',
	database : 'wlms_db',
	dateStrings: [
		'DATE',
		'DATETIME'
	]
});



var fx = 0;
var lx = 6;

var server = net.createServer(function(sock) {
    console.log('SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
    sock.on('data', function(data) 
	{
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var hexdata = buff.toString('hex');
		console.log('ORIGINAL: ' + hexdata);
		
		
		var regExp = /(?<=5b)(.*)(?=5d)/;
        var matches = hexdata.match(regExp) 
        
        var d = '';
        if(!empty(matches)){
            if(matches.length > 0){
        		d = matches[1];
        		
        		var fx = 0; 
				var lx = 0;
				
				fx += lx; lx = 6;
				var DS_DATE = d.substr(fx, lx);
				var DS_DD = Pad(parseInt(DS_DATE.substr(0, 2), 16), 2);
				var DS_MM = Pad(parseInt(DS_DATE.substr(2, 2), 16), 2);
				var DS_YY = Pad(parseInt(DS_DATE.substr(4, 2), 16), 2);
				
				fx += lx; lx = 6;
				var DS_TIME = d.substr(fx, lx);
				var DS_HH = Pad(parseInt(DS_TIME.substr(0, 2), 16), 2);
				var DS_MI = Pad(parseInt(DS_TIME.substr(2, 2), 16), 2);
				var DS_SS = Pad(parseInt(DS_TIME.substr(4, 2), 16), 2);
				var DATA_STAMP = DS_YY+"-"+DS_MM+"-"+DS_DD+" "+DS_HH+":"+DS_MI+":"+DS_SS;
				
				fx += lx; lx = 30;
				IMEI_NO = '';
				for(var i = fx; i<fx+lx; i+=2){
					IMEI_NO += String.fromCharCode(parseInt(d.substr(i,2), 16));
				}
				fx += lx; lx = 2;
				var SL_VOLTAGE = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var v1 = d.substr(fx,lx);
				fx += lx; lx = 2;
				var v2 = d.substr(fx,lx);
				var BT_VOLTAGE = HexToDec(String(v2)+String(v1));
				
				fx += lx; lx = 26;
				var IO_DATA = '';
				for(var i = fx; i<fx+lx; i+=2){
					IO_DATA += String(parseInt(d.substr(i,2), 16));
				}
				
				fx += lx; lx = 6;
				var IO_DATE = d.substr(fx, lx);
				var IO_DD = Pad(parseInt(IO_DATE.substr(0, 2), 16), 2);
				var IO_MM = Pad(parseInt(IO_DATE.substr(2, 2), 16), 2);
				var IO_YY = Pad(parseInt(IO_DATE.substr(4, 2), 16), 2);
				
				fx += lx; lx = 6;
				var IO_TIME = d.substr(fx, lx);
				var IO_HH = Pad(parseInt(IO_TIME.substr(0, 2), 16), 2);
				var IO_MI = Pad(parseInt(IO_TIME.substr(2, 2), 16), 2);
				var IO_SS = Pad(parseInt(IO_TIME.substr(4, 2), 16), 2);
				var IO_STAMP = IO_YY+"-"+IO_MM+"-"+IO_DD+" "+IO_HH+":"+IO_MI+":"+IO_SS;
				
				fx += lx; lx = 8;
				
				var LEVEL_DATA = '';
				//for(var i = fx; i<fx+lx; i+=2){
					LEVEL_DATA += parseInt(d.substr(fx+6,2)+""+d.substr(fx+4,2)+""+d.substr(fx+2,2)+""+d.substr(fx+0,2), 16);
				//}
				console.log("DATA STAMP: "+DATA_STAMP);
				console.log("IMEI NO: "+IMEI_NO);
				console.log("SL VOLTAGE: "+SL_VOLTAGE);
				console.log("BT VOLTAGE: "+BT_VOLTAGE);
				console.log("IO STAMP: "+IO_STAMP);
				console.log("LEVEL DATA: "+d.substr(fx,8)+" "+LEVEL_DATA);
				
				ACTUAL_DATA = d;
				ACTUALDATALENGTH = d.length;
				ANALOGINPUT = LEVEL_DATA/10;
				
				var sqlquery = {
    				imei_no: IMEI_NO,
    				data_stamp: DATA_STAMP,
    				actual_data: ACTUAL_DATA,
    				actualdatalength: ACTUALDATALENGTH,
    				sl_voltage: SL_VOLTAGE,
    				analoginput: ANALOGINPUT
    			}
    			
    			connection.query('INSERT INTO trans_received_data SET ? , insert_time = NOW();', sqlquery,
    			function selectCb(err, results, fields) {
    				if (err) {
    					console.log(err);	
    				}else {
    					connection.query('SELECT * FROM trans_last_data WHERE IMEI_NO='+IMEI_NO,
    					function selectCb(err2, rows2, fields2) {
    						if (err2) {
    							console.log(err2);	
    						}else {
    							if(rows2.length){
    								var sqlquery = {
    									data_stamp: DATA_STAMP,
    									actual_data: ACTUAL_DATA,
    									actualdatalength: ACTUALDATALENGTH,
    									sl_voltage: SL_VOLTAGE,
    									analoginput: ANALOGINPUT
    								}
    								
    								connection.query('UPDATE trans_last_data SET ?, update_time=NOW() WHERE imei_no = ?;', [sqlquery, IMEI_NO],
    								function selectCb(err3, results3, fields3) {
    									if (err3) {
    										console.log(err3);	
    									}else {
    										console.log("TRANS LAST DATA ROW UPDATED");
    									}
    								}); 
    							}else{								
    								var sqlquery = {
    									imei_no: IMEI_NO,
    									data_stamp: DATA_STAMP,
    									actual_data: ACTUAL_DATA,
    									actualdatalength: ACTUALDATALENGTH,
    									sl_voltage: SL_VOLTAGE,
    									analoginput: ANALOGINPUT
    								}
    								
    								connection.query('INSERT INTO trans_last_data SET ?, update_time=NOW() ', sqlquery,
    								function selectCb(err4, results4, fields4) {
    									if (err4) {
    										console.log(err4);	
    									}else {
    										console.log("INSERT TRANS LAST DATA");
    									}
    								});
    							}
    						}
    					}); 
    					
    					console.log("INSERT DATA OK ... ");
    				}
    			}); 
            }
        }
    });
    sock.on('close', function(data) 
	{
        console.log('SOCKET CLOSING ');
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
	});
	sock.setKeepAlive(true);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
server.listen(PORT, HOST);

server.on('connection', function(sock)
{
	console.log('SOCKET CONNECTED....');

	var now = new Date();
	var newdate = dateFormat(now, "ddmmyyHHMMss");
	
	var hexvalue = [0x52,0x54,0x43,0x2C];
	for(var i = 0; i<12; i+=2){
		hexvalue.push('0x'+newdate.substr(i,2));
	}
	hexvalue.push('0x0D');
	hexvalue.push('0x0A');

	console.log('SET RTC '+hexvalue);
	
	var buff = new Buffer(hexvalue, "hex");
	sock.write(buff);
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PORT);

function Pad (str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
}
function hexval(str){
	var arr = [];
	for(var i=0; i<str.length-1; i+=2){
		arr.push(str.substr(i, 2));
	}
	var code = arr.reverse().join().replace(/,/g,'').toString();
	return parseInt(code, 16);
}

function HexToFloat(value){
	return new Buffer(value, 'hex').readFloatBE(0).toFixed(3);
}
function HexToDecimal(value){
	return parseInt(Pad(value,4), 16);
}
function HexToBin(value){
	var bytes = "";
	for(var i=0; i< value.length; i++){
		bytes += Pad(parseInt(value.substr(i, 1), 16).toString(2), 4);
	}
	return bytes;
}
function getHexToDecimal(v1,v2){
	return String(HexToDecimal(String(v2)+String(v1)));//+String(HexToDecimal(v2));
	//return String(HexToFloat(v1))+String(HexToFloat(v2));
}

function dec2hex(dec) {
    var number = Number(dec).toString(16).toUpperCase()
    if( (number.length % 2) > 0 ) { number= "0" + number }
    return number;
}

function HexToDec(value){
	return parseInt(value, 16);
}