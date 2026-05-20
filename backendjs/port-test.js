var net = require('net');
var moment = require("moment");
var empty = require('is-empty');

var HOST = '216.10.247.24';
var PORT = 32282;

var interval = '';

var fx = 0;
var lx = 6;

var server = net.createServer(function(sock) {
    console.log('SERVER: ' + sock.remoteAddress +':'+ sock.remotePort);
	
    sock.on('data', function(data) 
	{
		var dt = new Date();
		var buff = Buffer.from(data, 'utf8');
		var d = buff.toString('hex');
		console.log('ORIGINAL: ' + d);
		
		
		
    });
    sock.on('close', function(data) 
	{
        console.log('SOCKET CLOSING ');
    });
	sock.on('end', function() {
        console.log('SOCKET END ');
    });
	sock.on('error', function(){
		console.log('ERROR IN SOCKET CONNECTION');
	});
	sock.setKeepAlive(true);
}).on('error', function(err) {
	console.log('ERROR '+ err);
});
server.listen(PORT, HOST);

server.on('connection', function(sock)
{
	console.log('SOCKET CONNECTED....');
});
console.log('SERVER LISTENING ON ' + HOST +':'+ PORT);
