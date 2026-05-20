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

// var HOST = '216.10.247.24';
// var PUMP_PORT = 32280;
// var LEVEL_PORT_4G = 32293;
// var LEVEL_PORT_2G = 32279;
// var HTTP_PORT = 32281;



var HOST = '103.211.219.183';
var PUMP_PORT = 35001;
var LEVEL_PORT_2G = 35002;
var LEVEL_PORT_4G = 35003;
var HTTP_PORT = 35004;
 
var interval = '';

var fx = 0;
var lx = 6;

var start_tag = '5b';
var end_tag = '5d';
var data_len = 236;

var PUMP_DATA = new Object();
var LEVEL_DATA = new Object();

var sockets = [];
var sockets_info = [];

var connection = mysql.createConnection({
	multipleStatements: true,
	host     : 'localhost',
	user     : 'farrukhabadwater_user',
	password : 'farrukhabadwater_pass',
	database : 'farrukhabadwater_db',
	dateStrings: [
		'DATE',
		'DATETIME'
	]
});


var rule_consumption = new schedule.RecurrenceRule();
rule_consumption.hour = 0;
rule_consumption.minute = 0;
rule_consumption.second = 1;
var rc = schedule.scheduleJob(rule_consumption, function(){
	var sql = "SELECT trans_id, imei_no, daily_run_hours FROM trans_last_data;";
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) throw err;
		else{
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
				    if(results[i].daily_run_hours){
    				    var daily_run_hours = JSON.parse(results[i].daily_run_hours);
    				    daily_run_hours.years = 0;
    				    daily_run_hours.months = 0;
    				    daily_run_hours.days = 0;
    				    daily_run_hours.hours = 0;
    				    daily_run_hours.minutes = 0;
    				    daily_run_hours.seconds = 0;
    				    connection.query('UPDATE trans_last_data SET daily_run_hours=?, daily_run_hours_cal=?, daily_run_last_time=NOW() WHERE trans_id = ?;', [JSON.stringify(daily_run_hours), JSON.stringify(daily_run_hours), results[i].trans_id],
    					function selectCb(err3, results3, fields3) {
    						if (err3) {
    							console.log(err3);	
    						}else {
    							console.log("TRANS LAST DATA ROW UPDATED");
    						}
    					}); 
				    }
				}
			}
		}
	});
});


setTimeout(load_pumps, 1000);
function load_pumps(){
	var sql = "SELECT mp.id, mp.tank_imei_no,mp.tank_sensor_imei_no, mp.imei_no, mp.mobile_no, mp.meter_type FROM master_pumps AS mp;";
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
					var IMEI_NO = results[i].imei_no;
					if(!PUMP_DATA[IMEI_NO]){
						PUMP_DATA[IMEI_NO] = new Object();
						PUMP_DATA[IMEI_NO]['SOCKET'] = '';
						PUMP_DATA[IMEI_NO]['MODE'] = 'N/A';
						PUMP_DATA[IMEI_NO]['OUTPUT_STATUS'] = '-1';
						PUMP_DATA[IMEI_NO]['METER_TYPE'] = 'PROC';
					}
					PUMP_DATA[IMEI_NO]['TANK_IMEI_NO'] = results[i].tank_imei_no;
					PUMP_DATA[IMEI_NO]['TANK_SENSOR_IMEI_NO'] = results[i].tank_sensor_imei_no;  
					PUMP_DATA[IMEI_NO]['MOBILE_NO'] = results[i].mobile_no;
					PUMP_DATA[IMEI_NO]['METER_TYPE'] = results[i].meter_type;
					

					if(!empty(results[i].tank_imei_no)){
						var TANK_IMEI_NO = results[i].tank_imei_no;
						if(!LEVEL_DATA[TANK_IMEI_NO]){
						    LEVEL_DATA[TANK_IMEI_NO] = new Object();
						    LEVEL_DATA[TANK_IMEI_NO]['SOCKET'] = '';
							LEVEL_DATA[TANK_IMEI_NO]['VALUE'] = 0;
						}
						LEVEL_DATA[TANK_IMEI_NO]['PUMP_CONTROL'] = IMEI_NO;
					}
				}
				
				load_levels();
				setTimeout(load_pumps, 60 * 1000);


				console.log("TOTAL RECORDS "+results.length);
			}else{
				console.log("NO RECORDS");
			}
		}
	});
}

function load_levels(){
	//var sql = "SELECT ml.imei_no, ml.tank_height, ml.sensor_height, ml.level_min, ml.level_max FROM master_pumps mp LEFT JOIN master_location ml ON mp.tank_imei_no = ml.imei_no WHERE mp.tank_imei_no IS NOT NULL GROUP BY ml.imei_no;";
	// SELECT list is not in GROUP BY clause and contains nonaggregated column 'wlms_db.ml.tank_height' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by
	
	var sql = "SELECT imei_no, tank_height, sensor_height, level_min, level_max, pump_on_level, pump_off_level FROM master_location WHERE imei_no IN (SELECT ml.imei_no FROM master_pumps mp LEFT JOIN master_location ml ON mp.tank_imei_no = ml.imei_no WHERE mp.tank_imei_no IS NOT NULL GROUP BY ml.imei_no);";
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
					var IMEI_NO = results[i].imei_no;
					if(!empty(IMEI_NO)){
						if(!LEVEL_DATA[IMEI_NO]){
						    LEVEL_DATA[IMEI_NO] = new Object();
						    LEVEL_DATA[IMEI_NO]['SOCKET'] = '';
							LEVEL_DATA[IMEI_NO]['VALUE'] = 0;
							LEVEL_DATA[IMEI_NO]['PUMP_CONTROL'] = '';
						}
						LEVEL_DATA[IMEI_NO]['OVERFLOW_HEIGHT'] = JSON.parse(results[i].tank_height).overflow;
						LEVEL_DATA[IMEI_NO]['SENSOR_HEIGHT'] = results[i].sensor_height;
						LEVEL_DATA[IMEI_NO]['LEVEL_MIN'] = results[i].level_min;
						LEVEL_DATA[IMEI_NO]['LEVEL_MAX'] = results[i].level_max;

						if(results[i].pump_on_level == null){
							LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL'] = 20;
						}else{
							LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL'] = results[i].pump_on_level;
						}
						
						if(results[i].pump_off_level == null){
							LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL'] = 95;
						}else{
							LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL'] = results[i].pump_off_level;
						}
							
					}

					
				}
				console.log("TOTAL LEVEL RECORDS "+results.length);
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


socketio.on('connection', function (httpsocket){
    var nb = 0;

    console.log('SocketIO > Connected socket ' + httpsocket.id);

    httpsocket.broadcast.emit('myconnect', 'hellllo');
    
    httpsocket.on('getdata', function(param){
    	console.log('SENDING LIVE RECORD');
    	//httpsocket.emit('liverecord', DEVICES);
    });
    httpsocket.on('setcommand', function(command, imei) {
    	//var d = param.split("|");
    	//var command = d[0];
    	//var imei = d[1];
    	console.log('--------- COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);

    	if(empty(PUMP_DATA[imei]['SOCKET'])){
    		return;
    	}
    	console.log('---Step2------ COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
    	if(command == "START"){
			console.log('---Step3------ COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
    		var hexvalue = [];
    		var str = "50554D504F4E";
    		for(var i = 0; i<str.length; i+=2){
		      hexvalue.push('0x'+str.substr(i,2));
		    }
		    hexvalue.push(0x0D);
		    hexvalue.push(0x0A);
			console.log('CMD ON:'+JSON.stringify(hexvalue));
		    var buf = new Buffer(hexvalue, "hex");
			PUMP_DATA[imei]['SOCKET'].write(buf);


    		console.log('STARTING..........................');
    	}
    	else{
			console.log('---Step4------ COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
			var hexvalue = [];
    		var str = "50554D504F4646";
    		for(var i = 0; i<str.length; i+=2){
		      hexvalue.push('0x'+str.substr(i,2));
		    }
		    hexvalue.push(0x0D);
		    hexvalue.push(0x0A);

    		var buf = new Buffer(hexvalue, "hex");
			PUMP_DATA[imei]['SOCKET'].write(buf);
    		console.log('STOPING.......................');
    	}
    	/*var devices = new Array();
    	for (const [key, value] of Object.entries(MASTER_DATA)) {
			if(areacode == value.ULB_CODE){
				devices.push(value);
			}
		}
		var result = new Object();
		result.time = moment().format("YYYY-MM-DD HH:mm:ss");
		result.devices = devices;
		httpsocket.emit('datarecieved', result);*/
    });

    httpsocket.on('disconnect', function () {
        console.log('SocketIO : Received ' + nb + ' messages');
        console.log('SocketIO > Disconnected socket ' + httpsocket.id);
    });
});
httpserver.listen(HTTP_PORT);



var pump_server = net.createServer(function(sock) {
    console.log('PUMP SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
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
			 if(IMEI_NO=='861190056529271'){
			    
			    console.log('==============================================================Vijay Data:'+IMEI_NO+'=============================================================='+d);
			    //return false;
			}
			
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
			
			var dojer_status = DIGITAL_OUTPUT.substr(5, 1);
			
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

			if(empty(PUMP_DATA[IMEI_NO])){
				PUMP_DATA[IMEI_NO] = new Object();
			}

			INPUTS = DIGITAL_OUTPUT.substr(0, 6);

			var OUTPUT_STATUS = INPUTS.charAt(2);


			PUMP_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT_STATUS;
			PUMP_DATA[IMEI_NO]['DATA_STAMP'] = DATA_STAMP;
			PUMP_DATA[IMEI_NO]['SL_VOLTAGE'] = SL_VOLTAGE;
			PUMP_DATA[IMEI_NO]['SOCKET'] = sock;

			
			var auto_manual = '';

			if(INPUTS.charAt(0) == 1){
				PUMP_DATA[IMEI_NO]['MODE'] = 'AUTO';
			}else{
				PUMP_DATA[IMEI_NO]['MODE'] = 'MANUAL';
			}
			
			console.log(fx);
			console.log(">> "+PUMP_DATA[IMEI_NO]['METER_TYPE']);
			if(PUMP_DATA[IMEI_NO]['METER_TYPE'] == 'ELM'){
			/* =============['METER_TYPE'] == 'ELM'================ */
				//console.log(d.substr(fx, d.length - fx));
				fx = (0*8) + 86;
				lx = 0;
				console.log(d.substr(fx, d.length - fx));
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var WATT_TOTAL = (getHexToDecimal2(v1,v2)/1000).toFixed(2); //=KW
        		//Number(ToFloat(HexToDecimal(v2), HexToDecimal(v1))[0]).toFixed(2);
    			
				var B_EMERGENCY =0;
				var HIGH_CURRENT_ERROR =0;
				var HIGH_VOLTAGE_ERROR =0;
				var DEPTH_SENSOR_MA =0;
				var LEVEL_SENSOR_MA = 0;
				var PRESSURE_SENSOR_MA =0;
				var FLOW_METER =0;
				if( PUMP_DATA[IMEI_NO]['TANK_SENSOR_IMEI_NO'] == IMEI_NO){
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_R = getHexToDecimal2(v1,v2);//Number(ToFloat(HexToDecimal(v2), HexToDecimal(v1))[0]).toFixed(2);
        		B_EMERGENCY =  Number(getHexToDecimal2(v1,v2)); 
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		HIGH_CURRENT_ERROR = Number(getHexToDecimal2(v1,v2));
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_B = getHexToDecimal2(v1,v2);
				HIGH_VOLTAGE_ERROR = Number(getHexToDecimal2(v1,v2));
				
				
				
				fx += lx; lx = 4;				
				var v1 = d.substr(fx, lx);
				fx += lx; lx = 4;			
				var v2 = d.substr(fx, lx);
				DEPTH_SENSOR_MA = getHexToDecimal2(v1,v2);				
				


				fx += lx; lx = 4;				
				var v1 = d.substr(fx, lx);
				fx += lx; lx = 4;				
				var v2 = d.substr(fx, lx);					
				LEVEL_SENSOR_MA = getHexToDecimal2(v1,v2);				
				

				fx += lx; lx = 4;				
				var v1 = d.substr(fx, lx);
				fx += lx; lx = 4;				
				var v2 = d.substr(fx, lx);				
				PRESSURE_SENSOR_MA = getHexToDecimal2(v1,v2);				
				


				fx += lx; lx = 4;				
				var v1 = d.substr(fx, lx);
				fx += lx; lx = 4;				
				var v2 = d.substr(fx, lx);				
				FLOW_METER = getHexToDecimal2(v1,v2);	
				
				
				}	
        		
				//if(IMEI_NO=='861190056529271'){
				console.log("----------->WATT_TOTAL "+WATT_TOTAL);
				//console.log("------------->WATT_R "+WATT_R);
				console.log("------------->B_EMERGENCY "+B_EMERGENCY);
				//console.log("------------->WATT_Y "+WATT_Y);
				console.log("------------->HIGH_CURRENT_ERROR "+HIGH_CURRENT_ERROR);
    			//console.log("------------->WATT_B "+WATT_B);
				console.log("------------->HIGH_VOLTAGE_ERROR "+HIGH_VOLTAGE_ERROR);
    			
				//	}
				
				console.log('DEPTH_SENSOR_MA:',DEPTH_SENSOR_MA);
				console.log('LEVEL_SENSOR_MA:',LEVEL_SENSOR_MA);
				console.log('PRESSURE_SENSOR_MA:',PRESSURE_SENSOR_MA);
				console.log('FLOW_METER:',FLOW_METER);
				
				
				
    			
				/* ================================================================================ */
				
				
				fx = (9*8) + 86;
				lx = 0;
				
				
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_R = getHexToDecimal2(v1,v2);//Number(ToFloat(HexToDecimal(v2), HexToDecimal(v1))[0]).toFixed(2);
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_Y = getHexToDecimal2(v1,v2);
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_B = getHexToDecimal2(v1,v2);
				
				console.log("PF_Y "+PF_Y);
    			console.log("PF_B "+PF_B);
    			console.log("PF_R "+PF_R);
				
				
				fx = (17*8) + 86;
				lx = 0;
				
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_RY = getHexToDecimal2(v1,v2);//Number(ToFloat(HexToDecimal(v2), HexToDecimal(v1))[0]).toFixed(2);
        		
        		fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_YB = getHexToDecimal2(v1,v2);
        		
        		fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_BR = getHexToDecimal2(v1,v2);
        		
        		console.log("VOLTAGE_RY "+VOLTAGE_RY);
    			console.log("VOLTAGE_YB "+VOLTAGE_YB);
    			console.log("VOLTAGE_BR "+VOLTAGE_BR);
				
				
				fx = (21*8) + 86;
				lx = 0;
			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_R = getHexToDecimal2(v1,v2);//Number(ToFloat(HexToDecimal(v1), HexToDecimal(v2))[0]).toFixed(2);
        		
        		fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_Y = getHexToDecimal2(v1,v2);
        		
        		fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var VOLTAGE_B = getHexToDecimal2(v1,v2);
        		
        		console.log("VOLTAGE_R "+VOLTAGE_R);
    			console.log("VOLTAGE_Y "+VOLTAGE_Y);
    			console.log("VOLTAGE_B "+VOLTAGE_B);
				
				fx = (25*8) + 86;
				lx = 0;
    			
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var CURRENT_R = getHexToDecimal2(v1,v2);
        		
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var CURRENT_Y = getHexToDecimal2(v1,v2);
        		
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var CURRENT_B = getHexToDecimal2(v1,v2);
				
				console.log("CURRENT_R "+CURRENT_R);
    			console.log("CURRENT_Y "+CURRENT_Y);
    			console.log("CURRENT_B "+CURRENT_B);
				
				fx = (28*8) + 86;
				lx = 0;
				
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var FREQUENCY = (getHexToDecimal2(v1,v2)/1).toFixed(2);
        		
        		console.log("FREQUENCY "+FREQUENCY);
        		if(IMEI_NO=='861190056529271'){
        		    console.log('---------------------------------------------');
        		 console.log('Vijay Data:'+IMEI_NO+'=======***************==========='+FREQUENCY);
        		 console.log('---------------------------------------------');
                    }
				fx = (29*8) + 86;
				lx = 0;
				
				fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var WH_RECEIVED = (getHexToDecimal2(v1,v2)/1000).toFixed(2);
        		console.log("WH_RECEIVED "+WH_RECEIVED);
				
    			
    			/*console.log("SUPPLY "+ SL_VOLTAGE);
    			console.log("BATTERY "+ BT_VOLTAGE);
    			console.log("DIGITAL_OUTPUT "+DIGITAL_OUTPUT);
    			console.log("OUTPUT_STATUS "+ OUTPUT_STATUS);
    			console.log("DOOR_STATUS "+ DOOR_STATUS);
    			console.log("IO_STAMP "+IO_STAMP);
    			
    			console.log("VOLTAGE_R "+VOLTAGE_R);
    			console.log("VOLTAGE_Y "+VOLTAGE_Y);
    			console.log("VOLTAGE_B "+VOLTAGE_B);*/
				
				
    			
    			/*console.log("CURRENT_R "+CURRENT_R);
    			console.log("CURRENT_Y "+CURRENT_Y);
    			console.log("CURRENT_B "+CURRENT_B);*/
    			
    			
			}else{
				console.log(d.substr(fx, d.length-fx));
			    fx += 8;
				
				var WATT_TOTAL = 0;
				
			
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
    			
    			
    			/*console.log("SUPPLY "+ SL_VOLTAGE);
    			console.log("BATTERY "+ BT_VOLTAGE);
    			console.log("DIGITAL_OUTPUT "+DIGITAL_OUTPUT);
    			console.log("OUTPUT_STATUS "+ OUTPUT_STATUS);
    			console.log("DOOR_STATUS "+ DOOR_STATUS);
    			console.log("IO_STAMP "+IO_STAMP);
    			
    			console.log("VOLTAGE_R "+VOLTAGE_R);
    			console.log("VOLTAGE_Y "+VOLTAGE_Y);
    			console.log("VOLTAGE_B "+VOLTAGE_B);*/
    			
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
        		
        		/*console.log("VOLTAGE_RY "+VOLTAGE_RY);
    			console.log("VOLTAGE_YB "+VOLTAGE_YB);
    			console.log("VOLTAGE_BR "+VOLTAGE_BR);*/
        		
        		
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
        		
        		fx += 136;
    			
    			/*console.log("CURRENT_R "+CURRENT_R);
    			console.log("CURRENT_Y "+CURRENT_Y);
    			console.log("CURRENT_B "+CURRENT_B);*/
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_R = getHexToDecimal(v1,v2);
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_Y = getHexToDecimal(v1,v2);
    			
    			fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		var PF_B = getHexToDecimal(v1,v2);
        		
        		var FREQUENCY = 0;
        		
        		var WH_RECEIVED = 0;
				
				var B_EMERGENCY =0;
				var HIGH_CURRENT_ERROR =0;
				var HIGH_VOLTAGE_ERROR =0;
				var DEPTH_SENSOR_MA =0;
				var LEVEL_SENSOR_MA =0;
				var PRESSURE_SENSOR_MA =0;
				var FLOW_METER =0;

				
				
			}
			
			
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
			//FREQUENCY = 0;
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
    			kw: WATT_TOTAL,
    			voltage_r: VOLTAGE_R,
    			voltage_y: VOLTAGE_Y,
    			voltage_b: VOLTAGE_B,
    			voltage_ry: VOLTAGE_RY,
    			voltage_yb: VOLTAGE_YB,
    			voltage_br: VOLTAGE_BR,
    			amp_r: CURRENT_R,
    			amp_y: CURRENT_Y,
    			amp_b: CURRENT_B,
    			pf_r: PF_R,
    			pf_y: PF_Y,
    			pf_b: PF_B,
    			frequency: FREQUENCY,
				b_emergency:B_EMERGENCY,
				high_current_error:HIGH_CURRENT_ERROR,
				high_voltage_error :HIGH_VOLTAGE_ERROR,
				depth_sensor_ma:DEPTH_SENSOR_MA,
				level_sensor_ma:LEVEL_SENSOR_MA,
				pressure_sensor_ma:PRESSURE_SENSOR_MA,
				flow_meter:FLOW_METER,
    		}
			if(WH_RECEIVED != 0){
			    sqlquery.kwh = WH_RECEIVED;
			}
			
			var running = 0;
			//if(CURRENT_R < 1 && CURRENT_Y < 1 && CURRENT_B < 1){
			if(INPUTS.substr(2,1) == 1){
			    running = 1;
			}else{
			    running = 0;
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
    			                            kw: WATT_TOTAL,
    			                            voltage_r: VOLTAGE_R,
                                			voltage_y: VOLTAGE_Y,
                                			voltage_b: VOLTAGE_B,
                                			amp_r: CURRENT_R,
                                			amp_y: CURRENT_Y,
                                			amp_b: CURRENT_B,
                                			voltage_ry: VOLTAGE_RY,
                                			voltage_yb: VOLTAGE_YB,
                                			voltage_br: VOLTAGE_BR,
                                			pf_r: PF_R,
                                			pf_y: PF_Y,
                                			pf_b: PF_B,
                                			frequency: FREQUENCY,
											b_emergency:B_EMERGENCY,
											high_current_error:HIGH_CURRENT_ERROR,
											high_voltage_error :HIGH_VOLTAGE_ERROR,
											depth_sensor_ma:DEPTH_SENSOR_MA,
											level_sensor_ma:LEVEL_SENSOR_MA,
											pressure_sensor_ma:PRESSURE_SENSOR_MA,
											flow_meter:FLOW_METER,

        								}
        								if(WH_RECEIVED != 0){
                            			    sqlquery2.kwh = WH_RECEIVED;
                            			}
                            			
                            			//if(rows2[0].amp_r < 1 && rows2[0].amp_y < 1 && rows2[0].amp_b < 1){
        								if(rows2[0].inputs.substr(2,1) == 0){
        								    // last status of pump is not running
        								    if(running == 1){
        								        sqlquery2.run_last_time = moment().format("YYYY-MM-DD HH:mm:ss");
        								    //    sqlquery2.daily_run_last_time = moment().format("YYYY-MM-DD HH:mm:ss");
        								    }else{
        								        sqlquery2.run_last_time = moment().format("YYYY-MM-DD HH:mm:ss");
        								        sqlquery2.daily_run_last_time = moment().format("YYYY-MM-DD HH:mm:ss");
        								    }
        								}else{
        								    // last status of pump is running
        								    if(running == 1){
        								        // continous running
        								        var a1 = moment(rows2[0].daily_run_last_time);
        								        var b1 = moment();
        								        
        								        if(rows2[0].daily_run_hours != 0){
        								            var x1 = moment.duration(b1.diff(a1))._data; 
        								        }else{
        								            var x1 = moment.duration(b1.diff(a1))._data; 
        								        }
        								        //sqlquery2.run_hours = x.years+":"+x.months+":"+x.days+":"+x.hours+":"+x.minutes+":"+x.seconds;
        								        sqlquery2.daily_run_hours = JSON.stringify(x1);
        								    }else{
        								        // stop pump
        								        var a1 = moment(rows2[0].daily_run_last_time);
        								        var b1 = moment();
        								        
        								        if(rows2[0].daily_run_hours != 0){
        								            var x1 = moment.duration(b1.diff(a1))._data;
        								            if(rows2[0].daily_run_hours_cal != 0){
        								                var xcal = moment.duration(b1.diff(a1)).add(JSON.parse(rows2[0].daily_run_hours_cal))._data;
        								            }else{
        								                var xcal = moment.duration(b1.diff(a1))._data;
        								            }
        								        }else{
        								            var x1 = moment.duration(b1.diff(a1))._data;
        								            var xcal = moment.duration(b1.diff(a1))._data;
        								        }
        								        //sqlquery2.run_hours = x.years+":"+x.months+":"+x.days+":"+x.hours+":"+x.minutes+":"+x.seconds;
        								        sqlquery2.daily_run_hours = JSON.stringify(x1);
        								        sqlquery2.daily_run_hours_cal = JSON.stringify(xcal);
        								        
        								        
        								        
        								        var a2 = moment(rows2[0].run_last_time);
        								        var b2 = moment();
        								        
        								        if(rows2[0].run_hours != 0){
        								            var x2 = moment.duration(b2.diff(a2)).add(JSON.parse(rows2[0].run_hours))._data; 
        								        }else{
        								            var x2 = moment.duration(b2.diff(a2))._data; 
        								        }
        								        //sqlquery2.run_hours = x.years+":"+x.months+":"+x.days+":"+x.hours+":"+x.minutes+":"+x.seconds;
        								        sqlquery2.run_hours = JSON.stringify(x2);
        								    }
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
        								var DAILY_RUN_HOURS = '{"milliseconds":0,"seconds":0,"minutes":0,"hours":0,"days":0,"months":0,"years":0}';
        								
         								var sqlquery4 = {
        									imei_no: IMEI_NO,
        									data_stamp: DATA_STAMP,
        									actual_data: ACTUAL_DATA,
        									actualdatalength: ACTUALDATALENGTH,
        									sl_voltage: SL_VOLTAGE,
        									inputs: INPUTS,
    			                            outputs: OUTPUTS,
    			                            io_stamp: IO_STAMP,
    			                            kw: WATT_TOTAL,
    			                            voltage_r: VOLTAGE_R,
                                			voltage_y: VOLTAGE_Y,
                                			voltage_b: VOLTAGE_B,
                                			amp_r: CURRENT_R,
                                			amp_y: CURRENT_Y,
                                			amp_b: CURRENT_B,
                                			voltage_ry: VOLTAGE_RY,
                                			voltage_yb: VOLTAGE_YB,
                                			voltage_br: VOLTAGE_BR,
                                			daily_run_hours:DAILY_RUN_HOURS,
                                			daily_run_hours_cal:DAILY_RUN_HOURS,
											b_emergency:B_EMERGENCY,
											high_current_error:HIGH_CURRENT_ERROR,
											high_voltage_error :HIGH_VOLTAGE_ERROR,
											depth_sensor_ma:DEPTH_SENSOR_MA,
											level_sensor_ma:LEVEL_SENSOR_MA,
											pressure_sensor_ma:PRESSURE_SENSOR_MA,
											flow_meter:FLOW_METER,
                                			
                                			
        								}
        								if(WH_RECEIVED != 0){
                            			    sqlquery4.kwh = WH_RECEIVED;
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
pump_server.listen(PUMP_PORT, HOST);

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





/* 
	******************
	2G Pump 
	******************** 
*/ 


var level_server_2g = net.createServer(function(sock) {
    console.log('SERVER CON: ' + sock.remoteAddress +':'+ sock.remotePort);
    console.log('-----* 2G Pump Data *-----');
    sock.on('data', function(data) {
		var dt = new Date();
		console.log('LEVEL DATA ' + sock.remoteAddress + ': ' + data +' ');
		if(data.length < 15){
			return;
		}
		
		var d = data.toString().replace(/[^0-9A-Z]/g, "");
		
		
		ST = dt.getTime();
		
		var fx = 0; 
		var lx = 0;
		
		
		
		
		if(data.length < 20){
			return;
		}
		
		
		fx = 0; lx = 6;
		var datestr = d.substr(fx, lx);
		var dd = datestr.substr(0, 2);
		var mm = datestr.substr(2, 2);
		var yy = datestr.substr(4, 2);
		var rec_date = yy+"-"+mm+"-"+dd;
		
		fx += lx; lx = 6;
		var timestr = d.substr(fx, lx);
		var hh = timestr.substr(0, 2);
		var mm = timestr.substr(2, 2);
		var ss = timestr.substr(4, 2);
		var rec_time = hh+":"+mm+":"+ss;
		
		fx += lx; lx = 15;
		var IMEI_NO = String(d.substr(fx, lx));		
		writeLog(IMEI_NO, data);
		
		fx += lx; lx = 2;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx));
		fx += lx; lx = 4;
		var BT_VOLTAGE = d.substr(fx, lx);  // wwoo
		
		var SHORTDATA = fx+lx;
		
		var DATA = d;
		var DATA_STAMP = rec_date+" "+rec_time;
		var STATUS = "1";
		var TYPE = "";
		var ACTUAL_DATA = d;
		var ACTUALDATALENGTH = d.length;
		
		var ANALOGINPUT = 0;
		
		/*
		fx += lx; lx = 4;
		var ANALOGINPUT = parseInt(d.substr(fx, lx));
		fx += lx; lx = 3;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx))/100;
		
		var SHORTDATA = fx+lx;
		
		var DATA = d;
		var DATA_STAMP = rec_date+" "+rec_time;
		console.log('DATA_STAMP================----'+DATA_STAMP);
		var STATUS = "";
		var TYPE = "";
		var ACTUAL_DATA = d;
		var ACTUALDATALENGTH = d.length;

		fx += lx; lx = d.length - fx;
		ANALOGINPUT = d.substr(fx, lx); */
		
		
		var chkstr = "000000000000";

		if(!LEVEL_DATA[IMEI_NO]){
		    LEVEL_DATA[IMEI_NO] = new Object();
		    LEVEL_DATA[IMEI_NO]['PUMP_CONTROL'] = '';
		    LEVEL_DATA[IMEI_NO]['OVERFLOW_HEIGHT'] = '';
		    LEVEL_DATA[IMEI_NO]['SENSOR_HEIGHT'] = '';
			LEVEL_DATA[IMEI_NO]['LEVEL_MIN'] = '';
			LEVEL_DATA[IMEI_NO]['LEVEL_MAX'] = '';
		}
		LEVEL_DATA[IMEI_NO]['SOCKET'] = sock;
		LEVEL_DATA[IMEI_NO]['VALUE'] = ANALOGINPUT;
		LEVEL_DATA[IMEI_NO]['LAST_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");

		if(!empty(LEVEL_DATA[IMEI_NO]['PUMP_CONTROL'])){
			var height = LEVEL_DATA[IMEI_NO]['OVERFLOW_HEIGHT'];
			var sensor_height = LEVEL_DATA[IMEI_NO]['SENSOR_HEIGHT'];
			var level = 0;
			var min = LEVEL_DATA[IMEI_NO]['LEVEL_MIN'];
			var max = min + parseInt((LEVEL_DATA[IMEI_NO]['LEVEL_MAX'] - LEVEL_DATA[IMEI_NO]['LEVEL_MIN']) * height / sensor_height);
			
			var unit = (max-min)/height;
			var level_per = 0;
			
			if(ANALOGINPUT <= min){
				level = 0;
			}
			if(ANALOGINPUT >= max){
				level = Number(height);
			}
			if(ANALOGINPUT > min && ANALOGINPUT < max){
				level = (ANALOGINPUT - min)/unit;
			}
			if(ANALOGINPUT == null){
				level = 0;
				level_per = '0.00';
			}else{
				level_per = ((level/height)*100).toFixed(2);
			}
			console.log('WATER LEVEL > '+level_per+' '+ LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL']+' '+ LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL']);

			if(level_per > LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL']){
				for (const [key, value] of Object.entries(PUMP_DATA)) {
					if(PUMP_DATA[key]['TANK_IMEI_NO'] == IMEI_NO){
						console.log('---- STOP ---- STOP ---- STOP ---- '+PUMP_DATA[key]['OUTPUT_STATUS'] +' '+ PUMP_DATA[key]['MODE']);
						if(PUMP_DATA[key]['OUTPUT_STATUS'] > 0 && PUMP_DATA[key]['MODE'] == 'AUTO'){

							var hexvalue = [];
				    		var str = "50554D504F4646";
				    		for(var i = 0; i<str.length; i+=2){
						      hexvalue.push('0x'+str.substr(i,2));
						    }
						    hexvalue.push(0x0D);
						    hexvalue.push(0x0A);

				    		var buf = new Buffer(hexvalue, "hex");
				    		if(PUMP_DATA[key]['SOCKET']){
				    			PUMP_DATA[key]['SOCKET'].write(buf);
				    			console.log('PUMP OFF COMMAND.........................');
				    		}
						}
						setTimeout(function(imei){
							if(PUMP_DATA[imei]['OUTPUT_STATUS'] > 0 && PUMP_DATA[imei]['MODE'] == 'AUTO'){

								var hexvalue = [];
					    		var str = "50554D504F4646";
					    		for(var i = 0; i<str.length; i+=2){
							      hexvalue.push('0x'+str.substr(i,2));
							    }
							    hexvalue.push(0x0D);
							    hexvalue.push(0x0A);

					    		var buf = new Buffer(hexvalue, "hex");
					    		if(PUMP_DATA[imei]['SOCKET']){
					    			PUMP_DATA[imei]['SOCKET'].write(buf);
					    			console.log('PUMP OFF COMMAND...............................');
					    		}
							}
							console.log('>>>>> '+imei);
						}, 3000, key);
					}
				}
			}
			else if(level_per < LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL']){
				for (const [key, value] of Object.entries(PUMP_DATA)) {
					if(PUMP_DATA[key]['TANK_IMEI_NO'] == IMEI_NO){
						console.log('------------------ PUMP START '+PUMP_DATA[key]['OUTPUT_STATUS'] +' '+ PUMP_DATA[key]['MODE']);
						if(PUMP_DATA[key]['OUTPUT_STATUS'] == 0 && PUMP_DATA[key]['MODE'] == 'AUTO'){

							var hexvalue = [];
				    		var str = "50554D504F4E";
				    		for(var i = 0; i<str.length; i+=2){
						      hexvalue.push('0x'+str.substr(i,2));
						    }
						    hexvalue.push(0x0D);
						    hexvalue.push(0x0A);

				    		var buf = new Buffer(hexvalue, "hex");
				    		if(PUMP_DATA[key]['SOCKET']){
				    			PUMP_DATA[key]['SOCKET'].write(buf);
				    			console.log('PUMP ON COMMAND......................');
				    		}
						}
						setTimeout(function(imei){
							if(PUMP_DATA[imei]['OUTPUT_STATUS'] == 0 && PUMP_DATA[imei]['MODE'] == 'AUTO'){

								var hexvalue = [];
					    		var str = "50554D504F4E";
					    		for(var i = 0; i<str.length; i+=2){
							      hexvalue.push('0x'+str.substr(i,2));
							    }
							    hexvalue.push(0x0D);
							    hexvalue.push(0x0A);

					    		var buf = new Buffer(hexvalue, "hex");
					    		if(PUMP_DATA[imei]['SOCKET']){
					    			//PUMP_DATA[imei]['SOCKET'].write(buf);
					    			console.log('PUMP ON COMMAND..........................');
					    		}
							}
							console.log('>>>>> '+imei);
						}, 3000, key);
					}
				}
			}
		}
		
		
		
		
			// Water level code
						
			console.log("IMEI_NO "+IMEI_NO+" VOLTAGE Y "+ANALOGINPUT);
			
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
		
		

		
		
		
		var idx = sockets.indexOf(sock);
		if (idx != -1) {
			if(sockets_info[idx].imei == ""){
				sockets_info[idx].imei = IMEI_NO;
				console.log("SOCKET UPDATE ");
			}
		}else{
			console.log("CURRENT SOCKET NOT FOUND");
		}
		    
    });
    sock.on('close', function(data) {
        console.log('SOCKET CLOSING ');
		
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
		
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
	});
	
	//setTimeout(listenDB, 100000);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
level_server_2g.listen(LEVEL_PORT_2G, HOST);


level_server_2g.on('connection', function(sock){
	console.log('LEVEL SOCKET CONNECTION: ' + sock.remoteAddress +':'+ sock.remotePort);
	sockets.push(sock);
	//sock.pipe(sock);
	
	sock.write('ACCSETPKT0180');

	var dateFormat = require('dateformat');
	var now = new Date();

	//sock.write('ACCRTC'+dateFormat(now, "ddmmyyHHMMss"));

	var created_at = dateFormat(now, "isoDateTime");
	var o = {imei:'',remoteaddr:sock.remoteAddress,remoteport:sock.remotePort};
	sockets_info.push(o);
	
	console.log('TOTAL NUMBER OF 2G CONNECTIONS: '+sockets.length);
});




/* 
	******************
	4G Pump 
	******************** 
*/ 


var level_server_4g = net.createServer(function(sock) {
    console.log('SERVER CON: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    sock.on('data', function(data) {
		// 4G
		console.log('-----* 4G Pump Data *-----');
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
				
				console.log(IMEI_NO,'::DATA_STAMPDATA_STAMPDATA_STAMP::::::::::',DATA_STAMP);
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
				
				var LVL_DATA = '';
				//for(var i = fx; i<fx+lx; i+=2){
					LVL_DATA += parseInt(d.substr(fx+6,2)+""+d.substr(fx+4,2)+""+d.substr(fx+2,2)+""+d.substr(fx+0,2), 16);
				//}
				console.log("DATA STAMP: "+DATA_STAMP);
				console.log("IMEI NO: "+IMEI_NO);
				console.log("SL VOLTAGE: "+SL_VOLTAGE);
				console.log("BT VOLTAGE: "+BT_VOLTAGE);
				console.log("IO STAMP: "+IO_STAMP);
				console.log("LEVEL DATA: "+d.substr(fx,8)+" "+LVL_DATA);
				
				ACTUAL_DATA = d;
				ACTUALDATALENGTH = d.length;
				ANALOGINPUT = LVL_DATA/10;





		if(!LEVEL_DATA[IMEI_NO]){
		    LEVEL_DATA[IMEI_NO] = new Object();
		    LEVEL_DATA[IMEI_NO]['PUMP_CONTROL'] = '';
		    LEVEL_DATA[IMEI_NO]['OVERFLOW_HEIGHT'] = '';
		    LEVEL_DATA[IMEI_NO]['SENSOR_HEIGHT'] = '';
			LEVEL_DATA[IMEI_NO]['LEVEL_MIN'] = '';
			LEVEL_DATA[IMEI_NO]['LEVEL_MAX'] = '';
		}
		LEVEL_DATA[IMEI_NO]['SOCKET'] = sock;
		LEVEL_DATA[IMEI_NO]['VALUE'] = ANALOGINPUT;
		LEVEL_DATA[IMEI_NO]['LAST_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");

		if(!empty(LEVEL_DATA[IMEI_NO]['PUMP_CONTROL'])){
			var height = LEVEL_DATA[IMEI_NO]['OVERFLOW_HEIGHT'];
			var sensor_height = LEVEL_DATA[IMEI_NO]['SENSOR_HEIGHT'];
			var level = 0;
			var min = LEVEL_DATA[IMEI_NO]['LEVEL_MIN'];
			var max = min + parseInt((LEVEL_DATA[IMEI_NO]['LEVEL_MAX'] - LEVEL_DATA[IMEI_NO]['LEVEL_MIN']) * height / sensor_height);
			
			var unit = (max-min)/height;
			var level_per = 0;
			
			if(ANALOGINPUT <= min){
				level = 0;
			}
			if(ANALOGINPUT >= max){
				level = Number(height);
			}
			if(ANALOGINPUT > min && ANALOGINPUT < max){
				level = (ANALOGINPUT - min)/unit;
			}
			if(ANALOGINPUT == null){
				level = 0;
				level_per = '0.00';
			}else{
				level_per = ((level/height)*100).toFixed(2);
			}
			console.log('WATER LEVEL 4G '+level_per+' '+LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL']+' '+LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL']);

			if(parseInt(level_per) > parseInt(LEVEL_DATA[IMEI_NO]['PUMP_OFF_LEVEL'])){
			    console.log("TRYING TO PUMP OFF");
				for (const [key, value] of Object.entries(PUMP_DATA)) {
					if(PUMP_DATA[key]['TANK_IMEI_NO'] == IMEI_NO){
						console.log('---- STOP ---- STOP ---- STOP ---- '+PUMP_DATA[key]['OUTPUT_STATUS'] +' '+ PUMP_DATA[key]['MODE']);
						if(PUMP_DATA[key]['OUTPUT_STATUS'] > 0 && PUMP_DATA[key]['MODE'] == 'AUTO'){

							var hexvalue = [];
				    		var str = "50554D504F4646";
				    		for(var i = 0; i<str.length; i+=2){
						      hexvalue.push('0x'+str.substr(i,2));
						    }
						    hexvalue.push(0x0D);
						    hexvalue.push(0x0A);

				    		var buf = new Buffer(hexvalue, "hex");
				    		if(PUMP_DATA[key]['SOCKET']){
				    			PUMP_DATA[key]['SOCKET'].write(buf);
				    			console.log('PUMP OFF COMMAND.........................');
				    		}
						}
						setTimeout(function(imei){
							if(PUMP_DATA[imei]['OUTPUT_STATUS'] > 0 && PUMP_DATA[imei]['MODE'] == 'AUTO'){

								var hexvalue = [];
					    		var str = "50554D504F4646";
					    		for(var i = 0; i<str.length; i+=2){
							      hexvalue.push('0x'+str.substr(i,2));
							    }
							    hexvalue.push(0x0D);
							    hexvalue.push(0x0A);

					    		var buf = new Buffer(hexvalue, "hex");
					    		if(PUMP_DATA[imei]['SOCKET']){
					    			PUMP_DATA[imei]['SOCKET'].write(buf);
					    			console.log('PUMP OFF COMMAND...............................');
					    		}
							}
							console.log('>>>>> '+imei);
						}, 3000, key);
					}
				}
			}
			else if(parseInt(level_per) < parseInt(LEVEL_DATA[IMEI_NO]['PUMP_ON_LEVEL'])){
			    console.log("TRYING TO PUMP ON");
				for (const [key, value] of Object.entries(PUMP_DATA)) {
					if(PUMP_DATA[key]['TANK_IMEI_NO'] == IMEI_NO){
						console.log('------------------ PUMP START '+PUMP_DATA[key]['OUTPUT_STATUS'] +' '+ PUMP_DATA[key]['MODE']);
						if(PUMP_DATA[key]['OUTPUT_STATUS'] == 0 && PUMP_DATA[key]['MODE'] == 'AUTO'){

							var hexvalue = [];
				    		var str = "50554D504F4E";
				    		for(var i = 0; i<str.length; i+=2){
						      hexvalue.push('0x'+str.substr(i,2));
						    }
						    hexvalue.push(0x0D);
						    hexvalue.push(0x0A);

				    		var buf = new Buffer(hexvalue, "hex");
				    		if(PUMP_DATA[key]['SOCKET']){
				    			PUMP_DATA[key]['SOCKET'].write(buf);
				    			console.log('PUMP ON COMMAND......................');
				    		}
						}
						setTimeout(function(imei){
							if(PUMP_DATA[imei]['OUTPUT_STATUS'] == 0 && PUMP_DATA[imei]['MODE'] == 'AUTO'){

								var hexvalue = [];
					    		var str = "50554D504F4E";
					    		for(var i = 0; i<str.length; i+=2){
							      hexvalue.push('0x'+str.substr(i,2));
							    }
							    hexvalue.push(0x0D);
							    hexvalue.push(0x0A);

					    		var buf = new Buffer(hexvalue, "hex");
					    		if(PUMP_DATA[imei]['SOCKET']){
					    			//PUMP_DATA[imei]['SOCKET'].write(buf);
					    			console.log('PUMP ON COMMAND..........................');
					    		}
							}
							console.log('>>>>> '+imei);
						}, 3000, key);
					}
				}
			}
		}



		

				
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
		
		
		
		
		var idx = sockets.indexOf(sock);
		if (idx != -1) {
			if(sockets_info[idx].imei == ""){
				sockets_info[idx].imei = IMEI_NO;
				console.log("SOCKET UPDATE ");
			}
		}else{
			console.log("CURRENT SOCKET NOT FOUND");
		}
		    
    });
    sock.on('close', function(data) {
        console.log('SOCKET CLOSING ');
		
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
		
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			//delete sockets[idx];
			sockets.splice(idx,1);
			sockets_info.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
	});
	
	//setTimeout(listenDB, 100000);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
level_server_4g.listen(LEVEL_PORT_4G, HOST);


level_server_4g.on('connection', function(sock){
	console.log('LEVEL SOCKET CONNECTION: ' + sock.remoteAddress +':'+ sock.remotePort);
	sockets.push(sock);
	//sock.pipe(sock);
	
	sock.write('ACCSETPKT0180');

	var dateFormat = require('dateformat');
	var now = new Date();

	//sock.write('ACCRTC'+dateFormat(now, "ddmmyyHHMMss"));

	var created_at = dateFormat(now, "isoDateTime");
	var o = {imei:'',remoteaddr:sock.remoteAddress,remoteport:sock.remotePort};
	sockets_info.push(o);
	
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
});







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
