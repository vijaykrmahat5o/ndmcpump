<?php 
$entityBody = json_decode(base64_decode($argv[1]));
/* print_r($entityBody);
echo "asdasd";
die; */

/* $host = "103.211.219.21";
$port = 32235; */

$host = "103.211.219.21";
$port = 32235; 

set_time_limit(0);
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP) or die("create():".socket_strerror(socket_last_error($socket)));


if(!socket_connect($socket , $host, $port))
{
	echo "Could not connect";
	die;
}
print_r($entityBody);
if(isset($entityBody)){
	//print_r($entityBody);
	$msg = json_encode($entityBody);
	$len = strlen($msg);
	socket_send($socket, $msg, $len, 0);
	//socket_sendto($socket, $msg, $len, '0', '103.211.219.21', $port);
	//socket_write($socket,$msg,$len);
	//socket_close($socket);


	//$sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);

	//socket_set_option($socket, SOL_SOCKET, SO_BROADCAST, 1);

    //socket_sendto($socket, $msg, $len, 0, '103.211.219.21', 32235);
    socket_close($socket);
	echo 'Sent....';
}

?>