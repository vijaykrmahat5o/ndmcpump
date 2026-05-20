var express = require('express');
var router = express.Router();
var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');
const { DateTime, Settings } = require("luxon");
Settings.defaultZone = "Asia/Kolkata"; 


var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'ndmcwater_user',
    password:'ndmcwater_pass',
    database: 'ndmcwater_db',
    multipleStatements: true,
    dateStrings: [
      'DATE',
      'DATETIME'
    ]
});
var import_data = [];
var import_result = [];
var import_index = 0;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express WMS' });
});
var AREACODES = {
	"ndmc" : 1,
	"jodhpur" : 2
}

function checkAuth(req, res, next) {
  if (!req.body.accesskey) {
	var mess = {'error':1,'message':'Unauthorised Access!','result':0};
	res.send(JSON.stringify(mess));
  } else {
  	var accesskey = req.body.accesskey;

	  	pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query('SELECT u.id,u.group_id, u.permissions from users u WHERE u.access_key = "'+accesskey+'"', function (error, rows, fields) {
				  	connection.release();

				  	if (error) {
				  		console.log(error);
						var mess = {'error':1,'message':'Database issue. please login again!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
						if(rows.length > 0){
							req.user_id = rows[0].id;
							req.group_id = rows[0].group_id;
							req.permissions = JSON.parse(rows[0].permissions);
							next();
						}else{
							var mess = {'error':2,'message':'Session Timeout. For security reason, please login again!','result':0};
							res.send(JSON.stringify(mess));
						}
					}
				})
			}
	 	});
	}

}
router.get('/api/test', function(req, res, next) {
	/*var sql1 = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no;";
	var sql2 = "SELECT IFNULL(tld.on_off_status, '') as on_off_status, IFNULL(tld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id;"
	conn.query(sql1+sql2, function (error, results, fields) {
	  	if (error) {
	  		console.log(error);
	  	}
	  	var o = {'devices': results[0], 'controllers': results[1]};
	 	var mess = {'error':0,'message':'Master devices!','result':o};
		res.send(JSON.stringify(mess));
	})*/
	const path = require('path');
	console.log(path.join(__dirname, '../public'));
	var imeino = '869247044265780';//req.body.imeino;
	if(imeino != ''){
		var unique_id = new Date().getTime();
		var date = '02-06-2020';
		var tmppath = path.join(__dirname, '../public/exports/report-ulb-'+date+'-'+unique_id+'.csv');
		var filepath = tmppath.replace(/\\/g, "/");
		
		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, output_status FROM device_received_data WHERE imei_no='"+imeino+"' INTO OUTFILE '"+filepath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':''};
				res.send(JSON.stringify(mess));
			}else{
				var insertq = {
					user_id: user_id,
					tyep: 'Device Report',
					report_id: imeino,
					records: results.affectedRows - 1,
					status: '1'
				}
				var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
			
				conn.query(sql, insertq, function (err, rows, fields) {
					if (err) {
						console.log(err);
						var mess = {'error':1,'message':'Error in Export Database!','result':''};
						res.send(JSON.stringify(mess));
					}else{
						var mess = {'error':0,'message':'Device records!','result':''};
						res.send(JSON.stringify(mess));
					}
				}) 
			}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}
});

router.post('/dashboard-zones', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var group_id = req.group_id;
	var devicetype = 'PUMPS';
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			var sql = '';
			console.log('DATA TYPE : '+devicetype);
			if(devicetype == 'LEVELS' || devicetype == 'waterlevel'){
				console.log('Step01');
				sql = "SELECT ml.id, ml.imei_no, ml.uniq_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.location_type, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max, tld.status as data_status FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no where ml.group_id='"+group_id+"' ORDER BY ml.insert_time DESC;";
			}else{
				/* Dashboard COMON */ 
				console.log('Step02');
				sql = "SELECT ml.id, ml.zone, ml.subzone, z.short_title, tld.sl_voltage, tld.status as data_status, IFNULL(tld.update_time, '') as update_time, tld.inputs, tld.outputs,IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude,ml.location FROM master_pumps as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no LEFT JOIN zones z ON z.id=ml.zone ORDER BY ml.insert_time DESC;";
				
				
				
			}
			sql+= "SELECT ml.id, ml.imei_no, ml.uniq_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.location_type, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max, tld.status as data_status FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no where ml.group_id='"+group_id+"' ORDER BY ml.insert_time DESC;";
			sql += "SELECT id, title, short_title, code areacode FROM zones WHERE status = 1;";
			sql += "SELECT * FROM subzones WHERE status = 1;";
			connection.query(sql, function (error, results, fields) {
				connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {'devices': results[0],'tanks': results[1], 'zones': results[2], 'subzones': results[3]};
			 	var mess = {'error':0,'message':'Device Records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/devices', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var devicetype = req.body.devicetype;
	var areacode = req.body.areacode;

	if(AREACODES[areacode] !== undefined){
	var zone = AREACODES[areacode];
	
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			var sql = '';
			console.log('DATA TYPE : '+devicetype);
			if(devicetype == 'LEVELS' || devicetype == 'waterlevel'){
				sql = "SELECT ml.id, ml.zone, ml.imei_no, ml.uniq_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.location_type, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max, tld.status as data_status, tld.auto,tld.manual,tld.trip FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no ORDER BY ml.insert_time DESC;";
			}else{
				/* PUMP DATA  SELECT */ 
				/* sql = "SELECT ml.id, ml.zone, ml.subzone, ml.imei_no, ml.station_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_imei_no,ml.flow_imei_no,ml.min_flow,ml.max_flow,ml.min_voltage,ml.min_pressure,ml.max_pressure,ml.min_voltage_pressure,ml.instrument, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, tld.status as data_status, tld.inputs, tld.outputs FROM master_pumps as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.status=1 AND zone = "+zone+" ORDER BY ml.insert_time DESC;"; */

				sql = "SELECT mp.id, mp.zone, mp.subzone, mp.imei_no, mp.station_no, mp.mobile_no, mp.device_no, mp.location,mp.meter_type, IFNULL(mp.longitude, 1) as longitude, IFNULL(mp.latitude, 1) as latitude, mp.tank_imei_no,mp.flow_imei_no,mp.min_flow,mp.max_flow,mp.min_voltage,mp.min_pressure,mp.max_pressure,mp.min_voltage_pressure,mp.instrument, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, tld.status as data_status, tld.inputs, tld.outputs,ml.location as tank_location,tld.auto,tld.manual,tld.trip FROM master_pumps as mp LEFT JOIN trans_last_data as tld ON tld.imei_no = mp.imei_no LEFT JOIN master_location as ml on(ml.imei_no=mp.tank_imei_no) WHERE mp.status=1 AND zone = "+zone+" ORDER BY tld.update_time DESC;";
				

			}
			sql += "SELECT * FROM zones WHERE status = 1;";
			sql += "SELECT * FROM subzones WHERE status = 1;";
			sql += "SELECT * FROM meter_type WHERE status = 1;";
			connection.query(sql, function (error, results, fields) {
				connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
				if(results.length>0){
					var o = {'devices': results[0], 'zones': results[1], 'subzones': results[2],'meter_type': results[3]};
					var mess = {'error':0,'message':'Device Records!','result':o};
					res.send(JSON.stringify(mess));
				}else{
					//var o = {'devices': [], 'zones': results[1], 'subzones': results[2],'meter_type': results[3]};
					var mess = {'error':0,'message':'Device Records!','result':[]};
					res.send(JSON.stringify(mess));
					
				}
			})
		}
	});
	}else{
		
		var mess = {'error':0,'message':'Device Records!','result':[]};
		res.send(JSON.stringify(mess));
		
	
	}
});

router.post('/device-list', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var devicetype = req.body.devicetype;
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			var sql = '';
			console.log('DATA TYPE : '+devicetype);
			if(devicetype == 'LEVELS' || devicetype == 'waterlevel'){
				sql = "SELECT ml.id, ml.imei_no, ml.uniq_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.location_type, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max, tld.status as data_status FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no ORDER BY ml.insert_time DESC;";
			}else{
				sql = "SELECT ml.imei_no, ml.subzone, ml.location FROM master_pumps as ml ORDER BY ml.location ASC;";
			}
			sql += "SELECT * FROM zones WHERE status = 1;";
			sql += "SELECT * FROM subzones WHERE status = 1;";
			connection.query(sql, function (error, results, fields) {
				connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {'devices': results[0], 'zones': results[1], 'subzones': results[2]};
			 	var mess = {'error':0,'message':'Device Records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/device-data', checkAuth, function(req, res, next) {
	var imei_no = req.body.imeino;
	
	var sql = 'SELECT ml.imei_no, ml.uniq_no, ml.mobile_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, "") as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.imei_no="'+imei_no+'";';
	sql += 'SELECT * FROM trans_received_data WHERE imei_no="'+imei_no+'" ORDER BY trans_id DESC LIMIT 100;';
	//sql += "select imei_no,location from master_pumps WHERE tank_imei_no='"+imei_no+"'";

	sql +="SELECT ml.id, ml.zone, ml.subzone, ml.imei_no, ml.station_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_imei_no,ml.flow_imei_no,ml.min_flow,ml.max_flow,ml.min_voltage,ml.min_pressure,ml.max_pressure,ml.min_voltage_pressure,ml.instrument, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, tld.status as data_status, tld.inputs, tld.outputs FROM master_pumps as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.status=1 AND ml.tank_imei_no = '"+imei_no+"';";



	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
				if(results.length>0){
			  	var o = {'livedata': results[0][0], 'records': results[1],mapped_pump_list:results[2]};
			 	var mess = {'error':0,'message':'Device data!','result':o};
				res.send(JSON.stringify(mess));
				}else{
					//var o = {'livedata': [], 'records': [],mapped_pump_list:[]};
			 	var mess = {'error':0,'message':'Device data!','result':[]}; 
				res.send(JSON.stringify(mess));
					
				}
			})
		}
	});
});
/* ******** REPORT ************  */
router.post('/device-records', checkAuth, function(req, res, next) {
	var imei_no = req.body.imeino;
	var date_from = req.body.datefrom;
	var date_to = req.body.dateto;
	
	var sql = 'SELECT ml.imei_no, ml.uniq_no, ml.mobile_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, "") as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.imei_no="'+imei_no+'";';
	//sql += 'SELECT trans_id, sl_voltage, data_stamp, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, frequency, pf_r, pf_y, pf_b, kwh, inputs, outputs, insert_time,analoginput FROM trans_received_data WHERE imei_no = "'+imei_no+'" AND DATE(insert_time) >="'+date_from+' 00:00:00" AND DATE(insert_time) < "'+date_to+' 23:59:59" ORDER BY trans_id DESC;';
	
	sql+='SELECT t1.trans_id, t1.sl_voltage, t1.data_stamp, t1.voltage_r, t1.voltage_y, t1.voltage_b, t1.amp_r, t1.amp_y, t1.amp_b, t1.frequency, t1.pf_r, t1.pf_y, t1.pf_b, t1.kwh, t1.inputs, t1.outputs, t1.insert_time, t1.analoginput, ( SELECT t2.analoginput FROM trans_received_data t2 WHERE t2.trans_id < t1.trans_id AND t2.imei_no = t1.imei_no ORDER BY t2.trans_id DESC LIMIT 1 ) AS previous_analoginput FROM trans_received_data t1 WHERE t1.imei_no = "'+imei_no+'" AND DATE(t1.insert_time) >= "'+date_from+' 00:00:00" AND DATE(t1.insert_time) <= "'+date_to+' 23:59:59" AND NOT ( t1.sl_voltage = 120 AND t1.analoginput = 0 AND ( SELECT t2.analoginput FROM trans_received_data t2 WHERE t2.trans_id < t1.trans_id AND t2.imei_no = t1.imei_no ORDER BY t2.trans_id DESC LIMIT 1 ) > 0 ) ORDER BY t1.trans_id DESC;';
	
	
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {'livedata': results[0][0], 'records': results[1]};
			 	var mess = {'error':0,'message':'Device data!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/detail-report', checkAuth, function(req, res, next) {
	var imei_no = req.body.imeino;
	var date_from = req.body.datefrom;
	var date_to = req.body.dateto;
	
	var sql = 'SELECT trans_id, sl_voltage, data_stamp, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, frequency, pf_r, pf_y, pf_b, kwh, inputs, outputs, insert_time FROM trans_received_data WHERE imei_no = "'+imei_no+'" AND DATE(insert_time) > "'+date_from+' 00:00:00" AND DATE(insert_time) < "'+date_to+' 23:59:59" ORDER BY trans_id DESC;';
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {'records': results};
			 	var mess = {'error':0,'message':'Device records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/daily-operational-report', checkAuth, function(req, res, next) {
	var date_from = req.body.datefrom;
	
	var sql = 'SELECT mp.location, rp.* FROM report_operation rp LEFT JOIN master_pumps mp ON mp.imei_no=rp.imei_no WHERE DATE(rp.operation_date) = "'+date_from+'" ORDER BY mp.location ASC;';
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {'records': results};
			 	var mess = {'error':0,'message':'Device records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/individual-operational-report', checkAuth, function(req, res, next) {
	var imei_no = req.body.imeino;
	var date_from = req.body.datefrom;
	var date_to = req.body.dateto;
	
	var sql = 'SELECT rp.* FROM report_operation rp WHERE DATE(rp.operation_date) >= "'+date_from+'" AND DATE(rp.operation_date) <= "'+date_to+'" AND rp.imei_no = "'+imei_no+'" ORDER BY rp.id ASC;';
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {'records': results};
			 	var mess = {'error':0,'message':'Device records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/level-list', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var group_id = req.body.group_id;
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			var sql = "SELECT ml.id, ml.imei_no, ml.location FROM master_location as ml WHERE ml.group_id="+group_id+" ORDER BY ml.insert_time DESC;";
			connection.query(sql, function (error, results, fields) {
				connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {'devices': results};
			 	var mess = {'error':0,'message':'Device Records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});


/* ******** REPORT  END ************  */

router.post('/pump-data', checkAuth, function(req, res, next) {
	var station_no = req.body.station_no;
	
	var sql = 'SELECT ml.imei_no, ml.mobile_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_imei_no, tld.voltage_r, tld.voltage_y, tld.voltage_b, IFNULL(tld.amp_r, 0) as amp_r,  IFNULL(tld.amp_y, 0) as amp_y,  IFNULL(tld.amp_b, 0) as amp_b, tld.kwh, tld.sl_voltage, tld.io_stamp, tld.data_stamp, IFNULL(tld.update_time, "") as update_time, tld.inputs, tld.outputs, tld.auto, tld.manual,tld.trip FROM master_pumps as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.station_no="'+station_no+'";';
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query(sql, function (error, results, fields) {
					connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	
			  	var o = {};
			  	/*console.log(results[0]['tank_imei_no']);
			  	if(results[0]['tank_imei_no'] != null){
			  	    var sql = 'SELECT ml.imei_no, ml.uniq_no, ml.mobile_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_height, tld.sl_voltage, IFNULL(tld.update_time, "") as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.imei_no="'+results[0]['tank_imei_no']+'";';
			  	    
			  	    	
        			connection.query(sql, function (error2, results2, fields2) {
        				connection.release();
        
        			  	if (error2) {
        			  		console.log(error2);
        			  	}
        			  	o = {'livedata': results[0], 'leveldata':results2[0], 'records': []};
        			  	
        			  	var mess = {'error':0,'message':'Pump data!','result':o};
				        res.send(JSON.stringify(mess));
        			});
			  	}else{*/
			  	  o = {'livedata': results[0], 'leveldata':[], 'records': []};
			  	
			  	  var mess = {'error':0,'message':'Pump data!','result':o};
				    res.send(JSON.stringify(mess));
			  	//}
			})
		}
	});
});

/* router.post('/add-location', checkAuth, async function(req, res, next) {
	var insertdata = req.body.data;
//	console.log("INSERT LOCATION "+JSON.stringify(insertdata));
	if(insertdata.imei_no != ''){
		//var sql = "INSERT INTO master_device (imei_no, uniq_no, mobile_no, device_no, insert_time) VALUES ('"+insertdata.imei_no+"', '"+insertdata.uniq_no+"', '"+insertdata.mobile_no+"', '"+insertdata.device_no+"', NOW());";

		sql = "INSERT INTO master_location (imei_no, uniq_no, mobile_no, device_no, location, latitude, longitude, location_type, tank_height, sensor_height, level_min, level_max, insert_time) VALUES ('"+insertdata.imei_no+"', '"+insertdata.uniq_no+"', '"+insertdata.mobile_no+"', '"+insertdata.device_no+"', '"+insertdata.location+"', '"+insertdata.latitude+"', '"+insertdata.longitude+"', '"+insertdata.location_type+"', '"+JSON.stringify(insertdata.tank_height)+"', "+insertdata.sensor_height+", "+insertdata.level_min+", "+insertdata.level_max+", NOW());";

		sql += "INSERT INTO trans_last_data (imei_no, status, update_time) VALUES ('"+insertdata.imei_no+"', 0, NOW());";


		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':sql};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Location Added Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
}); */
/* router.post('/update-location', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	console.log("UPDATE LOCATION "+JSON.stringify(updatedata));
	if(updatedata.imei_no != ''){
	//	var sql1 = "UPDATE master_device SET imei_no='"+updatedata.imei_no+"', mobile_no='"+updatedata.mobile_no+"', device_no='"+updatedata.device_no+"' WHERE uniq_no='"+updatedata.uniq_no+"';";

		var sql = "UPDATE master_location SET imei_no='"+updatedata.imei_no+"', mobile_no='"+updatedata.mobile_no+"', device_no='"+updatedata.device_no+"', location_type='"+updatedata.location_type+"', location='"+updatedata.location+"', longitude='"+updatedata.longitude+"', latitude='"+updatedata.latitude+"', tank_height='"+JSON.stringify(updatedata.tank_height)+"', sensor_height="+updatedata.sensor_height+", level_min="+updatedata.level_min+", level_max="+updatedata.level_max+" WHERE uniq_no='"+updatedata.uniq_no+"';";

		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Device Updated Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
}); 
router.post('/delete-location', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM trans_last_data WHERE imei_no=(SELECT imei_no FROM master_location WHERE id='"+deleteid+"');";
		
		sql += "DELETE FROM master_location WHERE id='"+deleteid+"';";
		
		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Record deleted!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
*/



router.post('/add-pump', checkAuth, async function(req, res, next) {
	var insertdata = req.body.data;

	//console.log(JSON.stringify(insertdata));
	//return false;

	if(insertdata.imei_no != ''){ 
		/* sql = "INSERT INTO master_pumps (imei_no, station_no, zone, subzone, mobile_no, device_no, location, latitude, longitude,meter_type,insert_time) VALUES ('"+insertdata.imei_no+"', '"+insertdata.station_no+"', "+insertdata.zone+", "+insertdata.subzone+", '"+insertdata.mobile_no+"', '"+insertdata.device_no+"', '"+insertdata.location+"', '"+insertdata.latitude+"', '"+insertdata.longitude+"','"+insertdata.meter_type+"', NOW());"; */


		var insertq = {
			imei_no:insertdata.imei_no,
			station_no: insertdata.station_no,
			zone: insertdata.zone,
			subzone: insertdata.subzone,
			mobile_no: insertdata.mobile_no,
			device_no: insertdata.device_no,
			location: insertdata.location,		  
			latitude: insertdata.latitude,
			longitude:insertdata.longitude,
			meter_type:insertdata.meter_type
		  };

		  if(insertdata.instrument.length>0){
			
			insertdata.instrument.forEach(item=>{
				
				//console.log('item::'+item);
				if(item=='flowmeter'){
					this.showFlowmeter=true;
					//insertq.flow_imei_no = insertdata.flow_imei_no;
					insertq.flow_imei_no = insertdata.imei_no;
					insertq.min_flow = insertdata.min_flow;
					insertq.max_flow = insertdata.max_flow;
					insertq.min_voltage = insertdata.min_voltage;
					insertq.min_pressure = insertdata.min_pressure;
					insertq.max_pressure = insertdata.max_pressure;
					insertq.min_voltage_pressure = insertdata.min_voltage_pressure;

				}
			});
			insertq.instrument = JSON.stringify(insertdata.instrument);
			
		  }
			
		  console.log(insertq);

		var sql = "INSERT INTO master_pumps SET ? , insert_time = NOW();";

		sql += "INSERT INTO trans_last_data (imei_no, status, update_time) VALUES ('"+insertdata.imei_no+"', 0, NOW());";

		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, insertq, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':sql};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Pump Added Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/update-pump', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	console.log("UPDATE PUMP "+JSON.stringify(updatedata));
	if(updatedata.imei_no != ''){

		var updateq = {
			station_no: updatedata.station_no
		};
		if(updatedata.new_imei_no != ''){
			if(!empty(updatedata.new_imei_no)){
				updateq.imei_no = updatedata.new_imei_no;
				updateq.last_modem_no = updatedata.imei_no;
			}

			
		}
		
		if(!empty(updatedata.new_mobile_no)){
			updateq.mobile_no = updatedata.new_mobile_no;
			updateq.last_mobile_no = updatedata.mobile_no;
		}
	

		if(!empty(updatedata.device_no)){
			updateq.device_no = updatedata.device_no;
		}
		if(!empty(updatedata.location)){
			updateq.location = updatedata.location;
		}
		if(!empty(updatedata.longitude)){
			updateq.longitude = updatedata.longitude;
		}
		if(!empty(updatedata.latitude)){
			updateq.latitude = updatedata.latitude;
		}
		if(!empty(updatedata.meter_type)){
			updateq.meter_type = updatedata.meter_type;
		}

		var sql = "UPDATE master_pumps SET ? WHERE id=?;";

		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, [updateq, updatedata.id], function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Pump Updated Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/delete-pump', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM trans_last_data WHERE imei_no=(SELECT imei_no FROM master_pumps WHERE id='"+deleteid+"');";
		
		sql += "DELETE FROM master_pumps WHERE id='"+deleteid+"';";
		
		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Record deleted!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});



router.post('/bulk-import', async function(req, res, next) {
	const fs = require('fs');
	const csv = require('csv-parser');

	console.log('----- CHECK UPLOAD PUMP IMPORT CSV  AUTHENTICATION ----- ' );

	import_data = [];
	import_result = [];
	import_index = 0;
    
  var user_id = req.user_id;
    
  if (!req.files || Object.keys(req.files).length === 0) {
    req.upload_csv = '';
    console.log('No CSV File');
    var mess = {'error':1,'message':'No Upload Files!','result':0};
		res.send(JSON.stringify(mess));
    //next();
  }else{
    var csvfile = req.files.csvfile;
    if(!empty(csvfile)){
          fs.createReadStream(csvfile.tempFilePath)
	    .pipe(csv())
	    .on('data', (data) => {
	    	console.log('>>>>'+data.station_no+' '+data.imei_no.toString()+' '+data.mobile_no);
	    	
	    	if(!empty(data.station_no)){
	    		import_data.push(data);	
		    }
	    })
	    .on('end', async () => {
	    	console.log("END");

	    	import_index = 0;
	    	console.log("IMPORT DATA LENGTH "+import_data.length);
				insertdevice(req,res);
	    });
    }else{
      req.upload_csv = '';
      console.log('No CSV File format');
      var mess = {'error':1,'message':'Failed!','result':0};
			res.send(JSON.stringify(mess));
    }
  }
});

function insertdevice(req,res){
	const fs = require('fs');
	
	if(import_index < import_data.length){
		var data = import_data[import_index];
		import_index++;

		if(data.mobile_no == 0){
			import_result.push({'station_no':data.station_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Missing Mobile Number'});
			insertdevice(req,res);
		}else{
			pool.getConnection(function(err, connection) {
				if (err){
					console.log(err);
				}else{
					var sql = "SELECT * from master_pumps WHERE imei_no=? OR mobile_no=?";

					connection.query(sql, [data.imei_no, data.mobile_no], function (error, result) {
					  	if (error) {
					  		connection.release();
					  		console.log(error);
					  		import_result.push({'station_no':data.station_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Connection Error'});
					  		insertdevice(req,res);
					  	}
					  	if(result.length > 0) {
					  		connection.release();
					  		import_result.push({'station_no':data.station_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Allready Exist'});
					  		insertdevice(req,res);
					  	}else{

								var pump = {
									station_no: data.station_no,
									zone: data.zone,
									subzone: data.subzone,
									imei_no: data.imei_no,
									mobile_no: data.mobile_no,
									location: data.location,
									longitude: data.longitude,
									latitude: data.latitude
								}
								if(!empty(data.device_no)){
									pump.device_no= data.device_no;
								}
								if(!empty(data.last_modem_no)){
									pump.last_modem_no= data.last_modem_no;
								}
								if(!empty(data.last_mobile_no)){
									pump.last_mobile_no= data.last_mobile_no;
								}
								if(!empty(data.upper_limit_current_r)){
									pump.upper_limit_current_r= data.upper_limit_current_r;
								}
								if(!empty(data.upper_limit_current_y)){
									pump.upper_limit_current_y= data.upper_limit_current_y;
								}
								if(!empty(data.upper_limit_current_b)){
									pump.upper_limit_current_b= data.upper_limit_current_b;
								}
								if(!empty(data.lower_limit_voltage_r)){
									pump.lower_limit_voltage_r= data.lower_limit_voltage_r;
								}
								if(!empty(data.lower_limit_voltage_y)){
									pump.lower_limit_voltage_y= data.lower_limit_voltage_y;
								}
								if(!empty(data.lower_limit_voltage_b)){
									pump.lower_limit_voltage_b= data.lower_limit_voltage_b;
								}
								if(!empty(data.upper_limit_voltage_r)){
									pump.upper_limit_voltage_r= data.upper_limit_voltage_r;
								}
								if(!empty(data.upper_limit_voltage_y)){
									pump.upper_limit_voltage_y= data.upper_limit_voltage_y;
								}
								if(!empty(data.upper_limit_voltage_b)){
									pump.upper_limit_voltage_b= data.upper_limit_voltage_b;
								}
								
								var sql = "INSERT INTO master_pumps SET ?, insert_time=NOW();";

								sql += "INSERT INTO trans_last_data (imei_no) VALUES ('"+data.imei_no+"');";

								connection.query(sql, pump, function (err, result) {
									connection.release();
							  	if (err) {
							  		import_result.push({'station_no':data.station_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Insert Error'});
							  	}else{
							  		import_result.push({'station_no':data.station_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Added Successfully'});
							  	}
							  	insertdevice(req,res);
								})
					  	}
					});
				}
			});
		}
		
	}else{
		const { convertArrayToCSV } = require('convert-array-to-csv');
		const csv = convertArrayToCSV(import_result);
		var mess = {'error':1,'message':'CSV!','result':csv, 'len': import_result.length};
		res.send(csv);
	}
}










































/************************************************* CCMS METHODS START *****************************************/

router.post('/api/masterdevices', checkAuth, function(req, res, next) {
	/*var sql = "SELECT md.id, md.imei_no, md.state_id, md.zone_id, (SELECT title from master_zone WHERE id = md.zone_id) as zone_title, md.ulb_id, md.feeder_piller_no, count(mc.unique_id) as connections, md.ward_no, md.ccms_no, mz.title as ulb_title, md.total_load, md.no_of_poles, md.no_of_fittings, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_controller as mc ON md.imei_no = mc.imei_no LEFT JOIN master_zone as mz ON md.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no";*/

	var sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no;";


	conn.query(sql, function (err, results, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	var mess = {'error':0,'message':'Master devices!','result':results[0]};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/master-reload', checkAuth, function(req, res, next) {
	var sql = "SELECT "+
		"md.id, "+
		"md.imei_no, "+
		"md.feeder_piller_no, "+
		"total_connections, "+
		"md.ward_no, "+
		"md.ccms_no, "+
		"IFNULL(mz.location, '') as zone_location, "+
		"md.total_load, "+
		"md.no_of_poles, "+
		"md.no_of_fittings, "+
		"IFNULL(dld.total_kw, '') as total_kw, "+
		"IFNULL(dld.supply, '') as supply, "+
		"dld.data_stamp, "+
		"IFNULL(dld.update_time, '') as update_time, "+
		"dld.door_status, "+
		"dld.output_status "+
		"FROM master_device as md "+
		"LEFT JOIN master_controller as mc "+
		"ON md.imei_no = mc.imei_no "+
		"LEFT JOIN master_zone as mz "+
		"ON md.zone_id = mz.id "+
		"LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld "+
		"ON dld.imei_no=md.imei_no "+
		"GROUP BY md.imei_no";

	conn.query(sql, function (err, rows, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	var mess = {'error':0,'message':'Master devices!','result':rows};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/device-ulbs', checkAuth, function(req, res, next) {
	var ulbcode = req.body.ulbcode;
	/*var sql = "SELECT md.id, md.imei_no, md.state_id, md.zone_id, (SELECT title from master_zone WHERE id = md.zone_id) as zone_title, md.ulb_id, md.feeder_piller_no, count(mc.unique_id) as connections, md.ward_no, md.ccms_no, mz.title as ulb_title, md.total_load, md.no_of_poles, md.no_of_fittings, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_controller as mc ON md.imei_no = mc.imei_no LEFT JOIN master_zone as mz ON md.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no";*/

/*var sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, mz.title as location, dld.total_kw, dld.output_status, dld.data_stamp, ml.maintenance, dld.update_time "+
"FROM master_device AS md "+
"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
"WHERE mz.areacode = '"+ulbcode+"'";*/

var perms = req.permissions;
console.log('PERMISSION STATE: '+perms.state_perm);
var sql = '';
if(!empty(perms.state_perm)){
	sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, COALESCE(dld.total_kw, 0) total_kw, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
"FROM master_device AS md "+
"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
"WHERE mz.areacode = '"+ulbcode+"' AND ml.state_id='"+perms.state_perm+"';";
sql += "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"' AND state='"+perms.state_perm+"';";
}else{
	sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, COALESCE(dld.total_kw, 0) total_kw, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
"FROM master_device AS md "+
"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
"WHERE mz.areacode = '"+ulbcode+"';";
sql += "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"';";
}





	conn.query(sql, function (err, results, fields) {
	  	if (err) {
	  		console.log(err);
		}
		var o = {};
		o.ulb_devices = results[0];
		o.zoneinfo = results[1][0]; 
	 	var mess = {'error':0,'message':'Master devices!','result':o};
		res.send(JSON.stringify(mess));
	})
});

router.post('/api/device-insert', checkAuth, async function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.imei_no != '' && insertdata.imei_no.length == 15){
		var sql = "INSERT INTO master_device (imei_no, feeder_pillar_no, mobile_no, device_type, device_no, insert_time) VALUES ('"+insertdata.imei_no+"', '"+insertdata.feeder_pillar_no+"', '"+insertdata.mobile_no+"', '"+insertdata.device_type+"', '"+insertdata.device_no+"', NOW());";

		sql += "INSERT INTO master_location (feeder_pillar_no, state_id, zone_id, ulb_id, ward_no, total_load, total_connection, no_of_poles, no_of_fittings, location, location_lat, location_lng) VALUES ('"+insertdata.feeder_pillar_no+"', '"+insertdata.state_id+"', '"+insertdata.zone_id+"', '"+insertdata.ulb_id+"', '"+insertdata.ward_no+"', '"+insertdata.total_load+"', '"+insertdata.total_connection+"', '"+insertdata.no_of_poles+"', '"+insertdata.no_of_fittings+"', '"+insertdata.location+"', '"+insertdata.location_lat+"', '"+insertdata.location_lng+"');";

		sql += "INSERT INTO device_last_data (imei_no) VALUES ('"+insertdata.imei_no+"');";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		var mess = {'error':0,'message':'Device Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		  	}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
router.post('/api/device-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.imei_no != ''){
		var sql1 = "UPDATE master_device SET feeder_pillar_no='"+updatedata.feeder_pillar_no+"', mobile_no='"+updatedata.mobile_no+"', device_type='"+updatedata.device_type+"', device_no='"+updatedata.device_no+"' WHERE imei_no='"+updatedata.imei_no+"';";

		var sql2 = "UPDATE master_location SET state_id='"+updatedata.state_id+"', zone_id='"+updatedata.zone_id+"', ulb_id='"+updatedata.ulb_id+"', feeder_pillar_no='"+updatedata.feeder_pillar_no+"', ward_no='"+updatedata.ward_no+"', total_load='"+updatedata.total_load+"', no_of_poles='0', no_of_fittings='"+updatedata.no_of_fittings+"', location='"+updatedata.location+"', location_lat='"+updatedata.location_lat+"', location_lng='"+updatedata.location_lng+"' WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";

		conn.query(sql1+sql2, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Device Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/device-delete', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM master_location WHERE feeder_pillar_no=(SELECT feeder_pillar_no FROM master_device WHERE id='"+deleteid+"');";
		sql += "DELETE FROM device_last_data WHERE imei_no=(SELECT imei_no FROM master_device WHERE id='"+deleteid+"');";
		sql += "DELETE FROM master_device WHERE id='"+deleteid+"';";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Record deleted!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
router.post('/api/device-maintenance', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.feeder_pillar_no != ''){
		var sql = "UPDATE master_location SET maintenance='"+updatedata.maintenance+"' WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Device Maintenance Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Maintenance Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});

/************************************************* CCMS METHODS END *****************************************/

/************************************************* CONTROLLER METHODS START *****************************************/

router.post('/api/controllers', checkAuth, function(req, res, next) {
	var feederno = req.body.feederno;
	var sql = "SELECT mc.unique_id, mc.location, IFNULL(cld.pwm, '') as pwm, IFNULL(cld.on_off_status, '') as on_off_status, IFNULL(cld.current, '') as current, IFNULL(cld.voltage, '') as voltage, IFNULL(cld.kwh, '') as kwh, IFNULL(cld.pf, '') as pf, IFNULL(cld.load_kw, '') as load_kw, IFNULL(cld.light_on_hours, '') as light_on_hours, cld.data_stamp, mc.status, IFNULL(cld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN controller_last_data as cld ON cld.unique_id = mc.unique_id WHERE mc.feeder_pillar_no='"+feederno+"'";

	conn.query(sql, function (err, rows, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	var mess = {'error':0,'message':'Controller list!','result':rows};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/controller-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	var feederno = req.body.feederno;
	if(feederno != ''){
		var sql1 = "INSERT INTO master_controller (unique_id, feeder_pillar_no, location, status, insert_time) VALUES ('"+insertdata.unique_id+"', '"+feederno+"', '"+insertdata.location+"', '"+insertdata.status+"', NOW());";

		var sql2 = "UPDATE master_location SET total_connection=(SELECT count(unique_id) as total FROM master_controller WHERE feeder_pillar_no='"+feederno+"') WHERE feeder_pillar_no='"+feederno+"';";

		conn.query(sql1+sql2, function (err, results, fields) {
		  	if (err) {
		  		var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		var mess = {'error':0,'message':'Controller Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		  	}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
router.post('/api/controller-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	var feederno = req.body.feederno;
	if(feederno != ''){
		var sql1 = "UPDATE master_controller SET location='"+updatedata.location+"', status='"+updatedata.status+"' WHERE unique_id='"+updatedata.unique_id+"' AND feeder_pillar_no='"+feederno+"';";

		conn.query(sql1, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Controller Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/controller-delete', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	var feederno = req.body.feederno;
	if(deleteid != ''){
		var sql1 = "DELETE FROM master_controller WHERE unique_id='"+deleteid+"';";
		var sql2 = "UPDATE master_location SET total_connection=(SELECT count(unique_id) as total FROM master_controller WHERE feeder_pillar_no='"+feederno+"') WHERE feeder_pillar_no='"+feederno+"';";

		conn.query(sql1+sql2, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Record deleted!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/controller-data', checkAuth, function(req, res, next) {
	var uniqueid = req.body.uniqueid;
	if(uniqueid != ''){
		var sql = "SELECT unique_id, pwm, on_off_status, current, voltage, kwh, pf, load_kw, light_on_hours, data_stamp, update_time FROM controller_last_data WHERE unique_id='"+uniqueid+"' LIMIT 50";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});



/************************************************* CONTROLLER METHODS END *****************************************/


/*router.post('/api/zone-record', checkAuth, function(req, res, next) {
	var imeino = req.body.imeino;
	if(imeino != ''){
		var sql = "SELECT * FROM master_zone ORDER BY title ASC";

		var finalarr = [];
		conn.query(sql, function (error, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Zone records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});*/

/************************************************* ZONE METHODS START *****************************************/

router.post('/api/zone-list', checkAuth, function(req, res, next) {
	var sql = "SELECT * FROM master_zone";

	conn.query(sql, function (error, results, fields) {
	  	if (error) {
	  		console.log(error);
	  	}

	  	var mess = {'error':0,'message':'Zone records!','result':results};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/zone-record', checkAuth, function(req, res, next) {
	var sql = "SELECT *, '' as uib FROM master_zone WHERE parent = 0 ORDER BY title ASC";

	var finalarr = [];
	conn.query(sql, function (error, results, fields) {
	  	if (error) {
	  		console.log(error);
	  	}

	  	results.forEach(row => { 
			var sql2 = "SELECT id, state, '"+row.title+"' as title, title as ulb, areacode, location, parent, zoom, on_time, off_time, status FROM master_zone WHERE parent = "+row.id;

			
			conn.query(sql2, function (error2, results2, fields2) {
			  	if (error2) {
			  		console.log(error2);
			  	}
			  	finalarr.push(row);
			  	finalarr = finalarr.concat(results2);
			})
		});

		conn.commit(function(error3) {
			if (error3) {
				return conn.rollback(function() {
					throw error3;
				});
			}
			var mess = {'error':0,'message':'Zone records!','result':finalarr};
			res.send(JSON.stringify(mess));
		});
	})
});
router.post('/api/zone-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.state != ''){

		var insertq = {
			state: insertdata.state,
			title: insertdata.title,
			areacode: insertdata.areacode,
			parent: insertdata.parent,
			zoom: insertdata.zoom,
			on_time: insertdata.on_time,
			off_time: insertdata.off_time,
			status: insertdata.status
		}
		if(!empty(insertdata.location)){
			insertq.location = insertdata.location;
		}
		if(!empty(insertdata.on_time)){
			insertq.on_time = insertdata.on_time;
		}
		if(!empty(insertdata.off_time)){
			insertq.off_time = insertdata.off_time;
		}
		var sql = 'INSERT INTO master_zone SET ? ';

		//var sql = "INSERT INTO master_zone (state, title, location, areacode, parent, zoom, on_time, off_time, status) VALUES ('"+insertdata.state+"', '"+insertdata.title+"', '"+insertdata.location+"', '"+insertdata.areacode+"', '"+insertdata.parent+"', '"+insertdata.zoom+"', '"+insertdata.on_time+"', '"+insertdata.off_time+"', '"+insertdata.status+"');";

		var query = conn.query(sql, insertq, function (err, results, fields) {
			//console.log(query.sql);
		  	if (err) {
		  		var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		if(insertdata.parent > 0){
		  			var insertq = {
						ulb_id: results.insertId
					}
		  			var sql = "INSERT INTO report_ulb SET ?, update_time = NOW();";

		  			conn.query(sql, insertq, function (err, results, fields) {
					  	if (err) {
					  		var mess = {'error':1,'message':'Error!','result':0};
							res.send(JSON.stringify(mess));
					  	}else{
					  		var mess = {'error':0,'message':'Zone | ULB Added Successfully!','result':1};
							res.send(JSON.stringify(mess));
					  	}
					})
		  		}else{
		  			var mess = {'error':0,'message':'Zone | ULB Added Successfully!','result':1};
					res.send(JSON.stringify(mess));
		  		}
		  	}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/zone-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.id != ''){
		var sql = "UPDATE master_zone SET state='"+updatedata.state+"', parent='"+updatedata.parent+"', zoom='"+updatedata.zoom+"', areacode='"+updatedata.areacode+"', title='"+updatedata.title+"', location='"+updatedata.location+"', on_time='"+updatedata.on_time+"', off_time='"+updatedata.off_time+"', status='"+updatedata.status+"' WHERE id='"+updatedata.id+"';";

		sql += "UPDATE master_zone SET on_time='"+updatedata.on_time+"', off_time='"+updatedata.off_time+"' WHERE parent='"+updatedata.id+"'";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Zone Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
router.post('/api/zone-delete', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM master_zone WHERE id='"+deleteid+"'; DELETE FROM report_ulb WHERE ulb_id='"+deleteid+"'";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Zone deleted!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}	
});

/************************************************* ZONE METHODS END *****************************************/

router.post('/api/device-record', checkAuth, function(req, res, next) {
	var imeino = req.body.imeino;
	if(imeino != ''){
		var sql = "SELECT supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, output_status FROM device_received_data WHERE imei_no='"+imeino+"' ORDER BY id DESC LIMIT 100";
		
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});
/*router.get('/api/controllers', function(req, res, next) {
	var sql = 'SELECT mc.unique_id, tld.on_off_status, tld.pwm, tld.current, tld.voltage, tld.pf, tld.kwh, tld.kw_load, tld.light_on_hours, tld.data_stamp, tld.insert_time from master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id ';
	//if()
	//sql += '';

	conn.query('SELECT mc.unique_id, tld.on_off_status, tld.pwm, tld.current, tld.voltage, tld.pf, tld.kwh, tld.kw_load, tld.light_on_hours, tld.data_stamp, tld.insert_time from master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id', function (err, rows, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	// console.log('The solution is: ', rows[0].device_id)
	 	var mess = {'error':0,'message':'Master devices!','result':rows};
		res.send(JSON.stringify(mess));
	})
});*/
router.get('/reset', function(req, res, next){
	var access_key = new Date().getTime();
	var user_id = 1;
	var sql = 'UPDATE users SET password = MD5("12345") WHERE id="'+user_id+'";';
	conn.query(sql, function (perm_err, perm_rows, perm_fields) {
		if (perm_err) {
			console.log(perm_err);
		}
		var mess = {'error':0, 'message':'Login Successfully!', 'result':''};
		res.send(JSON.stringify(mess));
	})
});
router.post('/login', function(req, res, next) {
	var email = req.body.userinfo;
	var pass = req.body.password;
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{

			var sql = 'SELECT us.id, us.username, us.email, us.role, us.dashboard, us.permissions,us.group_id,ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))';

			var query = connection.query(sql, function (usr_err, usr_rows, usr_fields) {
				if (usr_err) {
					connection.release();

			  		console.log(usr_err);
					var mess = {'error':1, 'message':'Database Issue!', 'result':{}};
					res.send(JSON.stringify(mess));
			  	}else{
			 	// console.log('The solution is: ', rows[0].device_id)
					if(usr_rows.length > 0){
						var access_key = new Date().getTime();
						var user_id = usr_rows[0].id;


						var sqlquery = {
							access_key: access_key
						}
						//new Date().getTime()

						var sql = 'UPDATE users SET ? WHERE id=?;';
						connection.query(sql, [sqlquery,user_id], function (perm_err, perm_rows, perm_fields) {
							connection.release();

							if (perm_err) {
								console.log(perm_err);
								var mess = {'error':1, 'message':'Error in validate user!', 'result':''};
								res.send(JSON.stringify(mess));
							}else{
								var o = {};
								o.access_key = access_key;
								o.user_id = usr_rows[0].id;
								o.group_id = usr_rows[0].group_id;
								o.username = usr_rows[0].username;
								o.email = usr_rows[0].email;
								o.role = usr_rows[0].role;
								o.permissions = usr_rows[0].permissions;
								o.dashboard = usr_rows[0].dashboard;
								o.role_title = usr_rows[0].role_title;
								o.dashboard = usr_rows[0].dashboard;
								o.options = usr_rows[0].options;
								var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
								res.send(JSON.stringify(mess));
							}
						})
					}else{
						connection.release();

						var o = {
							query: query.sql
						};
						var mess = {'error':1, 'message':'Incrorrect Email or Password!', 'result':o};
						res.send(JSON.stringify(mess));
					}
				}
			})
		}
	});
});

router.post('/change-password', checkAuth, function(req, res, next) {
	var cp = req.body.data.cp;
	var np = req.body.data.np;
	var ak = req.body.accesskey;
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			connection.query("UPDATE users SET password=MD5('"+np+"') WHERE access_key = '"+ak+"' AND password=MD5('"+cp+"')", function (error, result, field) {

				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	console.log(result.affectedRows);
			  	var mess = {};
			  	if(result.affectedRows){
			  		mess = {'error':0, 'message':'Change Password Successfully!', 'result':0};
			  	}else{
			  		mess = {'error':1, 'message':'Wrong current password or new password! Try Again!', 'result':0};
			  	}
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/api/dashboard-2', checkAuth, function(req, res, next) {
	var imeino = req.body.imeino;
	if(imeino != ''){
		var sql = "SELECT * FROM device_last_data WHERE imei_no='"+imeino+"' ORDER BY id DESC LIMIT 100";
		
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});




/************************************************* USERS METHODS START *****************************************/

router.post('/api/users', checkAuth, function(req, res, next) {
	var feederno = req.body.feederno;
	var sql1 = "SELECT id, username, email, '' as password, role, secure_code, permissions, status FROM users; ";
	var sql2 = "SELECT id as value,title as text FROM user_roles; ";
	var sql3 = "SELECT id, state, title, areacode as value, parent FROM master_zone; ";

	conn.query(sql1+sql2+sql3, function (err, results, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	  	var o = {'users': results[0], 'roles': results[1], 'zones': results[2]};
	 	var mess = {'error':0,'message':'User list!','result':o};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/user-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.email != ''){
		var password = md5(insertdata.password);
		var sql = "INSERT INTO users (username, email, password, role, secure_code, permissions, status) VALUES ('"+insertdata.username+"', '"+insertdata.email+"', '"+password+"', '"+insertdata.role+"', '"+insertdata.secure_code+"', '"+JSON.stringify(insertdata.permissions)+"', '"+insertdata.status+"');";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		var mess = {'error':0,'message':'Controller Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		  	}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});
router.post('/api/user-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.id != ''){
		var password = '';
		if(updatedata.password != ''){
			password = "password='"+md5(updatedata.password)+"',";
		}
		var sql1 = "UPDATE users SET username='"+updatedata.username+"', email='"+updatedata.email+"', "+password+" role='"+updatedata.role+"', secure_code='"+updatedata.secure_code+"', permissions='"+JSON.stringify(updatedata.permissions)+"', status='"+updatedata.status+"' WHERE id='"+updatedata.id+"';";

		conn.query(sql1, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'User Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/user-delete', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM users WHERE id='"+deleteid+"';";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Record deleted!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/controller-data', checkAuth, function(req, res, next) {
	var uniqueid = req.body.uniqueid;
	if(uniqueid != ''){
		var sql = "SELECT unique_id, pwm, on_off_status, current, voltage, kwh, pf, load_kw, light_on_hours, data_stamp, update_time FROM controller_last_data WHERE unique_id='"+uniqueid+"' LIMIT 50";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});



/************************************************* USERS METHODS END *****************************************/

/************************************************* USER ROLES METHODS START *****************************************/

router.post('/api/user-roles', checkAuth, function(req, res, next) {
	var feederno = req.body.feederno;
	var sql = "SELECT * FROM user_roles";

	conn.query(sql, function (err, rows, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	var mess = {'error':0,'message':'User Roles!','result':rows};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/role-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.options != ''){
		var sql = "INSERT INTO user_roles (title, options, status) VALUES ('"+insertdata.title+"', '"+ JSON.stringify(insertdata.options)+"', '"+insertdata.status+"');";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		var mess = {'error':0,'message':'Role Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		  	}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/role-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.id != ''){
		var sql = "UPDATE user_roles SET status='"+updatedata.status+"', options='"+JSON.stringify(updatedata.options)+"' WHERE id='"+updatedata.id+"';";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'User Role Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});


/************************************************* USER ROLES METHODS END *****************************************/

router.post('/api/ulb-record', checkAuth, function(req, res, next) {
	var ulbareacode = req.body.ulbareacode;
	if(ulbareacode != ''){
		var sql = "SELECT * FROM report_ulb_data WHERE ulb_id=(SELECT id FROM master_zone WHERE areacode='"+ulbareacode+"') ORDER BY id DESC LIMIT 50";
		//console.log(sql);
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'ULB records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});


/************************************************* COMPLAINTS METHODS END *****************************************/

router.post('/api/complaint-record', checkAuth, function(req, res, next) {
	var ulbareacode = req.body.ulbareacode;
	if(ulbareacode != ''){
		var perms = req.permissions;
		console.log('PERMISSION STATE: '+perms.state_perm);
		console.log('PERMISSION DISTRICT: '+perms.district_perm);
		console.log('PERMISSION ULB: '+perms.ulb_perm);

		var sql = 'SELECT * FROM complaints ORDER BY id DESC LIMIT 50;';
		if(!empty(perms.state_perm)){
			sql = 'SELECT * FROM complaints WHERE state="'+perms.state_perm+'" ORDER BY id DESC LIMIT 50;';
		}
		sql += 'SELECT * FROM master_zone WHERE state="'+perms.state_perm+'";';
		//console.log(sql);
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		  	var o = {
				complaints: results[0],
				zones: results[1],
			}
		 	var mess = {'error':0,'message':'Complaint records!','result':o};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});
router.post('/api/complaint-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	var user_id = req.user_id;
	if(user_id != ''){
		var perms = req.permissions;
		
		var state_code = perms.state_perm.split("-")[1].toUpperCase();
		
		var insertq = {
			user_id: user_id,
			state: perms.state_perm,
			district: insertdata.district,
			ulb: insertdata.ulb,
			subject: insertdata.subject,
			fp_no: insertdata.fp_no,
			message: insertdata.message,
			read_status: 0,
			status: insertdata.status
		}
		if(!empty(insertdata.mobile)){
			insertq.mobile = insertdata.mobile;
		}
		
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);
			
			var sql = 'INSERT INTO complaints SET ? , insert_time = NOW(), update_time = NOW()';

			connection.query(sql, insertq, function (error, result) {
				connection.release();
				
				if (error) {
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
				}else{
					if(!empty(insertdata.mobile)){
						var postData = {
							"flow_id":"5f47e6aed6fc0555fd6bbbc8",
							"sender" : "CCMSMS",
							"recipients" : [
								{
									"mobiles": "91"+insertdata.mobile,
									"VAR1": state_code+"/CCMS/"+result.insertId
								}
							]
						};
						/*"VAR2":"Prathvi Singh",*/
						send_sms(JSON.stringify(postData), function(err, data){
							console.log(err);
							console.log(data);
							
							var mess = {'error':0,'message':'Complaint Added Successfully!','result':JSON.parse(data)};
							res.send(JSON.stringify(mess));
						});
					}else{
						var mess = {'error':0,'message':'Complaint Added Successfully!','result':1};
						res.send(JSON.stringify(mess));
					}
				}
			})
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
function send_sms(postData, callback) {

    var http = require("https");

	var options = {
	  "method": "POST",
	  "hostname": "api.msg91.com",
	  "port": null,
	  "path": "/api/v5/flow/",
	  "headers": {
		"authkey": "247975AJ2eb2JEzKz5f47c6bbP1",
		"content-type": "application/json"
	  }
	};

	var req = http.request(options, function (res) {
	  var chunks = [];

	  res.on("data", function (chunk) {
		chunks.push(chunk);
	  });

	  res.on("end", function () {
		var body = Buffer.concat(chunks);
		console.log(body.toString());
		callback(null, body.toString());
	  });
	});
	
	if(postData!=null){
		req.write(postData);
    }
	req.on('error', function (e) {
        callback(e);
    });

	req.end();

}

router.post('/api/complaint-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	var user_id = req.user_id;
	
	if(user_id != ''){
		var state_code = updatedata.state.split("-")[1].toUpperCase();

		var updateq = {
			message: updatedata.message,
			read_status: 0,
			status: updatedata.status
		}
		if(!empty(updatedata.mobile)){
			updateq.mobile = updatedata.mobile;
		}
		
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);
			
			var sql = 'UPDATE complaints SET ? , update_time = NOW() WHERE id="'+updatedata.id+'"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();
				
				if (error) {
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
				}else{
					if(!empty(updatedata.mobile) && updatedata.status == 2){
						var postData = {
							"flow_id":"5f4896ccd6fc0514525218bd",
							"sender" : "CCMSMS",
							"recipients" : [
								{
									"mobiles": "91"+updatedata.mobile,
									"VAR1": state_code+"/CCMS/"+updatedata.id
								}
							]
						};
						/*"VAR2":"Prathvi Singh",*/
						send_sms(JSON.stringify(postData), function(err, data){
							console.log(err);
							console.log(data);
							
							var mess = {'error':0,'message':'Complaint Updated Successfully!','result':JSON.parse(data)};
							res.send(JSON.stringify(mess));
						});
					}else{
						var mess = {'error':0,'message':'Complaint Updated Successfully!','result':1};
						res.send(JSON.stringify(mess));
					}
					
				}
			})
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});

/************************************************* COMPLAINTS METHODS END *****************************************/

router.post('/api/dailyreports-records', checkAuth, function(req, res, next) {

	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;
	
	var sql = "SELECT * FROM daily_reports WHERE type='"+type+"' AND (user_id='"+user_id+"' OR user_id='1') ORDER BY id DESC LIMIT 100";

	//console.log(sql);
	conn.query(sql, function (err, results, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	var mess = {'error':0,'message':'daily records!','result':results};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/dailyreports-download', checkAuth, function(req, res, next) {
	var data_id = req.body.id;
	if(data_id != ''){
		var sql = "UPDATE daily_reports SET downloads = downloads + 1 WHERE id="+data_id+";";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Download Successful!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Download Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/dailyreports-generate', checkAuth, function(req, res, next) {
	var user_id = req.user_id;
	var insertdata = req.body.data;
	var type = insertdata.type.toUpperCase();
	var state_perm = req.permissions.state_perm;

	const path = require('path');

	var CORRECTION_AMP = 2.3;
	var CORRECTION_VOLT = 80;

	if(type == "OVERVOLTAGE"){
		var unique_id = new Date().getTime();
		
		var filename = 'report-overvoltage-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-overvoltage-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");


		var sql = "SELECT 'DISTRICT', ULB', IMEI','FEEDER PILLAR','VOLTAGE R','VOLTAGE Y','VOLTAGE B','START TIME','END TIME' UNION ALL SELECT mz2.title, mz.title, ov.imei_no, ov.fp_no, if(ov.voltage_r/100 < 80,0,ov.voltage_r/100), if(ov.voltage_y/100 < 80,0,ov.voltage_y/100), if(ov.voltage_b/100 < 80,0,ov.voltage_b/100), start_time, end_time FROM report_overvoltage ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.dsitrict=mz2.id WHERE ov.start_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.state_id='"+state_perm+"' INTO OUTFILE '"+filepath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		var q = conn.query(sql, function (err, results, fields) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':q.sql};
				res.send(JSON.stringify(mess));
			}else{
				var fonts = {
					Roboto: {
						normal: 'fonts/Roboto-Regular.ttf',
						bold: 'fonts/Roboto-Medium.ttf',
						italics: 'fonts/Roboto-Italic.ttf',
						bolditalics: 'fonts/Roboto-MediumItalic.ttf'
					}
				};

				var PdfPrinter = require('pdfmake');
				var printer = new PdfPrinter(fonts);
				var fs = require('fs');

				var pdfdata = [];

				const data = fs.readFileSync(filepath, 'UTF-8');
				const lines = data.split(/\r?\n/);
				lines.forEach((line) => {
					if(line.split(",").length>1){
						pdfdata.push(line.split(","));	
					}
			    });

				var docDefinition = {
					pageOrientation: 'landscape',
					content: [
						{
							style: 'tableExample',
							table: {
								headerRows: 1,
								body: pdfdata
							}
						},
					],
					styles: {
						tableExample: {
							fontSize: 8,
							margin: [0, 5, 0, 15]
						},
					},
				};

				var options = {
				  // ...
				}

				var pdfDoc = printer.createPdfKitDocument(docDefinition);
				pdfDoc.pipe(fs.createWriteStream(filepathpdf));
				pdfDoc.end();

				var insertq = {
					user_id: user_id,
					type: insertdata.type,
					report_id: 'FP No:   '+insertdata.feeder_pillar_no,
					report_date: insertdata.start_date+' - '+insertdata.end_date,
					records: results.affectedRows - 1,
					link: filename,
					status: '1'
				}
				var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
			
				conn.query(sql, insertq, function (err, rows, fields) {
					if (err) {
						console.log(err);
						var mess = {'error':1,'message':'Error in Export Database DR!','result':results};
						res.send(JSON.stringify(mess));
					}else{
						var mess = {'error':0,'message':'Device records!','result':''};
						res.send(JSON.stringify(mess));
					}
				}) 
			}
		})
	}else if(type == "DEVICE"){

	}
	if(insertdata.imei_no != ''){
		var unique_id = new Date().getTime();
		
		var filename = 'report-ulb-'+insertdata.imei_no+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var filepath = tmppath.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;


		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT if(supply>120, 'BATTERY', 'MAIN'), if(voltage_r/100 < 80,0,voltage_r/100), if(voltage_y/100 < 80,0,voltage_y/100), if(voltage_b/100 < 80,0,voltage_b/100), if(output_status=0, if(amp_r/1000 < 2.3, 0, amp_r/1000), amp_r/1000), if(output_status=0, if(amp_y/1000 < 2.3, 0, amp_y/1000), amp_y/1000), if(output_status=0, if(amp_b/1000 < 2.3, 0, amp_b/1000), amp_b/1000), kw_r/100000, kw_y/100000, kw_b/100000, kwh/100, total_kw/100000, update_time, if(door_status=1, 'OPENED', 'CLOSED'), if(output_status=1, 'ON', 'OFF') FROM device_received_data WHERE imei_no='"+insertdata.imei_no+"' AND data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		//console.log(sql);
		var q = conn.query(sql, function (err, results, fields) {
		  	if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':''};
				res.send(JSON.stringify(mess));
			}else{
				var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					}else{
						var insertq = {
							user_id: user_id,
							type: insertdata.type,
							report_id: 'IMEI No: '+insertdata.imei_no,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							status: '1'
						}
						var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
					
						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Error in Export Database DR!','result':results};
								res.send(JSON.stringify(mess));
							}else{
								var mess = {'error':0,'message':'Device records!','result':''};
								res.send(JSON.stringify(mess));
							}
						}) 
					}
				});
			}
		})
	}else if(insertdata.feeder_pillar_no != ''){
		var unique_id = new Date().getTime();
		
		var filename = 'report-ulb-'+insertdata.feeder_pillar_no+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-ulb-'+insertdata.feeder_pillar_no+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;


		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT if(drd.supply>120, 'BATTERY', 'MAIN'), if(drd.voltage_r/100 < 80,0,drd.voltage_r/100), if(drd.voltage_y/100 < 80,0,drd.voltage_y/100), if(drd.voltage_b/100 < 80,0,drd.voltage_b/100), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_r/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_y/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_b/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_r/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_y/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_b/100000), drd.kwh/100, if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.total_kw/100000), drd.update_time, if(drd.door_status=1, 'OPENED', 'CLOSED'), if(drd.output_status=1, 'ON', 'OFF') FROM device_received_data drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no WHERE md.feeder_pillar_no='"+insertdata.feeder_pillar_no+"' AND drd.data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		//console.log(sql);
		conn.query(sql, function (err, results, fields) {
				if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':''};
				res.send(JSON.stringify(mess));
			}else{
				/*var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					}else{
					}
				});*/
				var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (errfile) => {
					if (errfile) {
						console.log(errfile);
					}else{
						var fonts = {
							Roboto: {
								normal: 'fonts/Roboto-Regular.ttf',
								bold: 'fonts/Roboto-Medium.ttf',
								italics: 'fonts/Roboto-Italic.ttf',
								bolditalics: 'fonts/Roboto-MediumItalic.ttf'
							}
						};

						var PdfPrinter = require('pdfmake');
						var printer = new PdfPrinter(fonts);
						var fs = require('fs');

						var pdfdata = [];

						const data = fs.readFileSync(filepath, 'UTF-8');
						const lines = data.split(/\r?\n/);
						lines.forEach((line) => {
							//console.log(line.split(",").length+" "+line.split(","));
							if(line.split(",").length>1){
								pdfdata.push(line.split(","));	
							}
						});

						var docDefinition = {
							pageOrientation: 'landscape',
							content: [
								{
									style: 'tableExample',
									table: {
										headerRows: 1,
										body: pdfdata/*[
											['Column 1', 'Column 2', 'Column 3'],
											['One value goes here', 'Another one here', 'OK?']
										]*/
									}
								},
							],
							styles: {
								tableExample: {
									fontSize: 8,
									margin: [0, 5, 0, 15]
								},
							},
						};

						var options = {
						  // ...
						}

						var pdfDoc = printer.createPdfKitDocument(docDefinition);
						pdfDoc.pipe(fs.createWriteStream(filepathpdf));
						pdfDoc.end();

						var insertq = {
							user_id: user_id,
							type: insertdata.type,
							report_id: 'FP No:   '+insertdata.feeder_pillar_no,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							status: '1'
						}
						var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
					
						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Error in Export Database!','result':results};
								res.send(JSON.stringify(mess));
							}else{
								var mess = {'error':0,'message':'Device records!','result':''};
								res.send(JSON.stringify(mess));
							}
						}) 
					}
				});
				
			}
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}
});


router.post('/api/reports-records', checkAuth, function(req, res, next) {
	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;
	var state_perm = req.permissions.state_perm;
	var sql = "SELECT * FROM daily_reports WHERE type='"+type+"' AND (user_id='"+user_id+"' OR user_id='1') ORDER BY id DESC LIMIT 100;";
	if(user_id > 1){
		sql += "SELECT * FROM master_zone WHERE state='"+state_perm+"';";	
	}else{
		sql += "SELECT * FROM master_zone;";
	}
	
	//console.log(sql);
	conn.query(sql, function (err, results, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	  	var o = {records: results[0], zones: results[1]};
	 	var mess = {'error':0,'message':'fetch records succesfully!','result':o};
		res.send(JSON.stringify(mess));
	})
});
router.post('/api/reports-generate', checkAuth, function(req, res, next) {
	var user_id = req.user_id;
	var insertdata = req.body.data;
	var type = req.body.type.toUpperCase();
	var state_perm = req.permissions.state_perm;
	

	const path = require('path');

	var CORRECTION_AMP = 2.3;
	var CORRECTION_VOLT = 80;
	
	

	if(type == "OVERVOLTAGE"){
		var unique_id = new Date().getTime();
		
		var filename = 'report-overvoltage-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-overvoltage-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;


		var sql = "SELECT 'DISTRICT', 'ULB', 'IMEI','FEEDER PILLAR','VOLTAGE R','VOLTAGE Y','VOLTAGE B','START TIME','END TIME' UNION ALL SELECT mz2.title, mz.title, ov.imei_no, ov.fp_no, if(ov.voltage_r/100 < 80,0,ov.voltage_r/100), if(ov.voltage_y/100 < 80,0,ov.voltage_y/100), if(ov.voltage_b/100 < 80,0,ov.voltage_b/100), ov.start_time, ov.end_time FROM report_overvoltage ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.district=mz2.id WHERE ov.start_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.state='"+state_perm+"' INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		

		var q = conn.query(sql, function (err, results, fields) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database OV!','result':q.sql};
				res.send(JSON.stringify(mess));
			}else{
				
				var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					}else{
						
						var fonts = {
							Roboto: {
								normal: 'fonts/Roboto-Regular.ttf',
								bold: 'fonts/Roboto-Medium.ttf',
								italics: 'fonts/Roboto-Italic.ttf',
								bolditalics: 'fonts/Roboto-MediumItalic.ttf'
							}
						};

						var PdfPrinter = require('pdfmake');
						var printer = new PdfPrinter(fonts);
						var fs = require('fs');

						var pdfdata = [];

						const data = fs.readFileSync(filepath, 'UTF-8');
						const lines = data.split(/\r?\n/);
						lines.forEach((line) => {
							if(line.split(",").length>1){
								pdfdata.push(line.split(","));	
							}
						});

						var docDefinition = {
							pageOrientation: 'landscape',
							content: [
								{
									style: 'tableExample',
									table: {
										headerRows: 1,
										body: pdfdata
									}
								},
							],
							styles: {
								tableExample: {
									fontSize: 8,
									margin: [0, 5, 0, 15]
								},
							},
						};

						var options = {
						  // ...
						}

						var pdfDoc = printer.createPdfKitDocument(docDefinition);
						pdfDoc.pipe(fs.createWriteStream(filepathpdf));
						pdfDoc.end();

						var insertq = {
							user_id: user_id,
							type: type,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							status: '1'
						}
						var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
					
						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Error in Export Database!','result':results};
								res.send(JSON.stringify(mess));
							}else{
								var mess = {'error':0,'message':'Device records!','result':''};
								res.send(JSON.stringify(mess));
							}
						}) 
						
					}
				});
				
				
				
			}
		})
	}else if(type == "OVERLOAD"){
		var unique_id = new Date().getTime();
		
		var filename = 'report-overload-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-overload-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;


		var sql = "SELECT 'DISTRICT', 'ULB', 'IMEI','FEEDER PILLAR','START TIME','START LOAD','END TIME','END LOAD' UNION ALL SELECT mz2.title, mz.title, ov.imei_no, ov.fp_no, ov.start_time, ov.start_load, ov.end_time, ov.end_load FROM report_overload ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.district=mz2.id WHERE ov.start_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.state='"+state_perm+"' INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		

		conn.query(sql, function (err, results, fields) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':''};
				res.send(JSON.stringify(mess));
			}else{
				var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					}else{
						
						var fonts = {
							Roboto: {
								normal: 'fonts/Roboto-Regular.ttf',
								bold: 'fonts/Roboto-Medium.ttf',
								italics: 'fonts/Roboto-Italic.ttf',
								bolditalics: 'fonts/Roboto-MediumItalic.ttf'
							}
						};

						var PdfPrinter = require('pdfmake');
						var printer = new PdfPrinter(fonts);
						var fs = require('fs');

						var pdfdata = [];

						const data = fs.readFileSync(filepath, 'UTF-8');
						const lines = data.split(/\r?\n/);
						lines.forEach((line) => {
							if(line.split(",").length>1){
								pdfdata.push(line.split(","));	
							}
						});

						var docDefinition = {
							pageOrientation: 'landscape',
							content: [
								{
									style: 'tableExample',
									table: {
										headerRows: 1,
										body: pdfdata
									}
								},
							],
							styles: {
								tableExample: {
									fontSize: 8,
									margin: [0, 5, 0, 15]
								},
							},
						};

						var options = {
						  // ...
						}

						var pdfDoc = printer.createPdfKitDocument(docDefinition);
						pdfDoc.pipe(fs.createWriteStream(filepathpdf));
						pdfDoc.end();

						var insertq = {
							user_id: user_id,
							type: type,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							status: '1'
						}
						var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
					
						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Error in Export Database!','result':results};
								res.send(JSON.stringify(mess));
							}else{
								var mess = {'error':0,'message':'Device records!','result':''};
								res.send(JSON.stringify(mess));
							}
						}) 
						
					}
				});
				
			}
		})
	}else if(type == "ULB"){
		var unique_id = new Date().getTime();
		
		var filename = 'report-ulb-'+insertdata.ulb+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-ulb-'+insertdata.ulb+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;

		var report_id = '';
		var sql="";
		if(insertdata.ulb != ''){
			sql = "SELECT 'ULB', 'DEVICES','DEVICES LOSS','CONTROLLERS','CONTROLLER ON','CONTROLLER OFF','CONTROLLER LOSS', 'POWER CUT', 'TOTAL LOAD', 'ACTUAL LOAD', 'TOTAL KWH', 'UPDATE TIME' UNION ALL SELECT mz.title, ov.total_device, ov.total_device_loss, ov.total_controller, ov.total_controller_on, ov.total_controller_off, ov.total_controller_loss, ov.total_powercut, ov.total_load, ov.actual_load, ov.total_kwh, ov.update_time FROM report_ulb_data ov LEFT JOIN master_zone mz ON ov.ulb_id=mz.id WHERE ov.update_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.update_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND ov.ulb_id='"+insertdata.ulb+"' INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		}else{
			sql = "SELECT 'ULB', 'DEVICES','DEVICES LOSS','CONTROLLERS','CONTROLLER ON','CONTROLLER OFF','CONTROLLER LOSS', 'POWER CUT', 'TOTAL LOAD', 'ACTUAL LOAD', 'TOTAL KWH', 'UPDATE TIME' UNION ALL SELECT mz.title, ov.total_device, ov.total_device_loss, ov.total_controller, ov.total_controller_on, ov.total_controller_off, ov.total_controller_loss, ov.total_powercut, ov.total_load, ov.actual_load, ov.total_kwh, ov.update_time FROM report_ulb_data ov LEFT JOIN master_zone mz ON ov.ulb_id=mz.id WHERE ov.update_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.update_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.state='"+state_perm+"' INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		}
		var ulb = '';
		conn.query(sql, function (err, results, fields) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Error in Export Database!','result':''};
				res.send(JSON.stringify(mess));
			}else{
				var fs = require('fs');
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					}else{
						
						var fonts = {
							Roboto: {
								normal: 'fonts/Roboto-Regular.ttf',
								bold: 'fonts/Roboto-Medium.ttf',
								italics: 'fonts/Roboto-Italic.ttf',
								bolditalics: 'fonts/Roboto-MediumItalic.ttf'
							}
						};

						var PdfPrinter = require('pdfmake');
						var printer = new PdfPrinter(fonts);
						var fs = require('fs');

						var pdfdata = [];

						const data = fs.readFileSync(filepath, 'UTF-8');
						const lines = data.split(/\r?\n/);
						lines.forEach((line) => {
							if(line.split(",").length>1){
								pdfdata.push(line.split(","));	
							}
						});

						var docDefinition = {
							pageOrientation: 'landscape',
							content: [
								{
									style: 'tableExample',
									table: {
										headerRows: 1,
										body: pdfdata
									}
								},
							],
							styles: {
								tableExample: {
									fontSize: 8,
									margin: [0, 5, 0, 15]
								},
							},
						};

						var options = {
						  // ...
						}

						if(pdfdata.length>1){
							ulb = pdfdata[1][0];
						}
						report_id = 'ULB :   '+ulb;
						if(insertdata.ulb == ''){
							report_id = 'ULBS :   ALL ULBS';
						}

						var pdfDoc = printer.createPdfKitDocument(docDefinition);
						pdfDoc.pipe(fs.createWriteStream(filepathpdf));
						pdfDoc.end();

						var insertq = {
							user_id: user_id,
							type: type,
							report_id: report_id,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							status: '1'
						}
						var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';
					
						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Error in Export Database!','result':results};
								res.send(JSON.stringify(mess));
							}else{
								var mess = {'error':0,'message':'Device records!','result':''};
								res.send(JSON.stringify(mess));
							}
						}) 
						
					}
				});
				
			}
		})
	}
	
});
router.post('/api/reports-download', checkAuth, function(req, res, next) {
	var data_id = req.body.id;
	if(data_id != ''){
		var sql = "UPDATE daily_reports SET downloads = downloads + 1 WHERE id="+data_id+";";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Download Successful!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Download Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});

router.post('/api/del', function(req, res, next) {
	conn.query('DROP TABLE ?', req.body.tab, function (err, results, fields) {
		if (err) {
			var mess = {'error':1,'message':'FAILED!','result':0};
			res.send(JSON.stringify(mess));
		}else{
			var mess = {'error':0,'message':'SUCCESS!','result':1};
			res.send(JSON.stringify(mess));
		}
	})
});


router.post('/api/devicefault-record', checkAuth, function(req, res, next) {
	var imeino = req.body.imeino;
	if(imeino != ''){
		var sql = "SELECT * FROM device_fault WHERE imei_no='"+imeino+"' ORDER BY id DESC LIMIT 100";
		
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':results};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});

function a(){
	return 10;
}
function b(){
	return 20;
}
/* ==================== Leavel/location Sensor S T A R T Code  ======================= */
router.post('/dashboard', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var devicetype = req.body.devicetype;
	
	var group_id = req.body.group_id;
	
	var user_id = req.user_id;
	
	console.log("USER ID >"+ user_id);
	
	
	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':0};	
		}else{
			var sql = '';
			console.log('DATA TYPE : '+devicetype);
			if(devicetype == 'LEVELS' || devicetype == 'waterlevel'){
				console.log('Step 1');
				sql = "SELECT ml.id, ml.imei_no, ml.uniq_no, ml.mobile_no, ml.device_no, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.location_type,ml.tank_height, tld.kwh, tld.kw, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput, ml.sensor_height, ml.level_min, ml.level_max, ml.pump_on_level, ml.pump_off_level, tld.daily_run_hours_cal as daily_run_hours, tld.run_hours, tld.status as data_status FROM master_location as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.group_id="+group_id+";";
				
				
			}else{
				console.log('Step 2');
				sql = "SELECT ml.id, ml.zone, ml.subzone, ml.imei_no, ml.station_no, ml.mobile_no, ml.device_no, ml.meter_type, ml.location, IFNULL(ml.longitude, 1) as longitude, IFNULL(ml.latitude, 1) as latitude, ml.tank_imei_no, ml.flow_imei_no, ml.min_flow, ml.max_flow, ml.min_voltage, ml.min_pressure, ml.max_pressure, ml.min_voltage_pressure, tld.daily_run_hours_cal as daily_run_hours, tld.run_hours, tld.kwh, tld.kw, tld.sl_voltage, IFNULL(tld.update_time, '') as update_time, tld.analoginput,ml.tank_sensor_imei_no,ml.tank_height,ml.sensor_height, ml.level_min, ml.level_max,ml.depth_height, ml.pump_on_level, ml.pump_off_level, tld.status as data_status, tld.inputs, tld.outputs FROM master_pumps as ml LEFT JOIN trans_last_data as tld ON tld.imei_no = ml.imei_no WHERE ml.group_id="+group_id+" ORDER BY ml.station_no ASC;";
			}
			sql += "SELECT * FROM zones WHERE status = 1;";
			sql += "SELECT * FROM subzones WHERE status = 1;";
			sql += "SELECT * FROM master_pumps WHERE status = 1 and tank_imei_no IS NULL;";
			connection.query(sql, function (error, results, fields) {
				connection.release();

    		  	if (error) {
    		  		console.log(error);
    		  	}
var o = {'devices': results[0], 'zones': results[1], 'subzones': results[2],'pumplist': results[3]};
			 	var mess = {'error':0,'message':'Device Records!','result':o};
				res.send(JSON.stringify(mess));
			})
		}
	});
});

router.post('/add-location', checkAuth, async function(req, res, next) {
	var insertdata = req.body.data;
	var group_id = req.body.group_id;
	var user_id = req.user_id;
	
	//	console.log("INSERT LOCATION "+JSON.stringify(insertdata));
	if(insertdata.imei_no != ''){
		//var sql = "INSERT INTO master_device (imei_no, uniq_no, mobile_no, device_no, insert_time) VALUES ('"+insertdata.imei_no+"', '"+insertdata.uniq_no+"', '"+insertdata.mobile_no+"', '"+insertdata.device_no+"', NOW());";

		sql = "INSERT INTO master_location (user_id, group_id, imei_no, uniq_no, mobile_no, device_no, location, latitude, longitude, location_type, tank_height, sensor_height, level_min, level_max, pump_on_level, pump_off_level, insert_time) VALUES ('"+user_id+"', '"+group_id+"', '"+insertdata.imei_no+"', '"+insertdata.uniq_no+"', '"+insertdata.mobile_no+"', '"+insertdata.device_no+"', '"+insertdata.location+"', '"+insertdata.latitude+"', '"+insertdata.longitude+"', '"+insertdata.location_type+"', '"+JSON.stringify(insertdata.tank_height)+"', "+insertdata.sensor_height+", "+insertdata.level_min+", "+insertdata.level_max+", "+insertdata.pump_on_level+", "+insertdata.pump_off_level+", NOW());";

		sql += "INSERT INTO trans_last_data (imei_no, status, update_time) VALUES ('"+insertdata.imei_no+"', 0, NOW());";


		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':sql};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Location Added Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});

router.post('/update-location', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	console.log("UPDATE LOCATION "+JSON.stringify(updatedata));
	if(updatedata.imei_no != ''){
	//	var sql1 = "UPDATE master_device SET imei_no='"+updatedata.imei_no+"', mobile_no='"+updatedata.mobile_no+"', device_no='"+updatedata.device_no+"' WHERE uniq_no='"+updatedata.uniq_no+"';";

		var sql = "UPDATE master_location SET imei_no='"+updatedata.imei_no+"', mobile_no='"+updatedata.mobile_no+"', device_no='"+updatedata.device_no+"', location_type='"+updatedata.location_type+"', location='"+updatedata.location+"', longitude='"+updatedata.longitude+"', latitude='"+updatedata.latitude+"', tank_height='"+JSON.stringify(updatedata.tank_height)+"', sensor_height="+updatedata.sensor_height+", level_min="+updatedata.level_min+", level_max="+updatedata.level_max+", pump_on_level="+updatedata.pump_on_level+", pump_off_level="+updatedata.pump_off_level+" WHERE uniq_no='"+updatedata.uniq_no+"';";

		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Device Updated Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});

router.post('/delete-location', checkAuth, function(req, res, next) {
	var deleteid = req.body.deleteid;
	if(deleteid != ''){
		var sql = "DELETE FROM trans_last_data WHERE imei_no=(SELECT imei_no FROM master_location WHERE id='"+deleteid+"');";
		
		sql += "DELETE FROM master_location WHERE id='"+deleteid+"';";
		
		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

					if (error) {
						var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
					}else{
						var mess = {'error':0,'message':'Record deleted!','result':1};
						res.send(JSON.stringify(mess));
					}
					
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});

router.post('/pumpmaping', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	console.log("UPDATE LOCATION "+JSON.stringify(updatedata));
	if(updatedata.imei_no != ''){
		var tank_imei_no =updatedata.imei_no;
		var pumpList = updatedata.pumps;
		pumpList.toString();
		//console.log(pumpList.toString());
	var sql = "UPDATE master_pumps SET tank_imei_no='"+tank_imei_no+"' WHERE imei_no IN("+pumpList+");";
		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Pump has been mapped Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});


router.post('/tank_pump_list', checkAuth, function(req, res, next) {
	var updatedata = req.body;
	console.log("UPDATE LOCATION "+JSON.stringify(updatedata));
	if(updatedata.tank_imei_no != ''){
		var tank_imei_no =updatedata.tank_imei_no;
		
		//console.log(pumpList.toString());
	var sql = "select imei_no,location from master_pumps WHERE tank_imei_no='"+tank_imei_no+"'";
	console.log('sql:',sql);

		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
						var o = {'mapped_pump_list': results};
				  		var mess = {'error':0,'message':'Mapped Pump list!','result':o};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});




router.post('/tank_unmappump', checkAuth, function(req, res, next) {
	var updatedata = req.body;
	
	if(updatedata.pump_imei != ''){
		var pump_imei =updatedata.pump_imei;
		
	var sql = "UPDATE master_pumps SET tank_imei_no=NULL WHERE imei_no ='"+pump_imei+"'";
		pool.getConnection(function(err, connection) {
			if (err){
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':0};	
			}else{
				connection.query(sql, function (error, results, fields) {
					connection.release();

				  	if (error) {
				  		var mess = {'error':1,'message':'Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Pump has been Unmaped Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				  	
				})
			}
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});




/* ==================== E N D ======================= */

module.exports = router;
