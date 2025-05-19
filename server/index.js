const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (room) => {
        console.log('join')
        socket.join(room);
        socket.to(room).emit('user-joined');
    });

    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', data.offer);
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', data.candidate);
    });
});

server.listen(5000, () => console.log('Signaling server running on http://localhost:5000'));
