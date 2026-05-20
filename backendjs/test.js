var net = require('net');
var mysql = require('mysql');
var moment = require("moment");
var empty = require('is-empty');
var schedule = require('node-schedule');

var HOST = '216.10.247.24';
var PORT = 32216;

var fx = 0;
var lx = 6;

var MASTER_DEVICE = [];

var dateFormat = require('dateformat');
var interval = '';
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

var MASTER_DATA = new Object();

var tmpconn = mysql.createConnection({
	host     : 'localhost',
	user     : 'wlms_usr',
	password : 'anavvytozn81',
	database : 'wlms_db'
});

function dbstr(name,value){
	if(name){
		if(cname!=""){
			cname += ",";
		}
		if(cvalue!=""){
			cvalue += ",";
		}
		cname += name;
		if(!value){
			value="0";
		}
		cvalue += '"'+value+'"';
	}
}
var updatequery = "";
function buildupdate(name,value){
	if(name){
		if(updatequery!=""){
			updatequery += ",";
		}
		updatequery += name+' = "'+ value +'" ';
	}
}
function inc(){
	fx += lx;
}
function Pad (str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
}
function HexToFloat(value){
	return new Buffer(value, 'hex').readFloatBE(0).toFixed(3);
}
function HexToBin(value){
	var bytes = "";
	for(var i=0; i< value.length; i++){
		bytes += Pad(parseInt(value.substr(i, 1), 16).toString(2), 4);
	}
	return bytes;
}
function HexToDec(value){
	return parseInt(value, 16);
}
var dbcols = new Array();
var cname = "";
var cvalue = "";
var dt = new Date();
var ST = dt.getTime();
var dt = new Date();
var CT = dt.getTime();

connection.query('SHOW COLUMNS FROM trans_received_data', function(err, rows, fields){ 
	dbcols = rows;
	console.log(dbcols.length);
});

//setTimeout(resetSockets, 10 * 60 * 1000);
function resetSockets(){
	for(var i=0;i<sockets.length;i++){
		console.log('SOCKETS RESET');
		sockets[i].write('ACCRESETM');
	}
	//setTimeout(resetSockets, 10 * 60 * 1000);
}


var server = net.createServer(function(sock) {
    console.log('SERVER CON: ' + sock.remoteAddress +':'+ sock.remotePort);

    //sock.write('ACCSETPKT0010');
    
    sock.on('data', function(data) {
		var dt = new Date();
		console.log('NDATA ' + sock.remoteAddress + ': ' + data +' '+(dt.getTime()-ST));

		var d = data.toString().replace(/[^0-9A-Z]/g, "");

		if(d.length < 20 || d.length > 55){
			writeLog('ERROR', data);
			console.log('DATA ERROR ');
			return;
		}
		
		
		
		
		ST = dt.getTime();
		
		var fx = 0; 
		var lx = 0;
		
		
		fx += lx; lx = 15;
		var IMEI_NO = String(d.substr(fx, lx));
		writeLog(IMEI_NO, data);
		
		if(data.length < 20){
			return;
		}
		
		if(!MASTER_DATA[IMEI_NO]){
		    MASTER_DATA[IMEI_NO] = new Object();
		    MASTER_DATA[IMEI_NO]['CONNECTION'] = sock;
		}else{
		    MASTER_DATA[IMEI_NO]['CONNECTION'] = sock;
		}
		MASTER_DATA[IMEI_NO]['LAST_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");

		console.log("MASTER DATA LENGTH : "+Object.keys(MASTER_DATA).length);

		
		fx += lx; lx = 6;
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
		
		
		fx += lx; lx = 4;
		var ANALOGINPUT = parseInt(d.substr(fx, lx));
		fx += lx; lx = 3;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx))/100;
		
		var SHORTDATA = fx+lx;
		
		var DATA = d;
		var DATA_STAMP = rec_date+" "+rec_time;
		var STATUS = "";
		var TYPE = "";
		var ACTUAL_DATA = d;
		var ACTUALDATALENGTH = d.length;
		
		
		var chkstr = "000000000000";
		
		
		
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
		
		
		/*connection.query('INSERT INTO trans_received_data (IMEI_NO, DATA_STAMP, ACTUAL_DATA, ACTUALDATALENGTH, VOLTAGE_R, VOLTAGE_Y, VOLTAGE_B, AMP_R, AMP_Y, AMP_B, PF_R, PF_Y, PF_B, KWR, KWY, KWB, KVAR, KVAY, KVAB, KVAR_R, KVAR_Y, KVAR_B, KWH, KVAH, KVARH, METER_NO, SL_VOLTAGE, FREQUENCY, IO_STAMP, INPUT1, INPUT2, INPUT3, INPUT4, INPUT5, INPUT6, OUTPUT1, OUTPUT2, OUTPUT3, OUTPUT4, OUTPUT5, OUTPUT6) values ("' + IMEI_NO + '", "' + DATA_STAMP + '", "' + ACTUAL_DATA + '", "' + ACTUALDATALENGTH + '", "' + VOLTAGE_R + '", "' + VOLTAGE_Y + '", "' + VOLTAGE_B + '", "' + AMP_R + '", "' + AMP_Y + '", "' + AMP_B + '", "' + PF_R + '", "' + PF_Y + '", "' + PF_B + '", "' + KWR + '", "' + KWY + '", "' + KWB + '", "' + KVAR + '", "' + KVAY + '", "' + KVAB + '", "' + KVAR_R + '", "' + KVAR_Y + '", "' + KVAR_B + '", "' + KWH + '", "' + KVAH + '", "' + KVARH + '", "' + METER_NO + '", "' + SL_VOLTAGE + '", "' + FREQUENCY + '", "'+ IO_STAMP + '", "'+ INPUT1 + '", "'+ INPUT2 + '", "'+ INPUT3 + '", "'+ INPUT4 + '", "'+ INPUT5 + '", "'+ INPUT6 + '", "'+ OUTPUT1 + '", "'+ OUTPUT2 + '", "'+ OUTPUT3 + '", "'+ OUTPUT4 + '", "'+ OUTPUT5 + '", "'+ OUTPUT6 + '")',
		function selectCb(err, results, fields) {
			if (err) throw err;
			else console.log("INSERT DATA OK");
		});   */     
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
server.listen(PORT, HOST);
//setTimeout(resetServer, 100000);
function resetServer(){
	var dt = new Date();
	CT = dt.getTime();
	console.log("DIFF "+CT+" "+ (CT-ST));
	if(CT - ST > 100000){
		server.close();
		
		for(var i=0;i<sockets.length;i++){
			console.log('CLOSING SOCKETS');
			sockets[i].destroy();
		}
		sockets = [];
		sockets_info = [];
		
		server.listen(PORT, HOST);
	}
	setTimeout(resetServer, 100000);
}
function writeLog(IMEI_NO, DATA){
	var d = new Date();
	var time = dateFormat(d, "isoDateTime");
	//var file = "testlog.txt";
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+".txt";
	var fs = require('fs');
	fs.exists('logs/'+file, function(exist){
		if(exist){
			var str = time + "," + IMEI_NO + "," + DATA;
			fs.appendFile('logs/'+file, '\r\n'+str, function(err1) {
				console.log('WRITING LOG!');
				if (err1){
					console.log(err1);
				}
				console.log('LOG FINISH!');
			});
		}else{

			fs.writeFile('logs/'+file, '--- Start Logging ---', function(err2) {
				if (err2){
					console.log(err2);
				}
				fs.chown('logs/'+file, 1005, 1005, (error) => { 
				  if (error) 
				    console.log("Error Code:", error); 
				  else
				    console.log("uid and gid set successfully"); 
				}); 
				console.log('NEW LOG FILE CREATED!');
			});
		}
	});
}
server.on('connection', function(sock){
	console.log('SOCKET CONNECTION: ' + sock.remoteAddress +':'+ sock.remotePort);
	sockets.push(sock);
	//sock.pipe(sock);
	
	sock.write('ACCSETPKT0060');

	var dateFormat = require('dateformat');
	var now = new Date();

	//console.log("RTC "+dateFormat(now, "ddmmyyHHMMss"));

	//sock.write('RTC,'+dateFormat(now, "ddmmyyHHMMss"));

	var created_at = dateFormat(now, "isoDateTime");
	var o = {imei:'',remoteaddr:sock.remoteAddress,remoteport:sock.remotePort};
	sockets_info.push(o);
	
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
});

var schedule_light = {};
var rule = new schedule.RecurrenceRule();
rule.hour = 13;
rule.minute = 1;
var j = schedule.scheduleJob(rule, function(){
	console.log('CHECK SCHEDULE');
	
	for (const [key, value] of Object.entries(MASTER_DATA)) {
		if(!empty(value.CONNECTION)){
			var sock = value.CONNECTION;
			sock.write("ACCZAP");
			console.log("SOCK WRITE ACCZAP "+key);
		}
	}
});

function listenDB(){
	console.log("LISTEN DATABASE");
	tmpconn.query("SELECT DISTINCT(imei_no) FROM trans_send_data WHERE status = '0'",
	function selectCb(err, results, fields) {
		//tmpconn.end();
		if (err) {
			console.log(err);	
		}else{
			for(var i=0; i<results.length; i++){
				var row = results[i];
				scheduleInit(row.IMEI_NO);
			}
		}
		
	});
	setTimeout(listenDB, 100000);
}
function scheduleInit(IMEI_NO){
	console.log("SCHEDULE INIT "+IMEI_NO);
	tmpconn.query("SELECT * FROM trans_send_data WHERE imei_no = '"+IMEI_NO+"' AND STATUS = '0'",
	function selectCb(err, results, fields) {
		//tmpconn.end();
		if (err) {
			console.log(err);	
		}else{
			var TIME_ON = '';
			var TIME_OFF = '';
			for(var i=0; i<results.length; i++){
				var row = results[i];
				if(row.DATA == "TIMEON"){
					TIME_ON = row.COMMAND.replace(":","");
				}
				if(row.DATA == "TIMEOFF"){
					TIME_OFF = row.COMMAND.replace(":","");
				}
			}
			if(TIME_ON && TIME_OFF){
				var SCHEDULE_STR = 'TOD,'+TIME_ON+","+TIME_OFF+",0000,0000,0000,0000";
				console.log("IMEI SCHEDULE STRING "+SCHEDULE_STR);
				for(var i=0;i<sockets.length;i++){
					if(sockets_info[i].imei == IMEI_NO){
						sockets[i].write(SCHEDULE_STR);
						
						console.log("SCHEDULING DONE ");
						
						var dateFormat = require('dateformat');
						var now = new Date();
						var date_time = dateFormat(now, "isoDateTime");
						
						tmpconn.query("UPDATE trans_send_data SET STATUS='1', SND_DATE_STAMP='"+date_time+"' WHERE IMEI_NO='"+IMEI_NO+"' AND STATUS='0'",
						function selectCb(err, results, fields) {
							if (err) {
								console.log(err);	
							}else{
								console.log("DATABASE UPDATE DONE ");
							}
							//tmpconn.end();
						});
					}
				}
			}
		}
	});
}
console.log('Server listening on ' + HOST +':'+ PORT + ' '+ST);