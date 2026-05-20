var net = require('net');
var moment = require("moment");
var empty = require('is-empty');
var mysql = require('mysql');
var dateFormat = require('dateformat');
var schedule = require('node-schedule');
var http = require('http');
var httpserver = http.createServer();
//var socketio = require('socket.io')(httpserver);
//var socketio = require('socket.io')(httpserver);

const socketio = require("socket.io")(httpserver, {
  cors: {
    origin: "*", // Change to your frontend domain
    methods: ["GET", "POST"]
  }
});

const struct = require('python-struct');


var HOST = '103.211.219.183';
var PUMP_PORT = 35007;
var LEVEL_PORT_2G = '';
var LEVEL_PORT_4G = 35008; //Level Senior 4G 
var HTTP_PORT = 35009; //For SocketIO
 
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
	user     : 'ndmcwater_user',
	password : 'ndmcwater_pass',
	database : 'ndmcwater_db',
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
	var sql = "SELECT mp.id, mp.tank_imei_no,mp.tank_sensor_imei_no, mp.imei_no, mp.mobile_no, mp.meter_type FROM master_pumps AS mp where mp.status =1;";
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

		//console.log('SocketIO > Connected socket ' + httpsocket.id);

		httpsocket.broadcast.emit('myconnect', 'hellllo');
		
		httpsocket.on('getdata', function(dv){
			console.log('SENDING LIVE RECORD');
			console.log('VIJAY KUMAR--------- COMMAND ---------'+dv.command+' ----'+dv.imei+'------');
			//httpsocket.emit('liverecord', DEVICES);
		});
		
		httpsocket.on('setcommand', function(info, callback) {
			  const command = info.command;
			  const imei = info.imei;

			  console.log('COMMAND:', command, imei);

			  // Safety check
			  if (!PUMP_DATA[imei] || !PUMP_DATA[imei]['SOCKET']) {
				console.error("❌ No socket for IMEI:", imei);
				if (callback) callback({ status: 'error', message: 'IMEI not connected' });
				return;
			  }

			  let str;
			  let neutral ='444f532c00000000000000';
			  if (command === "START") {
				//str = "444f532c01010101010101";
				str = "444f532c01000000000000";
				
			  } else {
				//str = "444f532c00000000000000";
				str = "444f532c00010000000000";
			  }
 
			  let hexvalue = [];
			  for (let i = 0; i < str.length; i += 2) {
				hexvalue.push('0x' + str.substr(i, 2));
			  }
			  hexvalue.push(0x0D);
			  hexvalue.push(0x0A);
			  const buf = Buffer.from(hexvalue, "hex");
			  
			   let neutralHexvalue = [];
			  for (let i = 0; i < neutral.length; i += 2) {
				neutralHexvalue.push('0x' + neutral.substr(i, 2));
			  }
			  neutralHexvalue.push(0x0D);
			  neutralHexvalue.push(0x0A);
			  const neutralbuf = Buffer.from(neutralHexvalue,"hex"); 
			  
			  

			  try {
				PUMP_DATA[imei]['SOCKET'].write(buf);
				console.log(`✅ ${command} command sent to ${imei}`);
				var mess= `Taken 15 to 20 sec to Pump will be ${command}`;
				if (callback) callback({ status: 'success', message: mess });
				 //PUMP_DATA[imei]['SOCKET'].write(neutralbuf);
				
				// After 20 seconds, send the neutral command
				setTimeout(() => {
					PUMP_DATA[imei]['SOCKET'].write(neutralbuf);
				console.log('neutralbuf:::')					
				}, 5000); // 20,000 milliseconds = 20 seconds 
				
				
				
			  } catch (err) {
				console.error("❌ Error writing to socket:", err);
				if (callback) callback({ status: 'error', message: 'Failed to write command' });
			  }
		});

	
    /* httpsocket.on('setcommand', function(info) {
    	//var d = param.split("|");
		console.log('CCCCCCMMMMMMMM:',info);
    	var command = info.command; 
    	var imei = info.imei;
		//console.log('PUMP_DATA::',PUMP_DATA);
    	//console.log('VIJAY KUMAR--------- COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
    	console.log('VIJAY KUMAR--------- COMMAND ---------'+command+' '+imei+'------');
		
    	if(empty(PUMP_DATA[imei]['SOCKET'])){
    		return;
    	}
    	//console.log('---Step2------ COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
    	if(command == "START"){
			console.log('---Step3------ COMMAND ---------'+command+' '+imei+'------');
    		var hexvalue = [];
    		//var str = "50554D504F4E";
    		var str = "444f532c01010101010101";
    		for(var i = 0; i<str.length; i+=2){
		      hexvalue.push('0x'+str.substr(i,2));
		    }
		    hexvalue.push(0x0D);
		    hexvalue.push(0x0A);
			console.log('CMD ON:'+JSON.stringify(hexvalue));
		    var buf = new Buffer(hexvalue, "hex");
			PUMP_DATA[imei]['SOCKET'].write(buf);


    		console.log('STARTING vijay..........................');
    	}
    	else{
			console.log('---Step4------ COMMAND ---------'+command+' '+imei+'------'+PUMP_DATA[imei]['SOCKET']);
			var hexvalue = [];
    		//var str = "50554D504F4646";
    		var str = "444f532c00000000000000"; 
    		for(var i = 0; i<str.length; i+=2){
		      hexvalue.push('0x'+str.substr(i,2));
		    }
		    hexvalue.push(0x0D);
		    hexvalue.push(0x0A);
			console.log('CMD OFF:'+JSON.stringify(hexvalue));
    		var buf = new Buffer(hexvalue, "hex");
			PUMP_DATA[imei]['SOCKET'].write(buf);
    		console.log('STOPING vijay.......................');
    	}
    	
    }); */

    httpsocket.on('disconnect', function () {
        console.log('SocketIO : Received ' + nb + ' messages');
        console.log('SocketIO > Disconnected socket ' + httpsocket.id);
    });
});
httpserver.listen(HTTP_PORT);







/**================================================================================== */
/**================================================================================== */
/**================================================================================== */
 var pump_server = net.createServer(function(sock) {
    console.log('PUMP SERVER ============================================: ' + sock.remoteAddress +':'+ sock.remotePort);
	
		sock.on('data', function(data) {
			var dt = new Date();
			console.log('dt::',dt);
			console.log('dt::',data);
			
			// 4G
		console.log('-----* 4G LEVEL SENSER Data *-----');
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var hexdata = buff.toString('hex');
		console.log('ORIGINAL2: ' + hexdata);
		
			   
		
		
		var regExp = /(?<=5b)(.*)(?=5d)/;
        var matches = hexdata.match(regExp) 
        
        var d = '';
        if(!empty(matches)){
            if(matches.length > 0){
        		d = matches[1];
				
				console.log('Actual Data::',d);
				
				
				var FREQUENCY =0;
				var STATUS = "1";
				var ACTUAL_DATA = d;
				var ACTUALDATALENGTH = d.length;				
				var ANALOGINPUT = 0;
				var IO_STAMP ='';
				var SL_VOLTAGE='';
				var VOLTAGE_R=0;
				var VOLTAGE_Y =0;
				var VOLTAGE_B =0;
				var AMP_R = 0;
				var AMP_Y=0;
				var AMP_B=0;
				var PF_R=0;
				var PF_Y=0;
				var PF_B=0;
				var KW=0;
				var KWR=0;
				var KWY=0;
				var KWB=0;
				var KWH=0;
				var KVAH=0;
				var OUTPUT1 = 0;
				var INPUT1 = 0;
				var auto =0;
				var manual =0;
				var trip =0;
				
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
				
				//console.log("DATA STAMP: "+DATA_STAMP);

				fx += lx; lx = 30;
				IMEI_NO = '';
				console.log('IMEI_NO Logo fx:'+fx+'--lx:'+lx);
				
				
				
				for(var i = fx; i<fx+lx; i+=2){
					IMEI_NO += String.fromCharCode(parseInt(d.substr(i,2), 16));
				}
				
				//console.log('IMEI_NO:'+IMEI_NO);
				
				
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
				
				
				console.log("DATA STAMP: "+DATA_STAMP);
				console.log("IMEI NO: "+IMEI_NO);
				console.log("SL VOLTAGE: "+SL_VOLTAGE);
				console.log("BT VOLTAGE: "+BT_VOLTAGE);
				//console.log("IO STAMP: "+IO_STAMP);
				//console.log("LEVEL DATA1: "+d.substr(fx,8)+" "+LVL_DATA);
				
				
				console.log('-*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*-FB-*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*-');
				
				var MW0 = '';
				var AUTO_FB = '';
				var MW14 = '';
				var MW18 = '';
				var MW22 = '';
				var MW26 = '';
				var MW28 = '';
				var MW38 = '';
				console.log('::fx::',fx,',lx::',lx);
				fx = 102
				//fx+= (10*4); 
				lx = 4;
				
				
				//fx += lx; lx = 4;
        		var v1 = d.substr(fx, lx);
				MW0 = Number(HexToDec(v1));
				console.log('MW0:',MW0,'| V1:',v1);
				
				
				console.log(' \n  -----------AUTO_FB MW 10 | 142-------------');
				fx+= (10*4); 
				lx = 4;
				
				var v1 = d.substr(fx, lx);
				AUTO_FB = Number(HexToDec(v1));
				console.log('value:fx:',fx,'lx:',lx,'| v1:',v1);				
				console.log('AUTO_FB:',AUTO_FB);
				auto = AUTO_FB;
				
				console.log('\n -----------Manual Fb MW14 | 158-------------');
				fx+= (4*4); 
				lx = 4;				
				var v1 = d.substr(fx, lx);
				MW14 = Number(HexToDec(v1));				
				console.log('MW14:fx:',fx,'lx:',lx,'| v1:',v1);					
				console.log('Manual Fb | MW14:',MW14);
				manual = MW14;
				
				
				console.log('\n -----------Run Fb MW18 | 174-------------');
				fx+= (4*4); 
				lx = 4;				
				var v1 = d.substr(fx, lx);
				MW18 = Number(HexToDec(v1));	
				console.log('value MW18 :fx:',fx,'lx:',lx);
				console.log('MW18:',MW18);
				
				
				console.log('\n -----------Trip Fb MW22 | 190-------------');
				fx+= (4*4); 
				lx = 4;
				
				var v1 = d.substr(fx, lx);
				MW22 = Number(HexToDec(v1));
				console.log('value MW22 :fx:',fx,'lx:',lx ,'| v1:',v1);				
				console.log('MW22:',MW22);
				trip = MW22;
				
				console.log('\n -----------Moderm Start Input MW26 | 206 -------------');
				fx+= (4*4); 
				lx = 4;				
				var v1 = d.substr(fx, lx);
				MW26 = Number(HexToDec(v1));	
				console.log('value MW26 :fx:',fx,'lx:',lx,'| v1:',v1);
				console.log('Moderm Start Input| MW26:',MW26);
				
				console.log('\n -----------Level % Input MW28 | 214-------------');
				fx+= (2*4); 
				lx = 4;				
				var v1 = d.substr(fx, lx);				
				MW28 = Number(HexToDec(v1));
				console.log('value:fx:',fx,'lx:',lx,'| v1:',v1);				
				console.log('LEVEL | MW28:',MW28);
				ANALOGINPUT = MW28;
				
				/* fx+= (12*4); 
				lx = 4;				
				var v1 = d.substr(fx, lx);
				console.log('value:fx:',fx,'lx:',lx,'::v1:',v1);
				MW38 = Number(HexToDec(v1));				
				console.log('MW38:',MW38); */
				
				
				
				console.log(' \n \n -*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*MF VALUE-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*--*-*-*- \n \n');
				var mf8,mf42,mf48,mf52,mf58,mf62,mf66,mf74,mf78,mf82,mf86,mf32,mf38,mf2=''; 
				
				
				console.log('\n -----------Voltage-------------');
				console.log('\n -----------Voltage RY Input MF-32 | 230-------------');
			
				fx = 230; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		mf32 = Number(getHexToDecimal2(v1,v2));
				console.log(' Voltage RY | mf32:',mf32);
				VOLTAGE_R = mf32;
				
				console.log('\n -----------Voltage RY Input MF-38 | 254-------------');
				
				fx = 254; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf38 = Number(getHexToDecimal2(v1,v2));
				console.log(' Voltage YB | mf38:',mf38);
				VOLTAGE_Y = mf38;
				
				console.log('\n -----------Voltage BR | MF-2 | 110-------------');				
				fx = 110; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf2 = Number(getHexToDecimal2(v1,v2));
				console.log('BR voltage | mf2:',mf2);
				VOLTAGE_B = mf2;
				
				
				console.log('\n -----------Avg Voltage | MF-8 | 134-------------');				
				fx = 134; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf8 = Number(getHexToDecimal2(v1,v2));
				console.log('v1:',v1,'v2:',v2);
				console.log('Avg Voltage | mf8:',mf8);
				
				
				console.log('\n -----------Current-------------');	
				
				console.log('\n -----------Current R | MF-48 | 294-------------');	
				
				fx = 294; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf48 = Number(getHexToDecimal2(v1,v2));
				console.log('Current R | mf48:',mf48);
				AMP_R  = mf48;
				
				console.log('\n -----------Current Y | MF-52 | 310-------------');	
				fx = 310; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf52 = Number(getHexToDecimal2(v1,v2));
				console.log('Current Y | mf52:',mf52);
				AMP_Y = mf52;
				
				console.log('\n -----------Current B | MF-58 | 334-------------');
				fx = 334; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf58 = Number(getHexToDecimal2(v1,v2));
				console.log(' Current B  | mf58:',mf58);
				AMP_B = mf58;
				
				
				console.log('\n -----------Frequency | MF-42 | 270-------------');
				fx = 270; lx = 4;
				var v1 = d.substr(fx, lx);
        		fx += lx; lx = 4;
        		var v2 = d.substr(fx, lx);
        		//var WATT_Y = getHexToDecimal2(v1,v2);
        		mf42 = Number(getHexToDecimal2(v1,v2));
				console.log('Frequency |  mf42:',mf42);
				var FREQUENCY =  mf42;
				
				 
				console.log('\n -----------Total Current |  Address Not Found | MF-62-------');
				console.log('\n -----------Watt Hr |  Address Not Found | MF-68-------------');
				
				OUTPUT1=0;
				if(MW18==1){
					OUTPUT1 = 1;
				}
				if(VOLTAGE_R+VOLTAGE_Y+VOLTAGE_B>0){
					INPUT1=1;
				}
				var OUTPUT_STATUS = OUTPUT1;
				
				PUMP_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT_STATUS; //OUTPUT_STATUS;
				PUMP_DATA[IMEI_NO]['DATA_STAMP'] = DATA_STAMP;
				PUMP_DATA[IMEI_NO]['SL_VOLTAGE'] = SL_VOLTAGE;
				PUMP_DATA[IMEI_NO]['SOCKET'] = sock;
			
				var sqlquery = {
					imei_no: IMEI_NO,
					data_stamp: DATA_STAMP,
					actual_data: ACTUAL_DATA,
					actualdatalength: ACTUALDATALENGTH,
					sl_voltage: SL_VOLTAGE,
					voltage_r: VOLTAGE_R,
					voltage_y: VOLTAGE_Y,
					voltage_b: VOLTAGE_B,
					amp_r: AMP_R,
					amp_y: AMP_Y,
					amp_b: AMP_B,
					pf_r: PF_R,
					pf_y: PF_Y,
					pf_b: PF_B,
					kw: KW,
					kwr: KWR,
					kwy: KWY,
					kwb: KWB,
					kwh: KWH,
					kvah: KVAH,
					frequency: FREQUENCY,
					io_stamp: IO_STAMP,
					inputs: INPUT1,
					outputs: OUTPUT1,
					analoginput: ANALOGINPUT,
					auto:auto,
					manual:manual,
					trip:trip,
					status: STATUS
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
										imei_no: IMEI_NO,
										data_stamp: DATA_STAMP,
										actual_data: ACTUAL_DATA,
										actualdatalength: ACTUALDATALENGTH,
										sl_voltage: SL_VOLTAGE,
										voltage_r: VOLTAGE_R,
										voltage_y: VOLTAGE_Y,
										voltage_b: VOLTAGE_B,
										amp_r: AMP_R,
										amp_y: AMP_Y,
										amp_b: AMP_B,
										pf_r: PF_R,
										pf_y: PF_Y,
										pf_b: PF_B,
										kw: KW,
										kwr: KWR,
										kwy: KWY,
										kwb: KWB,
										kwh: KWH,
										kvah: KVAH,
										frequency: FREQUENCY,
										io_stamp: IO_STAMP,
										inputs: INPUT1,
										outputs: OUTPUT1,
										analoginput: ANALOGINPUT,
										auto:auto,
										manual:manual,
										trip:trip,
										status: STATUS
									}
									
									connection.query('UPDATE trans_last_data SET ?, update_time=NOW() WHERE imei_no = ?;', [sqlquery, IMEI_NO],
									function selectCb(err3, results3, fields3) {
										if (err3) {
											console.log(err3);	
										}else {
										//	console.log("TRANS LAST DATA ROW UPDATED");
										}
									}); 
								}else{								
					 
									var sqlquery = {
										imei_no: IMEI_NO,
										data_stamp: DATA_STAMP,
										actual_data: ACTUAL_DATA,
										actualdatalength: ACTUALDATALENGTH,
										sl_voltage: SL_VOLTAGE,
										voltage_r: VOLTAGE_R,
										voltage_y: VOLTAGE_Y,
										voltage_b: VOLTAGE_B,
										amp_r: AMP_R,
										amp_y: AMP_Y,
										amp_b: AMP_B,
										pf_r: PF_R,
										pf_y: PF_Y,
										pf_b: PF_B,
										kw: KW,
										kwr: KWR,
										kwy: KWY,
										kwb: KWB,
										kwh: KWH,
										kvah: KVAH,
										frequency: FREQUENCY,
										io_stamp: IO_STAMP,
										inputs: INPUT1,
										outputs: OUTPUT1,
										analoginput: ANALOGINPUT,
										auto:auto,
										manual:manual,
										trip:trip,
										status: STATUS
									}
									
									connection.query('INSERT INTO trans_last_data SET ?, update_time=NOW() ', sqlquery,
									function selectCb(err4, results4, fields4) {
										if (err4) {
											console.log(err4);	
										}else {
										//	console.log("INSERT TRANS LAST DATA");
										}
									});
								}
							}
						}); 
						
						//console.log("INSERT DATA OK ... ");
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
	4G Pump 
	******************** 
*/ 


var level_server_4g = net.createServer(function(sock) {
    console.log('SERVER CON: ' + sock.remoteAddress +':'+ sock.remotePort);
    
		sock.on('data', function(data) {
		// 4G
		console.log('-----* 4G LEVEL SENSER Data *-----');
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var hexdata = buff.toString('hex');
		console.log('ORIGINAL2: ' + hexdata);
		
			   
		
		
		var regExp = /(?<=5b)(.*)(?=5d)/;
        var matches = hexdata.match(regExp) 
        
        var d = '';
        if(!empty(matches)){
            if(matches.length > 0){
        		d = matches[1];
				
				console.log('Actual Data::',d);
				 
        		
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
				
				//fx += lx; lx = 8;
				
				/* var LVL_DATA = '';
				//for(var i = fx; i<fx+lx; i+=2){
					LVL_DATA += parseInt(d.substr(fx+6,2)+""+d.substr(fx+4,2)+""+d.substr(fx+2,2)+""+d.substr(fx+0,2), 16);
				//} */
				console.log("DATA STAMP: "+DATA_STAMP);
				console.log("IMEI NO: "+IMEI_NO);
				console.log("SL VOLTAGE: "+SL_VOLTAGE);
				console.log("BT VOLTAGE: "+BT_VOLTAGE);
				console.log("IO STAMP: "+IO_STAMP);
				//console.log("LEVEL DATA: "+d.substr(fx,8)+" "+LVL_DATA);
				
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
//level_server_4g.listen(LEVEL_PORT_4G, HOST);
//level_server_4g.listen(PUMP_PORT, HOST);


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

function HexToDecimalPump(value){
	return parseInt(Pad(value,4), 16);
}

function getHexToDecimalPump(v1,v2){
	return String(HexToDecimalPump(String(v2)+String(v1)));//+String(HexToDecimal(v2));
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
function UInt16(value) {
	return (value & 0xFFFF);
};
