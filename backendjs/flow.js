var net = require('net');
var moment = require("moment");
var empty = require('is-empty');
var mysql = require('mysql');
var dateFormat = require('dateformat');
var schedule = require('node-schedule');
var http = require('http');
var httpserver = http.createServer();
var socketio = require('socket.io')(httpserver);

const struct = require('python-struct');

var HOST = '216.10.247.24';
var PUMP_PORT = 32280;
var LEVEL_PORT_4G = 32293;
var LEVEL_PORT_2G = 32279;
var HTTP_PORT = 32281;
var FLOW_PORT = 32283;

var interval = '';

var fx = 0;
var lx = 6;

var start_tag = '5b';
var end_tag = '5d';
var data_len = 236;

var PUMP_DATA = new Object();
var LEVEL_DATA = new Object();
var FLOW_DATA = new Object();

var sockets = [];
var sockets_info = [];

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


setTimeout(load_flow, 1000);
function load_flow(){
	var sql = "SELECT mp.id, mp.imei_no, mp.flow_imei_no, mp.min_flow, mp.max_flow, mp.min_voltage, mp.min_pressure, mp.max_pressure, mp.min_voltage_pressure FROM master_pumps AS mp WHERE mp.flow_imei_no != '';";
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
					var FLOW_IMEI_NO = results[i].flow_imei_no;
					if(FLOW_IMEI_NO){
						FLOW_DATA[FLOW_IMEI_NO] = new Object();
						FLOW_DATA[FLOW_IMEI_NO]['IMEI_NO'] = results[i].imei_no;
						FLOW_DATA[FLOW_IMEI_NO]['SOCKET'] = '';
						FLOW_DATA[FLOW_IMEI_NO]['FLOW_IMEI_NO'] = results[i].flow_imei_no;
						FLOW_DATA[FLOW_IMEI_NO]['MIN_FLOW'] = results[i].min_flow;
						FLOW_DATA[FLOW_IMEI_NO]['MAX_FLOW'] = results[i].max_flow;
						FLOW_DATA[FLOW_IMEI_NO]['MIN_VOLTAGE'] = results[i].min_voltage;
						FLOW_DATA[FLOW_IMEI_NO]['MIN_PRESSURE'] = results[i].min_pressure;
						FLOW_DATA[FLOW_IMEI_NO]['MAX_PRESSURE'] = results[i].max_pressure;
						FLOW_DATA[FLOW_IMEI_NO]['MIN_VOLTAGE_PRESSURE'] = results[i].min_voltage_pressure;
					}
				}
				
				setTimeout(load_flow, 60 * 10 * 1000);


				//console.log("TOTAL RECORDS "+JSON.stringify(FLOW_DATA));
			}else{
				console.log("NO RECORDS");
			}
		}
	});
}

function writeLog(IMEI_NO, DATA, TYPE){
	var d = new Date();
	var time = dateFormat(d, "isoDateTime");
	
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+"-pump.txt";
	
	var fs = require('fs');
	fs.exists('logs/'+file, function(exist){
		if(exist){
			var str = time + "," + IMEI_NO + "," + DATA;
			fs.appendFile('logs/'+file, '\r\n'+str, function(err1) {
				if (err1) console.log(err1);
			});
		}else{
			fs.writeFile('logs/'+file, '--- Start Logging ---', function(err2) {
				if (err2) console.log(err2);
				console.log('NEW LOG FILE CREATED!');
			});
		}
	});
}




var pump_server = net.createServer(function(sock) {
    console.log('PUMP FLOW SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
    sock.on('data', function(data) 
	{
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var hexdata = buff.toString('hex');
		console.log('ORIGINAL: ' + hexdata);

		var regExp = /(?<=5b)(.*)(?=5d)/;
        var matches = hexdata.match(regExp) 

        if(matches == null){
        	return;
        }
        if(matches.length == 0){
        	return;
        }
        
        var d = matches[1];
		
		console.log(">>>   "+d);
		
		writeLog('', d);
		
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
			
			console.log("IMEI_NO  ------------>"+IMEI_NO);
			if(IMEI_NO=='861190056529271'){
				
				console.log('DATA------------>: '+ACTUAL_DATA);
			}
			
			fx += lx; lx = 2;
			var SL_VOLTAGE = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var v1 = d.substr(fx,lx);
			fx += lx; lx = 2;
			var v2 = d.substr(fx,lx);
			var BT_VOLTAGE = HexToDec(String(v2)+String(v1));
			
			console.log("SL VOLTAGE: "+SL_VOLTAGE);
			console.log("BT VOLTAGE: "+BT_VOLTAGE);
			
			fx += lx; lx = 26;
			var DIGITAL_OUTPUT = '';
			for(var i = fx; i<fx+lx; i+=2){
				DIGITAL_OUTPUT += String(parseInt(d.substr(i,2), 16));
			}
			
			var dojer_status = DIGITAL_OUTPUT.substr(5, 1);
			
			var OUTPUT_STATUS = DIGITAL_OUTPUT.substr(6, 1);
			
			console.log("DIGITAL OUTPUT : "+DIGITAL_OUTPUT);
			
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
			
			console.log("IO STAMP : "+IO_STAMP);

			if(empty(FLOW_DATA[IMEI_NO])){
				FLOW_DATA[IMEI_NO] = new Object();
			}

			INPUTS = DIGITAL_OUTPUT.substr(0, 6);

			var OUTPUT_STATUS = INPUTS.charAt(2);
			
			fx += lx; lx = 8;
			console.log('ANALOG1 POSITION:'+fx+'---'+lx);
			var value1 = d.substr(fx, lx);
			var ANALOG1 = getHexToDecimal4(value1);
			console.log("ANALOG 1: "+ANALOG1);
			
			fx += lx; lx = 8;
			var value2 = d.substr(fx, lx);
			var ANALOG2 = getHexToDecimal4(value2);
			
			console.log("ANALOG 2: "+ANALOG2);


			FLOW_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT_STATUS;
			FLOW_DATA[IMEI_NO]['DATA_STAMP'] = DATA_STAMP;
			FLOW_DATA[IMEI_NO]['SL_VOLTAGE'] = SL_VOLTAGE;
			FLOW_DATA[IMEI_NO]['SOCKET'] = sock;

			console.log("IO STAMP : "+IO_STAMP);
			var auto_manual = '';

			if(FLOW_DATA[IMEI_NO]['IMEI_NO'] != 'undefined' && FLOW_DATA[IMEI_NO]['IMEI_NO'] != undefined){
    			connection.query('SELECT * FROM trans_last_data WHERE imei_no='+FLOW_DATA[IMEI_NO]['IMEI_NO'], 
    			function selectCb(err2, rows2, fields2) {
    				if (err2) { console.log(err2);	
    				}else {
    					if(rows2.length){
    						updatequery = "";
    						
    						var minflow = FLOW_DATA[IMEI_NO]['MIN_FLOW'];
    						var maxflow = FLOW_DATA[IMEI_NO]['MAX_FLOW'];
    						var minvoltage = FLOW_DATA[IMEI_NO]['MIN_VOLTAGE'];
    						
    						var minpressure = FLOW_DATA[IMEI_NO]['MIN_PRESSURE'];
    						var maxpressure = FLOW_DATA[IMEI_NO]['MAX_PRESSURE'];
    						var minvoltagepressure = FLOW_DATA[IMEI_NO]['MIN_VOLTAGE_PRESSURE'];
    						
    						var sqlquery = {
    						    flow_data: ANALOG1,
    						    pressure_data: ANALOG2,
                    			flow_value: (((maxflow - minflow)/8)*((ANALOG1/1000) - minvoltage)).toFixed(2),
                    			pressure_value: (((maxpressure - minpressure)/8)*((ANALOG2/1000) - minvoltagepressure)).toFixed(2)
                    		}
                			
    						connection.query('UPDATE trans_last_data SET ?, update_time=NOW() WHERE imei_no = ?;', [sqlquery, FLOW_DATA[IMEI_NO]['IMEI_NO']],
    						function selectCb(err3, results3, fields3) {
    							if (err3) {
    								console.log(err3);	
    							}else {
    								console.log("TRANS LAST DATA ROW UPDATED");
    							}
    						}); 
    					}
    				}
    			}); 
    				
    			console.log("INSERT DATA OK");
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
pump_server.listen(FLOW_PORT, HOST);

pump_server.on('connection', function(sock)
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
	//sock.write(buff);
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PUMP_PORT);











function ToFloat(r0, r1){
	var buffer = struct.pack("!HH", r0, r1)
	return struct.unpack("!f", buffer);
}
function Pad (str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
}
function HexToFloat(value){
	if(value == '00000000'){
		return 0;
	}
	if(value == 0){
		return 0;
	}
	if(value == '0'){
		return 0;
	}
	return new Buffer(value, 'hex').readFloatBE(0).toFixed(1);
}
function HexToDecimal(value){
	var tmp = Pad(value,4);
	var rev = tmp.substr(2,2)+tmp.substr(0,2);
	
	return parseInt(Pad(rev,4), 16);
}
function HexToBin(value){
	var bytes = "";
	for(var i=0; i< value.length; i++){
		bytes += Pad(parseInt(value.substr(i, 1), 16).toString(2), 4);
	}
	return bytes;
}
function getHexToDecimal4(value){
	var tmp = Pad(value,8);
	var rev = tmp.substr(6,2)+tmp.substr(4,2)+tmp.substr(2,2)+tmp.substr(0,2);
	
	return parseInt(Pad(rev,8), 16);
}
function getHexToDecimal(v1,v2){
	//return String(HexToDecimal(String(v2)+String(v1)));//+String(HexToDecimal(v2));
	return String(HexToFloat(String(v1)+String(v2)));
}
function getHexToDecimal2(v1,v2){
	//var tmp1 = Pad(v1,4);
	
	//var t1 = tmp.substr(0,2)+tmp.substr(2,2);
	
	//var tmp = Pad(v2,4);

	//var t2 = tmp.substr(0,2)+tmp.substr(2,2);
	
	var buffer = struct.pack("!HH", UInt16(HexToDec(v2)), UInt16(HexToDec(v1)));
	return Number(struct.unpack("!f", buffer)).toFixed(2);
	
	//return Number(ToFloat(HexToDec(txt1), HexToDec(txt2))[0]).toFixed(2);
	//return String(HexToDecimal(String(v2)+String(v1)));//+String(HexToDecimal(v2));
	//return String(HexToFloat(String(v1)+String(v2)));
}
function DecToHex(dec) {
    var number = Number(dec).toString(16).toUpperCase()
    if( (number.length % 2) > 0 ) { number= "0" + number }
    return number;
}
function HexToDec(value){
	return parseInt(value, 16);
}
function UInt16(value) {
	return (value & 0xFFFF);
};
