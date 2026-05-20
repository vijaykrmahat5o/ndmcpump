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
    user: 'fablurs_usr',
    password: 'dcr8k9q04lgu',
    database: 'fablurs_db',
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

	  	next();
	}
}

router.post('/login', function(req, res, next) {
	var userinfo = req.body.userinfo;
	var password = req.body.password;

	var access_key = new Date().getTime();
						
	var o = {};
		o.access_key = access_key;
		o.user_id = 1;
		o.username = 'Admin';
		o.email = 'admin@livefibre.in';
		o.role = 'A';
		o.permissions = [];
	var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
	res.send(JSON.stringify(mess));
});


router.post('/dashboard', checkAuth, function(req, res, next) {
	var perms = req.permissions;
	
	var o = {'devices': []};
 	var mess = {'error':0,'message':'Master devices!','result':o};
	res.send(JSON.stringify(mess));
});




function a(){
	return 10;
}
function b(){
	return 20;
}

module.exports = router;
