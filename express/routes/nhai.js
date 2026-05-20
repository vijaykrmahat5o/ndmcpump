var express = require('express');
var router = express.Router();
//var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');
const fs = require('fs');
var moment = require('moment');
//var dateFormat = require('dateformat');
const path = require('path');


var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'ccms_usr',
    password: 'ah8vx61mxrbv',
    database: 'ccms_nhai',
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
	var toll_id = 1111;
	console.log(path.normalize(path.join(__dirname, '../../nhai/media/', toll_id+'/')));
	
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
	var userinfo = req.body.userinfo;
	var pass = req.body.password;

	console.log(req.body);

	console.log("HOST NAME "+req.hostname);
	
	pool.getConnection(function(pool_err, connection) {
		if (pool_err) console.log(pool_err);

		var sql = 'SELECT id, username FROM users WHERE username="'+userinfo+'" AND password=MD5("'+pass+'")';
	
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
							res.send(JSON.stringify(mess));

						});
					});
				}else{
					var mess = {'error':1, 'message':'Incrorrect Username or Password!', 'result':{}};
					res.send(JSON.stringify(mess));
				}
			}
		});
	});
});


router.post('/toll-insert', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;

	var insertq = {
		title: data.title,
		code: data.code,
		state_id: data.state_id,
		device: data.device,
		ipaddress: data.ipaddress,
		username: data.username,
		password: data.password,
		type: 'PICTURE'
	};
	if(!empty(data.port)){
		insertq.port = data.port;
	}
	if(!empty(data.channel_1)){
		insertq.channel_1 = data.channel_1;
	}
	if(!empty(data.channel_2)){
		insertq.channel_2 = data.channel_2;
	}
	
	var sql = "INSERT INTO tolls SET ?;";

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			var q = connection.query(sql, [insertq], function (error, result) {
				
				if (error) {
		  		console.log(error);
		  		connection.release();
		  		
					var mess = {'error':1,'message':'Database issue. please login again!','result':0, 'query': q.sql};
					res.send(JSON.stringify(mess));
		  	}else{
		  		sql = "INSERT INTO last_event (toll_id) VALUES (?);";
		  		var toll_id = result.insertId;
		  		connection.query(sql, [toll_id], function (error, result) {
						connection.release();
						if (error) {
				  		console.log(error);
				  		
							var mess = {'error':1,'message':'[LAST EVENT] Database issue. please login again!','result':1};
							res.send(JSON.stringify(mess));
				  	}else{
				  		fs.mkdir(path.normalize(path.join(__dirname, '../../nhai/media/', toll_id+'/')), { recursive: true }, (err) => {
								if (err) {
								  return console.error(err);
								}
							});
				  		
						 	var mess = {'error':0,'message':'toll added Successfully!','result':''};
							res.json(mess);
						}
					});
				}
				
			});
		}
	});
});

router.post('/toll-update', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;


	var updateq = {
		title: data.title,
		code: data.code,
		state_id: data.state_id,
		device: data.device,
		ipaddress: data.ipaddress,
		username: data.username,
		password: data.password,
		type: 'PICTURE'
	};
	if(!empty(data.port)){
		updateq.port = data.port;
	}
	if(!empty(data.channel_1)){
		updateq.channel_1 = data.channel_1;
	}
	if(!empty(data.channel_2)){
		updateq.channel_2 = data.channel_2;
	}
	
	var sql = "UPDATE tolls SET ? WHERE id = ?;";

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			var q = connection.query(sql, [updateq, data.id], function (error, result) {
				connection.release();
				if (error) {
		  		console.log(error);
		  		
					var mess = {'error':1,'message':'Database issue. please login again!','result':0, 'query': q.sql};
					res.send(JSON.stringify(mess));
		  	}else{
				 	var mess = {'error':0,'message':'Toll updated Successfully!','result':''};
					res.json(mess);
				}
				
			});
		}
	});
});

router.post('/toll-delete', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var id = body.id;
	
	var sql = "DELETE FROM tolls WHERE id=?; DELETE FROM last_event WHERE toll_id=?";

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [id, id], function (error, result) {
				connection.release();

			 	var mess = {'error':0,'message':'toll deleted Successfully!','result':''};
				res.json(mess);
			});
		}
	});
});

router.post('/tolls', function(req, res, next) {
	console.log('PERMISSION STATE: ');

	var body = req.body;
	var access_key = body.accesskey;
	var state_id = body.state;
	
	var sql = "SELECT ts.*, le.capture_id, le.update_time FROM tolls ts LEFT JOIN last_event le ON ts.id = le.toll_id WHERE state_id = (SELECT id FROM states WHERE areacode=?); SELECT id,title,areacode FROM states;";
		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, [state_id], function (error, result) {
					connection.release();

					var o = {};
					o.records = result[0];
					o.states = result[1];
					o.time = new Date();
				 	var mess = {'error':0,'message':'Tolls!','result':o};
					res.json(mess);
				});
			}
		});
});


router.post('/places', function(req, res, next) {
	console.log('PERMISSION STATE: ');

	var body = req.body;
	var access_key = body.accesskey;
	
	var sql = "SELECT s.*, (SELECT count(t.id) FROM tolls t WHERE t.state_id=s.id) total_tolls FROM states s;";
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
				 	var mess = {'error':0,'message':'Places!','result':o};
					res.json(mess);
				});
			}
		});
});



router.post('/live', function(req, res, next) {
	console.log('PERMISSION STATE: ');

	var body = req.body;
	var access_key = body.accesskey;
	var toll = body.toll;
	
	var sql = "SELECT ts.*, le.capture_id, le.update_time FROM tolls ts LEFT JOIN last_event le ON ts.id=le.toll_id WHERE code = ?;";
		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, [toll], function (error, result) {
					connection.release();

					var o = {};
					o.records = result;
					o.time = new Date();
				 	var mess = {'error':0,'message':'Live!','result':o};
					res.json(mess);
				});
			}
		});
});

router.post('/dashboard', function(req, res, next) {
	
	var sql = "SELECT count(id) total FROM states;";
		sql += "SELECT count(id) total FROM tolls;";
		sql += "SELECT count(id) total FROM users;";

		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, function (error, result) {
					connection.release();

					var o = {};
					o.states = result[0].total;
					o.tolls = result[1].total;
					o.users = result[2].total;
					o.time = new Date();
				 	var mess = {'error':0,'message':'Dashboard!','result':o};
					res.json(mess);
				});
			}
		});
});

router.post('/states', function(req, res, next) {
	console.log('PERMISSION STATE: ');
	
	var sql = "SELECT * FROM states ORDER BY id asc";

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
				 	var mess = {'error':0,'message':'States!','result':o};
					res.json(mess);
				});
			}
		});
});

router.post('/state-insert', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;
	
	var sql = "INSERT INTO states SET ?;";

	var insertq = {
		title: data.title,
		areacode: data.areacode,
		filters: '[]',
		status: data.status
	};

	

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [insertq], function (error, result) {
				if (error) {
		  		console.log(error);
		  		connection.release();
					var mess = {'error':1,'message':'Database issue. please login again!','result':0};
					res.send(JSON.stringify(mess));
		  	}else{
		  		sql = "INSERT INTO state_master SET ?;";
		  		insertq = {
						total_toll: 0,
						state_id: result.insertId
					};
		  		connection.query(sql, [insertq], function (error, result) {
						connection.release();

					 	var mess = {'error':0,'message':'State added Successfully!','result':''};
						res.json(mess);
					});
		  	}
				
			});
		}
	});
});

router.post('/state-update', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;
	
	var sql = "UPDATE states SET ? WHERE id=?";

	var updateq = {
		title: data.title,
		areacode: data.areacode,
		status: data.status
	};

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [updateq, data.id], function (error, result) {
				connection.release();

			 	var mess = {'error':0,'message':'State updated Successfully!','result':''};
				res.json(mess);
			});
		}
	});
});

router.post('/state-delete', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var id = body.id;
	
	var sql = "DELETE FROM states WHERE id=?; DELETE FROM state_master WHERE state_id=?";

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [id, id], function (error, result) {
				connection.release();

			 	var mess = {'error':0,'message':'State deleted Successfully!','result':''};
				res.json(mess);
			});
		}
	});
});

router.post('/users', function(req, res, next) {
	console.log('PERMISSION STATE: ');
	
	var sql = "SELECT id,username,role,cities,status,insert_time FROM users ORDER BY id DESC; SELECT * FROM roles ORDER BY title ASC; SELECT * FROM cities ORDER BY title ASC;";

		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, function (error, result) {
					connection.release();

					var o = {
						users: result[0],
						roles: result[1],
						cities: result[2],
						time: new Date()
					};
				 	var mess = {'error':0,'message':'Users!','result':o};
					res.json(mess);
				});
			}
		});
});
router.post('/user-insert', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;
	
	var sql = "INSERT INTO users SET ?;";

	var insertq = {
		username: data.username,
		password: md5(data.password),
		role: data.role,
		cities: JSON.stringify(data.cities),
		status: data.status
	};

	

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [insertq], function (error, result) {
				if (error) {
		  		console.log(error);
		  		connection.release();
					var mess = {'error':1,'message':'Database issue. please login again!','result':0};
					res.send(JSON.stringify(mess));
		  	}else{
		  		connection.release();

				 	var mess = {'error':0,'message':'User added Successfully!','result':''};
					res.json(mess);
				};
				
			});
		}
	});
});

router.post('/user-update', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var data = body.data;
	
	var sql = "UPDATE users SET ? WHERE id=?";

	var updateq = {
		role: data.role,
		cities: JSON.stringify(data.cities),
		status: data.status
	};

	if(!empty(data.password)){
		updateq.password = md5(data.password);
	}

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [updateq, data.id], function (error, result) {
				connection.release();

			 	var mess = {'error':0,'message':'User updated Successfully!','result':''};
				res.json(mess);
			});
		}
	});
});

router.post('/user-delete', function(req, res, next) {
	var body = req.body;
	console.log(body);

	var access_key = body.accesskey;
	var id = body.id;
	
	var sql = "DELETE FROM users WHERE id=?;";

	pool.getConnection(function(err, connection) {
		if (err) {
			console.log(err);
			var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
			res.send(JSON.stringify(mess));
		}else{
			connection.query(sql, [id], function (error, result) {
				connection.release();

			 	var mess = {'error':0,'message':'User deleted Successfully!','result':''};
				res.json(mess);
			});
		}
	});
});


router.post('/roles', function(req, res, next) {
	var sql = "SELECT * FROM roles ORDER BY title ASC;";

		pool.getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Database query error!','result':[],'s':sql};
				res.send(JSON.stringify(mess));
			}else{
				connection.query(sql, function (error, result) {
					connection.release();

					var o = {
						roles: result,
						time: new Date()
					};
				 	var mess = {'error':0,'message':'User Roles!','result':o};
					res.json(mess);
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
