const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Guest = require('../models/guest');
const GuestPublicRoom = require('./GuestPublicRoom');
const UserPublicRoom = require('./UserPublicRoom');



let guestsInfo = require('./data').guestsInfo; // { player_sid: {id, name, type, picture} }
let usersInfo = require('./data').usersInfo; // { email: {id, name, type, picture} }

// Get cookies from socket request from user
async function getCookies(socket, next) {
    try {
        socket.cookies = {};
        let cookieArr = await socket.handshake.headers.cookie.split('; ');
        await cookieArr.forEach(async element => {
            const [name, value] = await element.split('=');
            socket.cookies[name] = value;
        });
    } catch (err) {
        console.log(`Error while getting Cookies`, err);
    }
    await next();
}

// Fetch user details from the auth-token
async function fetchUserGuest(socket, next) {
    const token = (socket.cookies) ? socket.cookies['auth-token'] : undefined;
    socket.user = null;
    socket.guest = null;
    if (!token) {
        console.log('auth-token not found');
        return next();
    }
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        if (data.type === 'user')
            socket.user = data.user;
        if (data.type === 'guest')
            socket.guest = data.guest;
        return next();
    } catch (err) {
        console.log('Error while verifying user before socket connection.');
        return next();
    }
}

module.exports = (io) => {
    // Middlewares
    io.use(getCookies);
    io.use(fetchUserGuest);

    // On Connection
    io.on('connection', async (socket) => {

        // For Guests public rooms
        if (socket && socket.guest) {
            GuestPublicRoom.init(socket, io);
            socket.on("disconnect", (reason) => {
                // Player remover from Public room
                if (socket.guest) {
                    // Inform others in room that guest has left.
                    socket.broadcast.to(GuestPublicRoom.getUsersRoomId({ id: socket.id })).emit("provide-public-player-left", guestsInfo[socket.id]);
                    socket.leave(GuestPublicRoom.getUsersRoomId({ id: socket.id }));
                    GuestPublicRoom.removePlayer({ id: socket.id }, io);
                }
                delete guestsInfo[socket.id];
            });
        }



        // For Users public and private rooms
        if (socket && socket.user) {
            UserPublicRoom.init(socket, io);
            socket.on("disconnect", (reason) => {
                // Player remover from Public room
                if (socket.user) {
                    // Inform others in room that guest has left.
                    socket.broadcast.to(UserPublicRoom.getUsersRoomId({ id: socket.id })).emit("provide-public-player-left", usersInfo[socket.id]);
                    socket.leave(UserPublicRoom.getUsersRoomId({ id: socket.id }));
                    UserPublicRoom.removePlayer({ id: socket.id }, io);
                }
                delete usersInfo[socket.id];
            });
        }
    });
}