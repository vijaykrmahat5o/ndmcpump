var express = require('express');
var router = express.Router();
//var conn = require('./db');
var md5 = require('md5');
var empty = require('is-empty');
const fs = require('fs');
var moment = require('moment');



const axios = require('axios').default;
//var dateFormat = require('dateformat');

var socket_connected = false;

/*
const net = require('net');
const client = new net.Socket();
client.on('connect', () => {
	console.log('Server Connected! 122.15.193.107:32290');
	
	socket_connected = true;
});
client.on('close', (data) => {
	console.log('Connection Closed!');
	//socket_connected = false;
});
client.on('error', (data) => {
	console.log('Connection Error!');
	//socket_connected = false;
});
client.connect('32290', '122.15.193.107', function() {
	console.log('Connected');
	//client.write('Hello, server! Love, Client.');
});

const fileUpload = require('express-fileupload');
router.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
})); 
*/

var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit : 50,
    host: 'localhost',
    user: 'ccms_usr',
    password: 'ah8vx61mxrbv',
    database: 'ccms_wdms',
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
  res.render('index', { title: 'Express WDMS' });
});

console.log("--------Ffffffffffffffffffffffffffffffff------------------");

router.post('/pushdata', function(req, res, next) {
	var param = req.body;
	
	console.log('POST DATA');
	
	var data = {
		data: param
	};

	var https = require("https");

	var date = new Date();
	var time = date.getTime();
	const path = require('path');
	var file = date.getUTCFullYear()+"-"+(date.getUTCMonth() + 1)+"-"+(date.getUTCDate())+"-wdms.txt";
	fs.exists(path.normalize(__dirname+'/../logs/'+file), function(exist){
		if(exist){
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname+'/../logs/'+file), '\r\n'+str, function(err1) {
				if (err1) console.log(err1);
			});
			var mess = {'error':0,'message':'Task Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		}else{
			fs.writeFile(path.normalize(__dirname+'/../logs/'+file), '--- Start Logging ---', function(err2) {
				if (err2) console.log(err2);
				console.log('NEW LOG FILE CREATED!');
			});
			var mess = {'error':0,'message':'Task Added Successfully!','result':1};
				res.send(JSON.stringify(mess));
		}
	});
	
	var insertq = {};
	if(param.DevEUI_uplink){
		console.log("IF");
		insertq = {
			trans_id: 1,
			device_id: param.DevEUI_uplink.DevEUI,
			payload: param.DevEUI_uplink.payload_hex,
			timestamp: moment(param.DevEUI_uplink.Time).format('YYYY-MM-DD HH:mm:ss')
		};
		console.log(param.DevEUI_uplink.payload_hex.length);
		if(param.DevEUI_uplink.payload_hex.length == 42){
			decodeAxioma(param.DevEUI_uplink);
			return;
		}
		
	}else{
		console.log("ELSE");
		insertq = {
			trans_id: 1,
			device_id: param.DevEUI_uplink.DevEUI,
			payload: param.DevEUI_uplink.payload_hex,
			timestamp: moment(param.DevEUI_uplink.Time).format('YYYY-MM-DD HH:mm:ss')
		};
	}
	
	var hexPayload = param.DevEUI_uplink.payload_hex;
	
	
	
	var binaryMeterStatus = HexToBinary(hexPayload.substr(24, 2));
	//insertq.TariffStep = binaryMeterStatus.substr(binaryMeterStatus.length - 3, 3);
	//insertq.IsBackupCredit = binaryMeterStatus.substr(binaryMeterStatus.length - 5, 1) == "1";
	//insertq.valve_status = binaryMeterStatus.substr(binaryMeterStatus.length - 6, 1); // changes
	//insertq.IsValveClosedByConsumerCard = binaryMeterStatus.substr(0, 1) == "1";
	
	
//	insertq.version = parseInt(hexPayload.substr(30, 2), 10);

	var meterType = parseInt(hexPayload.substr(26, 1));

//	insertq.PenaltyStatus = parseInt(hexPayload.substr(20, 2));

	var binaryPenalties = HexToBinary(hexPayload.substr(20, 2));
	insertq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	insertq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	insertq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	insertq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	insertq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
//	insertq.IsFireModeActivated = parseInt(binaryPenalties.substr(2, 1));
//	insertq.IsValveClosedByConsumerCard = parseInt(binaryPenalties.substr(1, 1));
	insertq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

//	insertq.WarningStatus = parseInt(hexPayload.substr(22, 2));

	var binaryWarnings = HexToBinary(hexPayload.substr(22, 2));
	
//	insertq.IsCriticCredit = binaryWarnings.substr(7, 1) == "1";
//	insertq.IsValveMalfunction = binaryWarnings.substr(6, 1) == "1";
//	insertq.IsPulseMalfunction = binaryWarnings.substr(5, 1) == "1";
//	insertq.IsLeakageWarning = binaryWarnings.substr(4, 1) == "1";
	insertq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	insertq.battery_dead = binaryWarnings.substr(2, 1) == "1";
//	insertq.IsOveralConsumption = binaryWarnings.substr(1, 1) == "1";
//	insertq.IsMaximumFlowRate = binaryWarnings.substr(0, 1) == "1";
	
	var creditDivider = 0;
	var divider = 0;
	
	creditDivider = Math.pow(10, parseInt(hexPayload.substr(19, 1)));
	divider = Math.pow(10, parseInt(hexPayload.substr(18, 1)));
	
	
	insertq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	insertq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;
	
	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;
	var connectionType = hexPayload.substr(27, 1);
	switch (connectionType) {
		case '0':
			insertq.first_boot = "1";
			break;
		case '1':
			insertq.periodic = "1";
			break;
		case '2':
			insertq.reconnection = "1";
			break;
		case '3':
			insertq.manual_connection = "1";
			break;
	}
	
	var binaryBatteryStatus = HexToDecimal(hexPayload.substr(28, 2));
	insertq.battery_status = parseInt(binaryBatteryStatus) / 10;


		

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";
	
	
	var device_id = param.DevEUI_uplink.DevEUI;
	var updateq = {
		payload: param.DevEUI_uplink.payload_hex,
		timestamp: moment(param.DevEUI_uplink.Time).format('YYYY-MM-DD HH:mm:ss')
	};
	updateq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	updateq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	updateq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	updateq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	updateq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
	updateq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));
	
	updateq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	updateq.battery_dead = binaryWarnings.substr(2, 1) == "1";
	
	
	updateq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	updateq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;
	
	
	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;
	
	switch (connectionType) {
		case '0':
			updateq.first_boot = "1";
			break;
		case '1':
			updateq.periodic = "1";
			break;
		case '2':
			updateq.reconnection = "1";
			break;
		case '3':
			updateq.manual_connection = "1";
			break;
	}
	
	updateq.battery_status = parseInt(binaryBatteryStatus) / 10;

	connection.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		}else{ 
			console.log("DATA STORED ......");
		}
	});
	

/*
	const agent = new https.Agent({  
	  rejectUnauthorized: false
	});
	
	var config = {
		method: 'post',
		url: "https://ec2-15-207-172-159.ap-south-1.compute.amazonaws.com:443/pcmcsmart_log",
		headers: {
			'Content-Type': 'text/plain'
		},
		httpsAgent: agent,
		data: param
	}
	
	axios(config)
  .then(function (response) {
    console.log("DATA PUSH SUCCESSFULLY!");
  })
  .catch(function (error) {
    console.log(error);
  });

  if(socket_connected){
  	var runner = require("child_process");
		var phpScriptPath = "socket.php";
		
		const { base64encode, base64decode } = require('nodejs-base64');

		var argsString = base64encode(JSON.stringify(param));
		runner.exec("php " + phpScriptPath + " " +argsString, function(err, phpResponse, stderr) {
			if(err) console.log(err); 
			console.log( phpResponse );
		});

  	console.log('SOCKET IS WORKING...');
  	
  }
  */
	
	
});

function decodeAxioma(data){
	var _arr = new Array();
	console.log(data.substr(0, 8));
	
	var date = moment.unix(HexToRevDecimal(data.payload_hex.substr(0, 8))).format('YYYY-MM-DD HH:mm:ss');
	
	//console.log(date);
	
	var status = data.payload_hex.substr(8,2);
	//console.log(status);
	
	var volume = HexToRevDecimal(data.payload_hex.substr(10, 8));
	//console.log(volume);
	
	var logdate = moment.unix(HexToRevDecimal(data.payload_hex.substr(18, 8))).format('YYYY-MM-DD HH:mm:ss');
	//console.log(logdate);
	
	var insertq = {
		trans_id: 1,
		device_id: data.DevEUI,
		payload: data.payload_hex,
		timestamp: moment(data.Time).format('YYYY-MM-DD HH:mm:ss')
	};
	insertq.meter_cover_opened = 0;
	insertq.fitting_removed = 0;
	insertq.magnetic_affected = 0;
	insertq.battery_cover_opened = 0;
	insertq.leakage_penalty = 0;
	insertq.meter_disabled = 0;
	
	insertq.reverse_flow = 0;
	insertq.battery_dead = 0;
	
	insertq.reading = 0;
	insertq.credit = 0;
	
	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;
	
	insertq.battery_status = 0;
	
	
	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";
	
	
	var device_id = data.DevEUI;
	var updateq = {
		payload: data.payload_hex,
		timestamp: moment(data.Time).format('YYYY-MM-DD HH:mm:ss')
	};
	updateq.meter_cover_opened = 0;
	updateq.fitting_removed = 0;
	updateq.magnetic_affected = 0;
	updateq.battery_cover_opened = 0;
	updateq.leakage_penalty = 0;
	updateq.meter_disabled = 0;
	
	updateq.reverse_flow = 0;
	updateq.battery_dead = 0;

	updateq.reading = 0;
	updateq.credit = 0;
	
	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;
	
	updateq.battery_status = 0;

	connection.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		}else{ 
			console.log("DATA STORED ......");
		}
	});
}

function HexToRevDecimal(data){
	var _arr = new Array();
	for(var i = 0; i < 4; i++){
		_arr.push(data.substr(i*2, 2));
	}
	return HexToDecimal(_arr.reverse().join(""));
}


function HexToRev2Decimal(data){
	var _arr = new Array();
	for(var i = 0; i < 4; i++){
		_arr.push(data.substr(i*2, 2));
	}
	return HexToDecimal(_arr.reverse().join(""));
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
function HexToBinary(value){
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
