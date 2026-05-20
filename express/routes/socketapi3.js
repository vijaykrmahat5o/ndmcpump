const { log } = require('console');
var express      = require('express');
//var passport     = require('passport');
var router       = express.Router();



/* =========================== */

var io = require('socket.io-client');
var socket = io('http://216.10.243.92:33346');
//var socket = io('http://216.10.243.92:33346');
socket.on("hello",(arg)=>{
    console.log('asdasd'+arg);
}); 

    var o = new Object();
    var cmd ='ON';
    o.imei 	= '861190056536094'; 
    o.command = cmd;
    console.log('Send Cmd:'+JSON.stringify(o));
   
var dec = socket.emit('onoffcmd',{imei:'asdasd',command:'sdasdasd'});
/* console.log('Ram ram Ji',dec);  */

/* =========================== */

/* var socketNew = io('http://216.10.243.92:33346', {
    withCredentials: true,
    autoConnect: true,
});
//console.log('Ram Ram Ji'+JSON.stringify(socketNew));

var dec = socketNew.emit('onoffcmd',o);
console.log('Ram ram Ji',dec); 
socketNew.on('connect',function(socket){

    console.log('Ram Ram Ji'+socket);
}) */

/* =================================  */


var socketClientModule = require('socket.io-client');
var streamConnectionServer = 'http://216.10.243.92:33346';
 var activityToStreamSocket = socketClientModule.connect(streamConnectionServer);
/*console.log(activityToStreamSocket);
activityToStreamSocket.on('connect', function(socket){
    console.log('Connected to Stream Server'+socket);
});
 */


/* 
const getInfo = async () => {
    console.log('asasd');
  
    activityToStreamSocket = await socketClientModule.connect(streamConnectionServer);
    
    
    activityToStreamSocket.on('connect', function(socket){
        console.log('Connected to Stream Server'+socket);
    });
    setTimeout(22000, getInfo());
    return 'all done';
    
   }
   
   getInfo(); */
/* =========================== */


/* openSocketCommunication();
function openSocketCommunication() {
    const socket = socketClientModule.getInstance;
    if(socket) {
      socket.on("connect", () => {
          // Run all code that should run each time you get a reconnect        
          console.log("% trans 'Chat connection established");
  
          // You might need a flag to avoid adding multiple listeners for incomingMessage
          socket.on("incomingMessage", (message) => {
            createMessage(message);
            removeTypingEffect();
            goToBottom();
          });
      
          // You might need a flag to avoid adding multiple listeners for incomingTyping
          socket.on("incomingTyping", () => {
            if (!typingDots) {
              createTypingDots();
            }
            if (!typing) {
              typing = true;
              addTypingEffect();
            }
          //  clearTimeout(typingTimeout);
            //typingTimeout = setTimeout(clearTyping, 2000);
          });
        });
    } else {
      console.log("trans ");
    //  typingForm.style.display = 'none';
    }
} */


 



/* var http = require('http').Server(express);
var io   = require('socket.io')(http);

io.on('connection', function(socket){
    console.log('a user connected');
  
    socket.emit('tx', 'msg');
  
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
  });
router.post('/deviceonoff',  function(req, res) {
  //work here
  console.log('asdas');
 io.emit('tx', {key:"value"});
var mess ={'result':[]};
 res.send(JSON.stringify(mess));

}); */







module.exports = router;