var mysql = require('mysql');
var schedule = require('node-schedule');
var DB_CONNECTED = false;
var connection;

var db_scheduler = schedule.scheduleJob({second:5}, dbconnect);

function dbconnect(){
  if(!DB_CONNECTED){
    connection = mysql.createConnection({
      host: 'localhost',
      user: 'farrukhabadwater_user',
      password: 'farrukhabadwater_pass',
      database: 'farrukhabadwater_db',
      multipleStatements: true,
	  dateStrings: [
		'DATE',
		'DATETIME'
	  ]
    });
    connection.connect(function(err) {
        if (err) {
          console.log(err);
        }else{
          DB_CONNECTED = true;
          db_scheduler.cancel();
          console.log("DATABASE CONNECTED SUCCESFULLY!");
        }
    });
    connection.on('error', function(err) {
		console.log("DATABASE ERROR "+err.code);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') {
			DB_CONNECTED = false;
			if(connection) connection.destroy();
			db_scheduler.reschedule({second:5}, dbconnect);
			dbconnect();
			console.log("DATABASE RESCHEDULED ");
		} else {
			console.log( err );
		}
	});
  }else{
		console.log('Already connected!');
	}
}
dbconnect();


module.exports = connection;