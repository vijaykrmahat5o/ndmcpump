var net = require('net');
var mysql = require('mysql');
var moment = require("moment");
var http = require('http');
var httpserver = http.createServer();
var socketio = require('socket.io')(httpserver);
var empty = require('is-empty');

var schedule = require('node-schedule');

var HOST = '216.10.247.24';
var PORT = 33101;
var HTTP_PORT = 33102;

var dateFormat = require('dateformat');
var interval = '';
var sockets = [];
var sockets_info = [];
var connection = mysql.createConnection({
	multipleStatements: true,
	host     : 'localhost',
	user     : 'acumec_usr',
	password : 'az7gurl0nmns',
	database : 'acumec_ccms',
	dateStrings: [
		'DATE',
		'DATETIME'
	  ]
});
var dbcols = new Array();
var tldcols = new Array();
var cname = "";
var cvalue = "";
var dt = new Date();
var ST = dt.getTime();
var dt = new Date();
var CT = dt.getTime();
var TB_DEVICE = 'master_device';
var TB_LOCATION = 'master_location';
var TB_SCHEDULE = 'schedule';
var TB_DEVICE_RECIEVED = 'device_received_data';
var TB_DEVICE_LASTDATA = 'device_last_data';
var TB_REPORT_ULB = 'report_ulb';
var TB_REPORT_ULB_DATA = 'report_ulb_data';
var TB_LASTDATA = 'trans_last_data';
var TB_OVERVOLTAGE = 'report_overvoltage';
var TB_LOAD = 'report_overload';
var TB_SCHEDULE_STATUS = 'tb_schedule_data';
var TRANEW = 'trans_received_data_new';
var TB_KWH_DAILY = 'consumption_daily';
var TB_KWH_MONTHLY = 'consumption_monthly';
var AMP_LIMIT = 1300;
var VOLTAGE_LIMIT = 28000;
var MASTER_DATA = new Object();
var MASTER_DATA_INFO = new Object();
var MASTER_ULBS = new Array();
var DISCONNECTION_TIME_LIMIT = 30;
var CORRECTION_AMP = 2.3;

var data_check = new Object();

var IMEI_NOT_FOUND = new Object();

var ONESEC = 1000;
var ONEMIN = 60 * 1000;
var TENMIN = 10 * 60 * 1000;
var ONEHOUR = 60 * 60 * 1000;
var TWELVEHOURS = 12 * 60 * 60 * 1000;
var ONEDAY = 24 * 60 * 60 * 1000;

var DELAY = 15;

var METER_SINGLE_PHASE = 1;
var METER_THREE_PHASE = 3;


var fx = 0;
var lx = 6;

var ULB_INDEX = 0;



socketio.on('connection', function (httpsocket){
    var nb = 0;

    console.log('SocketIO > Connected socket ' + httpsocket.id);

    httpsocket.on('getdata', areacode => {
    	console.log('--------- WEB PAGE REQUEST ---------'+areacode);
    	
    	var devices = new Array();
    	for (const [key, value] of Object.entries(MASTER_DATA)) {
			if(areacode == value.ULB_CODE){
				devices.push(value);
			}
		}
		var result = new Object();
		result.time = moment().format("YYYY-MM-DD HH:mm:ss");
		result.devices = devices;
		httpsocket.emit('datarecieved', result);
    });

    httpsocket.on('commtoser', function(val){
		console.log("-----------------------------------> "+val.imei+" "+val.command)
		for (const [key, value] of Object.entries(MASTER_DATA)) {
			if(key == val.imei){
				console.log("---------------> IMEI FOUND "+key);

				var sock = MASTER_DATA_INFO[key]['CONNECTION'];
				if(MASTER_DATA[key]['MODEM_TYPE'] == '2G') {
					var cmdstr = "";
					if(val.command == "ON"){
						cmdstr = "LIGHTON";

					    console.log("2G LIGHT ON "+cmdstr);
					}else{
						cmdstr = "LIGHTOF";

					    console.log("2G LIGHT OFF "+cmdstr);
					}
					sock.write(cmdstr);
				}else if(MASTER_DATA[key]['MODEM_TYPE'] == '4G'){
					var optn = "";
					if(val.command == "ON"){
						optn = "4C494748544F4E";
					    for(var i = 0; i<optn.length; i+=2) {
					    	hexvalue.push('0x'+optn.substr(i,2));
					    }
					    hexvalue.push(0x0D);
					    hexvalue.push(0x0A);

					    console.log("4G LIGHT ON "+hexvalue);
					}else{
						optn = "4C494748544F46";
					    for(var i = 0; i<optn.length; i+=2) {
					    	hexvalue.push('0x'+optn.substr(i,2));
					    }
					    hexvalue.push(0x0D);
					    hexvalue.push(0x0A);

					    console.log("4G LIGHT OFF "+hexvalue);
					}

				    var buf = new Buffer(hexvalue, "hex");
					sock.write(buf);
				}
			}
		}
		httpsocket.emit('commtoser_res', 'OK');
	});


	httpsocket.on('singledcucommand', function(val){
		//console.log(val.imei+" "+val.command)
		for(var i=0;i<sockets.length;i++){
			//console.log(sockets[i].remoteAddress+" "+sockref[sockets[i].remoteAddress]);
			if(sockref[sockets[i].remoteAddress] == val.imei){
				var buf = new Buffer(val.command, "hex");
				sockets[i].write(buf);
				console.log('COMMAND '+val.imei+' '+val.command);
				break;
			}
		}
	});
	httpsocket.on('broadcast', function (val) {
        ++nb;
		console.log('BROADCAST '+val.command);
		for(var i=0;i<sockets.length;i++){
			var buf = new Buffer(val.command, "hex");
			sockets[i].write(buf);
		}
    });
    httpsocket.on('dcucommand', function (val) {
        ++nb;
		console.log('DCUCOM HIT '+val.imei+' '+val.command);
		for(var i=0;i<sockets.length;i++){
			if(val.imei != ''){
				if(sockets[i].imei_no == val.imei){
					var buf = new Buffer(val.command, "utf8");
					sockets[i].write(buf);
					console.log('DCU COMMAND '+val.imei+' '+val.command);
				}
			}else{
				var buf = new Buffer(val.command, "utf8");
				sockets[i].write(buf);
				console.log('DCU COMMAND TO ALL '+val.imei+' '+val.command);
			}
		}
		
		var COMMAND = '';
		if(val.imei != ''){
			COMMAND = val.command.toString().split(",")[3];
		}else{
			COMMAND = val.command.toString().split(",")[0];
		}
		
        //socketio.sockets.emit("broadcast", message);
    });
	
	httpsocket.on('ctrlcommand', function (val) {
        ++nb;
		console.log('CTRLCOM HIT '+val.imei+' '+val.command);
		for(var i=0;i<sockets.length;i++){
			if(val.imei != ''){
				if(sockets[i].imei_no == val.imei){
					var buf = new Buffer(val.command, "hex");
					sockets[i].write(buf);
					console.log('CTRL COMMAND '+val.imei+' '+val.command);
				}
			}else{
				var buf = new Buffer(val.command, "hex");
				sockets[i].write(buf);
				console.log('CTRL COMMAND TO ALL '+val.imei+' '+val.command);
			}
		}
		
        //socketio.sockets.emit("broadcast", message);
    });

    httpsocket.on('disconnect', function () {
        console.log('SocketIO : Received ' + nb + ' messages');
        console.log('SocketIO > Disconnected socket ' + httpsocket.id);
    });
});
console.log("Listening PORT ");
httpserver.listen(HTTP_PORT);



setTimeout(load_devices, 1000);
function load_devices(){
	var sql = "SELECT md.id, md.imei_no, ml.feeder_pillar_no, ml.meter_no, ml.modem_type, ml.meter_type, md.device_no, md.data_fault, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location, ml.mobile_no, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.maintenance, mz.title as ulb_title, mz.areacode, mz.on_time, mz.off_time, mz.sms_mobile, dld.total_kw as actual_load, dld.output_status, dld.data_stamp, dld.update_time, led_18w, led_24w, led_35w, led_45w, led_60w, led_70w, led_75w, led_80w, led_110w, led_130w, led_140w, led_190w, led_200w "+
"FROM master_device AS md "+
"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no;"

	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
					var IMEI_NO = results[i].imei_no;
					if(!MASTER_DATA[IMEI_NO]){
						MASTER_DATA[IMEI_NO] = new Object();
						MASTER_DATA_INFO[IMEI_NO] = new Object();
						
						MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] = 1;
						MASTER_DATA_INFO[IMEI_NO]['CONNECTION'] = '';
						MASTER_DATA_INFO[IMEI_NO]['TIME'] = 0;
						MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] = 0;
						MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] = 0;
						MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = -1;
						MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = -1;
						MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = -1;
						MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'] = '';
						MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = '';
						MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE'] = results[i].sms_mobile;
						MASTER_DATA_INFO[IMEI_NO]['DATE_READING'] = moment().date();
						MASTER_DATA_INFO[IMEI_NO]['MONTH_READING'] = moment().month();


						MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'] = moment().subtract(1, 'day').format("YYYY-MM-DD HH:mm:ss");
						MASTER_DATA[IMEI_NO]['RTC_SET_TIME'] = '';
						MASTER_DATA[IMEI_NO]['IMEI_NO'] = IMEI_NO;
						MASTER_DATA[IMEI_NO]['STATE_ID'] = results[i].state_id;
						MASTER_DATA[IMEI_NO]['ZONE_ID'] = results[i].zone_id;
						MASTER_DATA[IMEI_NO]['ULB_ID'] = results[i].ulb_id;
						MASTER_DATA[IMEI_NO]['ULB_CODE'] = results[i].areacode;
						MASTER_DATA[IMEI_NO]['FP_NO'] = results[i].feeder_pillar_no;
						MASTER_DATA[IMEI_NO]['ACTUAL_LOAD'] = results[i].actual_load;
						MASTER_DATA[IMEI_NO]['TOTAL_KW'] = results[i].actual_load;
						MASTER_DATA[IMEI_NO]['TOTAL_KWR'] = results[i].actual_load;
						MASTER_DATA[IMEI_NO]['METER_TYPE'] = results[i].meter_type;
						MASTER_DATA[IMEI_NO]['MODEM_TYPE'] = results[i].modem_type;
						MASTER_DATA[IMEI_NO]['METER_PHASE_TYPE'] = '';
						MASTER_DATA[IMEI_NO]['POWER_CUT'] = 0;
						MASTER_DATA[IMEI_NO]['DATALENGTH'] = 0;

						MASTER_DATA[IMEI_NO]['LOCATION'] = results[i].location;
						MASTER_DATA[IMEI_NO]['MOBILE'] = results[i].mobile_no;
						MASTER_DATA[IMEI_NO]['FITTINGS'] = results[i].no_of_fittings;
						MASTER_DATA[IMEI_NO]['TOTAL_LOAD'] = results[i].total_load;
						MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = 0;
						MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = 0;
						MASTER_DATA[IMEI_NO]['LATITUDE'] = results[i].location_lat;
						MASTER_DATA[IMEI_NO]['LONGITUDE'] = results[i].location_lng;
						MASTER_DATA[IMEI_NO]['METER_NO'] = results[i].meter_no;

						MASTER_DATA[IMEI_NO]['LED_18'] = results[i].led_18w;
						MASTER_DATA[IMEI_NO]['LED_24'] = results[i].led_24w;
						MASTER_DATA[IMEI_NO]['LED_35'] = results[i].led_35w;
						MASTER_DATA[IMEI_NO]['LED_45'] = results[i].led_45w;
						MASTER_DATA[IMEI_NO]['LED_60'] = results[i].led_60w;
						MASTER_DATA[IMEI_NO]['LED_70'] = results[i].led_70w;
						MASTER_DATA[IMEI_NO]['LED_75'] = results[i].led_75w;
						MASTER_DATA[IMEI_NO]['LED_80'] = results[i].led_80w;
						MASTER_DATA[IMEI_NO]['LED_110'] = results[i].led_110w;
						MASTER_DATA[IMEI_NO]['LED_130'] = results[i].led_130w;
						MASTER_DATA[IMEI_NO]['LED_140'] = results[i].led_140w;
						MASTER_DATA[IMEI_NO]['LED_190'] = results[i].led_190w;
						MASTER_DATA[IMEI_NO]['LED_200'] = results[i].led_200w;

						MASTER_DATA[IMEI_NO]['UPDATE_TIME'] = results[i].update_time;
					}
					MASTER_DATA[IMEI_NO]['RTC_ON_TIME'] = results[i].on_time;
					MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'] = results[i].off_time;
					MASTER_DATA[IMEI_NO]['MAINTENANCE'] = results[i].maintenance;
					
				}
				setTimeout(load_devices, TENMIN);
				console.log("TOTAL RECORDS "+results.length);
			}else{
				console.log("NO RECORDS");
			}
		}
	});
}



var server = net.createServer(function(sock) {
    console.log('SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
    
    sock.on('data', function(data) 
	{
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var hexdata = buff.toString('hex');
		//console.log('ORIGINAL: ' + data);
		//console.log('HEX: ' + hexdata);
		var regExp = /(?<=5b)(.*)(?=5d)/;
        var matches = hexdata.match(regExp) 
        
        var d = '';
        if(!empty(matches)){
        	if(matches.length > 0){
        		d = matches[1];
        	
        	
	        	var STATUS = "";
				var TYPE = "";
				var ACTUAL_DATA = d;
				var ACTUALDATALENGTH = d.length;

				var devicetype = d.toUpperCase().indexOf("53504D");

				var METER_PHASE_TYPE = 0;
				if(devicetype > 0){
					METER_PHASE_TYPE = METER_SINGLE_PHASE;
				}else{
					METER_PHASE_TYPE = METER_THREE_PHASE;
				}
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
				
				fx += lx; lx = 30;
				IMEI_NO = '';
				for(var i = fx; i<fx+lx; i+=2){
					IMEI_NO += String.fromCharCode(parseInt(d.substr(i,2), 16));
				}				
				if(IMEI_NO == '000000000000000'){
					console.log('WRONG IMEI NO');
					return false;
				}
				//console.log("IMEI_NO "+IMEI_NO);

				writeLog(IMEI_NO, d);

				
				
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
				
				var OUTPUT_STATUS = IO_DATA.substr(6, 1);
				
				
				//fx += lx; lx = 6;
				//var DIGITAL_INPUT = d.substr(fx, lx);
				var DOOR_STATUS = IO_DATA.substr(12, 1);
				
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
				
				if(empty(sock.imei_no)){
					sock.imei_no = IMEI_NO;
				}
				

				var skip = false;
				dt = new Date();

				if(empty(MASTER_DATA[IMEI_NO])){
					console.log(IMEI_NO+" NOT FOUND");
						
					if(!IMEI_NOT_FOUND[IMEI_NO]){
						IMEI_NOT_FOUND[IMEI_NO] = new Object();	
					}

					IMEI_NOT_FOUND[IMEI_NO]['TIME'] = dt.getTime();
					IMEI_NOT_FOUND[IMEI_NO]['DATA'] = d;
					IMEI_NOT_FOUND[IMEI_NO]['IP'] = sock.remoteAddress;

					var now = new Date();
					//var newdate = dateFormat(now, "ddmmyyHHMMss");
					//sock.write("UNAUTHORISED,"+newdate);

					return;
				}
				
				if((dt.getTime() - MASTER_DATA_INFO[IMEI_NO]['TIME']) < 10000 && (dt.getTime() - MASTER_DATA_INFO[IMEI_NO]['TIME']) > -10000){
					skip = true;
				}
				
				
				if(!skip){
					var date_rtc = moment("20"+DATA_STAMP);
					var date_curr = moment().format("YYYY-MM-DD HH:mm");
					//console.log("TIME DFFEERCE "+moment(date_curr).diff(date_rtc,'seconds')+" "+date_rtc+" "+date_curr);
					if(moment(date_curr).diff(date_rtc,'minutes') < 2 && moment(date_curr).diff(date_rtc,'minutes') >= 0){
						//console.log('OK DATA');
					}else{
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

						MASTER_DATA[IMEI_NO]['RTC_SET_TIME'] = moment().format("DD-MM-YYYY HH:mm:ss");
					}			
				}
						
				MASTER_DATA_INFO[IMEI_NO]['TIME'] = dt.getTime();

				MASTER_DATA[IMEI_NO]['MODEM_TYPE'] = '4G';

				MASTER_DATA[IMEI_NO]['UPDATE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
				
				MASTER_DATA_INFO[IMEI_NO]['CONNECTION'] = sock;
				MASTER_DATA[IMEI_NO]['METER_PHASE_TYPE'] = METER_PHASE_TYPE;
				
				if(moment().diff(MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'], 'hours') > 23 && MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0){
					if(!empty(MASTER_DATA[IMEI_NO]['RTC_ON_TIME']) && !empty(MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'])){
						var OFF_TIME = MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'].split(":"); 
						var ON_TIME = MASTER_DATA[IMEI_NO]['RTC_ON_TIME'].split(":");
						var schedule_str = 'TOD,0000,'+OFF_TIME[0]+OFF_TIME[1]+','+ON_TIME[0]+ON_TIME[1]+',2400,0000,0000';
						var socket = MASTER_DATA_INFO[IMEI_NO]['CONNECTION'];
						//socket.write(schedule_str);
						MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
					}
				}
				
				
				
				
				var INPUT1 = IO_DATA.substr(0, 1);
				var INPUT2 = IO_DATA.substr(1, 1);
				var INPUT3 = IO_DATA.substr(2, 1);
				var INPUT4 = IO_DATA.substr(3, 1);
				var INPUT5 = IO_DATA.substr(4, 1);
				var INPUT6 = IO_DATA.substr(5, 1);
				
				var INPUT_DATA = INPUT1+''+INPUT2+''+INPUT3+''+INPUT4+''+INPUT5+''+INPUT6;

				var OUTPUT1 = IO_DATA.substr(6, 1);
				var OUTPUT2 = IO_DATA.substr(7, 1);
				var OUTPUT3 = IO_DATA.substr(8, 1);
				var OUTPUT4 = IO_DATA.substr(9, 1);
				var OUTPUT5 = IO_DATA.substr(10, 1);
				var OUTPUT6 = IO_DATA.substr(11, 1);
				var OUTPUT7 = IO_DATA.substr(12, 1);
				
				var OUTPUT_DATA = OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6+''+OUTPUT7;
				
				
				
				/*fx += lx; lx = 6;
				var IO_DATE = d.substr(fx, lx);
				var IO_DD = IO_DATE.substr(0, 2);
				var IO_MM = IO_DATE.substr(2, 2);
				var IO_YY = IO_DATE.substr(4, 2);
				
				fx += lx; lx = 6;
				var IO_TIME = d.substr(fx, lx);
				var IO_HH = IO_TIME.substr(0, 2);
				var IO_MI = IO_TIME.substr(2, 2);
				var IO_SS = IO_TIME.substr(4, 2);
				var IO_STAMP = IO_YY+"-"+IO_MM+"-"+IO_DD+" "+IO_HH+":"+IO_MI+":"+IO_SS;*/
				
				var DATA = d;
				
				var STATUS = "";
				var TYPE = "";
				var ACTUAL_DATA = d;
				var ACTUALDATALENGTH = d.length;

				var PREVIOUS_DATALENGTH = MASTER_DATA[IMEI_NO]['DATALENGTH'];
				if(PREVIOUS_DATALENGTH > 59 && ACTUALDATALENGTH == 59){
					/* POWER FAILED NOW, SEND SMS TO ULB */
					console.log("POWER DOWN "+IMEI_NO+" "+MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE']);
					if(!empty(MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE'])){
						var mobile = MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE'];
						var sms = 'POWER OFF LOCATION - ' + MASTER_DATA[IMEI_NO]['LOCATION'];
						var url = 'http://sms.bmwebmedia.com/shn/api/pushsms.php?usr=624402&key=0105qJp302aRslvQCRCgLIpYL8meS0&sndr=RNDSMS&ph='+mobile+'&text='+sms+'&rpt=1';
						var request = http.request(url, function (res) {
							var data = '';
							res.on('data', function (chunk) {
								data += chunk;
							});
							res.on('end', function () {
								console.log(data);
							});
						});
						request.on('error', function (e) {
							console.log(e.message);
						});
						request.end();
					}


					var insertq = {
						state_id: MASTER_DATA[IMEI_NO]['STATE_ID'],
						city_id: 0,
						ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
						imei_no: MASTER_DATA[IMEI_NO]['IMEI_NO'],
						fp_no: MASTER_DATA[IMEI_NO]['FP_NO'],
						message: "POWER CUT"
					}
					var sql = 'INSERT INTO report_powercut SET ?, insert_time=NOW();';
					connection.query(sql, [insertq], function selectCb(err, results, fields) {
						if (err) {
							//console.log(err);
						}else{ 
							//console.log("INSERT TRANS LAST DATA OK");
						}
					});
				}

				MASTER_DATA[IMEI_NO]['DATALENGTH'] = d.length;
				
				cname = "";
				cvalue = "";

				if(data.toString().indexOf("DD0") == -1 && ACTUALDATALENGTH == 59 ){
					/* NO POWER OR LIGHT */

					if(IMEI_NO == "869247046644230"){
						console.log(">>> CONSOLE 2 : NO LIGHT");
					}

					MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = 0;
					MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

					var insertq = {
						imei_no: IMEI_NO,
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,

						voltage_r: 0,
						voltage_y: 0,
						voltage_b: 0,
						amp_r: 0,
						amp_y: 0,
						amp_b: 0,
						pf_r: 0,
						pf_y: 0,
						pf_b: 0,
						kw_r: 0,
						kw_y: 0,
						kw_b: 0,
						kva_r: 0,
						kva_y: 0,
						kva_b: 0,
						kvar_r: 0,
						kvar_y: 0,
						kvar_b: 0,
						total_kw: 0,
						kvah: 0,
						kvarh: 0,
						output_status: 0,

						io_stamp: IO_STAMP,
						door_status: INPUT5,
						power_cut: 1
					}

					var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
					
					connection.query(sql, insertq, function selectCb(err, results, fields) {
						if (err){
							console.log(err);
						}else{ 
							//console.log("INSERT DATA OK");
							var updateq = {
								data_stamp: DATA_STAMP,
								supply: SL_VOLTAGE,
								battery: BT_VOLTAGE,
								datalength: ACTUALDATALENGTH,
								output_data: OUTPUT_DATA,
								input_data: INPUT_DATA,

								voltage_r: 0,
								voltage_y: 0,
								voltage_b: 0,
								amp_r: 0,
								amp_y: 0,
								amp_b: 0,
								pf_r: 0,
								pf_y: 0,
								pf_b: 0,
								kw_r: 0,
								kw_y: 0,
								kw_b: 0,
								kva_r: 0,
								kva_y: 0,
								kva_b: 0,
								kvar_r: 0,
								kvar_y: 0,
								kvar_b: 0,
								total_kw: 0,
								kvah: 0,
								kvarh: 0,
								output_status: 0,

								io_stamp: IO_STAMP,
								door_status: INPUT5,
								power_cut: 1
							}
							
							var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
							connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
								if (err) {
									//console.log(err);
								}else{ 
									//console.log("INSERT TRANS LAST DATA OK");
								}
							});
						}
					}); 



					if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] != ""){
							var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
							connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="0" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("UPDATE LOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
						}
						
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']){
							var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
							connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("INSERT OVERLOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
						}
					}


					/*var sql = "INSERT INTO device_fault (imei_no, datastring, insert_time) values ('"+IMEI_NO+"','"+d+"', NOW());";
					connection.query(sql, function selectCb(err, results, fields) {
						if (err){
							console.log(err);
						}else{ 
							console.log("INSERT DATA OK");
						}
					});
					
					MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT'] = 1;
					
					
					var sql = 'UPDATE master_device SET data_fault=1,fault_time=NOW() WHERE imei_no="'+IMEI_NO+'"';
					connection.query(sql, function selectCb(err, results, fields) {
						if (err){
							console.log(err);
						}else{
							console.log("INSERT DATA OK");
						}
					});*/
					return;
				}


				//fx=58

				
				if(d.length < 209){
					
					/*1906201116168689970383514070003501010101000000190620053719
					var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";
					//console.log(sql);
					connection.query(sql, function selectCb(err, results, fields) {
						if (err){
							console.log(err);
						}else{ 
							console.log("INSERT DATA OK");
							connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
							function selectCb(err, results, fields) {
								if (err) {
									console.log(err);
								}else{ 
									console.log("INSERT TRANS LAST DATA OK");
								}
							});
						}
					});*/

					if(IMEI_NO == "869247046644230"){
						console.log(">>> CONSOLE 2 : LESS 209");
					}

					var insertq = {
						imei_no: IMEI_NO,
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,
						io_stamp: IO_STAMP,
						output_status: OUTPUT1,
						door_status: INPUT5,
						power_cut: 1
					}
					
					MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
					MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

					//var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','','','0','0','0','0','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";

					var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
					//console.log(sql);
					connection.query(sql, insertq, function selectCb(err, results, fields) {
						if (err){
							//console.log(err);
						}else{ 
							//console.log("INSERT DATA OK");
							var updateq = {
								data_stamp: DATA_STAMP,
								supply: SL_VOLTAGE,
								battery: BT_VOLTAGE,
								datalength: ACTUALDATALENGTH,
								output_data: OUTPUT_DATA,
								input_data: INPUT_DATA,
								io_stamp: IO_STAMP,
								output_status: OUTPUT1,
								door_status: INPUT5,
								meter_fault: 1
							}
							
							//connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='0', voltage_y='0', voltage_b='0', amp_r='0', amp_y='0', amp_b='0', pf_r='0', pf_y='0', pf_b='0', kw_r='0', kw_y='0', kw_b='0', kva_r='0', kva_y='0', kva_b='0', kvar_r='0', kvar_y='0', kvar_b='0', kwh='0', kvah='0', kvarh='0', meter_no='', meter_stamp='', total_kw='0', total_kva='0', total_pf='', frequency='', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
							var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
							connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
								if (err) {
									//console.log(err);
								}else{ 
									//console.log("INSERT TRANS LAST DATA OK");
								}
							});
						}
					});   
					
					
					
					
					
					/*connection.query('INSERT INTO '+TB_DEVICE_RECIEVED+' (IMEI_NO, DATA_STAMP, ACTUAL_DATA, ACTUALDATALENGTH, SL_VOLTAGE,  IO_STAMP, INPUT1, INPUT2, INPUT3, INPUT4, OUTPUT1, OUTPUT2, OUTPUT3, OUTPUT4 ) values ("' + IMEI_NO + '", "' + DATA_STAMP + '", "' + ACTUAL_DATA + '", "' + ACTUALDATALENGTH + '", "'+SL_VOLTAGE+'", "'+ IO_STAMP + '", "'+ INPUT1 + '", "'+ INPUT2 + '", "'+ INPUT3 + '", "'+ INPUT4 + '", "'+ OUTPUT1 + '", "'+ OUTPUT2 + '", "'+ OUTPUT3 + '", "'+ OUTPUT4 + '")',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							console.log("INSERT DATA OK");
						}
					});*/
					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = -1;
					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = -1;
					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = -1;
					
					if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] != ""){
							var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
							connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="0" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("UPDATE LOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
						}
						
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']){
							var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
							connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("INSERT OVERLOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
						}
					}
					
					return;
				}
				
				var VOLTAGE_R,VOLTAGE_Y,VOLTAGE_B,AMP_R,AMP_Y,AMP_B;


				/*if(MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT']){
					var sql = 'UPDATE master_device SET data_fault=0 WHERE imei_no="'+IMEI_NO+'"';
					connection.query(sql, function selectCb(err, results, fields) {
						if (err){
							console.log(err);
						}else{
							console.log("FAULT DEVICE REMOVED!");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT'] = 0;
				}*/


				if(METER_PHASE_TYPE == METER_SINGLE_PHASE){

					//console.log('SINGLE PHASE METER '+IMEI_NO);
					
					fx += lx; lx = 4; VOLTAGE_R = hexval(d.substr(fx, lx));
					//fx += lx; lx = 4; 
					//fx += lx; lx = 4; 
					VOLTAGE_Y = 0;
					VOLTAGE_B = 0;
					fx += lx; lx = 4; AMP_R = hexval(d.substr(fx, lx));
					//fx += lx; lx = 4; 
					//fx += lx; lx = 4; 
					AMP_Y = 0;
					AMP_B = 0;

					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = AMP_R;
					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = AMP_Y;
					MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = AMP_B;

					fx += lx; lx = 2;
					var PF_R = hexval(d.substr(fx, lx));
					//fx += lx; lx = 2;
					//fx += lx; lx = 2;
					var PF_Y = 0;
					var PF_B = 0;
					
					fx += lx; lx = 8;
					var KWR = hexval(d.substr(fx, lx));
					//fx += lx; lx = 8;
					//fx += lx; lx = 8;
					var KWY = 0;
					var KWB = 0;
					
					fx += lx; lx = 8;
					var KVAR = hexval(d.substr(fx, lx));
					//fx += lx; lx = 8;
					//fx += lx; lx = 8;
					var KVAY = 0;
					var KVAB = 0;


					fx += lx; lx = 8;
					var KWH = hexval(d.substr(fx, lx));

					fx += lx; lx = 8;
					var BILLING_KWH = hexval(d.substr(fx, lx));

					fx += lx; lx = 8;
					var KVAH = hexval(d.substr(fx, lx));

					fx += lx; lx = 8;
					var BILLING_KVAH = hexval(d.substr(fx, lx));

					fx += lx; lx = 4;
					var KW_MD = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
					fx += lx; lx = 2;
					var _MONTH = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _YEAR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _HOUR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _MIN = parseInt(d.substr(fx, lx), 16);
					var _SECOND = '00';
					var KW_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



					fx += lx; lx = 4;
					var BILLING_KW_MD = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
					fx += lx; lx = 2;
					var _MONTH = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _YEAR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _HOUR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _MIN = parseInt(d.substr(fx, lx), 16);
					var _SECOND = '00';
					var BILLING_KW_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



					fx += lx; lx = 4;
					var KVA_MD = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
					fx += lx; lx = 2;
					var _MONTH = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _YEAR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _HOUR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _MIN = parseInt(d.substr(fx, lx), 16);
					var _SECOND = '00';
					var KVA_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



					fx += lx; lx = 4;
					var BILLING_KVA_MD = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
					fx += lx; lx = 2;
					var _MONTH = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _YEAR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _HOUR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _MIN = parseInt(d.substr(fx, lx), 16);
					var _SECOND = '00';
					var BILLING_KVA_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);

					fx += lx; lx = 8;
					var SERIAL_NO = hexval(d.substr(fx, lx));


					fx += lx; lx = 2;
					var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
					fx += lx; lx = 2;
					var _MONTH = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _YEAR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _HOUR = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _MIN = parseInt(d.substr(fx, lx), 16);
					fx += lx; lx = 2;
					var _SECOND = parseInt(d.substr(fx, lx), 16);

					var METER_RTC = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);


					fx += lx; lx = 4;
					var FREQUENCY = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var REV_TAMPER = hexval(d.substr(fx, lx));

					fx += lx; lx = 2;
					var MAG_TAMPER = hexval(d.substr(fx, lx));



					var now = new Date();
					var created_at = dateFormat(now, "isoDateTime");
					
					/*var idx = sockets.indexOf(sock);
					if (idx != -1) {
						if(sockets_info[idx].imei == ""){
							sockets_info[idx].imei = IMEI_NO;
						}
					}else{
						console.log("CURRENT SOCKET NOT FOUND "+sockets.length+' '+sockets_info.length);
					}*/
					
					
					var sqlquery = {
						imei_no: IMEI_NO,
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						datalength: ACTUALDATALENGTH,
						input_data: INPUT_DATA,
						output_data: OUTPUT_DATA,
						voltage_r: VOLTAGE_R,
						amp_r: AMP_R,
						pf_r: PF_R,
						kw_r: KWR,
						kva_r: KVAR,
						kwh: KWH,
						kvah: KVAH,
						meter_no: SERIAL_NO,
						frequency: FREQUENCY,
						io_stamp: IO_STAMP,
						meter_stamp: METER_RTC,
						billing_kwh: BILLING_KWH,
						billing_kvah: BILLING_KVAH,
						kw_md: KW_MD,
						kw_md_date: KW_MD_DATE,
						billing_kw_md: BILLING_KW_MD,
						billing_kw_md_date: BILLING_KW_MD_DATE,
						kva_md: KVA_MD,
						kva_md_date: KVA_MD_DATE,
						billing_kva_md: BILLING_KVA_MD,
						billing_kva_md_date: BILLING_KVA_MD_DATE,
						reverse_temper: REV_TAMPER,
						mag_tamper: MAG_TAMPER,
						meter_phase_type: METER_PHASE_TYPE,
						output_status: OUTPUT1,
						door_status: INPUT5,
					}

					MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
					MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

					connection.query('INSERT INTO '+TB_DEVICE_RECIEVED+' SET ?, update_time = NOW() ', sqlquery, function selectCb(err, results, fields) {
						if (err)  {
							console.log("IMEI_NO "+IMEI_NO);
							console.log("ERROR "+err);
						}else{ 
							//console.log("INSERT DATA OK");		
						}
					});    

					
					connection.query('UPDATE '+TB_DEVICE_LASTDATA+' SET ?, update_time = NOW() WHERE imei_no = "'+IMEI_NO+'"', sqlquery, function selectCb(err, results, fields) {
						if (err)  {
							console.log("IMEI_NO "+IMEI_NO);
							console.log("ERROR "+err);
						}else{ 
							//console.log("INSERT TRANS LAST DATA OK");
						}
					}); 




					return;
				}


				if(IMEI_NO == "869247046644230"){
					console.log(">>> CONSOLE 2 : 1058");
				}

				// fx=58
				//console.log('FX : '+fx);
				
				fx += lx; lx = 4; VOLTAGE_R = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4; VOLTAGE_Y = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4; VOLTAGE_B = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4; AMP_R = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4; AMP_Y = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4; AMP_B = parseInt(d.substr(fx, lx), 16);
				
				
				if(!skip){
					if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
						//console.log(OUTPUT1+" "+AMP_R+" "+AMP_Y+" "+AMP_B+" "+AMP_LIMIT);
						if(OUTPUT1 == 1){
							if(AMP_R < AMP_LIMIT && AMP_Y < AMP_LIMIT && AMP_B < AMP_LIMIT){
								if(MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] < 2){
									var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
									var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
									
									if( inschedule ){
										//sock.write("LIGHTOF");
										setTimeout(function(sock){
											//sock.write("LIGHTON");
										},10000, sock);
										MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] += 1;
									}
								}
							}
							
						}else{
							if(AMP_R > AMP_LIMIT || AMP_Y > AMP_LIMIT || AMP_B > AMP_LIMIT){
								if(MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] < 2){
									var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
									var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
									
									if( !inschedule ){
										//sock.write("LIGHTON");
										setTimeout(function(sock){
											console.log("SEND LIGHT OFF COMMAND TO "+IMEI_NO);
											//sock.write("LIGHTOF");
										},10000, sock);
										MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] += 1;
									}
								}
							}
						}
					}
				}
				if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
					var start_date = moment().format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_ON_TIME'];
					var end_date = moment().add(1, 'day').format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'];
					var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
					var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
					
					//console.log("CHECK SCHEDULE "+IMEI_NO+" "+inschedule);
					if( inschedule ){
						MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] = 0;
					}else{
						MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] = 0;
					}
				}
				
				MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = AMP_R;
				MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = AMP_Y;
				MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = AMP_B;

				// fx=82
				
				fx += lx; lx = 2;
				var PF_R = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var PF_Y = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var PF_B = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KWR = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KWY = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KWB = parseInt(d.substr(fx, lx), 16);


				
				fx += lx; lx = 6;
				var KVAR = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KVAY = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KVAB = parseInt(d.substr(fx, lx), 16);
			
				fx += lx; lx = 6;
				var KVAR_R = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KVAR_Y = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KVAR_B = parseInt(d.substr(fx, lx), 16);
				
				fx += lx; lx = 6;
				var KWH = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var KVAH = parseInt(d.substr(fx, lx), 16);
				
				fx += lx; lx = 6;
				var KVARH = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 6;
				var METER_NO = parseInt(d.substr(fx, lx), 16);

				//console.log('FX:'+fx);
				// fx=166
				
				fx += lx; lx = 2;
				var DS_DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
				fx += lx; lx = 2;
				var DS_MONTH = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var DS_YEAR = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var DS_HOUR = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var DS_MIN = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 2;
				var DS_SECOND = parseInt(d.substr(fx, lx), 16);
				var METER_RTC = "20"+DS_YEAR+"-"+Pad(DS_MONTH,2)+"-"+Pad(DS_DATE,2)+" "+Pad(DS_HOUR,2)+":"+Pad(DS_MIN,2)+":"+Pad(DS_SECOND,2);

				if(IMEI_NO == '869247042708229'){
					console.log('IMEI CHECK 1163');
				}

				if(DS_YEAR == 0 || DS_YEAR == NaN){


					MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
					MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

					var insertq = {
						imei_no: IMEI_NO,
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,
						io_stamp: IO_STAMP,
						output_status: OUTPUT1,
						door_status: INPUT5
					}
					
					//var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','','','0','0','0','0','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";

					var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
					//console.log(sql);
					connection.query(sql, insertq, function selectCb(err, results, fields) {
						if (err){
							//console.log(err);
						}else{ 
							//console.log("INSERT DATA OK");
							var updateq = {
								data_stamp: DATA_STAMP,
								supply: SL_VOLTAGE,
								battery: BT_VOLTAGE,
								datalength: ACTUALDATALENGTH,
								output_data: OUTPUT_DATA,
								input_data: INPUT_DATA,
								io_stamp: IO_STAMP,
								output_status: OUTPUT1,
								door_status: INPUT5,
								meter_fault: 1
							}
							
							//connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='0', voltage_y='0', voltage_b='0', amp_r='0', amp_y='0', amp_b='0', pf_r='0', pf_y='0', pf_b='0', kw_r='0', kw_y='0', kw_b='0', kva_r='0', kva_y='0', kva_b='0', kvar_r='0', kvar_y='0', kvar_b='0', kwh='0', kvah='0', kvarh='0', meter_no='', meter_stamp='', total_kw='0', total_kva='0', total_pf='', frequency='', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
							var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
							connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
								if (err) {
									//console.log(err);
								}else{ 
									//console.log("INSERT TRANS LAST DATA OK");
								}
							});
						}
					}); 

					return;
				}
				
				fx += lx; lx = 6;
				var TOTAL_KW = parseInt(d.substr(fx, lx), 16);

				MASTER_DATA[IMEI_NO]['ACTUAL_LOAD'] = TOTAL_KW;
				MASTER_DATA[IMEI_NO]['TOTAL_KW'] = TOTAL_KW;

				//console.log('TOTAL KW '+TOTAL_KW);
				
				var TOTALLOAD_20 = MASTER_DATA[IMEI_NO]['TOTAL_LOAD'] * 0.05;
				if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
					if(TOTAL_KW > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20) && (parseInt(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'])/100) > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20)){
						if(!MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']){
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;


							connection.query('INSERT INTO '+TB_LOAD+' (state,district,ulb,imei_no, fp_no, start_time, start_load) values ("'+MASTER_DATA[IMEI_NO]['STATE_ID']+'","'+MASTER_DATA[IMEI_NO]['ZONE_ID']+'","'+MASTER_DATA[IMEI_NO]['ULB_ID']+'","'+IMEI_NO+'","'+MASTER_DATA[IMEI_NO]['FP_NO']+'","'+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']+'", "'+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD']+'")',
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("INSERT LOAD DATA OK "+results.insertId);
									MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = results.insertId;
								}
							});
						}
					}else{
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']){
							var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
							connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="'+TOTAL_KW+'" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
							function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("UPDATE LOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
						}
					}
				}
				MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;
				


				if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
					if(( VOLTAGE_R > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'] > VOLTAGE_LIMIT ) || ( VOLTAGE_Y > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'] > VOLTAGE_LIMIT ) || ( VOLTAGE_B > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'] > VOLTAGE_LIMIT ) ){
						if(!MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");

							var insertq ={
								state: MASTER_DATA[IMEI_NO]['STATE_ID'],
								district: MASTER_DATA[IMEI_NO]['ZONE_ID'],
								ulb: MASTER_DATA[IMEI_NO]['ULB_ID'],
								imei_no: IMEI_NO,
								fp_no: MASTER_DATA[IMEI_NO]['FP_NO'],
								voltage_r: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'],
								voltage_y: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'],
								voltage_b: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'],
								start_time: MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']
							}
							
							connection.query('INSERT INTO '+TB_OVERVOLTAGE+' SET ?; ', insertq, function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("INSERT OVERLOAD DATA OK "+results.insertId);
									MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = results.insertId;
									//MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = '';
								}
							});
						}
					}else{
						if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
							var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");


							connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time=? WHERE id=?;', [END_TIME, MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']], function selectCb(err, results, fields) {
								if (err) console.log(err);
								else{ 
									//console.log("INSERT OVERLOAD DATA OK");
								}
							});
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
						}
					}
				}
				MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'] = VOLTAGE_R;
				MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'] = VOLTAGE_Y;
				MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'] = VOLTAGE_B;
				
				fx += lx; lx = 6;
				var TOTAL_KVA = parseInt(d.substr(fx, lx), 16);
				
				fx += lx; lx = 2;
				var TOTAL_PF = parseInt(d.substr(fx, lx), 16);
				fx += lx; lx = 4;
				var FREQUENCY = parseInt(d.substr(fx, lx), 16);
				
				// fx=196
				//console.log('FX LAST: '+fx);
				
				var door_status = INPUT5;
				
				var now = new Date();
				var created_at = dateFormat(now, "isoDateTime");
				//console.log(created_at);

				MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
				MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;
				
				var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, door_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','"+VOLTAGE_R+"','"+VOLTAGE_Y+"','"+VOLTAGE_B+"','"+AMP_R+"','"+AMP_Y+"','"+AMP_B+"','"+PF_R+"','"+PF_Y+"','"+PF_B+"','"+KWR+"','"+KWY+"','"+KWB+"','"+KVAR+"','"+KVAY+"','"+KVAB+"','"+KVAR_R+"','"+KVAR_Y+"','"+KVAR_B+"','"+KWH+"','"+KVAH+"','"+KVARH+"','"+METER_NO+"','"+METER_RTC+"','"+TOTAL_KW+"','"+TOTAL_KVA+"','"+TOTAL_PF+"','"+FREQUENCY+"','"+IO_STAMP+"','"+OUTPUT1+"', '"+door_status+"', NOW())";
				//console.log(sql);
				connection.query(sql, function selectCb(err, results, fields) {
					if (err){
						console.log("DATA LENGTH "+data.length);
						console.log("IMEI_NO "+IMEI_NO);
						console.log(err);
					}else{ 
						//console.log("INSERT DATA OK");
						connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='"+VOLTAGE_R+"', voltage_y='"+VOLTAGE_Y+"', voltage_b='"+VOLTAGE_B+"', amp_r='"+AMP_R+"', amp_y='"+AMP_Y+"', amp_b='"+AMP_B+"', pf_r='"+PF_R+"', pf_y='"+PF_Y+"', pf_b='"+PF_B+"', kw_r='"+KWR+"', kw_y='"+KWY+"', kw_b='"+KWB+"', kva_r='"+KVAR+"', kva_y='"+KVAY+"', kva_b='"+KVAB+"', kvar_r='"+KVAR_R+"', kvar_y='"+KVAR_Y+"', kvar_b='"+KVAR_B+"', kwh='"+KWH+"', kvah='"+KVAH+"', kvarh='"+KVARH+"', meter_no='"+METER_NO+"', meter_stamp='"+METER_RTC+"', total_kw='"+TOTAL_KW+"', total_kva='"+TOTAL_KVA+"', total_pf='"+TOTAL_PF+"', frequency='"+FREQUENCY+"', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', door_status='"+door_status+"', meter_fault=0, meter_phase_type='"+METER_PHASE_TYPE+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
						function selectCb(err, results, fields) {
							if (err) {
								console.log(err);
							}else{ 
								//console.log("INSERT TRANS LAST DATA OK");
							}
						});
					}
				});
			}
        	return;
        }// End 4G Modem 
        
		




		var dt = new Date();
		var save_daily_kwh = false;
		var save_month_kwh = false;
		
		ST = dt.getTime();
		
		var d = data.toString().replace("CC91DD","");

		if(d.length < 58){
			console.log("--- LESS ---");
			return;
		}

		var devicetype = data.toString().indexOf("53504D");

		var METER_PHASE_TYPE = 0;
		if(devicetype > 0){
			METER_PHASE_TYPE = METER_SINGLE_PHASE;
		}else{
			METER_PHASE_TYPE = METER_THREE_PHASE;
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
		var mmj = timestr.substr(2, 2);
		var ss = timestr.substr(4, 2);
		var rec_time = hh+":"+mmj+":"+ss;
		
		fx += lx; lx = 15;
		var IMEI_NO = d.substr(fx, lx);

		if(IMEI_NO == '869247044169909'){
			console.log('IMEI CHECK 869247044169909 FOUND '+ d);
			//sock.write("LIGHTON");
		}

		//console.log(">>> "+imei_no+" "+d);

		writeLog(IMEI_NO, data);

		fx += lx; lx = 3;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx));

		

		fx += lx; lx = 3;
		var BT_VOLTAGE = d.substr(fx, lx);
		fx += lx; lx = 13;
		var IO_DATA = d.substr(fx, lx);
		
		// fx=46
		//sockref[sock.remoteAddress] = IMEI_NO;
		//console.log('>> '+sock.extra);
		if(empty(sock.imei_no)){
			sock.imei_no = IMEI_NO;
		}
		

		var skip = false;
		dt = new Date();

		if(empty(MASTER_DATA[IMEI_NO])){
			console.log(IMEI_NO+" NOT FOUND");
				
			if(!IMEI_NOT_FOUND[IMEI_NO]){
				IMEI_NOT_FOUND[IMEI_NO] = new Object();	
			}

			IMEI_NOT_FOUND[IMEI_NO]['TIME'] = dt.getTime();
			IMEI_NOT_FOUND[IMEI_NO]['DATA'] = d;
			IMEI_NOT_FOUND[IMEI_NO]['IP'] = sock.remoteAddress;

			//sock.write("UNAUTHORISED,"+newdate);

			return;
		}else{
			delete IMEI_NOT_FOUND[IMEI_NO];
		}

		MASTER_DATA[IMEI_NO]['MODEM_TYPE'] = '2G';

		if(MASTER_DATA_INFO[IMEI_NO]['DATE_READING'] != moment().date()){
			save_daily_kwh = true;
			MASTER_DATA_INFO[IMEI_NO]['DATE_READING'] = moment().date();
		}
		if(MASTER_DATA_INFO[IMEI_NO]['MONTH_READING'] != moment().month()){
			save_month_kwh = true;
			MASTER_DATA_INFO[IMEI_NO]['MONTH_READING'] = moment().month();
		}
		//console.log('DATA ' + sock.remoteAddress + ': ' +IMEI_NO+ ' ' + data +' '+(dt.getTime()-ST));
		
		
		if((dt.getTime() - MASTER_DATA_INFO[IMEI_NO]['TIME']) < 10000 && (dt.getTime() - MASTER_DATA_INFO[IMEI_NO]['TIME']) > -10000){
			skip = true;
		}
		
		
		if(!skip){
			var date_rtc = moment("20"+rec_date+" "+rec_time);
			var date_curr = moment().format("YYYY-MM-DD HH:mm");
			//console.log("TIME DFFEERCE "+moment(date_curr).diff(date_rtc,'seconds')+" "+date_rtc+" "+date_curr);
			if(moment(date_curr).diff(date_rtc,'minutes') < 2 && moment(date_curr).diff(date_rtc,'minutes') >= 0){
				//console.log('OK DATA');
			}else{
				
				var now = new Date();
				var newdate = dateFormat(now, "ddmmyyHHMMss");
				sock.write("RTC,"+newdate);

				MASTER_DATA[IMEI_NO]['RTC_SET_TIME'] = moment().format("DD-MM-YYYY HH:mm:ss");
			}
		}
				
		MASTER_DATA_INFO[IMEI_NO]['TIME'] = dt.getTime();

		MASTER_DATA[IMEI_NO]['UPDATE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
		
		MASTER_DATA_INFO[IMEI_NO]['CONNECTION'] = sock;
		MASTER_DATA[IMEI_NO]['METER_PHASE_TYPE'] = METER_PHASE_TYPE;
		
		if(moment().diff(MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'], 'hours') > 23 && MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0){
			if(!empty(MASTER_DATA[IMEI_NO]['RTC_ON_TIME']) && !empty(MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'])){
				var OFF_TIME = MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'].split(":"); 
				var ON_TIME = MASTER_DATA[IMEI_NO]['RTC_ON_TIME'].split(":");
				var schedule_str = 'TOD,0000,'+OFF_TIME[0]+OFF_TIME[1]+','+ON_TIME[0]+ON_TIME[1]+',2400,0000,0000';
				var socket = MASTER_DATA_INFO[IMEI_NO]['CONNECTION'];
				//socket.write(schedule_str);
				MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
			}
		}
		
		
		var OUTPUT1 = IO_DATA.substr(0, 1);
		var OUTPUT2 = IO_DATA.substr(1, 1);
		var OUTPUT3 = IO_DATA.substr(2, 1);
		var OUTPUT4 = IO_DATA.substr(3, 1);
		var OUTPUT5 = IO_DATA.substr(4, 1);
		var OUTPUT6 = IO_DATA.substr(5, 1);
		var OUTPUT7 = IO_DATA.substr(6, 1);
		
		var OUTPUT_DATA = OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6+''+OUTPUT7;
		
		var INPUT1 = IO_DATA.substr(7, 1);
		var INPUT2 = IO_DATA.substr(8, 1);
		var INPUT3 = IO_DATA.substr(9, 1);
		var INPUT4 = IO_DATA.substr(10, 1);
		var INPUT5 = IO_DATA.substr(11, 1);
		var INPUT6 = IO_DATA.substr(12, 1);
		
		var INPUT_DATA = INPUT1+''+INPUT2+''+INPUT3+''+INPUT4+''+INPUT5+''+INPUT6;
		
		
		
		fx += lx; lx = 6;
		var IO_DATE = d.substr(fx, lx);
		var IO_DD = IO_DATE.substr(0, 2);
		var IO_MM = IO_DATE.substr(2, 2);
		var IO_YY = IO_DATE.substr(4, 2);
		
		fx += lx; lx = 6;
		var IO_TIME = d.substr(fx, lx);
		var IO_HH = IO_TIME.substr(0, 2);
		var IO_MI = IO_TIME.substr(2, 2);
		var IO_SS = IO_TIME.substr(4, 2);
		var IO_STAMP = IO_YY+"-"+IO_MM+"-"+IO_DD+" "+IO_HH+":"+IO_MI+":"+IO_SS;
		
		var DATA = d;
		var DATA_STAMP = rec_date+" "+rec_time;
		var STATUS = "";
		var TYPE = "";
		var ACTUAL_DATA = "";
		var ACTUALDATALENGTH = d.length;

		var PREVIOUS_DATALENGTH = MASTER_DATA[IMEI_NO]['DATALENGTH'];
		if(PREVIOUS_DATALENGTH > 59 && ACTUALDATALENGTH == 59){
			/* POWER FAILED NOW, SEND SMS TO ULB */
			console.log("POWER DOWN "+IMEI_NO+" "+MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE']);
			if(!empty(MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE'])){
				var mobile = MASTER_DATA_INFO[IMEI_NO]['SMS_MOBILE'];
				var sms = 'POWER OFF LOCATION - ' + MASTER_DATA[IMEI_NO]['LOCATION'];
				var url = 'http://sms.bmwebmedia.com/shn/api/pushsms.php?usr=624402&key=0105qJp302aRslvQCRCgLIpYL8meS0&sndr=RNDSMS&ph='+mobile+'&text='+sms+'&rpt=1';
				var request = http.request(url, function (res) {
				    var data = '';
				    res.on('data', function (chunk) {
				        data += chunk;
				    });
				    res.on('end', function () {
				        console.log(data);
				    });
				});
				request.on('error', function (e) {
				    console.log(e.message);
				});
				request.end();
			}


			var insertq = {
				state_id: MASTER_DATA[IMEI_NO]['STATE_ID'],
				city_id: 0,
				ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
				imei_no: MASTER_DATA[IMEI_NO]['IMEI_NO'],
				fp_no: MASTER_DATA[IMEI_NO]['FP_NO'],
				message: "POWER CUT"
			}
			var sql = 'INSERT INTO report_powercut SET ?, insert_time=NOW();';
			connection.query(sql, [insertq], function selectCb(err, results, fields) {
				if (err) {
					//console.log(err);
				}else{ 
					//console.log("INSERT TRANS LAST DATA OK");
				}
			});
		}

		MASTER_DATA[IMEI_NO]['DATALENGTH'] = d.length;
		
		cname = "";
		cvalue = "";

		if(data.toString().indexOf("DD0") == -1 && ACTUALDATALENGTH == 59 ){
			/* NO POWER OR LIGHT */

			if(IMEI_NO == "869247046644230"){
				console.log(">>> CONSOLE 2 : NO LIGHT");
			}

			MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = 0;
			MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

			var insertq = {
				imei_no: IMEI_NO,
				data_stamp: DATA_STAMP,
				supply: SL_VOLTAGE,
				battery: BT_VOLTAGE,
				data: ACTUAL_DATA,
				datalength: ACTUALDATALENGTH,
				output_data: OUTPUT_DATA,
				input_data: INPUT_DATA,

				voltage_r: 0,
				voltage_y: 0,
				voltage_b: 0,
				amp_r: 0,
				amp_y: 0,
				amp_b: 0,
				pf_r: 0,
				pf_y: 0,
				pf_b: 0,
				kw_r: 0,
				kw_y: 0,
				kw_b: 0,
				kva_r: 0,
				kva_y: 0,
				kva_b: 0,
				kvar_r: 0,
				kvar_y: 0,
				kvar_b: 0,
				total_kw: 0,
				kvah: 0,
				kvarh: 0,
				output_status: 0,

				io_stamp: IO_STAMP,
				door_status: INPUT5,
				power_cut: 1
			}

			var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
			
			connection.query(sql, insertq, function selectCb(err, results, fields) {
				if (err){
					console.log(err);
				}else{ 
					//console.log("INSERT DATA OK");
					var updateq = {
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						data: ACTUAL_DATA,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,

						voltage_r: 0,
						voltage_y: 0,
						voltage_b: 0,
						amp_r: 0,
						amp_y: 0,
						amp_b: 0,
						pf_r: 0,
						pf_y: 0,
						pf_b: 0,
						kw_r: 0,
						kw_y: 0,
						kw_b: 0,
						kva_r: 0,
						kva_y: 0,
						kva_b: 0,
						kvar_r: 0,
						kvar_y: 0,
						kvar_b: 0,
						total_kw: 0,
						kvah: 0,
						kvarh: 0,
						output_status: 0,

						io_stamp: IO_STAMP,
						door_status: INPUT5,
						power_cut: 1
					}
					
					var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
					connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
						if (err) {
							//console.log(err);
						}else{ 
							//console.log("INSERT TRANS LAST DATA OK");
						}
					});
				}
			}); 

			if(save_daily_kwh){
				var kwh_insertq = {
					imei_no: IMEI_NO,
					ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
					kwh: 0,
					billing_kwh: 0,
					meter_no: ''
				}
				var sql = 'INSERT INTO '+TB_KWH_DAILY+' SET ?, update_time=NOW();';
				connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
					if (err) {
						//console.log(err);
					}
				});	
			}
			if(save_month_kwh){
				var kwh_insertq = {
					imei_no: IMEI_NO,
					ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
					kwh: 0,
					billing_kwh: 0,
					meter_no: ''
				}
				var sql = 'INSERT INTO '+TB_KWH_MONTHLY+' SET ?, update_time=NOW();';
				connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
					if (err) {
						//console.log(err);
					}
				});	
			}



			if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] != ""){
					var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="0" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("UPDATE LOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
				}
				
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']){
					var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
				}
			}


			/*var sql = "INSERT INTO device_fault (imei_no, datastring, insert_time) values ('"+IMEI_NO+"','"+d+"', NOW());";
			connection.query(sql, function selectCb(err, results, fields) {
				if (err){
					console.log(err);
				}else{ 
					console.log("INSERT DATA OK");
				}
			});
			
			MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT'] = 1;
			
			
			var sql = 'UPDATE master_device SET data_fault=1,fault_time=NOW() WHERE imei_no="'+IMEI_NO+'"';
			connection.query(sql, function selectCb(err, results, fields) {
				if (err){
					console.log(err);
				}else{
					console.log("INSERT DATA OK");
				}
			});*/
			return;
		}


		//fx=58

		
		if(d.length < 209){
			
			/*1906201116168689970383514070003501010101000000190620053719
			var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";
			//console.log(sql);
			connection.query(sql, function selectCb(err, results, fields) {
				if (err){
					console.log(err);
				}else{ 
					console.log("INSERT DATA OK");
					connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
					function selectCb(err, results, fields) {
						if (err) {
							console.log(err);
						}else{ 
							console.log("INSERT TRANS LAST DATA OK");
						}
					});
				}
			});*/

			if(IMEI_NO == "869247046644230"){
				console.log(">>> CONSOLE 2 : LESS 209");
			}

			var insertq = {
				imei_no: IMEI_NO,
				data_stamp: DATA_STAMP,
				supply: SL_VOLTAGE,
				battery: BT_VOLTAGE,
				data: ACTUAL_DATA,
				datalength: ACTUALDATALENGTH,
				output_data: OUTPUT_DATA,
				input_data: INPUT_DATA,
				io_stamp: IO_STAMP,
				output_status: OUTPUT1,
				door_status: INPUT5,
				power_cut: 1
			}
			
			MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
			MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

			var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
			//console.log(sql);
			connection.query(sql, insertq, function selectCb(err, results, fields) {
				if (err){
					//console.log(err);
				}else{ 
					//console.log("INSERT DATA OK");
					var updateq = {
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						data: ACTUAL_DATA,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,
						io_stamp: IO_STAMP,
						output_status: OUTPUT1,
						door_status: INPUT5,
						meter_fault: 1
					}
					
					var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
					connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
						if (err) {
							//console.log(err);
						}else{ 
							//console.log("INSERT TRANS LAST DATA OK");
						}
					});
				}
			});   
			
			
			
			
			
			/*connection.query('INSERT INTO '+TB_DEVICE_RECIEVED+' (IMEI_NO, DATA_STAMP, ACTUAL_DATA, ACTUALDATALENGTH, SL_VOLTAGE,  IO_STAMP, INPUT1, INPUT2, INPUT3, INPUT4, OUTPUT1, OUTPUT2, OUTPUT3, OUTPUT4 ) values ("' + IMEI_NO + '", "' + DATA_STAMP + '", "' + ACTUAL_DATA + '", "' + ACTUALDATALENGTH + '", "'+SL_VOLTAGE+'", "'+ IO_STAMP + '", "'+ INPUT1 + '", "'+ INPUT2 + '", "'+ INPUT3 + '", "'+ INPUT4 + '", "'+ OUTPUT1 + '", "'+ OUTPUT2 + '", "'+ OUTPUT3 + '", "'+ OUTPUT4 + '")',
			function selectCb(err, results, fields) {
				if (err) console.log(err);
				else{ 
					console.log("INSERT DATA OK");
				}
			});*/
			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = -1;
			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = -1;
			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = -1;
			
			if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] != ""){
					var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="0" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("UPDATE LOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
				}
				
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']){
					var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
				}
			}
			
			return;
		}
		
		var VOLTAGE_R,VOLTAGE_Y,VOLTAGE_B,AMP_R,AMP_Y,AMP_B;


		/*if(MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT']){
			var sql = 'UPDATE master_device SET data_fault=0 WHERE imei_no="'+IMEI_NO+'"';
			connection.query(sql, function selectCb(err, results, fields) {
				if (err){
					console.log(err);
				}else{
					console.log("FAULT DEVICE REMOVED!");
				}
			});
			MASTER_DATA_INFO[IMEI_NO]['DEVICE_FAULT'] = 0;
		}*/


		if(METER_PHASE_TYPE == METER_SINGLE_PHASE){

			//console.log('SINGLE PHASE METER '+IMEI_NO);
			
			fx += lx; lx = 4; VOLTAGE_R = hexval(d.substr(fx, lx));
			//fx += lx; lx = 4; 
			//fx += lx; lx = 4; 
			VOLTAGE_Y = 0;
			VOLTAGE_B = 0;
			fx += lx; lx = 4; AMP_R = hexval(d.substr(fx, lx));
			//fx += lx; lx = 4; 
			//fx += lx; lx = 4; 
			AMP_Y = 0;
			AMP_B = 0;

			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = AMP_R;
			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = AMP_Y;
			MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = AMP_B;

			fx += lx; lx = 2;
			var PF_R = hexval(d.substr(fx, lx));
			//fx += lx; lx = 2;
			//fx += lx; lx = 2;
			var PF_Y = 0;
			var PF_B = 0;
			
			fx += lx; lx = 8;
			var KWR = hexval(d.substr(fx, lx));
			//fx += lx; lx = 8;
			//fx += lx; lx = 8;
			var KWY = 0;
			var KWB = 0;
			
			fx += lx; lx = 8;
			var KVAR = hexval(d.substr(fx, lx));
			//fx += lx; lx = 8;
			//fx += lx; lx = 8;
			var KVAY = 0;
			var KVAB = 0;


			fx += lx; lx = 8;
			var KWH = hexval(d.substr(fx, lx));

			fx += lx; lx = 8;
			var BILLING_KWH = hexval(d.substr(fx, lx));

			fx += lx; lx = 8;
			var KVAH = hexval(d.substr(fx, lx));

			fx += lx; lx = 8;
			var BILLING_KVAH = hexval(d.substr(fx, lx));

			fx += lx; lx = 4;
			var KW_MD = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
			fx += lx; lx = 2;
			var _MONTH = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _YEAR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _HOUR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _MIN = parseInt(d.substr(fx, lx), 16);
			var _SECOND = '00';
			var KW_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



			fx += lx; lx = 4;
			var BILLING_KW_MD = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
			fx += lx; lx = 2;
			var _MONTH = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _YEAR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _HOUR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _MIN = parseInt(d.substr(fx, lx), 16);
			var _SECOND = '00';
			var BILLING_KW_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



			fx += lx; lx = 4;
			var KVA_MD = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
			fx += lx; lx = 2;
			var _MONTH = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _YEAR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _HOUR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _MIN = parseInt(d.substr(fx, lx), 16);
			var _SECOND = '00';
			var KVA_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);



			fx += lx; lx = 4;
			var BILLING_KVA_MD = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
			fx += lx; lx = 2;
			var _MONTH = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _YEAR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _HOUR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _MIN = parseInt(d.substr(fx, lx), 16);
			var _SECOND = '00';
			var BILLING_KVA_MD_DATE = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);

			fx += lx; lx = 8;
			var SERIAL_NO = hexval(d.substr(fx, lx));


			fx += lx; lx = 2;
			var _DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
			fx += lx; lx = 2;
			var _MONTH = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _YEAR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _HOUR = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _MIN = parseInt(d.substr(fx, lx), 16);
			fx += lx; lx = 2;
			var _SECOND = parseInt(d.substr(fx, lx), 16);

			var METER_RTC = "20"+_YEAR+"-"+Pad(_MONTH,2)+"-"+Pad(_DATE,2)+" "+Pad(_HOUR,2)+":"+Pad(_MIN,2)+":"+Pad(_SECOND,2);


			fx += lx; lx = 4;
			var FREQUENCY = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var REV_TAMPER = hexval(d.substr(fx, lx));

			fx += lx; lx = 2;
			var MAG_TAMPER = hexval(d.substr(fx, lx));



			var now = new Date();
			var created_at = dateFormat(now, "isoDateTime");
			
			/*var idx = sockets.indexOf(sock);
			if (idx != -1) {
				if(sockets_info[idx].imei == ""){
					sockets_info[idx].imei = IMEI_NO;
				}
			}else{
				console.log("CURRENT SOCKET NOT FOUND "+sockets.length+' '+sockets_info.length);
			}*/
			
			
			var sqlquery = {
				imei_no: IMEI_NO,
				data_stamp: DATA_STAMP,
				supply: SL_VOLTAGE,
				battery: BT_VOLTAGE,
				data: ACTUAL_DATA,
				datalength: ACTUALDATALENGTH,
				input_data: INPUT_DATA,
				output_data: OUTPUT_DATA,
				voltage_r: VOLTAGE_R,
				amp_r: AMP_R,
				pf_r: PF_R,
				kw_r: KWR,
				kva_r: KVAR,
				kwh: KWH,
				kvah: KVAH,
				meter_no: SERIAL_NO,
				frequency: FREQUENCY,
				io_stamp: IO_STAMP,
				meter_stamp: METER_RTC,
				billing_kwh: BILLING_KWH,
				billing_kvah: BILLING_KVAH,
				kw_md: KW_MD,
				kw_md_date: KW_MD_DATE,
				billing_kw_md: BILLING_KW_MD,
				billing_kw_md_date: BILLING_KW_MD_DATE,
				kva_md: KVA_MD,
				kva_md_date: KVA_MD_DATE,
				billing_kva_md: BILLING_KVA_MD,
				billing_kva_md_date: BILLING_KVA_MD_DATE,
				reverse_temper: REV_TAMPER,
				mag_tamper: MAG_TAMPER,
				meter_phase_type: METER_PHASE_TYPE,
				output_status: OUTPUT1,
				door_status: INPUT5,
			}

			MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
			MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

			connection.query('INSERT INTO '+TB_DEVICE_RECIEVED+' SET ?, update_time = NOW() ', sqlquery, function selectCb(err, results, fields) {
				if (err)  {
					//console.log("IMEI_NO "+IMEI_NO);
					console.log("ERROR "+err);
				}else{ 
					//console.log("INSERT DATA OK");		
				}
			});    

			
			connection.query('UPDATE '+TB_DEVICE_LASTDATA+' SET ?, update_time = NOW() WHERE imei_no = "'+IMEI_NO+'"', sqlquery, function selectCb(err, results, fields) {
				if (err)  {
					console.log("IMEI_NO "+IMEI_NO);
					console.log("ERROR "+err);
				}else{ 
					//console.log("INSERT TRANS LAST DATA OK");
				}
			}); 

			if(save_daily_kwh){
				var kwh_insertq = {
					imei_no: IMEI_NO,
					ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
					kwh: KWH,
					billing_kwh: BILLING_KWH,
					meter_no: SERIAL_NO
				}
				var sql = 'INSERT INTO '+TB_KWH_DAILY+' SET ?, update_time=NOW();';
				connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
					if (err) {
						//console.log(err);
					}
				});	
			}

			if(save_month_kwh){
				var kwh_insertq = {
					imei_no: IMEI_NO,
					ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
					kwh: KWH,
					billing_kwh: BILLING_KWH,
					meter_no: SERIAL_NO
				}
				var sql = 'INSERT INTO '+TB_KWH_MONTHLY+' SET ?, update_time=NOW();';
				connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
					if (err) {
						//console.log(err);
					}
				});	
			}


			return;
		}


		if(IMEI_NO == "869247046644230"){
			console.log(">>> CONSOLE 2 : 1058");
		}

		// fx=58
		//console.log('FX : '+fx);
		
		fx += lx; lx = 4; VOLTAGE_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; VOLTAGE_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; VOLTAGE_B = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_B = parseInt(d.substr(fx, lx), 16);
		
		
		if(!skip){
			if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
				//console.log(OUTPUT1+" "+AMP_R+" "+AMP_Y+" "+AMP_B+" "+AMP_LIMIT);
				if(OUTPUT1 == 1){
					if(AMP_R < AMP_LIMIT && AMP_Y < AMP_LIMIT && AMP_B < AMP_LIMIT){
						if(MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] < 2){
							var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
							var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
							
							if( inschedule ){
								//sock.write("LIGHTOF");
								setTimeout(function(sock){
									//sock.write("LIGHTON");
								},10000, sock);
								MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] += 1;
							}
						}
					}
					
				}else{
					if(AMP_R > AMP_LIMIT || AMP_Y > AMP_LIMIT || AMP_B > AMP_LIMIT){
						if(MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] < 2){
							var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
							var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
							
							if( !inschedule ){
								//sock.write("LIGHTON");
								setTimeout(function(sock){
									console.log("SEND LIGHT OFF COMMAND TO "+IMEI_NO);
									//sock.write("LIGHTOF");
								},10000, sock);
								MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] += 1;
							}
						}
					}
				}
			}
		}
		if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
			var start_date = moment().format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_ON_TIME'];
			var end_date = moment().add(1, 'day').format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'];
			var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
			var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
			
			//console.log("CHECK SCHEDULE "+IMEI_NO+" "+inschedule);
			if( inschedule ){
				MASTER_DATA_INFO[IMEI_NO]['OFF_HITS'] = 0;
			}else{
				MASTER_DATA_INFO[IMEI_NO]['ON_HITS'] = 0;
			}
		}
		
		MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_R'] = AMP_R;
		MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_Y'] = AMP_Y;
		MASTER_DATA_INFO[IMEI_NO]['LAST_AMP_B'] = AMP_B;

		// fx=82
		
		fx += lx; lx = 2;
		var PF_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var PF_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var PF_B = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KWR = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KWY = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KWB = parseInt(d.substr(fx, lx), 16);


		
		fx += lx; lx = 6;
		var KVAR = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KVAY = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KVAB = parseInt(d.substr(fx, lx), 16);
	
		fx += lx; lx = 6;
		var KVAR_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KVAR_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KVAR_B = parseInt(d.substr(fx, lx), 16);
		
		fx += lx; lx = 6;
		var KWH = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var KVAH = parseInt(d.substr(fx, lx), 16);
		
		fx += lx; lx = 6;
		var KVARH = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 6;
		var METER_NO = parseInt(d.substr(fx, lx), 16);

		//console.log('FX:'+fx);
		// fx=166
		
		fx += lx; lx = 2;
		var DS_DATE = parseInt(d.substr(fx, lx), 16); // DS = data stamp
		fx += lx; lx = 2;
		var DS_MONTH = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var DS_YEAR = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var DS_HOUR = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var DS_MIN = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 2;
		var DS_SECOND = parseInt(d.substr(fx, lx), 16);
		var METER_RTC = "20"+DS_YEAR+"-"+Pad(DS_MONTH,2)+"-"+Pad(DS_DATE,2)+" "+Pad(DS_HOUR,2)+":"+Pad(DS_MIN,2)+":"+Pad(DS_SECOND,2);

		if(IMEI_NO == '869247042708229'){
			console.log('IMEI CHECK 1163');
		}

		if(DS_YEAR == 0 || DS_YEAR == NaN){


			MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
			MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;

			var insertq = {
				imei_no: IMEI_NO,
				data_stamp: DATA_STAMP,
				supply: SL_VOLTAGE,
				battery: BT_VOLTAGE,
				data: ACTUAL_DATA,
				datalength: ACTUALDATALENGTH,
				output_data: OUTPUT_DATA,
				input_data: INPUT_DATA,
				io_stamp: IO_STAMP,
				output_status: OUTPUT1,
				door_status: INPUT5
			}
			
			//var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','','','0','0','0','0','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";

			var sql = 'INSERT INTO device_received_data SET ?, update_time=NOW();';
			//console.log(sql);
			connection.query(sql, insertq, function selectCb(err, results, fields) {
				if (err){
					//console.log(err);
				}else{ 
					//console.log("INSERT DATA OK");
					var updateq = {
						data_stamp: DATA_STAMP,
						supply: SL_VOLTAGE,
						battery: BT_VOLTAGE,
						data: ACTUAL_DATA,
						datalength: ACTUALDATALENGTH,
						output_data: OUTPUT_DATA,
						input_data: INPUT_DATA,
						io_stamp: IO_STAMP,
						output_status: OUTPUT1,
						door_status: INPUT5,
						meter_fault: 1
					}
					
					//connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='0', voltage_y='0', voltage_b='0', amp_r='0', amp_y='0', amp_b='0', pf_r='0', pf_y='0', pf_b='0', kw_r='0', kw_y='0', kw_b='0', kva_r='0', kva_y='0', kva_b='0', kvar_r='0', kvar_y='0', kvar_b='0', kwh='0', kvah='0', kvarh='0', meter_no='', meter_stamp='', total_kw='0', total_kva='0', total_pf='', frequency='', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
					var sql = 'UPDATE device_last_data SET ?, update_time=NOW() WHERE imei_no=?;';
					connection.query(sql, [updateq, IMEI_NO], function selectCb(err, results, fields) {
						if (err) {
							//console.log(err);
						}else{ 
							//console.log("INSERT TRANS LAST DATA OK");
						}
					});
				}
			}); 

			return;
		}
		
		fx += lx; lx = 6;
		var TOTAL_KW = parseInt(d.substr(fx, lx), 16);

		MASTER_DATA[IMEI_NO]['ACTUAL_LOAD'] = TOTAL_KW;
		MASTER_DATA[IMEI_NO]['TOTAL_KW'] = TOTAL_KW;

		//console.log('TOTAL KW '+TOTAL_KW);
		
		var TOTALLOAD_20 = MASTER_DATA[IMEI_NO]['TOTAL_LOAD'] * 0.05;
		if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
			if(TOTAL_KW > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20) && (parseInt(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'])/100) > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20)){
				if(!MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']){
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;


					connection.query('INSERT INTO '+TB_LOAD+' (state,district,ulb,imei_no, fp_no, start_time, start_load) values ("'+MASTER_DATA[IMEI_NO]['STATE_ID']+'","'+MASTER_DATA[IMEI_NO]['ZONE_ID']+'","'+MASTER_DATA[IMEI_NO]['ULB_ID']+'","'+IMEI_NO+'","'+MASTER_DATA[IMEI_NO]['FP_NO']+'","'+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']+'", "'+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD']+'")',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT LOAD DATA OK "+results.insertId);
							MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = results.insertId;
						}
					});
				}
			}else{
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME']){
					var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="'+TOTAL_KW+'" WHERE id='+MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'],
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("UPDATE LOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD_TIME'] = "";
				}
			}
		}
		MASTER_DATA_INFO[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;
		


		if( MASTER_DATA_INFO[IMEI_NO]['REGISTERED'] > 0 ){
			if(( VOLTAGE_R > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'] > VOLTAGE_LIMIT ) || ( VOLTAGE_Y > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'] > VOLTAGE_LIMIT ) || ( VOLTAGE_B > VOLTAGE_LIMIT && MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'] > VOLTAGE_LIMIT ) ){
				if(!MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");

					var insertq ={
						state: MASTER_DATA[IMEI_NO]['STATE_ID'],
						district: MASTER_DATA[IMEI_NO]['ZONE_ID'],
						ulb: MASTER_DATA[IMEI_NO]['ULB_ID'],
						imei_no: IMEI_NO,
						fp_no: MASTER_DATA[IMEI_NO]['FP_NO'],
						voltage_r: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'],
						voltage_y: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'],
						voltage_b: MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'],
						start_time: MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']
					}
					
					connection.query('INSERT INTO '+TB_OVERVOLTAGE+' SET ?; ', insertq, function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK "+results.insertId);
							MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = results.insertId;
							//MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = '';
						}
					});
				}
			}else{
				if(MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
					var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");


					connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time=? WHERE id=?;', [END_TIME, MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID']], function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK");
						}
					});
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
					MASTER_DATA_INFO[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
				}
			}
		}
		MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_R'] = VOLTAGE_R;
		MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_Y'] = VOLTAGE_Y;
		MASTER_DATA_INFO[IMEI_NO]['PREV_VOLTAGE_B'] = VOLTAGE_B;
		
		fx += lx; lx = 6;
		var TOTAL_KVA = parseInt(d.substr(fx, lx), 16);
		
		fx += lx; lx = 2;
		var TOTAL_PF = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4;
		var FREQUENCY = parseInt(d.substr(fx, lx), 16);
		
		// fx=196
		//console.log('FX LAST: '+fx);
		
		var door_status = INPUT5;
		
		var now = new Date();
		var created_at = dateFormat(now, "isoDateTime");
		//console.log(created_at);

		MASTER_DATA[IMEI_NO]['OUTPUT_STATUS'] = OUTPUT1;
		MASTER_DATA[IMEI_NO]['DOOR_STATUS'] = INPUT5;
		
		var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, door_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','"+VOLTAGE_R+"','"+VOLTAGE_Y+"','"+VOLTAGE_B+"','"+AMP_R+"','"+AMP_Y+"','"+AMP_B+"','"+PF_R+"','"+PF_Y+"','"+PF_B+"','"+KWR+"','"+KWY+"','"+KWB+"','"+KVAR+"','"+KVAY+"','"+KVAB+"','"+KVAR_R+"','"+KVAR_Y+"','"+KVAR_B+"','"+KWH+"','"+KVAH+"','"+KVARH+"','"+METER_NO+"','"+METER_RTC+"','"+TOTAL_KW+"','"+TOTAL_KVA+"','"+TOTAL_PF+"','"+FREQUENCY+"','"+IO_STAMP+"','"+OUTPUT1+"', '"+door_status+"', NOW())";
		//console.log(sql);
		connection.query(sql, function selectCb(err, results, fields) {
			if (err){
				console.log("DATA LENGTH "+data.length);
				console.log("IMEI_NO "+IMEI_NO);
				console.log(err);
			}else{ 
				//console.log("INSERT DATA OK");
				connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='"+VOLTAGE_R+"', voltage_y='"+VOLTAGE_Y+"', voltage_b='"+VOLTAGE_B+"', amp_r='"+AMP_R+"', amp_y='"+AMP_Y+"', amp_b='"+AMP_B+"', pf_r='"+PF_R+"', pf_y='"+PF_Y+"', pf_b='"+PF_B+"', kw_r='"+KWR+"', kw_y='"+KWY+"', kw_b='"+KWB+"', kva_r='"+KVAR+"', kva_y='"+KVAY+"', kva_b='"+KVAB+"', kvar_r='"+KVAR_R+"', kvar_y='"+KVAR_Y+"', kvar_b='"+KVAR_B+"', kwh='"+KWH+"', kvah='"+KVAH+"', kvarh='"+KVARH+"', meter_no='"+METER_NO+"', meter_stamp='"+METER_RTC+"', total_kw='"+TOTAL_KW+"', total_kva='"+TOTAL_KVA+"', total_pf='"+TOTAL_PF+"', frequency='"+FREQUENCY+"', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', door_status='"+door_status+"', meter_fault=0, meter_phase_type='"+METER_PHASE_TYPE+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
				function selectCb(err, results, fields) {
					if (err) {
						console.log(err);
					}else{ 
						//console.log("INSERT TRANS LAST DATA OK");
					}
				});
			}
		});  

		if(save_daily_kwh){
			var kwh_insertq = {
				imei_no: IMEI_NO,
				ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
				kwh: KWH,
				billing_kwh: 0,
				meter_no: METER_NO
			}
			var sql = 'INSERT INTO '+TB_KWH_DAILY+' SET ?, update_time=NOW();';
			connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
				if (err) {
					//console.log(err);
				}
			});	
		} 
		if(save_month_kwh){
			var kwh_insertq = {
				imei_no: IMEI_NO,
				ulb_id: MASTER_DATA[IMEI_NO]['ULB_ID'],
				kwh: KWH,
				billing_kwh: 0,
				meter_no: METER_NO
			}
			var sql = 'INSERT INTO '+TB_KWH_MONTHLY+' SET ?, update_time=NOW();';
			connection.query(sql, [kwh_insertq, IMEI_NO], function selectCb(err, results, fields) {
				if (err) {
					//console.log(err);
				}
			});	
		} 
		
    });
    sock.on('close', function(data) 
	{
        console.log('SOCKET CLOSING ');
		var idx = sockets.indexOf(this);
		if (idx != -1) 
		{
			sockets.splice(idx,1);
		}
		//console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			sockets.splice(idx,1);
		}
		//console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			sockets.splice(idx,1);
		}
		//console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
	});
	sock.setKeepAlive(true);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
server.listen(PORT, HOST);
function writeLog(IMEI_NO, DATA, TYPE){
	var d = new Date();
	var time = dateFormat(d, "isoDateTime");
	
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+"-up.txt";
	if(TYPE == "SCHEDULE"){
		file = "schedule_log.txt";
	}else if(TYPE == "DATACLONE"){
		file = "dataclone_up.txt";
	}

	var fs = require('fs');
	const path = require('path');

	//console.log(path.normalize(__dirname+'../../../../logs/'+file));
	fs.exists(path.normalize(__dirname+'../../../../logs/'+file), function(exist){
		if(exist){
			var str = time + "," + IMEI_NO + "," + DATA;
			fs.appendFile(path.normalize(__dirname+'../../../../logs/'+file), '\r\n'+str, function(err1) {
				if (err1) console.log(err1);
			});
		}else{
			fs.writeFile(path.normalize(__dirname+'../../../../logs/'+file), '--- Start Logging ---', function(err2) {
				if (err2) console.log(err2);
				console.log('NEW LOG FILE CREATED!');
			});
		}
	});
}
server.on('connection', function(sock)
{
	//console.log('SOCKET CONNECTION: ' + sock.remoteAddress +':'+ sock.remotePort);
	sockets.push(sock);
	
	/*var now = new Date();
	var newdate = dateFormat(now, "ddmmyyHHMMss");
	sock.write("RTC,"+newdate);*/
		
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PORT + ' '+ST);

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

var schedule_records = {};
var rule = new schedule.RecurrenceRule();

rule.hour = new schedule.Range(5, 23);
rule.minute = 47;
var j = schedule.scheduleJob(rule, function(){
	console.log('CHECK SCHEDULE');
	
	connection.query("SELECT * FROM master_zone WHERE parent != 0", function selectCb(err, results, fields) {
		if (err) throw err;
		else{
			for(var i=0; i<results.length; i++){
				var row = results[i];
				schedule_records[row.id] = {ulb_id:row.id, on_time:row.on_time.replace(":",""), off_time:row.off_time.replace(":","")};
			}
			for (const item in MASTER_DATA) {
				//if(MASTER_DATA[item].IMEI_NO == '869247042708088' && !empty(MASTER_DATA[item]['CONNECTION'])){
				if(!empty(MASTER_DATA_INFO[item]['CONNECTION'])){
					//console.log(MASTER_DATA[item]['ULB_ID']+" "+MASTER_DATA[item].ULB_ID);
					if(!empty(schedule_records[MASTER_DATA[item]['ULB_ID']])){
						console.log('>>> '+MASTER_DATA[item]['MODEM_TYPE']);

						var sock = MASTER_DATA_INFO[item]['CONNECTION'];
						if(MASTER_DATA[item]['MODEM_TYPE'] == '2G'){
							var SCHEDULE_STR = 'TOD,0000,'+schedule_records[MASTER_DATA[item]['ULB_ID']].off_time+','+schedule_records[MASTER_DATA[item]['ULB_ID']].on_time+',2400,0000,0000';
							console.log("IMEI SCHEDULE STRING "+SCHEDULE_STR);
							
							sock.write(SCHEDULE_STR);
						}else if(MASTER_DATA[item]['MODEM_TYPE'] == '4G'){
							var dotime1 = schedule_records[MASTER_DATA[item]['ULB_ID']].on_time;
							var dotime2 = schedule_records[MASTER_DATA[item]['ULB_ID']].off_time;
							var hexvalue = [0x44,0x4F,0x54,0x4F,0x44,0x2C];
						    hexvalue.push('0x'+Pad(dec2hex(dotime1.substr(0,2)), 2));
						    hexvalue.push('0x'+Pad(dec2hex(dotime1.substr(2,2)), 2));
						    hexvalue.push('0x'+Pad(dec2hex(dotime2.substr(0,2)), 2));
						    hexvalue.push('0x'+Pad(dec2hex(dotime2.substr(2,2)), 2));
						    hexvalue.push(0x0D);
						    hexvalue.push(0x0A);

						    var buf = new Buffer(hexvalue, "hex");
							sock.write(buf);
						}else{
							
						}
						
					}
				}
			}
		}
	});
});

/*
var schedule_light = {};
var rule = new schedule.RecurrenceRule();

rule.hour = new schedule.Range(5, 23);
rule.minute = [29, 30 , 31, 32, 33, 34, 35, 36, 37, 38, 40];
var j = schedule.scheduleJob(rule, function(){
	console.log('CHECK SCHEDULE');
	
	connection.query("SELECT * FROM master_zone WHERE parent != 0", function selectCb(err, results, fields) {
		if (err) throw err;
		else{
			for(var i=0; i<results.length; i++){
				var row = results[i];
				schedule_records[row.id] = {ulb_id:row.id, on_time:row.on_time.replace(":",""), off_time:row.off_time.replace(":","")};
			}
			for (const item in MASTER_DATA) {
				//if(MASTER_DATA[item].IMEI_NO == '869247042708088' && !empty(MASTER_DATA[item]['CONNECTION'])){
				if(!empty(MASTER_DATA_INFO[item]['CONNECTION'])){
					console.log(MASTER_DATA[item]['ULB_ID']+" "+MASTER_DATA[item].ULB_ID);
					if(MASTER_DATA[item]['ULB_ID'] == 5 || MASTER_DATA[item].ULB_ID == 5){
						//var SCHEDULE_STR = 'TOD,0000,'+schedule_records[MASTER_DATA[item]['ULB_ID']].off_time+','+schedule_records[MASTER_DATA[item]['ULB_ID']].on_time+',2400,0000,0000';
						//console.log("IMEI SCHEDULE STRING "+SCHEDULE_STR);
						var sock = MASTER_DATA_INFO[item]['CONNECTION'];
						sock.write("LIGHTON");
					}
				}
			}
		}
	});
});*/



function in_schedule(curr_time,start_time,end_time){
	if(start_time != '' && end_time!= '' && start_time != null && end_time!= null){
		var cal_start_time = parseFloat(start_time.split(":")[0]+'.'+start_time.split(":")[1]);
		var cal_end_time = parseFloat(end_time.split(":")[0]+'.'+end_time.split(":")[1]);
		var cal_curr_time = moment(curr_time).format("HH.mm");

		var start_date = '';
		var end_date = '';
		if(cal_start_time > cal_end_time){
			if(cal_curr_time <= 24.00 && cal_curr_time > cal_start_time){
				start_date = moment(curr_time).format("YYYY-MM-DD")+" "+start_time;
				end_date = moment(curr_time).add(1, 'day').format("YYYY-MM-DD")+" "+end_time;
			}else if(cal_curr_time < cal_end_time){
				//console.log("ELSE IF");
				start_date = moment(curr_time).subtract(1, 'day').format("YYYY-MM-DD")+" "+start_time;
				end_date = moment(curr_time).format("YYYY-MM-DD")+" "+end_time;
			}else{
				//console.log("ELSE ");
				start_date = moment(curr_time).format("YYYY-MM-DD")+" "+start_time;
				end_date = moment(curr_time).add(1, 'day').format("YYYY-MM-DD")+" "+end_time;
			}
		}else{
			start_date = moment(curr_time).format("YYYY-MM-DD")+" "+start_time;
			end_date = moment(curr_time).format("YYYY-MM-DD")+" "+end_time;
		}
		if(moment(curr_time).diff(start_date, 'minutes') > 0){
			return true;
		}
	}
	return false;
}


var rule_nf = new schedule.RecurrenceRule();
//rule_nf.hour = new schedule.Range(9, 17);
rule_nf.second = 20;

var nf = schedule.scheduleJob(rule_nf, function(){
	console.log('CHECK NOT FOUND');
	
	var file = "unregistered-up.json";
	
	var fs = require('fs');
	fs.exists('logs/'+file, function(exist){
		if(exist){
			fs.truncate('logs/'+file, 0, function() {
			    fs.writeFile('logs/'+file, JSON.stringify(IMEI_NOT_FOUND), function (err1) {
			        if (err1) {
			           if (err1) console.log(err1);
			        }
			    });
			});
		}
	});
});


var rule_dataclone = new schedule.RecurrenceRule();
rule_dataclone.hour = 1;
var dc = schedule.scheduleJob(rule_dataclone, function(){
	var sql = 'DELETE FROM device_received_data WHERE id <= (SELECT (MAX(id) - 1000000) from device_received_data_clone);';
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) throw err;
		else{
			writeLog('DELETING', '>', 'DATACLONE');
			var sql = 'INSERT INTO device_received_data_clone SELECT * FROM device_received_data WHERE id > (SELECT MAX(id) from device_received_data_clone);';
			connection.query(sql, function selectCb(err, results, fields) {
				if (err) throw err;
				else{
					writeLog('CLONING', '>', 'DATACLONE');
				}
			});
		}
	});
});

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