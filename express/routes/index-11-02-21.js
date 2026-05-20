var express = require('express');
var router = express.Router();
var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');
var url = require('url');

const fileUpload = require('express-fileupload');
router.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
})); 

var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'i3wd_slc',
    password: 'xmwmce4celwi',
    database: 'i3wd_slc',
    multipleStatements: true,
    dateStrings: [
      'DATE',
      'DATETIME'
    ]
});

var pool_up = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'ccmsup_usr',
    password: 'az7gurl0nmns',
    database: 'ccmsup_db',
    multipleStatements: true,
    dateStrings: [
      'DATE',
      'DATETIME'
    ]
});

var import_data = [];
var import_result = [];
var import_index = 0;

var POOLDB = {
	'216.10.251.190': pool,
	'103.211.218.36': pool_up
}
var IP_MH = '216.10.251.190';
var IP_UP = '103.211.218.36';

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log(req.hostname);
  	res.render('index', { title: 'Express' });
});

router.get('/dev', function(req, res, next) {
	var sql = 'SELECT count(id) as total FROM master_device';
	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Issue!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				if(result.length > 0){
					var mess = {'error':1,'message':'ok! '+result[0]['total'],'result':0};
					res.send(JSON.stringify(mess));
				}else{
					var mess = {'error':2,'message':'failed!','result':0};
					res.send(JSON.stringify(mess));
				}
			}
		});
	});
});

router.get('/api/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function checkAuth(req, res, next) {
	if (!req.body.accesskey) {
		var mess = {'error':1,'message':'Unauthorised Access!','result':0};
		res.send(JSON.stringify(mess));
	} else {
	  	var accesskey = req.body.accesskey;

	  	console.log("CHK AUTH "+req.hostname+" ");

	  	POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT ap.user_id, u.permissions from access_permission ap LEFT JOIN users u ON ap.user_id=u.id WHERE ap.access_key = "'+accesskey+'" AND ap.is_valid=1';
			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Database issue. please login again!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
					if(result.length > 0){
						req.user_id = result[0].user_id;
						req.permissions = JSON.parse(result[0].permissions);
						next();
					}else{
						var mess = {'error':2,'message':'Session Timeout. For security reason, please login again!','result':0};
						res.send(JSON.stringify(mess));
					}
				}
			});
		})
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
		
		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, output_status FROM device_received_data_clone WHERE imei_no='"+imeino+"' INTO OUTFILE '"+filepath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		
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
router.post('/api/dashboard', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	console.log('PERMISSION STATE: '+perms.state_perm);
	var state_perm = perms.state_perm;
	if(empty(perms.state_perm)){
		state_perm = req.body.state_perm;;
	}
	console.log("HOST NAME "+req.hostname+" "+state_perm);
	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = '';
		if(!empty(state_perm)){
			sql = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no LEFT JOIN master_location ml ON ml.feeder_pillar_no=md.feeder_pillar_no WHERE ml.state_id='"+state_perm+"';";
			sql += "SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id WHERE mz2.state='"+state_perm+"';";
			sql += "SELECT id, title, areacode FROM master_zone WHERE parent=0 AND state='"+state_perm+"';";
		}else{
			sql = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no;";
			sql += "SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id;";
			sql += "SELECT id, title, areacode FROM master_zone WHERE parent=0;";
		}

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {'devices': results[0], 'records':results[1], 'zones':results[2]};
		 	var mess = {'error':0,'message':'Master devices!','result':o};
			res.send(JSON.stringify(mess));
		});
	});
});

router.post('/api/livedata', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	console.log('PERMISSION STATE: '+perms.state_perm);
	var state_perm = perms.state_perm;
	if(empty(perms.state_perm)){
		state_perm = req.body.state_perm;;
	}
	var sql = '';
	if(!empty(state_perm)){
		sql = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no LEFT JOIN master_location ml ON ml.feeder_pillar_no=md.feeder_pillar_no WHERE ml.state_id='"+state_perm+"';";
		sql += "SELECT IFNULL(tld.on_off_status, '') as on_off_status, IFNULL(tld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN controller_last_data as tld ON tld.unique_id = mc.unique_id;";
		sql += "SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id WHERE mz2.state='"+state_perm+"';";
		sql += "SELECT id, title, areacode FROM master_zone WHERE parent=0 AND state='"+state_perm+"';";
	}
	
	conn.query(sql, function (error, results, fields) {
	  	if (error) {
	  		console.log(error);
	  	}//'total_ulb': results[0][0].total_ulb, 
	  	var o = {'devices': results[0], 'controllers': results[1], 'records':results[2], 'zones':results[3]};
	 	var mess = {'error':0,'message':'Master devices!','result':o};
		res.send(JSON.stringify(mess));
	})
});

router.post('/api/search-device', checkAuth, function(req, res, next) {
	var searchtxt = req.body.imei_no;
	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "";
		if(searchtxt.length == 15){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.imei_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 6 && searchtxt.length >= 4){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE ml.feeder_pillar_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 13 && searchtxt.length >= 10){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.mobile_no='"+searchtxt+"';";
		}else{
			
		}

		

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var mess = {'error':0,'message':'Master devices!','result':[]};


		  	if(result.length > 0){
		  		
		  		mess = {'error':0,'message':'Master devices!','result':result[0]};
		  	}
		 	
			res.send(JSON.stringify(mess));
		});
	})
});
/************************************************* CCMS METHODS START *****************************************/

router.post('/api/masterdevices', checkAuth, function(req, res, next) {
	/*var sql = "SELECT md.id, md.imei_no, md.state_id, md.zone_id, (SELECT title from master_zone WHERE id = md.zone_id) as zone_title, md.ulb_id, md.feeder_piller_no, count(mc.unique_id) as connections, md.ward_no, md.ccms_no, mz.title as ulb_title, md.total_load, md.no_of_poles, md.no_of_fittings, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_controller as mc ON md.imei_no = mc.imei_no LEFT JOIN master_zone as mz ON md.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no";*/
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no;";

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		 	var mess = {'error':0,'message':'Master devices!','result':result[0]};
			res.send(JSON.stringify(mess));
		});
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
	
	var sql = "";

	if(!empty(perms.state_perm)){
		sql = "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"' AND state='"+perms.state_perm+"';";
	}else{
		sql = "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"';";
	}

	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

			var mess = {};
		  	if (error) {
		  		console.log(error);
		  		mess = {'error':1,'message':'Error in loading zone record!','result':[]};
		  	}else{
		  		var ulb_id = results[0]['id'];
		  		var zoneinfo = results[0];

		  		if(!empty(perms.state_perm)){
					sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_no as sys_meter_no, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
					"FROM master_device AS md "+
					"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
					"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
					"WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"';";
				}else{
					sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_no as sys_meter_no, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
					"FROM master_device AS md "+
					"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
					"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
					"WHERE ml.ulb_id = '"+ulb_id+"';";
				}

				POOLDB[req.hostname].getConnection(function(err, connection) {
					if (err) {
						console.log(err);
						var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
						res.send(JSON.stringify(mess));
					}else{
						connection.query(sql, function (error, results) {
							connection.release();

							var o = {};
							o.ulb_devices = results;
							o.zoneinfo = zoneinfo;
							o.time = new Date();
						 	var mess = {'error':0,'message':'Ulb devices!','result':o};
							res.send(JSON.stringify(mess));
						});
					}
				});
		  	}
		});
	});
});

router.post('/api/ulb-info', checkAuth, function(req, res, next) {
	var ulbcode = req.body.ulbcode;

	var perms = req.permissions;
	console.log('PERMISSION STATE: '+perms.state_perm);
	
	var sql = "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"';";

	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

			var mess = {};
		  	if (error) {
		  		console.log(error);
		  		mess = {'error':1,'message':'Error in loading zone record!','result':[]};
		  	}else{
		  		var ulb_id = results[0]['id'];

		  		if(!empty(perms.state_perm)){

					sql = "SELECT ml.total_load, ml.no_of_fittings, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.kwh, ml.location_lat, ml.location_lng, ml.location, dld.output_status, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
					"FROM master_device AS md "+
					"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
					"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
					"WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"';";
				}else{

					sql = "SELECT ml.total_load, ml.no_of_fittings, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.kwh, ml.location_lat, ml.location_lng, ml.location, dld.output_status, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
					"FROM master_device AS md "+
					"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
					"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
					"WHERE ml.ulb_id = '"+ulb_id+"';";
				}

				pool.getConnection(function(err, connection) {
					if (err) {
						console.log(err);
						var mess = {'error':1,'message':'Database query error!','result':[]};
						res.send(JSON.stringify(mess));
					}else{
						connection.query(sql, function (error, results) {
							connection.release();

							var o = {};
							o.ulb_devices = results;
							o.time = new Date();
						 	var mess = {'error':0,'message':'Ulb devices!','result':o};
							res.send(JSON.stringify(mess));
						});
					}
				});
				
		  	}
		});
	});
});
router.post('/api/ulb-devices', checkAuth, function(req, res, next) {
	var ulbcode = req.body.ulbcode;
	var limit = req.body.limit;
	var index = req.body.index;
	var filters = req.body.filters;

	console.log(filters.network+' '+filters.power+' '+filters.search);

	var offset = index * limit;

	var perms = req.permissions;
	console.log('PERMISSION STATE: '+perms.state_perm);
	
	var sql = "SELECT * FROM master_zone WHERE areacode='"+ulbcode+"';";

	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

			var mess = {};
		  	if (error) {
		  		console.log(error);
		  		mess = {'error':1,'message':'Error in loading zone record!','result':[]};
		  	}else{
		  		var ulb_id = results[0]['id'];
		  		var zoneinfo = results[0];

		  		sql = "";

		  		if(filters.search != ""){
		  			sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
						"FROM master_device AS md "+
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
					if(!empty(perms.state_perm)){
						if(filters.search.length >= 4 && filters.search.length <= 7){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.feeder_pillar_no = '"+filters.search+"' AND ml.state_id='"+perms.state_perm+"';";
			  			}else if(filters.search.length >= 10 && filters.search.length <= 13){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.mobile_no = '"+filters.search+"'; AND ml.state_id='"+perms.state_perm+"';";
			  			}else if(filters.search.length >= 14 && filters.search.length <= 16){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '"+filters.search+"'; AND ml.state_id='"+perms.state_perm+"';";
			  			}else{
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '000000000000000'; AND ml.state_id='"+perms.state_perm+"';";
			  			}
			  			//sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"' LIMIT "+limit+" OFFSET "+offset+";";
		  			}else{
		  				if(filters.search.length >= 4 && filters.search.length <= 7){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.feeder_pillar_no = '"+filters.search+"';";
			  			}else if(filters.search.length >= 10 && filters.search.length <= 13){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.mobile_no = '"+filters.search+"';";
			  			}else if(filters.search.length >= 14 && filters.search.length <= 16){
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '"+filters.search+"';";
			  			}else{
			  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '000000000000000';";
			  			}
		  				//sql += "WHERE ml.ulb_id = '"+ulb_id+"' LIMIT "+limit+" OFFSET "+offset+";";
		  			}
		  			/*if(filters.search.length >= 4 && filters.search.length <= 7){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.feeder_pillar_no = '"+filters.search+"';";
		  			}else if(filters.search.length >= 10 && filters.search.length <= 13){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.mobile_no = '"+filters.search+"';";
		  			}else if(filters.search.length >= 14 && filters.search.length <= 16){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '"+filters.search+"';";
		  			}else{
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '000000000000000';";
		  			}*/
		  		}else if(filters.network != ""){
		  			sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
						"FROM master_device AS md "+
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
						if(filters.network == "CONNECTED"){
							if(!empty(perms.state_perm)){
				  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"' AND dld.update_time >= DATE_SUB(NOW(),INTERVAL 1 HOUR) LIMIT "+limit+" OFFSET "+offset+";";
				  			}else{
				  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND dld.update_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT "+limit+" OFFSET "+offset+";";
				  			}
						}else if(filters.network == "DISCONNECTED"){
							if(!empty(perms.state_perm)){
				  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"' AND (dld.update_time <= DATE_SUB(NOW(),INTERVAL 1 HOUR) OR dld.update_time IS NULL) LIMIT "+limit+" OFFSET "+offset+";";
				  			}else{
				  				sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND (dld.update_time <= DATE_SUB(NOW(),INTERVAL 1 HOUR) OR dld.update_time IS NULL) LIMIT "+limit+" OFFSET "+offset+";";
				  			}
						}else{
							sql += "WHERE ml.ulb_id = '"+ulb_id+"' LIMIT "+limit+" OFFSET "+offset+";";
						}
		  			//console.log(sql);
		  		}else{
		  			if(!empty(perms.state_perm)){
						sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
						"FROM master_device AS md "+
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
						"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
						"WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"' LIMIT "+limit+" OFFSET "+offset+";";
					}else{
						sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
						"FROM master_device AS md "+
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
						"WHERE ml.ulb_id = '"+ulb_id+"' LIMIT "+limit+" OFFSET "+offset+";";
					}
		  		}
		  		
	  			pool.getConnection(function(err, connection) {
					if (err) {
						console.log(err);
						var mess = {'error':1,'message':'Database query error!','result':[]};
						res.send(JSON.stringify(mess));
					}else{
						connection.query(sql, function (error, results) {
							connection.release();

							var o = {};
							o.limit_devices = results;
							o.zoneinfo = zoneinfo;
							o.time = new Date();
						 	var mess = {'error':0,'message':'Master devices!','result':o};
							res.send(JSON.stringify(mess));
						});
					}

					
				});
				
		  	}
		});
	});	

});
router.post('/api/ulb-devices-search', checkAuth, function(req, res, next) {
	var searchtxt = req.body.searchtxt;
	var state = req.body.state;
	
	var offset = index * limit;

	var mess = {};

	var perms = req.permissions;
	var sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_60w, ml.led_70w, ml.led_75w, ml.led_80w, ml.led_110w, ml.led_130w, ml.led_140w, ml.led_190w, ml.led_200w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
		"FROM master_device AS md "+
		"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
		"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
		"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
	if(searchtxt.length == 15){
		sql += "WHERE md.imei_no='"+searchtxt+"';";
	}else if(searchtxt.length <= 6 && searchtxt.length >= 4){
		sql += "WHERE ml.feeder_pillar_no='"+searchtxt+"';";
	}else if(searchtxt.length <= 13 && searchtxt.length >= 10){
		sql += "WHERE md.mobile_no='"+searchtxt+"';";
	}else{
		sql = "";
		mess = {'error':0,'message':'Devices!','result':[]};
		res.send(JSON.stringify(mess));
	}
	if(sql.length > 0){
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, results) {
				connection.release();

				var mess = {};
			  	if (error) {
			  		console.log(error);
			  		mess = {'error':0,'message':'Devices!','result':[]};
			  	}else{
			  		var o = {};
					o.ulb_devices = results[0];
					o.total_devices = results[1][0]['total_count'];
					o.zoneinfo = results[2][0];
				 	mess = {'error':0,'message':'Master devices!','result':o};
			  	}
				res.send(JSON.stringify(mess));
			});
		});	
	}
	
});

/*
router.post('/api/search-device', checkAuth, function(req, res, next) {
	var searchtxt = req.body.imei_no;
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "";
		if(searchtxt.length == 15){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.imei_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 6 && searchtxt.length >= 4){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE ml.feeder_pillar_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 13 && searchtxt.length >= 10){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.mobile_no='"+searchtxt+"';";
		}else{
			
		}

		

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var mess = {'error':0,'message':'Master devices!','result':[]};


		  	if(result.length > 0){
		  		
		  		mess = {'error':0,'message':'Master devices!','result':result[0]};
		  	}
		 	
			res.send(JSON.stringify(mess));
		});
	})
});*/

router.post('/api/device-all', checkAuth, function(req, res, next) {
	var ulbcode = req.body.ulb_id;

	var sql = '';
	if(!empty(ulbcode)){
		sql = "SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time "+
	"FROM master_device AS md "+
	"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no "+
	"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id "+
	"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no "+
	"WHERE mz.id = '"+ulbcode+"';";
		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
			}
			var o = {};
			o.ulb_devices = results;
			o.zoneinfo = []; 
		 	var mess = {'error':0,'message':'Master devices!','result':o};
			res.send(JSON.stringify(mess));
		})
	}else{
		var o = {};
			o.ulb_devices = [];
			o.zoneinfo = []; 
		var mess = {'error':0,'message':'Master devices!','result':o};
			res.send(JSON.stringify(mess));
	}





	
});





router.post('/api/device-insert', checkAuth, async function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.imei_no != '' && insertdata.imei_no.length == 15){

		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = "SELECT * from master_device WHERE imei_no=?";

			connection.query(sql, [insertdata.imei_no], function (error, result) {
				//connection.release();

			  	if (error) {
			  		console.log(error);
			  		var mess = {'error':1,'message':'Server error!', 'result':''};
					res.send(JSON.stringify(mess));
			  	}
			  	if(result.length > 0){
			  		var mess = {'error':1,'message':'Imei allready exist!', 'result':''};
					res.send(JSON.stringify(mess));
			  	}else{

			  		var device = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						device_type: insertdata.device_type,
						device_no: insertdata.device_no
					}
					var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

					var location = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						state_id: insertdata.state_id,
						zone_id: insertdata.zone_id,
						ulb_id: insertdata.ulb_id,
						ward_no: insertdata.ward_no,
						total_load: insertdata.total_load,
						no_of_fittings: insertdata.no_of_fittings,
						location: insertdata.location,
						location_lat: insertdata.location_lat,
						location_lng: insertdata.location_lng
					}
					if(!empty(insertdata.previous_load)){
						location.previous_load= insertdata.previous_load;
					}else{
						location.previous_load= 0;
					}
					if(!empty(insertdata.meter_type)){
						location.meter_type= insertdata.meter_type;
					}
					if(!empty(insertdata.meter_type)){
						location.meter_no= insertdata.device_no;
					}
					if(!empty(insertdata.led_18w)){
						location.led_18w= insertdata.led_18w;
					}
					if(!empty(insertdata.led_24w)){
						location.led_24w= insertdata.led_24w;
					}
					if(!empty(insertdata.led_35w)){
						location.led_35w= insertdata.led_35w;
					}
					if(!empty(insertdata.led_45w)){
						location.led_45w= insertdata.led_45w;
					}
					if(!empty(insertdata.led_60w)){
						location.led_60w= insertdata.led_60w;
					}
					if(!empty(insertdata.led_70w)){
						location.led_70w= insertdata.led_70w;
					}
					if(!empty(insertdata.led_75w)){
						location.led_75w= insertdata.led_75w;
					}
					if(!empty(insertdata.led_80w)){
						location.led_80w= insertdata.led_80w;
					}
					if(!empty(insertdata.led_110w)){
						location.led_110w= insertdata.led_110w;
					}
					if(!empty(insertdata.led_130w)){
						location.led_130w= insertdata.led_130w;
					}
					if(!empty(insertdata.led_140w)){
						location.led_140w= insertdata.led_140w;
					}
					if(!empty(insertdata.led_190w)){
						location.led_190w= insertdata.led_190w;
					}
					if(!empty(insertdata.led_200w)){
						location.led_200w= insertdata.led_200w;
					}

					//sql += "INSERT INTO master_location (feeder_pillar_no, state_id, zone_id, ulb_id, ward_no, total_load, no_of_fittings, location, location_lat, location_lng) VALUES ('"+insertdata.feeder_pillar_no+"', '"+insertdata.state_id+"', '"+insertdata.zone_id+"', '"+insertdata.ulb_id+"', '"+insertdata.ward_no+"', '"+insertdata.total_load+"', '"+insertdata.no_of_fittings+"', '"+insertdata.location+"', '"+insertdata.location_lat+"', '"+insertdata.location_lng+"');";
					sql += "INSERT INTO master_location SET ?, insert_time=NOW(), update_time=NOW();";




					sql += "INSERT INTO device_last_data (imei_no) VALUES ('"+insertdata.imei_no+"');";

					var query = connection.query(sql, [device, location], function (err, results) {
						connection.release();
					  	if (err) {
					  		var mess = {'error':1,'message':'Error!','result':0};
							res.send(JSON.stringify(mess));
					  	}else{
					  		var mess = {'error':0,'message':'Device Added Successfully!','result':1};
							res.send(JSON.stringify(mess));
					  	}
					})
			  	}

			 	
			});
		});

		
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
	
});

router.post('/api/device-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.imei_no != ''){

		var device = {
			mobile_no: updatedata.mobile_no,
			device_type: updatedata.device_type
		}

		var sql = "UPDATE master_device SET ? WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";


		var location = {
			state_id: updatedata.state_id,
			zone_id: updatedata.zone_id,
			ulb_id: updatedata.ulb_id,
			ward_no: updatedata.ward_no,
			total_load: updatedata.total_load,
			no_of_fittings: updatedata.no_of_fittings,
			location: updatedata.location,
			location_lat: updatedata.location_lat,
			location_lng: updatedata.location_lng
		}
		if(!empty(updatedata.previous_load)){
			location.previous_load= updatedata.previous_load;
		}else{
			location.previous_load= 0;
		}
		if(!empty(updatedata.meter_type)){
			location.meter_type= updatedata.meter_type;
		}
		if(!empty(updatedata.led_18w)){
			location.led_18w= updatedata.led_18w;
		}
		if(!empty(updatedata.led_24w)){
			location.led_24w= updatedata.led_24w;
		}
		if(!empty(updatedata.led_35w)){
			location.led_35w= updatedata.led_35w;
		}
		if(!empty(updatedata.led_45w)){
			location.led_45w= updatedata.led_45w;
		}
		if(!empty(updatedata.led_70w)){
			location.led_70w= updatedata.led_70w;
		}
		if(!empty(updatedata.led_75w)){
			location.led_75w= updatedata.led_75w;
		}
		if(!empty(updatedata.led_110w)){
			location.led_110w= updatedata.led_110w;
		}
		if(!empty(updatedata.led_140w)){
			location.led_140w= updatedata.led_140w;
		}
		if(!empty(updatedata.led_190w)){
			location.led_190w= updatedata.led_190w;
		}

		//sql += "UPDATE master_location SET state_id='"+updatedata.state_id+"', zone_id='"+updatedata.zone_id+"', ulb_id='"+updatedata.ulb_id+"', ward_no='"+updatedata.ward_no+"', total_load='"+updatedata.total_load+"', no_of_poles='0', no_of_fittings='"+updatedata.no_of_fittings+"', location='"+updatedata.location+"', location_lat='"+updatedata.location_lat+"', location_lng='"+updatedata.location_lng+"' WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";
		sql += "UPDATE master_location SET ?, update_time=NOW() WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";


		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, [device, location], function (error, result) {
				//connection.release();

			  	if (error) {
			  		console.log(error);
			  		var mess = {'error':1,'message':'Server error!', 'result':''};
					res.send(JSON.stringify(mess));
			  	}else{
			  		var mess = {'error':0,'message':'Device Updated Successfully!','result':1};
					res.send(JSON.stringify(mess));
			  	}
			});
		});
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
router.post('/api/device-import', async function(req, res, next) {
	const fs = require('fs');
	const csv = require('csv-parser');

	var ulb_id = req.body.ulb_id;

	console.log('----- CHECK UPLOAD PRODUCT IMPORT CSV  AUTHENTICATION ----- ' );
    
    var user_id = req.user_id;
    //console.log(JSON.stringify(req.files));
    
    if (!req.files || Object.keys(req.files).length === 0) {
        req.upload_csv = '';
        console.log('No CSV File');
        var mess = {'error':1,'message':'No Upload Files!','result':0};
		res.send(JSON.stringify(mess));
        //next();
    }else{
        var csvfile = req.files.csvfile;
        //console.log('IMAG E' +imagefile.name);
        if(!empty(csvfile)){
        	//pool.getConnection(function(err, connection) {
			//if (err) console.log(err);

	        	
	            fs.createReadStream(csvfile.tempFilePath)
			    .pipe(csv())
			    .on('data', (data) => {
			    	//console.log('>>>>'+data.feeder_pillar_no+' '+data.imei_no.toString()+' '+data.mobile_no);
			    	
			    	if(!empty(data.feeder_pillar_no)){
			    		if(data.ulb_id == ulb_id){
			    			import_data.push(data);	
			    		}
			    		
				    }
			    })
			    .on('end', async () => {
			    	console.log("END");

			    	import_index = 0;
					insertdevice(res);
			    });

           // var csvext = csvinfo[csvinfo.length-1];


            /*var fs = require('fs');

            var dt = new Date();
            var year = dt.getFullYear();
            var month = ('0' + (dt.getMonth()+1)).slice(-2);
            //var date = ('0' + dt.getDate()).slice(-2);
            var folder = config.ROOT_PATH+'/imports/'+year+'/'+month;
            fs.mkdir(folder, { recursive: true }, function(err) {
                if (err) {
                    console.log(err)
                } else {
                    const { v4: uuidv4 } = require('uuid');
                    var uuid = uuidv4();
                    var csvfilepath = folder+'/'+uuid+'.csv';
                    csvfile.mv(csvfilepath, function(err) {
                        if (err)
                            return res.status(500).send(err);
                    
                        req.upload_csv = year+'/'+month+'/'+uuid+'.csv';
                        req.uuid = uuid;
                        console.log('CSV File Uploaded');
                        next();
                    });
                }
            }) */

            //});
            
        }else{
            req.upload_csv = '';
            console.log('No CSV File format');
            var mess = {'error':1,'message':'Failed!','result':0};
			res.send(JSON.stringify(mess));
            //next();
        }
    }
	return;
	if(insertdata.imei_no != '' && insertdata.imei_no.length == 15){

		pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = "SELECT * from master_device WHERE imei_no=?";

			connection.query(sql, [insertdata.imei_no], function (error, result) {
				//connection.release();

			  	if (error) {
			  		console.log(error);
			  		var mess = {'error':1,'message':'Server error!', 'result':''};
					res.send(JSON.stringify(mess));
			  	}
			  	if(result.length > 0){
			  		var mess = {'error':1,'message':'Imei allready exist!', 'result':''};
					res.send(JSON.stringify(mess));
			  	}else{

			  		var device = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						device_type: insertdata.device_type,
						device_no: insertdata.device_no
					}
					var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

					var location = {
						feeder_pillar_no: insertdata.feeder_pillar_no,
						state_id: insertdata.state_id,
						zone_id: insertdata.zone_id,
						ulb_id: insertdata.ulb_id,
						ward_no: insertdata.ward_no,
						total_load: insertdata.total_load,
						no_of_fittings: insertdata.no_of_fittings,
						location: insertdata.location,
						location_lat: insertdata.location_lat,
						location_lng: insertdata.location_lng
					}
					if(!empty(insertdata.previous_load)){
						location.previous_load= insertdata.previous_load;
					}else{
						location.previous_load= 0;
					}
					if(!empty(insertdata.meter_type)){
						location.meter_type= insertdata.meter_type;
					}
					if(!empty(insertdata.led_18w)){
						location.led_18w= insertdata.led_18w;
					}
					if(!empty(insertdata.led_24w)){
						location.led_24w= insertdata.led_24w;
					}
					if(!empty(insertdata.led_35w)){
						location.led_35w= insertdata.led_35w;
					}
					if(!empty(insertdata.led_45w)){
						location.led_45w= insertdata.led_45w;
					}
					if(!empty(insertdata.led_70w)){
						location.led_70w= insertdata.led_70w;
					}
					if(!empty(insertdata.led_75w)){
						location.led_75w= insertdata.led_75w;
					}
					if(!empty(insertdata.led_110w)){
						location.led_110w= insertdata.led_110w;
					}
					if(!empty(insertdata.led_140w)){
						location.led_140w= insertdata.led_140w;
					}
					if(!empty(insertdata.led_190w)){
						location.led_190w= insertdata.led_190w;
					}

					//sql += "INSERT INTO master_location (feeder_pillar_no, state_id, zone_id, ulb_id, ward_no, total_load, no_of_fittings, location, location_lat, location_lng) VALUES ('"+insertdata.feeder_pillar_no+"', '"+insertdata.state_id+"', '"+insertdata.zone_id+"', '"+insertdata.ulb_id+"', '"+insertdata.ward_no+"', '"+insertdata.total_load+"', '"+insertdata.no_of_fittings+"', '"+insertdata.location+"', '"+insertdata.location_lat+"', '"+insertdata.location_lng+"');";
					sql += "INSERT INTO master_location SET ?;";




					sql += "INSERT INTO device_last_data (imei_no) VALUES ('"+insertdata.imei_no+"');";

					connection.query(sql, [device, location], function (err, results) {
						connection.release();
					  	if (err) {
					  		var mess = {'error':1,'message':'Error!','result':0};
							res.send(JSON.stringify(mess));
					  	}else{
					  		var mess = {'error':0,'message':'Device Added Successfully!','result':1};
							res.send(JSON.stringify(mess));
					  	}
					})
			  	}

			 	
			});
		});

		
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

function insertdevice(res){
	const fs = require('fs');
	
	if(import_index < import_data.length){
		var data = import_data[import_index];
		import_index++;

		if(data.mobile_no == 0){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Missing Mobile Number'});
			insertdevice(res);
		}else{
			pool.getConnection(function(err, connection) {
				if (err){
					console.log(err);
				}else{
					var sql = "SELECT * from master_device WHERE imei_no=? OR mobile_no=?";

					connection.query(sql, [data.imei_no, data.mobile_no], function (error, result) {
						//connection.release();
					  	if (error) {
					  		console.log(error);
					  		import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Connection Error'});
					  		insertdevice(res);
					  	}
					  	if(result.length > 0) {
					  		import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Allready Exist'});
					  		insertdevice(res);
					  	}else{
					  		
					  		var device = {
								imei_no: data.imei_no,
								feeder_pillar_no: data.feeder_pillar_no,
								mobile_no: data.mobile_no,
								device_type: "CCMS",
								device_no: data.meter_no
							}
							var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

							var location = {
								feeder_pillar_no: data.feeder_pillar_no,
								state_id: data.state_id,
								zone_id: data.zone_id,
								ulb_id: data.ulb_id,
								ward_no: data.feeder_pillar_no,
								total_load: data.total_load,
								no_of_fittings: data.no_of_fittings,
								location: data.location,
								location_lat: data.location_lat,
								location_lng: data.location_lng
							}
							if(!empty(data.previous_load)){
								location.previous_load= data.previous_load;
							}else{
								location.previous_load= 0;
							}
							if(!empty(data.meter_type)){
								location.meter_type= data.meter_type;
							}
							if(!empty(data.led_18w)){
								location.led_18w= data.led_18w;
							}
							if(!empty(data.led_24w)){
								location.led_24w= data.led_24w;
							}
							if(!empty(data.led_35w)){
								location.led_35w= data.led_35w;
							}
							if(!empty(data.led_45w)){
								location.led_45w= data.led_45w;
							}
							if(!empty(data.led_60w)){
								location.led_60w= data.led_60w;
							}
							if(!empty(data.led_70w)){
								location.led_70w= data.led_70w;
							}
							if(!empty(data.led_75w)){
								location.led_75w= data.led_75w;
							}
							if(!empty(data.led_80w)){
								location.led_80w= data.led_80w;
							}
							if(!empty(data.led_110w)){
								location.led_110w= data.led_110w;
							}
							if(!empty(data.led_130w)){
								location.led_130w= data.led_130w;
							}
							if(!empty(data.led_140w)){
								location.led_140w= data.led_140w;
							}
							if(!empty(data.led_190w)){
								location.led_190w= data.led_190w;
							}
							if(!empty(data.led_200w)){
								location.led_200w= data.led_200w;
							}

							sql += "INSERT INTO master_location SET ?;";

							sql += "INSERT INTO device_last_data (imei_no) VALUES ('"+data.imei_no+"');";

							connection.query(sql, [device, location], function (err, results) {
								connection.release();
							  	if (err) {
							  		import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Insert Error'});
							  	}else{
							  		import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Added Successfully'});
							  	}
							  	insertdevice(res);
							})
					  	}

					  	//insertdevice(res);
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
	var sql = "SELECT id, state, title, title as ulb, areacode, location, parent, zoom, previous_load, tariff_rate, on_time, off_time, status FROM master_zone WHERE parent != 0 ORDER BY title ASC";

	var finalarr = [];

	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database connection error!','result':[]};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, function (error, results) {
				connection.release();

			 	var mess = {'error':0,'message':'Zone records!','result':results};
				res.send(JSON.stringify(mess));
			});
		}
	});
	/*conn.query(sql, function (error, results, fields) {
	  	if (error) {
	  		console.log(error);
	  	}

	  	results.forEach(row => { 
			var sql2 = "SELECT id, state, '"+row.title+"' as title, title as ulb, areacode, location, parent, zoom, previous_load, tariff_rate, on_time, off_time, status FROM master_zone WHERE parent = "+row.id;

			
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
	})*/
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
		if(!empty(insertdata.previous_load)){
			insertq.previous_load = insertdata.previous_load;
		}
		if(!empty(insertdata.location)){
			insertq.location = insertdata.location;
		}
		if(!empty(insertdata.tariff_rate)){
			insertq.tariff_rate = insertdata.tariff_rate;
		}
		if(!empty(insertdata.on_time)){
			insertq.on_time = insertdata.on_time;
		}
		if(!empty(insertdata.off_time)){
			insertq.off_time = insertdata.off_time;
		}
		var sql = 'INSERT INTO master_zone SET ? ';

		//var sql = "INSERT INTO master_zone (state, title, location, areacode, parent, zoom, on_time, off_time, status) VALUES ('"+insertdata.state+"', '"+insertdata.title+"', '"+insertdata.location+"', '"+insertdata.areacode+"', '"+insertdata.parent+"', '"+insertdata.zoom+"', '"+insertdata.on_time+"', '"+insertdata.off_time+"', '"+insertdata.status+"');";

		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database connection error!','result':[]};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, insertq, function (error, results) {
					connection.release();

				 	if(insertdata.parent > 0){
			  			var insertq = {
							ulb_id: results.insertId
						}
			  			var sql = "INSERT INTO report_ulb SET ?, update_time = NOW();";

			  			POOLDB[req.hostname].getConnection(function(err, connection) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Database connection error!','result':[]};
								res.send(JSON.stringify(mess));
							}else{
								connection.query(sql, insertq, function (error, results) {
									connection.release();
									if (err) {
								  		var mess = {'error':1,'message':'Error!','result':0};
										res.send(JSON.stringify(mess));
								  	}else{
								  		var mess = {'error':0,'message':'Zone | ULB Added Successfully!','result':1};
										res.send(JSON.stringify(mess));
								  	}
								});
							}
						});
			  		}else{
			  			var mess = {'error':0,'message':'Zone | ULB Added Successfully!','result':1};
						res.send(JSON.stringify(mess));
			  		}
				});
			}
		});

	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/zone-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.id != ''){
		var updateq = {
			state: updatedata.state,
			parent: updatedata.parent,
			zoom: updatedata.zoom,
			areacode: updatedata.areacode,
			title: updatedata.title,
			location: updatedata.location,
			status: updatedata.status
		}
		if(!empty(updatedata.previous_load)){
			updateq.previous_load = updatedata.previous_load;
		}
		if(!empty(updatedata.tariff_rate)){
			updateq.tariff_rate = updatedata.tariff_rate;
		}
		if(!empty(updatedata.on_time)){
			updateq.on_time = updatedata.on_time;
		}
		if(!empty(updatedata.off_time)){
			updateq.off_time = updatedata.off_time;
		}
		
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);
			
			var sql = 'UPDATE master_zone SET ? , update_time = NOW() WHERE id="'+updatedata.id+'"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();
				
				if (error) {
					var mess = {'error':1,'message':'Connection Error!','result':0};
					res.send(JSON.stringify(mess));
				}else{
					if (err) {
				  		var mess = {'error':1,'message':'Update Error!','result':0};
						res.send(JSON.stringify(mess));
				  	}else{
				  		var mess = {'error':0,'message':'Zone Updated Successfully!','result':1};
						res.send(JSON.stringify(mess));
				  	}
				}
			})
		});






		/*var sqlpart = '';
		if(!empty(updatedata.tariff_rate)){
			sqlpart += "tariff_rate='"+updatedata.tariff_rate+"' ";
		}
		if(!empty(updatedata.on_time)){
			sqlpart += "on_time='"+updatedata.on_time+"' ";
		}
		if(!empty(updatedata.off_time)){
			sqlpart += "off_time='"+updatedata.off_time+"' ";
		}
		var sql = "UPDATE master_zone SET state='"+updatedata.state+"', parent='"+updatedata.parent+"', zoom='"+updatedata.zoom+"', previous_load='"+updatedata.previous_load+"', areacode='"+updatedata.areacode+"', title='"+updatedata.title+"', location='"+updatedata.location+"', "+sqlpart+", status='"+updatedata.status+"' WHERE id='"+updatedata.id+"';";

		//sql += "UPDATE master_zone SET tariff_rate='"+updatedata.tariff_rate+"', on_time='"+updatedata.on_time+"', off_time='"+updatedata.off_time+"' WHERE parent='"+updatedata.id+"'";

		conn.query(sql, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Zone Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})*/
	}else{
		var mess = {'error':1,'message':'Update Failed!','result':0};
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
	var imei_no = req.body.imeino;
	if(imei_no != ''){
		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT datalength, supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, meter_phase_type, output_status FROM device_received_data WHERE imei_no=? ORDER BY id DESC LIMIT 25;';
			sql += 'SELECT ml.location, ml.meter_type FROM master_device md LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no WHERE md.imei_no = ?;';
		
			connection.query(sql, [imei_no, imei_no], function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {
			  		records: result[0],
			  		location: result[1][0]['location'],
			  		device: result[1][0]
			  	};

			 	var mess = {'error':0,'message':'Device records!','result':o};
				res.send(JSON.stringify(mess));
			});
		});
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
router.post('/api/login', function(req, res, next) {
	var email = req.body.email;
	var pass = req.body.pass;
	//var email = req.query.email;
	//var pass = req.query.pass;

	console.log("HOST NAME "+req.hostname+" "+POOLDB[req.hostname]);

	POOLDB[req.hostname].getConnection(function(pool_err, connection) {
		if (pool_err) console.log(pool_err);

		var sql = 'SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))';
	
		connection.query(sql, function (usr_err, usr_result) {
			connection.release();

			if (usr_err) {
		  		console.log(usr_err);
				var mess = {'error':1, 'message':'Database Issue!', 'result':{}};
				res.send(JSON.stringify(mess));
		  	}else{
		 	// console.log('The solution is: ', rows[0].device_id)
				if(usr_result.length > 0){
					var access_key = new Date().getTime();
					var user_id = usr_result[0].id;
					var sql = '';

					if(usr_result[0].multi_login == 0 || usr_result[0].multi_login == '0'){
						sql += 'UPDATE access_permission SET is_valid=0 WHERE user_id="'+user_id+'";';
					}
					sql += 'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("'+user_id+'","'+access_key+'",1,NOW())';

					POOLDB[req.hostname].getConnection(function(err, connection) {
						if (err) console.log(err);

						connection.query(sql, function (perm_err, perm_result) {
							if (perm_err) {
								console.log(perm_err);
							}

							var o = {};
								o.access_key = access_key;
								o.user_id = usr_result[0].user_id;
								o.username = usr_result[0].username;
								o.email = usr_result[0].email;
								o.role = usr_result[0].role;
								o.permissions = usr_result[0].permissions;
								o.role_title = usr_result[0].role_title;
								o.options = usr_result[0].options;
							var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
							res.send(JSON.stringify(mess));

						});
					});
				}else{
					var mess = {'error':1, 'message':'Incrorrect Email or Password!', 'result':{}};
					res.send(JSON.stringify(mess));
				}
			}
		});
	});
	
	/*conn.query('SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))', function (usr_err, usr_rows, usr_fields) {
	  	if (usr_err) {
	  		console.log(usr_err);
			var mess = {'error':1, 'message':'Database Issue!', 'result':{}};
			res.send(JSON.stringify(mess));
	  	}else{
	 	// console.log('The solution is: ', rows[0].device_id)
			if(usr_rows.length > 0){
				var access_key = new Date().getTime();
				var user_id = usr_rows[0].id;
				var sql = '';
				if(usr_rows[0].multi_login == 0 || usr_rows[0].multi_login == '0'){
					sql += 'UPDATE access_permission SET is_valid=0 WHERE user_id="'+user_id+'";';
				}
				sql += 'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("'+user_id+'","'+access_key+'",1,NOW())';
				conn.query(sql, function (perm_err, perm_rows, perm_fields) {
					if (perm_err) {
						console.log(perm_err);
					}
					var o = {};
						o.access_key = access_key;
						o.user_id = usr_rows[0].user_id;
						o.username = usr_rows[0].username;
						o.email = usr_rows[0].email;
						o.role = usr_rows[0].role;
						o.permissions = usr_rows[0].permissions;
						o.role_title = usr_rows[0].role_title;
						o.options = usr_rows[0].options;
					var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
					res.send(JSON.stringify(mess));
				})
			}else{
				var mess = {'error':1, 'message':'Incrorrect Email or Password!', 'result':{}};
				res.send(JSON.stringify(mess));
			}
		}
	})*/
});

router.post('/api/change-password', checkAuth, function(req, res, next) {
	var cp = req.body.data.cp;
	var np = req.body.data.np;
	var ak = req.body.accesskey;

	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "UPDATE users SET password=MD5('"+np+"') WHERE id=(SELECT user_id FROM access_permission WHERE access_key = '"+ak+"') AND password=MD5('"+cp+"');";
		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Connection error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		var mess = {};
		  		if(result.affectedRows){
			  		mess = {'error':0, 'message':'Change Password Successfully!', 'result':0};
			  	}else{
			  		mess = {'error':1, 'message':'Wrong current password or new password! Try Again!', 'result':0};
			  	}
				res.send(JSON.stringify(mess));
			}
		});
	});
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
		
		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = "INSERT INTO users (username, email, password, role, secure_code, permissions, status) VALUES ('"+insertdata.username+"', '"+insertdata.email+"', '"+password+"', '"+insertdata.role+"', '"+insertdata.secure_code+"', '"+JSON.stringify(insertdata.permissions)+"', '"+insertdata.status+"');";
			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
					var mess = {'error':0,'message':'Controller Added Successfully!','result':1};
					res.send(JSON.stringify(mess));
				}
			});
		});
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


		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
					var mess = {'error':0,'message':'Record deleted!','result':1};
					res.send(JSON.stringify(mess));
				}
			});
		});
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

	POOLDB[req.hostname].getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var mess = {'error':0,'message':'User Roles!','result':result};
				res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post('/api/role-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
	if(insertdata.options != ''){
		var sql = "INSERT INTO user_roles (title, options, status) VALUES ('"+insertdata.title+"', '"+ JSON.stringify(insertdata.options)+"', '"+insertdata.status+"');";

		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
					var mess = {'error':0,'message':'Role Added Successfully!','result':1};
					res.send(JSON.stringify(mess));
				}
			});
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}
});
router.post('/api/role-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	if(updatedata.id != ''){
		var sql = "UPDATE user_roles SET status='"+updatedata.status+"', options='"+JSON.stringify(updatedata.options)+"' WHERE id='"+updatedata.id+"';";

		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
					var mess = {'error':0,'message':'User Role Updated Successfully!','result':1};
					res.send(JSON.stringify(mess));
				}
			});
		});
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
		if(!empty(insertdata.location)){
			insertq.location = insertdata.location;
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

router.post('/api/ulb-locations', checkAuth, function(req, res, next) {
	var ulb_id = req.body.ulb_id;
	var user_id = req.user_id;
	
	if(ulb_id > 0){
		
		
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);
			
			var sql = 'SELECT feeder_pillar_no fpno, location FROM master_location WHERE ulb_id="'+ulb_id+'"';

			connection.query(sql, function (error, result) {
				connection.release();
				
				if (error) {
					var mess = {'error':1,'message':'Error!','result':0};
					res.send(JSON.stringify(mess));
				}else{
					var o = {
						locations: result
					};
					var mess = {'error':0,'message':'Get All Location Successfully!','result':o};
					res.send(JSON.stringify(mess));
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


		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT if(supply>120, 'BATTERY', 'MAIN'), if(voltage_r/100 < 80,0,voltage_r/100), if(voltage_y/100 < 80,0,voltage_y/100), if(voltage_b/100 < 80,0,voltage_b/100), if(output_status=0, if(amp_r/1000 < 2.3, 0, amp_r/1000), amp_r/1000), if(output_status=0, if(amp_y/1000 < 2.3, 0, amp_y/1000), amp_y/1000), if(output_status=0, if(amp_b/1000 < 2.3, 0, amp_b/1000), amp_b/1000), kw_r/100000, kw_y/100000, kw_b/100000, kwh/100, total_kw/100000, update_time, if(door_status=1, 'OPENED', 'CLOSED'), if(output_status=1, 'ON', 'OFF') FROM device_received_data_clone WHERE imei_no='"+insertdata.imei_no+"' AND data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
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


		var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT if(drd.supply>120, 'BATTERY', 'MAIN'), if(drd.voltage_r/100 < 80,0,drd.voltage_r/100), if(drd.voltage_y/100 < 80,0,drd.voltage_y/100), if(drd.voltage_b/100 < 80,0,drd.voltage_b/100), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_r/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_y/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_b/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_r/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_y/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_b/100000), drd.kwh/100, if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.total_kw/100000), drd.update_time, if(drd.door_status=1, 'OPENED', 'CLOSED'), if(drd.output_status=1, 'ON', 'OFF') FROM device_received_data_clone drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no WHERE md.feeder_pillar_no='"+insertdata.feeder_pillar_no+"' AND drd.data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
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
	var sql = "SELECT * FROM daily_reports WHERE type='"+type+"' AND (user_id='"+user_id+"' OR user_id='1') ORDER BY id DESC LIMIT 250;";
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

		var insertdata = req.body.data;
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;


		var sql = "SELECT 'DISTRICT', 'LOCATION', 'FEEDER PILLAR', 'TOTAL LOAD (KW)','START TIME','START LOAD (KW)','END TIME','END LOAD (KW)' UNION ALL SELECT mz2.title, ml.location, ov.fp_no, (ml.total_load/1000), ov.start_time, (ov.start_load/100000), ov.end_time, (ov.end_load/100000) FROM report_overload ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.district=mz2.id LEFT JOIN master_location ml ON ml.feeder_pillar_no = ov.fp_no WHERE ml.total_load < (ov.start_load/100) AND ov.start_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.id='"+insertdata.ulb+"' INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		

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
	}else if(type == "ANALYSIS"){
		var unique_id = new Date().getTime();
		
		var filename = 'report-analysis-'+insertdata.ulb+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.csv';
		var filenamepdf = 'report-analysis-'+insertdata.ulb+'-'+insertdata.start_date+'-'+insertdata.end_date+'-'+unique_id+'.pdf';
		var tmppath = path.join(__dirname, '../public/exports/'+filename);
		var tmppathpdf = path.join(__dirname, '../public/exports/'+filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");
		
		var mysqlpath = '/var/lib/mysql-files/'+filename;

		var report_id = '';
		var sql="";
		if(insertdata.ulb != ''){
			sql = "SELECT 'Name of City', 'Date Time','Zone / ULB','Ward','UID No', 'Location', 'Mode', 'Ontime', 'Relay', 'R_Voltage', 'Y_Voltage', 'B_Voltage', 'R_Current', 'Y_Current', 'B_Current', 'R_KW', 'Y_KW', 'B_KW', 'R_PF', 'Y_PF', 'B_PF', 'Error', 'Phase', 'Units Consumed' UNION ALL SELECT 'MH', drd.update_time, mz.title, ml.ward_no, drd.imei_no, ml.location, 'Auto', drd.io_stamp, if(drd.output_status=1,'ON','OFF'), drd.voltage_r/100, drd.voltage_y/100, drd.voltage_b/100, drd.amp_r/1000, drd.amp_y/1000, drd.amp_b/1000, drd.kw_r/100000, drd.kw_y/100000, drd.kw_b/100000, drd.pf_r/100, drd.pf_y/100, drd.pf_b/100, '', 'Three', drd.kwh/100 from device_received_data_clone drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no LEFT JOIN master_zone mz ON mz.id=ml.ulb_id WHERE drd.update_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.update_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND ((drd.voltage_r<18000 OR drd.voltage_y<18000 OR drd.voltage_b<18000) OR (drd.voltage_r=0 AND drd.voltage_y=0 AND drd.voltage_b=0))  AND ml.ulb_id='"+insertdata.ulb+"' GROUP BY hour( drd.update_time ) , day( drd.update_time ) INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';" ;
		}

		var ulb = 'ULB :   '+insertdata.ulb;
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
						var insertq = {
							user_id: user_id,
							type: type,
							report_id: report_id,
							report_date: insertdata.start_date+' - '+insertdata.end_date,
							records: results.affectedRows - 1,
							link: filename,
							pdf: 0,
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
		var sql = "SELECT * FROM device_fault WHERE imei_no='"+imeino+"' ORDER BY id DESC LIMIT 50";
		
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


router.post('/api/replacepanel-record', checkAuth, function(req, res, next) {
//	var imeino = req.body.imeino;
//	if(imeino != ''){

	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "SELECT * FROM replace_devices ORDER BY id DESC LIMIT 100";
		
		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		 	var mess = {'error':0,'message':'Replace device records!','result':result};
			res.send(JSON.stringify(mess));
		})
	});	
});

router.post('/api/replacepanel-insert', checkAuth, function(req, res, next) {
	var insertdata = req.body.data;
		
	var insertq = {
		feeder_pillar_no: insertdata.feeder_pillar_no,
	}
	var sql = 'INSERT INTO replace_devices SET ?, insert_time=NOW();';
	if(!empty(insertdata.new_imei_no)){
		insertq.new_imei_no = insertdata.new_imei_no;

		if(!empty(insertdata.replace_imei_no)){
			insertq.replace_imei_no = insertdata.replace_imei_no;	
		}

		sql += 'UPDATE master_device SET imei_no = "'+insertdata.new_imei_no+'" WHERE feeder_pillar_no="'+insertdata.feeder_pillar_no+'";';
		sql += 'UPDATE master_location SET imei_no = "'+insertdata.new_imei_no+'" WHERE feeder_pillar_no="'+insertdata.feeder_pillar_no+'";';
		sql += 'INSERT INTO device_last_data SET imei_no="'+insertdata.new_imei_no+'";';
		sql += 'DELETE FROM device_last_data WHERE imei_no="'+insertdata.replace_imei_no+'";';	
	}
	

	if(!empty(insertdata.new_meter_no)){
		insertq.new_meter_no = insertdata.new_meter_no;

		if(!empty(insertdata.replace_meter_no)){
			insertq.replace_meter_no = insertdata.replace_meter_no;

			sql += 'UPDATE master_device SET device_no = "'+insertdata.new_meter_no+'" WHERE feeder_pillar_no="'+insertdata.feeder_pillar_no+'";';
			sql += 'UPDATE master_location SET meter_no = "'+insertdata.new_meter_no+'" WHERE feeder_pillar_no="'+insertdata.feeder_pillar_no+'";';
		}
	}

	sql += 'INSERT INTO replace_device_last_data (total_kw, total_kva, meter_no, imei_no, update_time) SELECT COALESCE(total_kw, 0) as total_kw, COALESCE(total_kva, 0) as total_kva, meter_no, imei_no, update_time FROM device_last_data WHERE imei_no=?;';
	
	if(!empty(insertdata.replace_time)){
		insertq.replace_time = insertdata.replace_time;
	}
	
	
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);
		
		

		connection.query(sql, [insertq, insertdata.replace_imei_no], function (error, result) {
			connection.release();
			
			if (error) {
				var mess = {'error':1,'message':'Error!','result':0};
				res.send(JSON.stringify(mess));
			}else{
				var mess = {'error':0,'message':'Replace Device Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
			}
		})
	});
});

/************************************************* ZONE METHODS END *****************************************/

router.post('/api/doorstatus-record', checkAuth, function(req, res, next) {
	var imei_no = req.body.imeino;
	if(imei_no != ''){
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT md.imei_no, md.feeder_pillar_no, dld.amp_r, dld.amp_y, dld.amp_b, dld.update_time, dld.power_cut, dld.door_status, dld.output_status FROM device_last_data dld LEFT JOIN master_device md ON dld.imei_no=md.imei_no LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no WHERE dld.door_status=1;';
		
			connection.query(sql, [imei_no, imei_no], function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
			  	}
			  	var o = {
			  		records: result[0],
			  		location: result[1][0]['location']
			  	};

			 	var mess = {'error':0,'message':'Device records!','result':o};
				res.send(JSON.stringify(mess));
			});
		});
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});


router.post('/api/devicecorrection-records', checkAuth, function(req, res, next) {
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = 'SELECT md.imei_no, md.feeder_pillar_no, md.mobile_no, md.insert_time FROM master_device md LEFT JOIN master_location ml ON ml.feeder_pillar_no = md.feeder_pillar_no WHERE ml.feeder_pillar_no IS NULL;';
		sql += 'SELECT md.imei_no, md.feeder_pillar_no, md.mobile_no, md.insert_time FROM master_device md LEFT JOIN device_last_data dld ON dld.imei_no = md.imei_no WHERE dld.imei_no IS NULL;';
	
		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {
		  		locations: result[0],
		  		translastdata: result[1],
		  		zones: []
		  	};

		 	var mess = {'error':0,'message':'Device records!','result':o};
			res.send(JSON.stringify(mess));
		});
	});
});

router.post('/api/devicecorrection-update', checkAuth, function(req, res, next) {
	var updatedata = req.body.data;
	var type = req.body.type;
	if(type == 'location'){
		if(updatedata.imei_no != ''){
			var location = {
				state_id: updatedata.state_id,
				zone_id: updatedata.zone_id,
				ulb_id: updatedata.ulb_id,
				imei_no: updatedata.imei_no,
				mobile_no: updatedata.mobile_no,
				feeder_pillar_no: updatedata.feeder_pillar_no,
				ward_no: updatedata.ward_no,
				total_load: updatedata.total_load,
				no_of_fittings: updatedata.no_of_fittings,
				location: updatedata.location,
				location_lat: updatedata.location_lat,
				location_lng: updatedata.location_lng
			}
			if(!empty(updatedata.previous_load)){
				location.previous_load= updatedata.previous_load;
			}else{
				location.previous_load= 0;
			}
			if(!empty(updatedata.device_no)){
				location.meter_no= updatedata.device_no;
			}
			if(!empty(updatedata.meter_type)){
				location.meter_type= updatedata.meter_type;
			}
			if(!empty(updatedata.led_18w)){
				location.led_18w= updatedata.led_18w;
			}
			if(!empty(updatedata.led_24w)){
				location.led_24w= updatedata.led_24w;
			}
			if(!empty(updatedata.led_35w)){
				location.led_35w= updatedata.led_35w;
			}
			if(!empty(updatedata.led_45w)){
				location.led_45w= updatedata.led_45w;
			}
			if(!empty(updatedata.led_70w)){
				location.led_70w= updatedata.led_70w;
			}
			if(!empty(updatedata.led_75w)){
				location.led_75w= updatedata.led_75w;
			}
			if(!empty(updatedata.led_110w)){
				location.led_110w= updatedata.led_110w;
			}
			if(!empty(updatedata.led_140w)){
				location.led_140w= updatedata.led_140w;
			}
			if(!empty(updatedata.led_190w)){
				location.led_190w= updatedata.led_190w;
			}

			var sql = "INSERT master_location SET ? ;";

			conn.query(sql, location, function (err, results, fields) {
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
	}else{
		var sql = 'INSERT INTO device_last_data SET imei_no=?;';
		conn.query(sql, updatedata.imei_no, function (err, results, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Device Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})
	}
	
});


router.post('/api/pushdata-record', checkAuth, function(req, res, next) {
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = 'SELECT * FROM device_last_data WHERE is_valid=0;';
	
		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var o = {
		  		records: result[0]
		  	};
		  	if(result.length > 0){
		  		var o = {
			  		records: result
			  	};	
		  	}else{
		  		var o = {
			  		records: []
			  	};
		  	}

		 	var mess = {'error':0,'message':'Device records!','result':o};
			res.send(JSON.stringify(mess));
		});
	});
});
router.post('/api/pushdata-insert', checkAuth, function(req, res, next) {
	var data = req.body.data
	var imei_source = data.imei_source;
	var imei_target = data.imei_target;
	if(imei_source != ''){
		pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT * FROM device_last_data WHERE imei_no = ?;';
		
			connection.query(sql, imei_source, function (error, result) {
				//connection.release();

			  	if (error) {
			  		console.log(error);
			  		var mess = {'error':1,'message':'Database select error!','result':''};
					res.send(JSON.stringify(mess));
			  	}else {
			  		var newdata = result[0];
			  		delete newdata['id'];
			  		delete newdata['imei_no'];
			  		newdata['is_valid'] = 0;
			  		var sql = "UPDATE device_last_data SET ? WHERE imei_no = '"+imei_target+"';";

			  		connection.query(sql, newdata, function (error, result) {
						connection.release();

					  	if (error) {
					  		console.log(error);
					  		var mess = {'error':1,'message':'Database update error!','result':''};
							res.send(JSON.stringify(mess));
					  	}else{
					  		var mess = {'error':0,'message':'Data Updated!','result':''};
							res.send(JSON.stringify(mess));	
					  	}
					});
			  	}
			 	
			});
		});
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

module.exports = router;
