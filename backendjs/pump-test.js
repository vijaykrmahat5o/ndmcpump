var net = require('net');
var moment = require("moment");
var empty = require('is-empty');
var mysql = require('mysql');

var HOST = '216.10.247.24';
var PORT = 32281;

var interval = '';

var fx = 0;
var lx = 6;

var start_tag = '5b';
var end_tag = '5d';
var data_len = 236;

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
        
        var d = matches[1];
		
		console.log(">>>   "+d);
		
		if(d != ""){
		    var STATUS = "";
			var TYPE = "";
			var ACTUAL_DATA = d;
			var ACTUALDATALENGTH = d.length;
			
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
			
			var RTC_TIME = DS_HH+"."+DS_MI;
			
			console.log("DATETIME "+DATA_STAMP);
			
			fx += lx; lx = 30;
			IMEI_NO = '';
			for(var i = fx; i<fx+lx; i+=2){
				IMEI_NO += String.fromCharCode(parseInt(d.substr(i,2), 16));
			}				
			if(IMEI_NO == '000000000000000'){
				console.log('WRONG IMEI NO');
				return false;
			}
			console.log("IMEI_NO "+IMEI_NO);
			
			fx += lx; lx = 2;
			var SL_VOLTAGE = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var v1 = d.substr(fx,lx);
			fx += lx; lx = 2;
			var v2 = d.substr(fx,lx);
			var BT_VOLTAGE = HexToDec(String(v2)+String(v1));
			
			fx += lx; lx = 26;
			var DIGITAL_OUTPUT = '';
			for(var i = fx; i<fx+lx; i+=2){
				DIGITAL_OUTPUT += String(parseInt(d.substr(i,2), 16));
			}
			
			var OUTPUT_STATUS = DIGITAL_OUTPUT.substr(6, 1);
			
			var ACTUAL_DATA = d;
			var ACTUALDATALENGTH = d.length;
			
			//fx += lx; lx = 6;
			//var DIGITAL_INPUT = d.substr(fx, lx);
			var DOOR_STATUS = DIGITAL_OUTPUT.substr(12, 1);
			
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

			if(IO_YY == 0){
				var now = new Date();
				IO_STAMP = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
			}
			
			fx += 8;
			
			fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_R = getHexToDecimal(v1,v2);
    		
    		fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_Y = getHexToDecimal(v1,v2);
    		
    		fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_B = getHexToDecimal(v1,v2);
			
			
			console.log("SUPPLY "+ SL_VOLTAGE);
			console.log("BATTERY "+ BT_VOLTAGE);
			console.log("DIGITAL_OUTPUT "+DIGITAL_OUTPUT);
			console.log("OUTPUT_STATUS "+ OUTPUT_STATUS);
			console.log("DOOR_STATUS "+ DOOR_STATUS);
			console.log("IO_STAMP "+IO_STAMP);
			
			console.log("VOLTAGE_R "+VOLTAGE_R);
			console.log("VOLTAGE_Y "+VOLTAGE_Y);
			console.log("VOLTAGE_B "+VOLTAGE_B);
			
			fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_RY = getHexToDecimal(v1,v2);
    		
    		fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_YB = getHexToDecimal(v1,v2);
    		
    		fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var VOLTAGE_BR = getHexToDecimal(v1,v2);
    		
    		console.log("VOLTAGE_RY "+VOLTAGE_RY);
			console.log("VOLTAGE_YB "+VOLTAGE_YB);
			console.log("VOLTAGE_BR "+VOLTAGE_BR);
    		
    		
			fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var CURRENT_R = getHexToDecimal(v1,v2);
    		
			fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var CURRENT_Y = getHexToDecimal(v1,v2);
    		
			fx += lx; lx = 4;
    		var v1 = d.substr(fx, lx);
    		fx += lx; lx = 4;
    		var v2 = d.substr(fx, lx);
    		var CURRENT_B = getHexToDecimal(v1,v2);
			
			console.log("CURRENT_R "+CURRENT_R);
			console.log("CURRENT_Y "+CURRENT_Y);
			console.log("CURRENT_B "+CURRENT_B);
			PF_R = 0;
			PF_Y = 0;
			PF_B = 0;
			KW_R = 0;
			KW_Y = 0;
			KW_B = 0;
			KVA_R = 0;
			KVA_Y = 0;
			KVA_B = 0;
			KVAR_R = 0;
			KVAR_Y = 0;
			KVAR_B = 0;
			KWH = 0;
			KVAH = 0;
			KVARH = 0;
			METER_NO = 0;
			METER_STAMP = '';
			TOTAL_KW = 0;
			TOTAL_KVA = 0;
			TOTAL_PF = 0;
			FREQUENCY = 0;
			REVERSE_TEMPER = 0;
			CURRENT_TEMPER = 0;
			TOTAL_KVAR = 0;
			
			INPUTS = DIGITAL_OUTPUT.substr(0, 6);
			OUTPUTS = DIGITAL_OUTPUT.substr(6, DIGITAL_OUTPUT.length);
			
			var sqlquery = {
    			imei_no: IMEI_NO,
    			data_stamp: DATA_STAMP,
    			actual_data: ACTUAL_DATA,
    			actualdatalength: ACTUALDATALENGTH,
    			inputs: INPUTS,
    			outputs: OUTPUTS,
    			sl_voltage: SL_VOLTAGE,
    			io_stamp: IO_STAMP,
    			voltage_r: VOLTAGE_R,
    			voltage_y: VOLTAGE_Y,
    			voltage_b: VOLTAGE_B,
    			voltage_ry: VOLTAGE_RY,
    			voltage_yb: VOLTAGE_YB,
    			voltage_br: VOLTAGE_BR,
    			amp_r: CURRENT_R,
    			amp_y: CURRENT_Y,
    			amp_b: CURRENT_B,
    		}
    		connection.query('INSERT INTO trans_received_data SET ? , insert_time = NOW();', sqlquery,
        		function selectCb(err, results, fields) {
        			if (err) { console.log(err);	
        			}else {
        				connection.query('SELECT * FROM trans_last_data WHERE imei_no='+IMEI_NO, 
        				function selectCb(err2, rows2, fields2) {
        						if (err2) { console.log(err2);	
        						}else {
        							if(rows2.length){
        								updatequery = "";
        								
        								var sqlquery2 = {
        									data_stamp: DATA_STAMP,
        									actual_data: ACTUAL_DATA,
        									actualdatalength: ACTUALDATALENGTH,
        									sl_voltage: SL_VOLTAGE,
        									inputs: INPUTS,
    			                            outputs: OUTPUTS,
    			                            io_stamp: IO_STAMP,
    			                            voltage_r: VOLTAGE_R,
                                			voltage_y: VOLTAGE_Y,
                                			voltage_b: VOLTAGE_B,
                                			amp_r: CURRENT_R,
                                			amp_y: CURRENT_Y,
                                			amp_b: CURRENT_B,
                                			voltage_ry: VOLTAGE_RY,
                                			voltage_yb: VOLTAGE_YB,
                                			voltage_br: VOLTAGE_BR,
        								}
        								connection.query('UPDATE trans_last_data SET ?, update_time=NOW() WHERE imei_no = ?;', [sqlquery2, IMEI_NO],
        								function selectCb(err3, results3, fields3) {
        									if (err3) {
        										console.log(err3);	
        									}else {
        										console.log("TRANS LAST DATA ROW UPDATED");
        									}
        								}); 
        							}else{
        								cname = "";
        								cvalue = "";
        								
        								var sqlquery4 = {
        									imei_no: IMEI_NO,
        									data_stamp: DATA_STAMP,
        									actual_data: ACTUAL_DATA,
        									actualdatalength: ACTUALDATALENGTH,
        									sl_voltage: SL_VOLTAGE,
        									inputs: INPUTS,
    			                            outputs: OUTPUTS,
    			                            io_stamp: IO_STAMP,
    			                            voltage_r: VOLTAGE_R,
                                			voltage_y: VOLTAGE_Y,
                                			voltage_b: VOLTAGE_B,
                                			amp_r: CURRENT_R,
                                			amp_y: CURRENT_Y,
                                			amp_b: CURRENT_B,
                                			voltage_ry: VOLTAGE_RY,
                                			voltage_yb: VOLTAGE_YB,
                                			voltage_br: VOLTAGE_BR,
        								}
        								
        								connection.query('INSERT INTO trans_last_data SET ?, update_time=NOW();', sqlquery4,
        								function selectCb(err4, results4, fields4) {
        									if (err4) throw err4;
        									else {
        										console.log("INSERT TRANS LAST DATA");
        									}
        								});
        							}
        						}
        					}); 
        					
        					console.log("INSERT DATA OK");
        				}
        			});
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
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PORT);

function Pad (str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
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
function DecToHex(dec) {
    var number = Number(dec).toString(16).toUpperCase()
    if( (number.length % 2) > 0 ) { number= "0" + number }
    return number;
}
function HexToDec(value){
	return parseInt(value, 16);
}

