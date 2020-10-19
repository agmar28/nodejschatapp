const path = require('path')
const http = require('http');
const express = require('express')
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateLocationMessage, generateMessage } = require('./utils/messages')

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { addUser, getUser, getUsersInRoom, removeUser} = require('./utils/users')

//Directories
const publicDirectories = path.join(__dirname, '../public')

app.use(express.static(publicDirectories));


io.on('connection', (socket) => {

    console.log('New WebSocket Connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({id: socket.id, ...options})
        const headername = user.username.toUpperCase().charAt(0)+ user.username.substring(1)
        if (error) {
            return callback(error);
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome! ' + headername + '!', 'Server'));
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, 'Server'))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        
        const filter = new Filter();
        
        if (new Filter().isProfane(message)) {
            return callback('Do not use Profane Words')
        }
        
        io.to(user.room).emit('message', generateMessage(message, user.username));
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('locationMessage', generateLocationMessage(`https://google.com/maps/?q=${coords.latitude},${coords.longitude}`, user.username))
        callback()
    })
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left.`, 'Server'));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }   
    });

})


//Port Hosting
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Server is now listening to port ${port}`)
})
