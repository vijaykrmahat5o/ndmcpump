var net = require('net');
var mysql = require('mysql');
var moment = require("moment");
var empty = require('is-empty');

var HOST = '119.18.52.29';
var PORT = 36012;

var fx = 0;
var lx = 6; 

var dateFormat = require('dateformat');
var interval = '';
var sockets = [];
var sockets_info = [];
var connection = mysql.createConnection({
	multipleStatements: true,
	host     : 'localhost',
	user     : 'wms_usr',
	password : 'mozucp50eua2',
	database : 'wms_db',
	dateStrings: [
		'DATE',
		'DATETIME'
	]
});

var tmpconn = mysql.createConnection({
	host     : 'localhost',
	user     : 'wms_usr',
	password : 'mozucp50eua2',
	database : 'wms_db'
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
function ilog(param1,param2){
	console.log(param1+" : "+param2);
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
		if(data.length < 15){
			return;
		}
		writeLog(IMEI_NO, data);
		
		
		
		
		ST = dt.getTime();
		
		var fx = 0; 
		var lx = 0;
		var d = data.toString().replace(/[^0-9A-Z]/g, "");
		if(d.length<20){
			return;
		}

		
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
		
		fx += lx; lx = 15;
		var IMEI_NO = String(d.substr(fx, lx));
		
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
		
		if(d.length < 50){
			cname = "";
			cvalue = "";
		
			fx += lx; lx = d.length - fx;
			ANALOGINPUT = d.substr(fx, lx);
		
		var sqlquery = {
			imei_no: IMEI_NO,
			data_stamp: DATA_STAMP,
			actual_data: ACTUAL_DATA,
			actualdatalength: ACTUALDATALENGTH,
			sl_voltage: SL_VOLTAGE
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
									sl_voltage: SL_VOLTAGE
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
									sl_voltage: SL_VOLTAGE
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
			return;
		}
		
		
		fx += lx; lx = 13;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var IO_DATA = d.substr(fx, lx);
		
		var OUTPUT1 = IO_DATA.substr(0, 1);
		var OUTPUT2 = IO_DATA.substr(1, 1);
		var OUTPUT3 = IO_DATA.substr(2, 1);
		var OUTPUT4 = IO_DATA.substr(3, 1);
		var OUTPUT5 = IO_DATA.substr(4, 1);
		var OUTPUT6 = IO_DATA.substr(5, 1);
		var INPUT7 = IO_DATA.substr(6, 1);
		var INPUT6 = IO_DATA.substr(7, 1);
		var INPUT5 = IO_DATA.substr(8, 1);
		var INPUT4 = IO_DATA.substr(9, 1);
		var INPUT3 = IO_DATA.substr(10, 1);
		var INPUT2 = IO_DATA.substr(11, 1);
		var INPUT1 = IO_DATA.substr(12, 1);
		
		
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
		
		fx += lx; lx = 6; // IGNORE
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KW = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KWR = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KWY = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KWB = getHexToDecimal(v1,v2);
		
		console.log('KWB '+KWB)
		
		fx += lx; lx = 40;
		
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
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KVAH = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 64;
		
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
		console.log("VOLTAGE_B "+VOLTAGE_B+" "+(v2+v1));
		
		fx += lx; lx = 8;
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var AMP_R = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var AMP_Y = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var AMP_B = getHexToDecimal(v1,v2);
		
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var FREQUENCY = getHexToDecimal(v1,v2);
		console.log("FREQUENCY "+FREQUENCY+" "+(v2+v1));
		fx += lx; lx = 4;
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4;
		var v2 = d.substr(fx, lx);
		var KWH = getHexToDecimal(v1,v2);
		
		
		
		

		cname = "";
		cvalue = "";
		if(d.length > 50){
			
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
				inputs: INPUT1+''+INPUT2+''+INPUT3+''+INPUT4+''+INPUT5+''+INPUT6,
				outputs: OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6,
				analoginput: ANALOGINPUT,
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
									inputs: INPUT1+''+INPUT2+''+INPUT3+''+INPUT4+''+INPUT5+''+INPUT6,
									outputs: OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6,
									analoginput: ANALOGINPUT,
									status: STATUS
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
									inputs: INPUT1+''+INPUT2+''+INPUT3+''+INPUT4+''+INPUT5+''+INPUT6,
									outputs: OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6,
									analoginput: ANALOGINPUT,
									status: STATUS
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
			return;
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
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+"-xx.txt";
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
	
	var dateFormat = require('dateformat');
	var now = new Date();
	var created_at = dateFormat(now, "isoDateTime");
	var o = {imei:'',remoteaddr:sock.remoteAddress,remoteport:sock.remotePort};
	sockets_info.push(o);
	
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
});
function listenDB(){
	//console.log("LISTEN DATABASE");
	tmpconn.query("SELECT DISTINCT(IMEI_NO) FROM trans_send_data WHERE STATUS = '0'",
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