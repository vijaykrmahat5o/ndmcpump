var net = require('net');
var mysql = require('mysql');
var moment = require("moment");
var httpserver = require('http').createServer();
var socketio = require('socket.io')(httpserver);
var empty = require('is-empty');

var HOST = '103.55.91.17';
var PORT = 32212;
var HTTP_PORT = 32217;

var dateFormat = require('dateformat');
var interval = '';
var sockets = [];
var sockets_info = [];
var connection = mysql.createConnection({
	multipleStatements: true,
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'slc',
	timezone: 'UTC',
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
var AMP_LIMIT = 1300;
var VOLTAGE_LIMIT = 28000;
var MASTER_DATA = new Object();
var MASTER_ULBS = new Array();

var data_check = new Object();

var ONESEC = 1000;
var ONEMIN = 60 * 1000;
var TENMIN = 10 * 60 * 1000;
var ONEHOUR = 60 * 60 * 1000;
var TWELVEHOURS = 12 * 60 * 60 * 1000;
var ONEDAY = 24 * 60 * 60 * 1000;

var DELAY = 15;

var fx = 0;
var lx = 6;

var ULB_INDEX = 0;



socketio.on('connection', function (httpsocket){
    var nb = 0;

    console.log('SocketIO > Connected socket ' + httpsocket.id);

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
	var sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.maintenance, mz.title as ulb_title, mz.on_time, mz.off_time, dld.total_kw as actual_load, dld.output_status, dld.data_stamp, dld.update_time "+
"FROM master_device AS md "+
"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no;"

	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				for(var i=0; i<results.length; i++){
					var imei_no = results[i].imei_no;
					if(!MASTER_DATA[imei_no]){
						MASTER_DATA[imei_no] = new Object();
						MASTER_DATA[imei_no]['TIME'] = 0;
						MASTER_DATA[imei_no]['REGISTERED'] = 1;
						MASTER_DATA[imei_no]['CONNECTION'] = '';
						MASTER_DATA[imei_no]['SCHEDULE_TIME'] = moment().subtract(1, 'day').format("YYYY-MM-DD HH:mm:ss");
						MASTER_DATA[imei_no]['IMEI_NO'] = imei_no;
						MASTER_DATA[imei_no]['ON_HITS'] = 0;
						MASTER_DATA[imei_no]['OFF_HITS'] = 0;
						MASTER_DATA[imei_no]['LAST_AMP_R'] = -1;
						MASTER_DATA[imei_no]['LAST_AMP_Y'] = -1;
						MASTER_DATA[imei_no]['LAST_AMP_B'] = -1;
						MASTER_DATA[imei_no]['STATE_ID'] = results[i].state_id;
						MASTER_DATA[imei_no]['ZONE_ID'] = results[i].zone_id;
						MASTER_DATA[imei_no]['ULB_ID'] = results[i].ulb_id;
						MASTER_DATA[imei_no]['TOTAL_CONNECTION'] = results[i].no_of_fittings;
						MASTER_DATA[imei_no]['TOTAL_LOAD'] = results[i].total_load;
						MASTER_DATA[imei_no]['ACTUAL_LOAD'] = results[i].actual_load;
						MASTER_DATA[imei_no]['DEVICE_TYPE'] = results[i].device_type;
						MASTER_DATA[imei_no]['PREV_LOAD_DBID'] = '';
						MASTER_DATA[imei_no]['PREV_LOAD_TIME'] = '';
						MASTER_DATA[imei_no]['PREV_LOAD'] = '';
						MASTER_DATA[imei_no]['PREV_OVERVOLTAGE_TIME'] = '';
						MASTER_DATA[imei_no]['PREV_VOLTAGE_R'] = '';
						MASTER_DATA[imei_no]['PREV_VOLTAGE_Y'] = '';
						MASTER_DATA[imei_no]['PREV_VOLTAGE_B'] = '';
						MASTER_DATA[imei_no]['PREV_OVERVOLTAGE_DBID'] = '';
						MASTER_DATA[imei_no]['UPDATE_TIME'] = results[i].update_time;
					}
					MASTER_DATA[imei_no]['RTC_ON_TIME'] = results[i].on_time;
					MASTER_DATA[imei_no]['RTC_OFF_TIME'] = results[i].off_time;
					MASTER_DATA[imei_no]['MAINTENANCE'] = results[i].maintenance;
					
				}
				setTimeout(load_devices, TENMIN);
				//console.log("TOTAL RECORDS "+JSON.stringify(MASTER_DATA));
			}else{
				console.log("NO RECORDS");
			}
		}
	});
}

setTimeout(load_ulbs, 1000);
function load_ulbs(){
	var sql = "SELECT ru.ulb_id FROM report_ulb ru";

	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			if(results.length > 0){
				var ulbs = new Array();
				for(var i=0; i<results.length; i++){
					var d = results[i];
					ulbs.push(d.ulb_id);
				}
				MASTER_ULBS = ulbs
				console.log('TOTAL ULBS '+MASTER_ULBS.length);
			}else{
				console.log("NO RECORDS");
			}
			setTimeout(load_ulbs, ONEMIN);
		}
	});
}

setTimeout(update_ulbs, 1000 * 10);
function update_ulbs(){
	var ulb_id = MASTER_ULBS[ULB_INDEX];
	console.log('FETCHING ULB DATA '+ulb_id);
	var sql = "SELECT md.id, md.device_type, ml.no_of_fittings, ml.total_load, dld.supply, COALESCE(dld.total_kw, 0) total_kw, dld.output_status, dld.data_stamp, dld.update_time FROM master_device AS md LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no WHERE ml.ulb_id = '"+ulb_id+"'";
	//console.log(sql);
	connection.query(sql, function selectCb(err, results, fields) {
		if (err) console.log(err);
		else {
			var total_lights = 0;
			var total_light_on = 0;
			var total_light_off = 0;
			var total_signal_loss = 0;
			var total_load = 0;
			var actual_load = 0;
			var total_powercut = 0;
			
			if(results.length > 0){
				var total_device = results.length;
				var total_device_loss = 0;
				
				console.log('TOTAL RECORDS : '+results.length);
				for(var i=0; i<results.length; i++){
					var d = results[i];
					total_lights += d.no_of_fittings;
					total_load += parseInt(d.total_load);
					
					
					var _total_kw = 0;
					console.log("CALCULAT TOTAL LOAD: "+parseInt(d.total_kw)/100000);
					if((parseInt(d.total_kw)/100000) > 0.5){
						_total_kw = parseInt(d.total_kw);
					}
					actual_load += _total_kw;
					
					
					var curdatetime = moment().format("YYYY-MM-DD HH:mm");
					var conn_status = 1;
					if(d.update_time != ""){
						var dbdatetime = moment(d.update_time);
						var duration = '';
						var minutes = moment().diff(dbdatetime,'minutes');
						//var minutes = duration.asMinutes();
						//console.log("MINUTES :"+minutes);
						if(minutes < 10){
							conn_status = 1;
						}else{
							conn_status = 0;
						}
					}else{
						conn_status = 0;
					}
					d.connection_status = conn_status;
					if(d.supply < 120){
						total_powercut += 1;
					}
					if(d.output_status == 1 && conn_status == 1){
						total_light_on += d.no_of_fittings;
					}
					if(d.output_status == 0 && conn_status == 1){
						total_light_off += d.no_of_fittings;
					}
					if(conn_status == 0){
						total_signal_loss += d.no_of_fittings;
						total_device_loss += 1;
					}
				}
				console.log('TOTAL LOAD : '+total_load+' ACTUAL LOAD '+actual_load);
				
				var sql = "UPDATE "+TB_REPORT_ULB+" SET total_device='"+total_device+"', total_powercut='"+total_powercut+"', total_device_loss='"+total_device_loss+"', total_controller='"+total_lights+"', total_controller_on='"+total_light_on+"', total_controller_off='"+total_light_off+"', total_controller_loss='"+total_signal_loss+"', total_load='"+total_load+"', actual_load="+actual_load+", update_time=NOW() WHERE ulb_id = '"+ulb_id+"';";
				
				sql += "INSERT INTO "+TB_REPORT_ULB_DATA+" (ulb_id, total_device, total_powercut, total_device_loss, total_controller, total_controller_on, total_controller_off, total_controller_loss, total_load, actual_load, update_time) VALUES ('"+ulb_id+"', '"+total_device+"', '"+total_powercut+"', '"+total_device_loss+"', '"+total_lights+"', '"+total_light_on+"', '"+total_light_off+"', '"+total_signal_loss+"', '"+total_load+"', '"+actual_load+"', NOW() );";
				
				connection.query(sql, function selectCb(err, results, fields) {
					if (err) {
						console.log(err);
					}else{ 
						console.log("ULB REPORT UPDATE COMPLETE > IF");
					}
				});
			}else{
				console.log("NO RECORDS");
				
				var sql = "UPDATE "+TB_REPORT_ULB+" SET total_device='0', total_powercut='0', total_device_loss='0', total_controller='0', total_controller_on='0', total_controller_off='0', total_controller_loss='0', total_load='0', actual_load='0', update_time=NOW() WHERE ulb_id = '"+ulb_id+"';";
				
				sql += "INSERT INTO "+TB_REPORT_ULB_DATA+" (ulb_id, total_device, total_powercut, total_device_loss, total_controller, total_controller_on, total_controller_off, total_controller_loss, total_load, actual_load, update_time) VALUES ('"+ulb_id+"', 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW() );";
				
				connection.query( sql, function selectCb(err, results, fields) {
					if (err) {
						console.log(err);
					}else{ 
						console.log("ULB REPORT UPDATE COMPLETE > ELSE");
					}
				});
			}
			ULB_INDEX++;
			console.log("ULB INDEX "+ULB_INDEX+" "+MASTER_ULBS.length);
			if(ULB_INDEX >= MASTER_ULBS.length){
				ULB_INDEX = 0;
			}
			//console.log('>> '+total_lights+' '+total_light_on+' '+total_light_off+' '+total_signal_loss);
			setTimeout(update_ulbs, ONEMIN);
		}
	});
}




var server = net.createServer(function(sock) {
    console.log('SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
    
    sock.on('data', function(data) 
	{
		var dt = new Date();
		
		ST = dt.getTime();
		
		var d = data.toString().replace("CC91DD","");
		
		
		
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
		fx += lx; lx = 3;
		var SL_VOLTAGE = parseInt(d.substr(fx, lx));
		fx += lx; lx = 3;
		var BT_VOLTAGE = d.substr(fx, lx);
		fx += lx; lx = 13;
		var IO_DATA = d.substr(fx, lx);
		
		//sockref[sock.remoteAddress] = IMEI_NO;
		//console.log('>> '+sock.extra);
		if(empty(sock.imei_no)){
			sock.imei_no = IMEI_NO;
		}
		
		if(empty(MASTER_DATA[IMEI_NO])){
			console.log(IMEI_NO+" NOT FOUND");
			return;
		}
		
		console.log('DATA ' + sock.remoteAddress + ': ' +IMEI_NO+ ' ' + data +' '+(dt.getTime()-ST));
		
		var skip = false;
		var dt = new Date();
		
		if((dt.getTime() - MASTER_DATA[IMEI_NO]['TIME']) < 10000 && (dt.getTime() - MASTER_DATA[IMEI_NO]['TIME']) > -10000){
			skip = true;
		}
		
		
		if(!skip){
			var date_rtc = moment("20"+rec_date+" "+rec_time);
			var date_curr = moment().format("YYYY-MM-DD HH:mm");
			//console.log("TIME DFFEERCE "+moment(date_curr).diff(date_rtc,'seconds')+" "+date_rtc+" "+date_curr);
			if(moment(date_curr).diff(date_rtc,'minutes') < 2 && moment(date_curr).diff(date_rtc,'minutes') >= 0){
				console.log('OK DATA');
			}else{
				
				var now = new Date();
				var newdate = dateFormat(now, "ddmmyyHHMMss");
				sock.write("RTC,"+newdate);
				
				console.log('>>>>>>>>>>>>>>>> SET RTC COMMAND '+newdate);
			}			
		}
				
		MASTER_DATA[IMEI_NO]['TIME'] = dt.getTime();
		MASTER_DATA[IMEI_NO]['CONNECTION'] = sock;
		
		if(moment().diff(MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'], 'hours') > 23 && MASTER_DATA[IMEI_NO]['REGISTERED'] > 0){
			
			var OFF_TIME = MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'].split(":"); 
			var ON_TIME = MASTER_DATA[IMEI_NO]['RTC_ON_TIME'].split(":");
			var schedule_str = 'TOD,0000,'+OFF_TIME[0]+OFF_TIME[1]+','+ON_TIME[0]+ON_TIME[1]+',2400,0000,0000';
			var socket = MASTER_DATA[IMEI_NO]['CONNECTION'];
			socket.write(schedule_str);
			MASTER_DATA[IMEI_NO]['SCHEDULE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
			
			/*connection.query('UPDATE '+TB_SCHEDULE_STATUS+' SET schedule_time="'+MASTER_DATA[IMEI_NO]['SCHEDULE_TIME']+'", rtc_on_time="'+MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']+'", rtc_off_time="'+MASTER_DATA[IMEI_NO]['RTC_ON_TIME']+'", connected = 1 WHERE IMEI_NO="'+IMEI_NO+'"',
			function selectCb(err, results, fields) {
				if (err) console.log(err);
				else{ 
					//console.log("INSERT RTC DATA OK");
				}
			});*/
			
			//console.log("SCHEDULE COMMAND "+IMEI_NO+" : "+schedule_str);
		}
		
		writeLog(IMEI_NO, data);
		
		var OUTPUT1 = IO_DATA.substr(0, 1);
		var OUTPUT2 = IO_DATA.substr(1, 1);
		var OUTPUT3 = IO_DATA.substr(2, 1);
		var OUTPUT4 = IO_DATA.substr(3, 1);
		var OUTPUT5 = IO_DATA.substr(4, 1);
		var OUTPUT6 = IO_DATA.substr(5, 1);
		var OUTPUT7 = IO_DATA.substr(6, 1);
		
		var OUTPUT_DATA = OUTPUT1+''+OUTPUT2+''+OUTPUT3+''+OUTPUT4+''+OUTPUT5+''+OUTPUT6+''+OUTPUT7;
		
		var INPUT6 = IO_DATA.substr(7, 1);
		var INPUT5 = IO_DATA.substr(8, 1);
		var INPUT4 = IO_DATA.substr(9, 1);
		var INPUT3 = IO_DATA.substr(10, 1);
		var INPUT2 = IO_DATA.substr(11, 1);
		var INPUT1 = IO_DATA.substr(12, 1);
		
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
		var ACTUAL_DATA = d;
		var ACTUALDATALENGTH = d.length;
		
		cname = "";
		cvalue = "";
		
		if(d.length < fx+10){
			connection.query('INSERT INTO '+TB_DEVICE_RECIEVED+' (IMEI_NO, DATA_STAMP, ACTUAL_DATA, ACTUALDATALENGTH, SL_VOLTAGE,  IO_STAMP, INPUT1, INPUT2, INPUT3, INPUT4, OUTPUT1, OUTPUT2, OUTPUT3, OUTPUT4 ) values ("' + IMEI_NO + '", "' + DATA_STAMP + '", "' + ACTUAL_DATA + '", "' + ACTUALDATALENGTH + '", "'+SL_VOLTAGE+'", "'+ IO_STAMP + '", "'+ INPUT1 + '", "'+ INPUT2 + '", "'+ INPUT3 + '", "'+ INPUT4 + '", "'+ OUTPUT1 + '", "'+ OUTPUT2 + '", "'+ OUTPUT3 + '", "'+ OUTPUT4 + '")',
			function selectCb(err, results, fields) {
				if (err) console.log(err);
				else{ 
					console.log("INSERT DATA OK");
				}
			});
			MASTER_DATA[IMEI_NO]['LAST_AMP_R'] = -1;
			MASTER_DATA[IMEI_NO]['LAST_AMP_Y'] = -1;
			MASTER_DATA[IMEI_NO]['LAST_AMP_B'] = -1;
			
			if( MASTER_DATA[IMEI_NO]['REGISTERED'] > 0 ){
				if(MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'] != ""){
					var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="0" WHERE id='+MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'],
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("UPDATE LOAD DATA OK");
						}
					});
					MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'] = "";
					MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME'] = "";
				}
				
				if(MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID']){
					var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK");
						}
					});
					MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
					MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
				}
			}
			
			return;
		}
		
		var VOLTAGE_R,VOLTAGE_Y,VOLTAGE_B,AMP_R,AMP_Y,AMP_B;
		
		fx += lx; lx = 4; VOLTAGE_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; VOLTAGE_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; VOLTAGE_B = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_R = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_Y = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4; AMP_B = parseInt(d.substr(fx, lx), 16);
		
		
		if(!skip){
			if( MASTER_DATA[IMEI_NO]['REGISTERED'] > 0 ){
				//console.log(OUTPUT1+" "+AMP_R+" "+AMP_Y+" "+AMP_B+" "+AMP_LIMIT);
				if(OUTPUT1 == 1){
					if(AMP_R < AMP_LIMIT && AMP_Y < AMP_LIMIT && AMP_B < AMP_LIMIT){
						if(MASTER_DATA[IMEI_NO]['ON_HITS'] < 2){
							var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
							var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
							
							if( inschedule ){
								sock.write("LIGHTOF");
								setTimeout(function(sock){
									sock.write("LIGHTON");
								},10000, sock);
								MASTER_DATA[IMEI_NO]['ON_HITS'] += 1;
							}
						}
					}
					
				}else{
					if(AMP_R > AMP_LIMIT || AMP_Y > AMP_LIMIT || AMP_B > AMP_LIMIT){
						if(MASTER_DATA[IMEI_NO]['OFF_HITS'] < 2){
							var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
							var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
							
							if( !inschedule ){
								sock.write("LIGHTON");
								setTimeout(function(sock){
									console.log("SEND LIGHT OFF COMMAND TO "+IMEI_NO);
									sock.write("LIGHTOF");
								},10000, sock);
								MASTER_DATA[IMEI_NO]['OFF_HITS'] += 1;
							}
						}
					}
				}
			}
		}
		if( MASTER_DATA[IMEI_NO]['REGISTERED'] > 0 ){
			var start_date = moment().format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_ON_TIME'];
			var end_date = moment().add(1, 'day').format("YYYY-MM-DD")+" "+MASTER_DATA[IMEI_NO]['RTC_OFF_TIME'];
			var curr_time = moment().format("YYYY-MM-DD HH:mm:ss");
			var inschedule = in_schedule(curr_time, MASTER_DATA[IMEI_NO]['RTC_ON_TIME'], MASTER_DATA[IMEI_NO]['RTC_OFF_TIME']);
			
			console.log("CHECK SCHEDULE "+IMEI_NO+" "+inschedule);
			if( inschedule ){
				MASTER_DATA[IMEI_NO]['OFF_HITS'] = 0;
			}else{
				MASTER_DATA[IMEI_NO]['ON_HITS'] = 0;
			}
		}
		
		MASTER_DATA[IMEI_NO]['LAST_AMP_R'] = AMP_R;
		MASTER_DATA[IMEI_NO]['LAST_AMP_Y'] = AMP_Y;
		MASTER_DATA[IMEI_NO]['LAST_AMP_B'] = AMP_B;
		
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
		
		fx += lx; lx = 6;
		var TOTAL_KW = parseInt(d.substr(fx, lx), 16);
		//console.log('TOTAL KW '+TOTAL_KW);
		
		var TOTALLOAD_20 = MASTER_DATA[IMEI_NO]['TOTAL_LOAD'] * 0.2;
		if( MASTER_DATA[IMEI_NO]['REGISTERED'] > 0 ){
			if(TOTAL_KW > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20) && MASTER_DATA[IMEI_NO]['PREV_LOAD'] > (parseInt(MASTER_DATA[IMEI_NO]['TOTAL_LOAD']) + TOTALLOAD_20)){
				if(!MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME']){
					MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
					MASTER_DATA[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;
					
					connection.query('INSERT INTO '+TB_LOAD+' (imei_no, start_time, start_load) values ("'+IMEI_NO+'","'+MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME']+'", "'+MASTER_DATA[IMEI_NO]['PREV_LOAD']+'")',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT LOAD DATA OK "+results.insertId);
							MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'] = results.insertId;
						}
					});
				}
			}else{
				if(MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME']){
					var CURRENT_LOAD_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_LOAD+' SET end_time = "'+CURRENT_LOAD_TIME+'", end_load="'+TOTAL_KW+'" WHERE id='+MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'],
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("UPDATE LOAD DATA OK");
						}
					});
					MASTER_DATA[IMEI_NO]['PREV_LOAD_DBID'] = "";
					MASTER_DATA[IMEI_NO]['PREV_LOAD_TIME'] = "";
				}
			}
		}
		MASTER_DATA[IMEI_NO]['PREV_LOAD'] = TOTAL_KW;
		if( MASTER_DATA[IMEI_NO]['REGISTERED'] > 0 ){
			if(( VOLTAGE_R > VOLTAGE_LIMIT && MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_R'] > VOLTAGE_LIMIT ) || ( VOLTAGE_Y > VOLTAGE_LIMIT && MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_Y'] > VOLTAGE_LIMIT ) || ( VOLTAGE_B > VOLTAGE_LIMIT && MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_B'] > VOLTAGE_LIMIT ) ){
				if(!MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
					MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = moment().format("YYYY-MM-DD HH:mm:ss");
					
					connection.query('INSERT INTO '+TB_OVERVOLTAGE+' (imei_no, voltage_r, voltage_y, voltage_b, start_time, end_time) values ("'+IMEI_NO+'","'+MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_R']+'", "'+MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_Y']+'","'+MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_B']+'","'+MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME']+'", "'+END_TIME+'")',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK "+results.insertId);
							MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = results.insertId;
							//MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = '';
						}
					});
				}
			}else{
				if(MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME']){
					var END_TIME = moment().format("YYYY-MM-DD HH:mm:ss");
					connection.query('UPDATE '+TB_OVERVOLTAGE+' SET end_time="'+END_TIME+'" WHERE id="'+MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID']+'"',
					function selectCb(err, results, fields) {
						if (err) console.log(err);
						else{ 
							//console.log("INSERT OVERLOAD DATA OK");
						}
					});
					MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_DBID'] = "";
					MASTER_DATA[IMEI_NO]['PREV_OVERVOLTAGE_TIME'] = "";
				}
			}
		}
		MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_R'] = VOLTAGE_R;
		MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_Y'] = VOLTAGE_Y;
		MASTER_DATA[IMEI_NO]['PREV_VOLTAGE_B'] = VOLTAGE_B;
		
		fx += lx; lx = 6;
		var TOTAL_KVA = parseInt(d.substr(fx, lx), 16);
		
		fx += lx; lx = 2;
		var TOTAL_PF = parseInt(d.substr(fx, lx), 16);
		fx += lx; lx = 4;
		var FREQUENCY = parseInt(d.substr(fx, lx), 16);
		
		
		
		
		
		var now = new Date();
		var created_at = dateFormat(now, "isoDateTime");
		//console.log(created_at);
		
		var sql = "INSERT INTO "+TB_DEVICE_RECIEVED+" (imei_no, data_stamp, supply, battery, data, datalength, output_data, input_data, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, pf_r, pf_y, pf_b, kw_r, kw_y, kw_b, kva_r, kva_y, kva_b, kvar_r, kvar_y, kvar_b, kwh, kvah, kvarh, meter_no, meter_stamp, total_kw, total_kva, total_pf, frequency, io_stamp, output_status, update_time) values ('"+IMEI_NO+"','"+DATA_STAMP+"','"+SL_VOLTAGE+"','"+BT_VOLTAGE+"','"+ACTUAL_DATA+"','"+ACTUALDATALENGTH+"','"+OUTPUT_DATA+"','"+INPUT_DATA+"','"+VOLTAGE_R+"','"+VOLTAGE_Y+"','"+VOLTAGE_B+"','"+AMP_R+"','"+AMP_Y+"','"+AMP_B+"','"+PF_R+"','"+PF_Y+"','"+PF_B+"','"+KWR+"','"+KWY+"','"+KWB+"','"+KVAR+"','"+KVAY+"','"+KVAB+"','"+KVAR_R+"','"+KVAR_Y+"','"+KVAR_B+"','"+KWH+"','"+KVAH+"','"+KVARH+"','"+METER_NO+"','"+METER_RTC+"','"+TOTAL_KW+"','"+TOTAL_KVA+"','"+TOTAL_PF+"','"+FREQUENCY+"','"+IO_STAMP+"','"+OUTPUT1+"', NOW())";
		//console.log(sql);
		connection.query(sql, function selectCb(err, results, fields) {
			if (err){
				console.log(err);
			}else{ 
				console.log("INSERT DATA OK");
				connection.query("UPDATE "+TB_DEVICE_LASTDATA+" SET data_stamp='"+DATA_STAMP+"', supply='"+SL_VOLTAGE+"', battery='"+BT_VOLTAGE+"', data='"+ACTUAL_DATA+"', datalength='"+ACTUALDATALENGTH+"', output_data='"+OUTPUT_DATA+"', input_data='"+INPUT_DATA+"', voltage_r='"+VOLTAGE_R+"', voltage_y='"+VOLTAGE_Y+"', voltage_b='"+VOLTAGE_B+"', amp_r='"+AMP_R+"', amp_y='"+AMP_Y+"', amp_b='"+AMP_B+"', pf_r='"+PF_R+"', pf_y='"+PF_Y+"', pf_b='"+PF_B+"', kw_r='"+KWR+"', kw_y='"+KWY+"', kw_b='"+KWB+"', kva_r='"+KVAR+"', kva_y='"+KVAY+"', kva_b='"+KVAB+"', kvar_r='"+KVAR_R+"', kvar_y='"+KVAR_Y+"', kvar_b='"+KVAR_B+"', kwh='"+KWH+"', kvah='"+KVAH+"', kvarh='"+KVARH+"', meter_no='"+METER_NO+"', meter_stamp='"+METER_RTC+"', total_kw='"+TOTAL_KW+"', total_kva='"+TOTAL_KVA+"', total_pf='"+TOTAL_PF+"', frequency='"+FREQUENCY+"', io_stamp='"+IO_STAMP+"', output_status='"+OUTPUT1+"', update_time=NOW() WHERE imei_no = '"+IMEI_NO+"'",
				function selectCb(err, results, fields) {
					if (err) {
						console.log(err);
					}else{ 
						console.log("INSERT TRANS LAST DATA OK");
					}
				});
			}
		});   
    });
    sock.on('close', function(data) 
	{
        console.log('SOCKET CLOSING ');
		var idx = sockets.indexOf(this);
		if (idx != -1) 
		{
			sockets.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			sockets.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
		var idx = sockets.indexOf(this);
		if (idx != -1) {
			sockets.splice(idx,1);
		}
		console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
	});
	sock.setKeepAlive(true);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
server.listen(PORT, HOST);
function writeLog(IMEI_NO, DATA, TYPE){
	var d = new Date();
	var time = dateFormat(d, "isoDateTime");
	
	var file = d.getUTCFullYear()+"-"+(d.getUTCMonth() + 1)+"-"+(d.getUTCDate())+".txt";
	if(TYPE == "SCHEDULE"){
		file = "schedule_log.txt";
	}
	
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
server.on('connection', function(sock)
{
	console.log('SOCKET CONNECTION: ' + sock.remoteAddress +':'+ sock.remotePort);
	sockets.push(sock);
	
	var now = new Date();
	var newdate = dateFormat(now, "ddmmyyHHMMss");
	sock.write("RTC,"+newdate);
		
	console.log('TOTAL NUMBER OF CONNECTIONS: '+sockets.length);
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PORT + ' '+ST);

function Pad (str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
}



function in_schedule(curr_time,start_time,end_time){
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
	return false;
}