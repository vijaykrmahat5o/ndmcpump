var express = require('express');
var router = express.Router();
var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');

var moment = require('moment');


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

var scada_pool = mysql.createPool({
    connectionLimit : 40,
    host: 'localhost',
    user: 'i3wd_slc',
    password: 'xmwmce4celwi',
    database: 'i3wd_scada',
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
  res.render('index', { title: 'Express' });
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

	  	pool.getConnection(function(err, connection) {
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

/**** SCADA START ****/

router.post('/dashboard', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var sql = sql = "SELECT md.map_id, md.imei_no, md.circuit_info, md.device_info, dld.datalength, dld.amp_r, dld.amp_y, dld.amp_b, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no ORDER BY md.position ASC;";
	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'devices': results};
			 	var mess = {'error':0,'message':'Master devices!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});

router.post('/device-all', checkAuth, function(req, res, next) {
	var perms = req.permissions;

	var sql = sql = "SELECT title, imei_no FROM master_device ORDER BY position ASC;";
	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'devices': results};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});

router.post('/device-record', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	var imeino = req.body.imeino;

	var sql = sql = "SELECT md.circuit_info, md.device_info, md.breaker_info, dld.datalength, dld.voltage_r, dld.voltage_y, dld.voltage_b, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw, dld.pf, dld.frequency, dld.kva, dld.kwh, dld.spare_1, dld.spare_2, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no WHERE md.imei_no='"+imeino+"';";
	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'device': results[0]};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});


/**** SCADA END ****/




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

function insertdevice(res){
	const fs = require('fs');
	
	if(import_index < import_data.length){
		var data = import_data[import_index];
		import_index++;

		if(data.mobile_no == 0 || data.mobile_no == ""){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Missing Mobile Number'});
			insertdevice(res);
		}else if(data.feeder_pillar_no == 0 || data.feeder_pillar_no == ""){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Missing Feeder Piller Number'});
			insertdevice(res);
		}else if(data.imei_no == 0 || data.imei_no == ""){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Missing Feeder Piller Number'});
			insertdevice(res);
		}else if(data.imei_no.length != 15){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Wrong IMEI Number'});
			insertdevice(res);
		}else{
			pool.getConnection(function(err, connection) {
				if (err){
					console.log(err);
					import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Pool Error'});
					insertdevice(res);
				}else{
					var sql = "SELECT * from master_device WHERE imei_no=? OR mobile_no=?";

					connection.query(sql, [data.imei_no, data.mobile_no], function (error, result) {
						connection.release();
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
							pool.getConnection(function(err, connection) {
								if (err){
									console.log(err);
									import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'mobile_no': data.mobile_no, 'status':'Pool Error'});
									insertdevice(res);
								}else{
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
							});
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


router.post('/login', function(req, res, next) {
	var email = req.body.email;
	var pass = req.body.pass;
	//var email = req.query.email;
	//var pass = req.query.pass;
	
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = 'SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))';
		connection.query(sql, function (error, results) {
			if (error) {
		  		console.log(error);
		  		connection.release();
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
		  		if(results.length > 0){
		  			var access_key = new Date().getTime();
					var user_id = results[0].id;
					var sql = '';
					if(results[0].multi_login == 0 || results[0].multi_login == '0'){
						sql += 'UPDATE access_permission SET is_valid=0 WHERE user_id="'+user_id+'";';
					}
					sql += 'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("'+user_id+'","'+access_key+'",1,NOW())';

					connection.query(sql, function (error, reso) {
						connection.release();

					  	if (error) {
					  		console.log(error);
							var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
							res.send(JSON.stringify(mess));
					  	}else{
					  		var o = {};
								o.access_key = access_key;
								o.user_id = results[0].user_id;
								o.username = results[0].username;
								o.email = results[0].email;
								o.role = results[0].role;
								o.permissions = results[0].permissions;
								o.role_title = results[0].role_title;
								o.options = results[0].options;
							var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
							res.send(JSON.stringify(mess));
						}
					});
						
		  		}else{
		  			connection.release();

		  			var mess = {'error':1, 'message':'Incrorrect Email or Password!', 'result':{}};
					res.send(JSON.stringify(mess));
		  		}
			}
		});
	})
});

router.post('/login2', function(req, res, next) {
	var email = req.body.email;
	var pass = req.body.pass;
	//var email = req.query.email;
	//var pass = req.query.pass;
	
	conn.query('SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))', function (usr_err, usr_rows, usr_fields) {
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
					// console.log('The solution is: ', rows[0].device_id)
					/*if(perm_rows.insert_id > 0){
						var o = {};
						o.access_key = access_key;
						o.user_id = usr_rows[0].user_id;
						o.email = usr_rows[0].email;
						var mess = {'error':0, 'message':'Login Successfully!', 'access_key':perm_rows};
					}else{
						var mess = {'error':0, 'message':'Error!', 'data':{}};
					}*/
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
	})
});

router.post('/api/change-password', checkAuth, function(req, res, next) {
	var cp = req.body.data.cp;
	var np = req.body.data.np;
	var ak = req.body.accesskey;
	
	conn.query("UPDATE users SET password=MD5('"+np+"') WHERE id=(SELECT user_id FROM access_permission WHERE access_key = '"+ak+"') AND password=MD5('"+cp+"')", function (error, result, field) {
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

/************************************************* COMPLAINTS METHODS END *****************************************/

router.post('/api/dailyreports-records', checkAuth, function(req, res, next) {

	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;
	
	var sql = "SELECT * FROM daily_reports WHERE type='"+type+"' AND (user_id='1') ORDER BY id DESC LIMIT 100";

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

		pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

			  	if (error) {
			  		console.log(error);
					var mess = {'error':1,'message':'Error in Export Database!','result':0};
					res.send(JSON.stringify(mess));
			  	}else{
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
			});
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}
});


router.post('/reports-records', checkAuth, function(req, res, next) {
	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;
	var state_perm = req.permissions.state_perm;
	var sql = "SELECT * FROM daily_reports WHERE type='"+type+"' ORDER BY id DESC LIMIT 100;";
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
router.post('/ui-report-2', checkAuth, function(req, res, next) {
	var perms = req.permissions;

	var datetime = req.body.datetime;

	var sql = "SELECT md.imei_no, md.title, md.circuit_info, md.device_info, dld.datalength, dld.voltage_r, dld.voltage_y, dld.voltage_b, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw, dld.pf, dld.frequency, dld.kva, dld.kwh, dld.spare_1, dld.spare_2, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN (SELECT * FROM `device_received_data` drd INNER JOIN (SELECT MAX(id) as cid FROM device_received_data WHERE update_time<='"+datetime+"' GROUP BY imei_no) as f ON drd.id=f.cid) as dld ON dld.imei_no = md.imei_no ORDER BY md.position ASC";

	//SELECT * FROM `device_received_data` drd INNER JOIN (SELECT MAX(id) as id FROM device_received_data GROUP BY imei_no) as f ON drd.id=f.id

	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'device': results, 'time': moment(datetime).tz("Asia/Calcutta").format()};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});
router.post('/ui-report', checkAuth, function(req, res, next) {
	var perms = req.permissions;

	var datetime = req.body.datetime;

	var sql = "SELECT md.imei_no, md.title, md.circuit_info, md.device_info, dld.datalength, dld.voltage_r, dld.voltage_y, dld.voltage_b, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw, dld.pf, dld.frequency, dld.kva, dld.kwh, dld.spare_1, dld.spare_2, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no ORDER BY md.position ASC;";



	//var sql = "SELECT md.imei_no, md.title, md.circuit_info, md.device_info, dld.datalength, dld.voltage_r, dld.voltage_y, dld.voltage_b, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw, dld.pf, dld.frequency, dld.kva, dld.kwh, dld.spare_1, dld.spare_2, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no WHERE dld.update_time<'"+datetime+"' ORDER BY md.position ASC LIMIT 10 ;";

	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'device': results, 'time': moment().tz("Asia/Calcutta").format()};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});
router.post('/device-report', checkAuth, function(req, res, next) {
	var perms = req.permissions;

	var imei_no = req.body.imei_no;
	var datefrom = req.body.datefrom;
	var dateto = req.body.dateto;


	

	var sql = "SELECT datalength, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw, pf, frequency, kva, kwh, spare_1, spare_2, input_1, input_2, input_3, IFNULL(supply, '') as supply, IFNULL(update_time, '') as update_time FROM device_received_data WHERE imei_no = '"+imei_no+"' AND update_time >='"+datefrom+"' AND update_time <='"+dateto+"' ORDER BY update_time DESC;";
	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'records': results, 'time': new Date()};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
	})
});
router.post('/daily-report', checkAuth, function(req, res, next) {
	var perms = req.permissions;


	
	var current_time = moment();
	var end_time = moment(moment().format('YYYY-MM-DD')+' 06:05:00');
	var start_time = moment(moment().format('YYYY-MM-DD')+' 06:05:00').subtract(1, 'days');
	var diff = current_time.diff(end_time, 'seconds');

	if(diff < 0){
		end_time = moment(moment().format('YYYY-MM-DD')+' 06:05:00').subtract(1, 'days');
		start_time = moment(moment().format('YYYY-MM-DD')+' 06:05:00').subtract(2, 'days');
	}

	console.log(moment(start_time).format('YYYY-MM-DD hh:mm:ss')+" => "+moment(end_time).format('YYYY-MM-DD hh:mm:ss'));


	var sql = "SELECT md.imei_no, md.title, '19.5 hr' avalibility, '24 hr' network_status, (SELECT count(id) FROM report_trips rt WHERE rt.imei_no=md.imei_no AND rt.insert_time >= '"+moment(start_time).format('YYYY-MM-DD hh:mm:ss')+"' AND rt.insert_time <= '"+moment(end_time).format('YYYY-MM-DD hh:mm:ss')+"') power_trips, '16 hr' on_hours, dld.datalength, dld.voltage_r, dld.voltage_y, dld.voltage_b, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw, dld.pf, dld.frequency, dld.kva, dld.kwh, (SELECT spare_1 FROM device_received_data drd WHERE drd.imei_no = md.imei_no AND drd.update_time >='"+moment(start_time).format('YYYY-MM-DD hh:mm:ss')+"' AND drd.update_time <= '"+moment(end_time).format('YYYY-MM-DD hh:mm:ss')+"' ORDER BY drd.update_time DESC LIMIT 1) as spare_1, (SELECT spare_2 FROM device_received_data drd WHERE drd.imei_no = md.imei_no AND drd.update_time >='"+moment(start_time).format('YYYY-MM-DD hh:mm:ss')+"' AND drd.update_time <= '"+moment(end_time).format('YYYY-MM-DD hh:mm:ss')+"' ORDER BY drd.update_time DESC LIMIT 1) as spare_2, dld.input_1, dld.input_2, dld.input_3, IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time, (SELECT kwh FROM device_received_data drd WHERE drd.imei_no = md.imei_no AND drd.update_time >='"+moment(start_time).format('YYYY-MM-DD hh:mm:ss')+"' AND drd.update_time <= '"+moment(end_time).format('YYYY-MM-DD hh:mm:ss')+"' ORDER BY drd.update_time ASC LIMIT 1) as kwh_start, (SELECT kwh FROM device_received_data drd WHERE drd.imei_no = md.imei_no AND drd.update_time >='"+moment(start_time).format('YYYY-MM-DD hh:mm:ss')+"' AND drd.update_time <= '"+moment(end_time).format('YYYY-MM-DD hh:mm:ss')+"' ORDER BY drd.update_time DESC LIMIT 1) as kwh_end FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no ORDER BY md.position ASC;";
	scada_pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, results) {
			connection.release();

		  	if (error) {
		  		console.log(error);
				var mess = {'error':1,'message':'Database issue. please contact administrator!','result':0};
				res.send(JSON.stringify(mess));
		  	}else{
				var o = {'device': results, 'time': new Date(), 'report_start_time':moment(start_time).format('DD-MM-YYYY hh:mm A'), 'report_end_time':moment(end_time).format('DD-MM-YYYY hh:mm A')};
			 	var mess = {'error':0,'message':'Device Record!','result':o};
				res.send(JSON.stringify(mess));
			}
		});
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
	
	
	if(type == "DAILY"){
		var unique_id = new Date().getTime();
		
		var filename = 'daily-'+insertdata.date+'-'+unique_id;

		new Promise(function(resolve, reject) {
			var insertq = {
				user_id: user_id,
				type: type,
				report_date: insertdata.date,
				records: 0,
				link: filename+'.csv',
				status: 0
			}
			var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';

			POOLDB[req.hostname].getConnection(function(err, connection) {
				if (err) {
					console.log(err);
				}else{
					connection.query(sql, insertq, function (error, result) {
						connection.release();

					  	if (error) {
					  		reject(error);
					  	}else{
					  		report_id = result.insertId;
					  		var mess = {'error':0,'message':'Start generating report!','result':1};
							res.send(JSON.stringify(mess));
					  		resolve(result.insertId);
					  	}
					})
				}
				
			});	
		}).then(function(result) {
		  	new Promise(function(resolve, reject) {
		  		var sql = "SELECT md.imei_no, md.circuit_info, dld.network_status, dld.update_time, dld.supply, dld.current FROM master_device md LEFT JOIN device_last_data dld ON md.imei_no=dld.imei_no WHERE dld.start_time = DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.id='"+insertdata.ulb+"' ORDER BY md.id DESC LIMIT 100;";
		  		process_start_time = new Date().getTime();

		    	POOLDB[req.hostname].getConnection(function(err, connection) {
					if (err) {
						reject(err);
					}else{
						connection.query(sql, function (error, result) {
							connection.release();

						  	if (error) {
						  		reject(error)
						  	}else{
						  		resolve(result);
						  	}
						})
					}
					
				});	
			}).then(function(result) {
				process_end_time = new Date().getTime();
				generateReports(result, header, filename, function(){
	           		console.log('GENERATE PDF DONE');
	           		var updateq = {
						records: result.length,
						process_time: process_end_time - process_start_time,
						status: '1'
					}
					var sql = 'UPDATE daily_reports SET ? WHERE id="'+report_id+'"';


					POOLDB[req.hostname].getConnection(function(err, connection) {
						if (err) {
							reject(err);
						}else{ 
							connection.query(sql, updateq, function (error, result) {
								connection.release();
								
								if (error) {
									reject(error);
								}
							});
						}
					});
	           	})
			}).catch((error) => {
				reportError(req, report_id, function(response){
			    });			    
			});
		}).catch((error) => {
		    reportError(req, report_id, function(response){
		    	var mess = {'error':1,'message':'Error!','result':response};
				res.send(JSON.stringify(mess));
		    });
		    
		});
	}
	else if(type == "OVERVOLTAGE"){
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
		sql += 'INSERT INTO device_last_data SET imei_no="'+insertdata.new_imei_no+'";';
		sql += 'DELETE FROM device_last_data WHERE imei_no="'+insertdata.replace_imei_no+'";';
		sql += 'INSERT INTO replace_device_last_data (total_kw, total_kva, meter_no, imei_no, update_time) SELECT COALESCE(total_kw, 0) as total_kw, COALESCE(total_kva, 0) as total_kva, meter_no, imei_no, update_time FROM device_last_data WHERE imei_no=?;';
	}
	console.log(sql);
	

	if(!empty(insertdata.new_meter_no)){
		insertq.new_meter_no = insertdata.new_meter_no;

		if(!empty(insertdata.replace_meter_no)){
			insertq.replace_meter_no = insertdata.replace_meter_no;
		}
	}
	
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
