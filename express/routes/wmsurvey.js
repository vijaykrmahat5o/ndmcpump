var express = require('express');
var router = express.Router();
//var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');
const fs = require('fs');
var moment = require('moment');
//var dateFormat = require('dateformat');

const fileUpload = require('express-fileupload');
router.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
})); 


var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ccms_wmsurvey',
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
	var accesskey = req.body.accesskey;

	if (!accesskey) {
		console.log('***************** Unauthorised Access! ***************');
		var mess = {'error':1,'message':'Unauthorised Access!','result':0};
		res.send(JSON.stringify(mess));
	} else {
	  	//var accesskey = req.body.accesskey;

	  	console.log("CHK AUTH "+req.hostname+" "+accesskey);

	  	pool.getConnection(function(err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT ap.user_id, u.permissions from access_permission ap LEFT JOIN users u ON ap.user_id=u.id WHERE ap.access_key = "'+accesskey+'" AND ap.is_valid=1;';
			connection.query(sql, function (error, result) {
				if (error) {
			  		console.log(error);
			  		connection.release();
						var mess = {'error':1,'message':'Database issue. please login again!','result':0};
						res.send(JSON.stringify(mess));
			  	}else{
						if(result.length > 0){
							console.log('------x------ LOGIN SUCCESSFULLY ------x------');
							req.user_id = result[0].user_id;
							req.permissions = JSON.parse(result[0].permissions);
							connection.release();
							

							next();
						}else{
							connection.release();
							console.log('!!!!!!!!!!! SECURITY ISSUE !!!!!!!!!!!!');
							var mess = {'error':2,'message':'Session Timeout. For security reason, please login again!','result':0};
							res.send(JSON.stringify(mess));
						}
					}
			});
		})
	}
}

router.post('/login', function(req, res, next) {
	var username = req.body.username.toLowerCase();
	var password = req.body.password.toLowerCase();

	console.log("USERNAME: "+username+" PASSWORD: "+password);
	
	pool.getConnection(function(pool_err, connection) {
		if (pool_err) console.log(pool_err);

		var sql = 'SELECT id, username FROM users WHERE username="'+username+'" AND password=MD5("'+password+'")';
	
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
					var sql = 'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("'+user_id+'","'+access_key+'",1,NOW())';

					pool.getConnection(function(err, connection) {
						if (err) console.log(err);

						connection.query(sql, function (perm_err, perm_result) {
							connection.release();
							if (perm_err) {
								console.log(perm_err);
							}

							var o = {};
								o.access_key = access_key;
								o.user_id = usr_result[0].id;
								o.username = usr_result[0].username;
								
							var mess = {'error':0, 'message':'Login Successfully!', 'result':o};

							console.log(mess);
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
});

router.post('/add-survey', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = JSON.parse(body.data);

	var insertq = {
		user_id: 0
	};

	if(empty(data.city_id)){
		insertq.city_id = 21;
	}
	if(!empty(data.geo_loc)){
		insertq.geo_loc = data.geo_loc;
	}
	if(!empty(data.geo_address)){
		insertq.geo_address = data.geo_address;
	}
	if(!empty(data.building)){
		insertq.building = data.building;
	}
	if(!empty(data.house_no)){
		insertq.house_no = data.house_no;
	}
	if(!empty(data.consumer_name)){
		insertq.consumer_name = data.consumer_name;
	}
	if(!empty(data.contact_no)){
		insertq.contact_no = data.contact_no;
	}
	if(!empty(data.aadhar)){
		insertq.aadhar = data.aadhar;
	}
	if(!empty(data.address)){
		insertq.address = data.address;
	}
	if(!empty(data.ward_no)){
		insertq.ward_no = data.ward_no;
	}
	if(!empty(data.avaliability)){
		insertq.avaliability = JSON.stringify(data.avaliability);
	}
	if(!empty(data.comment)){
		insertq.comment = data.comment;
	}


	pool.getConnection(function(err, connection) {
		if (err){
			console.log(err);
		//	next();
		}else{
			var sql = 'INSERT INTO survey SET ?;';
			var q = connection.query(sql, [insertq], function (error, result) {
				connection.release();
				if(error){
					var mess = {'error':1, 'message':'Error in sql query!', 'result':{}, 's': q.sql};
					res.send(JSON.stringify(mess));
				}else{
					var mess = {'error':0, 'message':'Inserted Successfully! ', 'result':{}};
					res.send(JSON.stringify(mess));
				}
			});
		}
	})



	
	
});



router.post('/survey-history', function(req, res, next) {
	console.log('Survey History');
	
	var sql = "SELECT * FROM survey ORDER BY id DESC";

		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, function (error, result) {
					connection.release();

					var o = {};
					o.records = result;
					o.time = new Date();
				 	var mess = {'error':0,'message':'Devices!','result':o};
					res.send(JSON.stringify(mess));
				});
			}
		});
});

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
function DecToHex(dec) {
    var number = Number(dec).toString(16).toUpperCase()
    if( (number.length % 2) > 0 ) { number= "0" + number }
    return number;
}
function HexToDec(value){
	return parseInt(value, 16);
}


function a(){
	return 10;
}
function b(){
	return 20;
}

module.exports = router;
