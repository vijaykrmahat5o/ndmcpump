var net = require('net');
var mysql = require('mysql');
var moment = require("moment");
var empty = require('is-empty');
var schedule = require('node-schedule');

var HOST = '216.10.247.24';
var PORT = 32230;

var fx = 0;
var lx = 6;

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

var server = net.createServer(function(sock) {
    console.log('SERVER CON: ' + sock.remoteAddress +':'+ sock.remotePort);

    
    
    sock.on('data', function(data) {
		var dt = new Date();
		console.log('NDATA ' + sock.remoteAddress + ': ' + data +' '+(dt.getTime()-ST));
		
		
		var d = data.toString().replace(/[^0-9A-Z]/g, "");
		
		
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
		
		
		fx += lx; lx = 3;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx))/10;
		fx += lx; lx = 3;
		var BT_VOLTAGE = d.substr(fx, lx);  // wwoo
		
		var SHORTDATA = fx+lx;
		
		var DATA = d;
		var DATA_STAMP = rec_date+" "+rec_time;
		var STATUS = "";
		var TYPE = "";
		var ACTUAL_DATA = d;
		var ACTUALDATALENGTH = d.length;
		
		var ANALOGINPUT = "";
		
		var chkstr = "000000000000";
		/*if(d.substr(d.length-chkstr.length, chkstr.length) == "000000000000" || d.length < 38){
			
			//var IMEI_NO = String(d.substr(0, 15));
			//var VOLTAGE_Y = parseInt(d.substr(57, 4)) +""+ parseInt(d.substr(61, 4));
			var VOLTAGE_Y = HexToDec(d.substr(57, 4)) +""+ HexToDec(d.substr(61, 4));
			if(d.length < 38){
				VOLTAGE_Y = 0;
			}
			//var VOLTAGE_Y = HexToDec(d.substr(57, 8));
			console.log("IMEI_NO "+IMEI_NO+" VOLTAGE Y "+VOLTAGE_Y);
			
			var sqlquery = {
				imei_no: IMEI_NO,
				data_stamp: DATA_STAMP,
				actual_data: ACTUAL_DATA,
				actualdatalength: ACTUALDATALENGTH,
				sl_voltage: SL_VOLTAGE,
				voltage_y: VOLTAGE_Y
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
									voltage_y: VOLTAGE_Y
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
									voltage_y: VOLTAGE_Y
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
		}*/
		
		if(d.length < 38){
			// Water level code
			
			fx += lx; lx = d.length - fx;
			ANALOGINPUT = d.substr(fx, lx);
			
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
			return;
		}
		
		
		
		if(d.length > 30 && d.substr(d.length-2, 2) != "FF"){
			cname = "";
			cvalue = "";
			
			
		
			fx += lx; lx = d.length - fx;
			ANALOGINPUT = d.substr(fx, lx);
			
			//var VOLTAGE_Y = HexToDec(d.substr(57, 8));
			var VOLTAGE_Y = HexToDec(d.substr(57, 4)) +""+ HexToDec(d.substr(61, 4));
			console.log("STRING VOLTAGE "+VOLTAGE_Y);
			
			
			var sqlquery = {
						imei_no: IMEI_NO,
						data_stamp: DATA_STAMP,
						actual_data: ACTUAL_DATA,
						actualdatalength: ACTUALDATALENGTH,
						sl_voltage: SL_VOLTAGE,
						analoginput: ANALOGINPUT,
						voltage_y: VOLTAGE_Y
					}
		
			/*var mdarr = ['IMEI_NO', 'DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'SL_VOLTAGE', 'ANALOGINPUT', 'VOLTAGE_Y'];
			for(var z=0; z<dbcols.length; z++){
				var f = dbcols[z].Field;
				if(mdarr.indexOf(f) >= 0){
					dbstr(f,eval(f));
				}
			}*/
			connection.query('INSERT INTO trans_received_data SET ?, insert_time=NOW() ', sqlquery,
			function selectCb(err, results, fields) {
				if (err) {
					console.log(err);	
				}else {
					connection.query('SELECT * FROM trans_last_data WHERE imei_no="'+IMEI_NO+'"',
					function selectCb(err2, rows2, fields2) {
						if (err2) {
							console.log(err2);	
						}else {
							if(rows2.length){
								updatequery = "";
								
								//var mdarr = ['DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'SL_VOLTAGE'];
								/*var mdarr = ['DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'SL_VOLTAGE', 'ANALOGINPUT', 'VOLTAGE_Y'];
								for(var z=0; z<dbcols.length; z++){
									var f = dbcols[z].Field;
									if(mdarr.indexOf(f) >= 0){
										buildupdate(f,eval(f));
									}
								}*/
								var sqlquery = {
									data_stamp: DATA_STAMP,
									actual_data: ACTUAL_DATA,
									actualdatalength: ACTUALDATALENGTH,
									sl_voltage: SL_VOLTAGE,
									analoginput: ANALOGINPUT,
									voltage_y: VOLTAGE_Y
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
								cname = "";
								cvalue = "";
								//var mdarr = ['IMEI_NO', 'DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'SL_VOLTAGE'];
								/*var mdarr = ['IMEI_NO', 'DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'SL_VOLTAGE', 'ANALOGINPUT', 'VOLTAGE_Y'];
								for(var z=0; z<dbcols.length; z++){
									var f = dbcols[z].Field;
									if(mdarr.indexOf(f) >= 0){
										dbstr(f,eval(f));
									}
								}*/
								
								var sqlquery = {
									imei_no: IMEI_NO,
									data_stamp: DATA_STAMP,
									actual_data: ACTUAL_DATA,
									actualdatalength: ACTUALDATALENGTH,
									sl_voltage: SL_VOLTAGE,
									analoginput: ANALOGINPUT,
									voltage_y: VOLTAGE_Y
								}
								
								connection.query('INSERT INTO trans_last_data SET ?, update_time=NOW() ;', sqlquery,
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
		
		console.log("STEP #3 "+fx);
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var hexvalue = d.substr(fx, lx);
		var i1to16 = HexToBin(hexvalue); // mw0

		var INPUT16 = i1to16.substr(0, 1)?i1to16.substr(0, 1):0;
		var INPUT15 = i1to16.substr(1, 1)?i1to16.substr(1, 1):0;
		var INPUT14 = i1to16.substr(2, 1)?i1to16.substr(2, 1):0;
		var INPUT13 = i1to16.substr(3, 1)?i1to16.substr(3, 1):0;
		var INPUT12 = i1to16.substr(4, 1)?i1to16.substr(4, 1):0;
		var INPUT11 = i1to16.substr(5, 1)?i1to16.substr(5, 1):0;
		var INPUT10 = i1to16.substr(6, 1)?i1to16.substr(6, 1):0;
		var INPUT9 = i1to16.substr(7, 1)?i1to16.substr(7, 1):0;
		var INPUT8 = i1to16.substr(8, 1)?i1to16.substr(8, 1):0;
		var INPUT7 = i1to16.substr(9, 1)?i1to16.substr(9, 1):0;
		var INPUT6 = i1to16.substr(10, 1)?i1to16.substr(10, 1):0;
		var INPUT5 = i1to16.substr(11, 1)?i1to16.substr(11, 1):0;
		var INPUT4 = i1to16.substr(12, 1)?i1to16.substr(12, 1):0;
		var INPUT3 = i1to16.substr(13, 1)?i1to16.substr(13, 1):0;
		var INPUT2 = i1to16.substr(14, 1)?i1to16.substr(14, 1):0;
		var INPUT1 = i1to16.substr(15, 1)?i1to16.substr(15, 1):0;

		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH "+fx);
			return; 
		}
		var hexvalue = d.substr(fx, lx);
		var i17to32 = HexToBin(hexvalue); // mw1

		var INPUT32 = i17to32.substr(0, 1)?i17to32.substr(0, 1):0;
		var INPUT31 = i17to32.substr(1, 1)?i17to32.substr(1, 1):0;
		var INPUT30 = i17to32.substr(2, 1)?i17to32.substr(2, 1):0;
		var INPUT29 = i17to32.substr(3, 1)?i17to32.substr(3, 1):0;
		var INPUT28 = i17to32.substr(4, 1)?i17to32.substr(4, 1):0;
		var INPUT27 = i17to32.substr(5, 1)?i17to32.substr(5, 1):0;
		var INPUT26 = i17to32.substr(6, 1)?i17to32.substr(6, 1):0;
		var INPUT25 = i17to32.substr(7, 1)?i17to32.substr(7, 1):0;
		var INPUT24 = i17to32.substr(8, 1)?i17to32.substr(8, 1):0;
		var INPUT23 = i17to32.substr(9, 1)?i17to32.substr(9, 1):0;
		var INPUT22 = i17to32.substr(10, 1)?i17to32.substr(10, 1):0;
		var INPUT21 = i17to32.substr(11, 1)?i17to32.substr(11, 1):0;
		var INPUT20 = i17to32.substr(12, 1)?i17to32.substr(12, 1):0;
		var INPUT19 = i17to32.substr(13, 1)?i17to32.substr(13, 1):0;
		var INPUT18 = i17to32.substr(14, 1)?i17to32.substr(14, 1):0;
		var INPUT17 = i17to32.substr(15, 1)?i17to32.substr(15, 1):0;
		
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FEEDBACK_SPARE = parseInt(d.substr(fx, lx),16).toString(2); // mw2

		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE1 = parseInt(d.substr(fx, lx),16).toString(10); // mw3
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE2 = parseInt(d.substr(fx, lx),16).toString(10); // mw4
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE3 = parseInt(d.substr(fx, lx),16).toString(10); // mw5
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE4 = parseInt(d.substr(fx, lx),16).toString(10); // mw6
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE5 = parseInt(d.substr(fx, lx),16).toString(10); // mw7
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE6 = parseInt(d.substr(fx, lx),16).toString(10); // mw8
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE7 = parseInt(d.substr(fx, lx),16).toString(10); // mw9
		fx += lx; lx = 4;
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE8 = parseInt(d.substr(fx, lx),16).toString(10); // mw10


		fx += lx; lx = 4; // SPARE PUMP
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var FLOW_RATE_SPARE = parseInt(d.substr(fx, lx),16).toString(10); // mw11

		fx += lx; lx = 4; // mw12
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		
		console.log(">>>> "+fx);
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw13
		
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var v2 = d.substr(fx, lx);
		var TOTALIZER1 = HexToFloat(v2+v1);
		fx += lx; lx = 4; // mw14
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw15
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var v2 = d.substr(fx, lx);
		var TOTALIZER2 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw16
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw17
		if(d.length < (fx+lx)){
			console.log("DATA IS NOT APPROPRIATE IN LENGTH");
			return; 
		}
		var v2 = d.substr(fx, lx);
		var TOTALIZER3 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw18
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw19
		var v2 = d.substr(fx, lx);
		var TOTALIZER4 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw20
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw21
		var v2 = d.substr(fx, lx);
		var TOTALIZER5 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw22
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw23
		var v2 = d.substr(fx, lx);
		var TOTALIZER6 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw24
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw25
		var v2 = d.substr(fx, lx);
		var TOTALIZER7 = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw26
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw27
		var v2 = d.substr(fx, lx);
		var TOTALIZER8 = HexToFloat(v2+v1);
		
		fx += lx; lx = 4; // mw28 SPARE PART
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw29
		var v2 = d.substr(fx, lx);
		var TOTALIZER_SPARE = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw30
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw31
		var v2 = d.substr(fx, lx);
		var AMP_R = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw32
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw33
		var v2 = d.substr(fx, lx);
		var KWH = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw34
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw35
		var v2 = d.substr(fx, lx);
		var KW = HexToFloat(v2+v1);

		fx += lx; lx = 4; // mw36
		var v1 = d.substr(fx, lx);
		fx += lx; lx = 4; // mw37
		var v2 = d.substr(fx, lx);
		var PF_R = HexToFloat(v2+v1);

		fx += lx; lx = 4;
		var VOLTAGE_R = parseInt(d.substr(fx, lx),16).toString(10); //mw38



		cname = "";
		cvalue = "";
		if(d.substr(d.length-2, 2) == "FF"){
			
			/*var mdarr = ['IMEI_NO', 'DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'VOLTAGE_R', 'AMP_R', 'PF_R', 'KWH', 'KW', 'SL_VOLTAGE', 'INPUT1', 'INPUT2', 'INPUT3', 'INPUT4', 'INPUT5', 'INPUT6', 'INPUT7', 'INPUT8', 'INPUT9', 'INPUT10', 'INPUT11', 'INPUT12', 'INPUT13', 'INPUT14', 'INPUT15', 'INPUT16', 'INPUT17', 'INPUT18', 'INPUT19', 'INPUT20', 'INPUT21', 'INPUT22', 'INPUT23', 'INPUT24', 'INPUT25', 'INPUT26', 'INPUT27', 'INPUT28', 'INPUT29', 'INPUT30', 'INPUT31', 'INPUT32', 'FEEDBACK_SPARE', 'FLOW_RATE1', 'FLOW_RATE2', 'FLOW_RATE3', 'FLOW_RATE4', 'FLOW_RATE5', 'FLOW_RATE6', 'FLOW_RATE7', 'FLOW_RATE8', 'FLOW_RATE_SPARE', 'TOTALIZER1', 'TOTALIZER2', 'TOTALIZER3', 'TOTALIZER4', 'TOTALIZER5', 'TOTALIZER6', 'TOTALIZER7', 'TOTALIZER8','TOTALIZER_SPARE'];
			for(var z=0; z<dbcols.length; z++){
				var f = dbcols[z].Field;
				if(mdarr.indexOf(f) >= 0){
					dbstr(f,eval(f));
				}
			}*/
			
			var sqlquery = {
					imei_no: IMEI_NO,
					data_stamp: DATA_STAMP,
					actual_data: ACTUAL_DATA,
					actualdatalength: ACTUALDATALENGTH,
					voltage_r: VOLTAGE_R,
					amp_r: AMP_R,
					pf_r: PF_R,
					kwh: KWH,
					kw: KW,
					sl_voltage: SL_VOLTAGE,
					inputs: INPUT1 +','+ INPUT2 +','+ INPUT3 +','+ INPUT4 +','+ INPUT5 +','+ INPUT6 +','+ INPUT7 +','+ INPUT8 +','+ INPUT9 +','+ INPUT10 +','+ INPUT11 +','+ INPUT12 +','+ INPUT13 +','+ INPUT14 +','+ INPUT15 +','+ INPUT16 +','+ INPUT17 +','+ INPUT18 +','+ INPUT19 +','+ INPUT20 +','+ INPUT21 +','+ INPUT22 +','+ INPUT23 +','+ INPUT24 +','+ INPUT25 +','+ INPUT26 +','+ INPUT27 +','+ INPUT28 +','+ INPUT29 +','+ INPUT30 +','+ INPUT31 +','+ INPUT32,
					feedback_spare: FEEDBACK_SPARE,
					flow_rate: FLOW_RATE1 +','+ FLOW_RATE2 +','+ FLOW_RATE3 +','+ FLOW_RATE4 +','+ FLOW_RATE5 +','+ FLOW_RATE6 +','+ FLOW_RATE7 +','+ FLOW_RATE8,
					flow_rate_spare: FLOW_RATE_SPARE,
					totalizer: TOTALIZER1 +','+ TOTALIZER2 +','+ TOTALIZER3 +','+ TOTALIZER4 +','+ TOTALIZER5 +','+ TOTALIZER6 +','+ TOTALIZER7 +','+ TOTALIZER8,
					totalizer_spare: TOTALIZER_SPARE
				}
			
			//console.log('INSERT INTO trans_received_data ('+cname+') values ('+cvalue+')');
			
			connection.query('INSERT INTO trans_received_data SET ?, insert_time=NOW() ;', sqlquery,
			function selectCb(err, results, fields) {
				if (err) {
					console.log(err);	
				}else {
					connection.query('SELECT * FROM trans_last_data WHERE imei_no=?;', IMEI_NO,
					function selectCb(err2, rows2, fields2) {
						if (err2) {
							console.log(err2);	
						}else {
							console.log(">>>> "+rows2.length);
							if(rows2.length){
								updatequery = "";
								
								/*var mdarr = ['DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'VOLTAGE_R', 'AMP_R', 'PF_R', 'KWH', 'KW', 'SL_VOLTAGE', 'INPUT1', 'INPUT2', 'INPUT3', 'INPUT4', 'INPUT5', 'INPUT6', 'INPUT7', 'INPUT8', 'INPUT9', 'INPUT10', 'INPUT11', 'INPUT12', 'INPUT13', 'INPUT14', 'INPUT15', 'INPUT16', 'INPUT17', 'INPUT18', 'INPUT19', 'INPUT20', 'INPUT21', 'INPUT22', 'INPUT23', 'INPUT24', 'INPUT25', 'INPUT26', 'INPUT27', 'INPUT28', 'INPUT29', 'INPUT30', 'INPUT31', 'INPUT32', 'FEEDBACK_SPARE', 'FLOW_RATE1', 'FLOW_RATE2', 'FLOW_RATE3', 'FLOW_RATE4', 'FLOW_RATE5', 'FLOW_RATE6', 'FLOW_RATE7', 'FLOW_RATE8', 'FLOW_RATE_SPARE', 'TOTALIZER1', 'TOTALIZER2', 'TOTALIZER3', 'TOTALIZER4', 'TOTALIZER5', 'TOTALIZER6', 'TOTALIZER7', 'TOTALIZER8','TOTALIZER_SPARE'];
								for(var z=0; z<dbcols.length; z++){
									var f = dbcols[z].Field;
									if(mdarr.indexOf(f) >= 0){
										buildupdate(f,eval(f));
									}
								}*/
								
								var sqlquery = {
									data_stamp: DATA_STAMP,
									actual_data: ACTUAL_DATA,
									actualdatalength: ACTUALDATALENGTH,
									voltage_r: VOLTAGE_R,
									amp_r: AMP_R,
									pf_r: PF_R,
									kwh: KWH,
									kw: KW,
									sl_voltage: SL_VOLTAGE,
									inputs: INPUT1 +','+ INPUT2 +','+ INPUT3 +','+ INPUT4 +','+ INPUT5 +','+ INPUT6 +','+ INPUT7 +','+ INPUT8 +','+ INPUT9 +','+ INPUT10 +','+ INPUT11 +','+ INPUT12 +','+ INPUT13 +','+ INPUT14 +','+ INPUT15 +','+ INPUT16 +','+ INPUT17 +','+ INPUT18 +','+ INPUT19 +','+ INPUT20 +','+ INPUT21 +','+ INPUT22 +','+ INPUT23 +','+ INPUT24 +','+ INPUT25 +','+ INPUT26 +','+ INPUT27 +','+ INPUT28 +','+ INPUT29 +','+ INPUT30 +','+ INPUT31 +','+ INPUT32,
									feedback_spare: FEEDBACK_SPARE,
									flow_rate: FLOW_RATE1 +','+ FLOW_RATE2 +','+ FLOW_RATE3 +','+ FLOW_RATE4 +','+ FLOW_RATE5 +','+ FLOW_RATE6 +','+ FLOW_RATE7 +','+ FLOW_RATE8,
									flow_rate_spare: FLOW_RATE_SPARE,
									totalizer: TOTALIZER1 +','+ TOTALIZER2 +','+ TOTALIZER3 +','+ TOTALIZER4 +','+ TOTALIZER5 +','+ TOTALIZER6 +','+ TOTALIZER7 +','+ TOTALIZER8,
									totalizer_spare: TOTALIZER_SPARE
								}
								
								//console.log('UPDATE trans_last_data SET '+updatequery+' WHERE IMEI_NO = '+IMEI_NO);
							connection.query('UPDATE trans_last_data SET ?, update_time=NOW() WHERE imei_no = ?;', [sqlquery, IMEI_NO],
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
								/*var mdarr = ['IMEI_NO', 'DATA_STAMP', 'ACTUAL_DATA', 'ACTUALDATALENGTH', 'VOLTAGE_R', 'AMP_R', 'PF_R', 'KWH', 'KW', 'SL_VOLTAGE', 'INPUT1', 'INPUT2', 'INPUT3', 'INPUT4', 'INPUT5', 'INPUT6', 'INPUT7', 'INPUT8', 'INPUT9', 'INPUT10', 'INPUT11', 'INPUT12', 'INPUT13', 'INPUT14', 'INPUT15', 'INPUT16', 'INPUT17', 'INPUT18', 'INPUT19', 'INPUT20', 'INPUT21', 'INPUT22', 'INPUT23', 'INPUT24', 'INPUT25', 'INPUT26', 'INPUT27', 'INPUT28', 'INPUT29', 'INPUT30', 'INPUT31', 'INPUT32', 'FEEDBACK_SPARE', 'FLOW_RATE1', 'FLOW_RATE2', 'FLOW_RATE3', 'FLOW_RATE4', 'FLOW_RATE5', 'FLOW_RATE6', 'FLOW_RATE7', 'FLOW_RATE8', 'FLOW_RATE_SPARE', 'TOTALIZER1', 'TOTALIZER2', 'TOTALIZER3', 'TOTALIZER4', 'TOTALIZER5', 'TOTALIZER6', 'TOTALIZER7', 'TOTALIZER8','TOTALIZER_SPARE'];
								for(var z=0; z<dbcols.length; z++){
									var f = dbcols[z].Field;
									if(mdarr.indexOf(f) >= 0){
										dbstr(f,eval(f));
									}
								}*/
								
								var sqlquery = {
									imei_no: IMEI_NO,
									data_stamp: DATA_STAMP,
									actual_data: ACTUAL_DATA,
									actualdatalength: ACTUALDATALENGTH,
									voltage_r: VOLTAGE_R,
									amp_r: AMP_R,
									pf_r: PF_R,
									kwh: KWH,
									kw: KW,
									sl_voltage: SL_VOLTAGE,
									inputs: INPUT1 +','+ INPUT2 +','+ INPUT3 +','+ INPUT4 +','+ INPUT5 +','+ INPUT6 +','+ INPUT7 +','+ INPUT8 +','+ INPUT9 +','+ INPUT10 +','+ INPUT11 +','+ INPUT12 +','+ INPUT13 +','+ INPUT14 +','+ INPUT15 +','+ INPUT16 +','+ INPUT17 +','+ INPUT18 +','+ INPUT19 +','+ INPUT20 +','+ INPUT21 +','+ INPUT22 +','+ INPUT23 +','+ INPUT24 +','+ INPUT25 +','+ INPUT26 +','+ INPUT27 +','+ INPUT28 +','+ INPUT29 +','+ INPUT30 +','+ INPUT31 +','+ INPUT32,
									feedback_spare: FEEDBACK_SPARE,
									flow_rate: FLOW_RATE1 +','+ FLOW_RATE2 +','+ FLOW_RATE3 +','+ FLOW_RATE4 +','+ FLOW_RATE5 +','+ FLOW_RATE6 +','+ FLOW_RATE7 +','+ FLOW_RATE8,
									flow_rate_spare: FLOW_RATE_SPARE,
									totalizer: TOTALIZER1 +','+ TOTALIZER2 +','+ TOTALIZER3 +','+ TOTALIZER4 +','+ TOTALIZER5 +','+ TOTALIZER6 +','+ TOTALIZER7 +','+ TOTALIZER8,
									totalizer_spare: TOTALIZER_SPARE
								}
								
								connection.query('INSERT INTO trans_last_data SET ?, update_time=NOW() ;', sqlquery,
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
					
					/*connection.query('INSERT INTO trans_received_data ('+cname+') values ('+cvalue+')',
					function selectCb(err, results, fields) {
						if (err) throw err;
						else {
							
							console.log("INSERT DATA OK");
						}
					}); */
					console.log("INSERT DATA OK");
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
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+".txt";
	var fs = require('fs');
	fs.exists('/home/wlms/www/nodejs/node_modules/npm/logs/'+file, function(exist){
		if(exist){
			var str = time + "," + IMEI_NO + "," + DATA;
			fs.appendFile('/home/wlms/www/nodejs/node_modules/npm/logs/'+file, '\r\n'+str, function(err1) {
				console.log('WRITING LOG!');
				if (err1){
					console.log(err1);
				}
				console.log('LOG FINISH!');
			});
		}else{
			fs.writeFile('/home/wlms/www/nodejs/node_modules/npm/logs/'+file, '--- Start Logging ---', function(err2) {
				if (err2){
					console.log(err2);
				}
				fs.chown('/home/wlms/www/nodejs/node_modules/npm/logs/'+file, 1005, 1005, (error) => { 
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
	sock.pipe(sock);
	
	var dateFormat = require('dateformat');
	var now = new Date();
	var created_at = dateFormat(now, "isoDateTime");
	var o = {imei:'',remoteaddr:sock.remoteAddress,remoteport:sock.remotePort};
	sockets_info.push(o);
	
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
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

var schedule_light = {};
var rule = new schedule.RecurrenceRule();
rule.hour = 12;
rule.minute = 25;
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