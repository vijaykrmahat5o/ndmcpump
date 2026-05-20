const express = require('express');
const app = express();
var router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const net = require('net');

const PORT = 5000;
let sockets = ['103.211.219.21:32235']; // array of sockets

// emmit data to all connected clients


const broadcast = (msg) => {
    console.log('========'+msg);
    //Loop through the active clients object
    sockets.forEach((client) => {
        client.write(msg);
        
    });
};

const server = net.createServer((socket) => {
    console.log('CONNECTED: ' + socket.remoteAddress +':'+ socket.remotePort);
    sockets.push(socket);

    socket.on('end', () => {
    console.log('DISCONNECTED: ');
    // remove the client for list
    let index = sockets.indexOf(socket);
        if (index !== -1) {
            console.log(sockets.length);
            sockets.splice(index, 1);
            console.log(sockets.length);
        }
    });
});


app.use(cors());
app.use(bodyParser.json());

/* app.get('/', (request, response) => {
    response.send('VMS server');
});


app.post('/contact', (req, res) => {
    const data = { hello: 'hello' }
    broadcast(data); //emit data to all clients
    res.send({ data: 'data emmited' })
}); */

app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}/`);
});

server.listen(1337, function() {
    console.log("Listening on 1337");



});




module.exports = router;