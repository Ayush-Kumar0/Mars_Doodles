const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Guest = require('../models/guest');
const GuestPublicRoom = require('./GuestPublicRoom');
const UserPublicRoom = require('./UserPublicRoom');
const UserPrivateRoom = require('./UserPrivateRoom');
const { removeAlreadyPlaying } = require('./utils');



const guestsInfo = require('./data').guestsInfo; // { player_sid: {id, name, type, picture} }
const usersInfo = require('./data').usersInfo; // { email: {id, name, type, picture} }

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
                removeAlreadyPlaying(socket);
            });
        }



        // For Users public and private rooms
        if (socket && socket.user) {
            UserPrivateRoom.init(socket, io);
            UserPublicRoom.init(socket, io);

            socket.on("disconnect", (reason) => {
                // Player remover from Public room
                if (socket.user) {
                    const email = socket.user.email;
                    console.log(email);
                    // Inform others in room that guest has left.
                    if (UserPublicRoom.getUsersRoomId({ email })) {
                        socket.broadcast.to(UserPublicRoom.getUsersRoomId({ email })).emit("provide-public-player-left", usersInfo[email]);
                        socket.leave(UserPublicRoom.getUsersRoomId({ email }));
                        UserPublicRoom.removePlayer({ email }, io);
                    } else if (UserPrivateRoom.getUsersRoomId({ email })) {
                        console.log(email);
                        socket.broadcast.to(UserPrivateRoom.getUsersRoomId({ email })).emit("provide-private-player-left", usersInfo[email]);
                        UserPrivateRoom.removePlayer({ email, id: socket.id }, io, socket);
                    }
                    delete usersInfo[email];
                }
                removeAlreadyPlaying(socket);
            });
        }


        socket.on("provide-new-history", (drawingChanges, dimensions) => {
            if (socket.user) {
                const email = socket.user.email;
                if (UserPublicRoom.getUsersRoomId({ email }) && UserPublicRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPublicRoom.getUsersRoomId({ email }))
                        .emit("get-new-history", drawingChanges, dimensions);
                } else if (UserPrivateRoom.getUsersRoomId({ email }) && UserPrivateRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPrivateRoom.getUsersRoomId({ email }))
                        .emit("get-new-history", drawingChanges, dimensions);
                }
            } else if (socket.guest) {
                if (GuestPublicRoom.getUsersRoomId({ id: socket.id }) && GuestPublicRoom.isPlayerArtist({ id: socket.id })) {
                    socket.broadcast.to(GuestPublicRoom.getUsersRoomId({ id: socket.id }))
                        .emit("get-new-history", drawingChanges, dimensions);
                }
            }
        });

        socket.on("undo-event-from-client", () => {
            if (socket.user) {
                const email = socket.user.email;
                if (UserPublicRoom.getUsersRoomId({ email }) && UserPublicRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPublicRoom.getUsersRoomId({ email }))
                        .emit("undo-event-to-client");
                } else if (UserPrivateRoom.getUsersRoomId({ email }) && UserPrivateRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPrivateRoom.getUsersRoomId({ email }))
                        .emit("undo-event-to-client");
                }
            } else if (socket.guest) {
                if (GuestPublicRoom.getUsersRoomId({ id: socket.id }) && GuestPublicRoom.isPlayerArtist({ id: socket.id })) {
                    socket.broadcast.to(GuestPublicRoom.getUsersRoomId({ id: socket.id }))
                        .emit("undo-event-to-client");
                }
            }
        });
        socket.on("redo-event-from-client", () => {
            if (socket.user) {
                const email = socket.user.email;
                if (UserPublicRoom.getUsersRoomId({ email }) && UserPublicRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPublicRoom.getUsersRoomId({ email }))
                        .emit("redo-event-to-client");
                } else if (UserPrivateRoom.getUsersRoomId({ email }) && UserPrivateRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPrivateRoom.getUsersRoomId({ email }))
                        .emit("redo-event-to-client");
                }
            } else if (socket.guest) {
                if (GuestPublicRoom.getUsersRoomId({ id: socket.id }) && GuestPublicRoom.isPlayerArtist({ id: socket.id })) {
                    socket.broadcast.to(GuestPublicRoom.getUsersRoomId({ id: socket.id }))
                        .emit("redo-event-to-client");
                }
            }
        });

        socket.on("provide-mouse-pointer", (location, pointerType, dimensions) => {
            if (socket.user) {
                const email = socket.user.email;
                if (UserPublicRoom.getUsersRoomId({ email }) && UserPublicRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPublicRoom.getUsersRoomId({ email }))
                        .emit("get-mouse-pointer", location, pointerType, dimensions);
                } else if (UserPrivateRoom.getUsersRoomId({ email }) && UserPrivateRoom.isPlayerArtist({ email })) {
                    socket.broadcast.to(UserPrivateRoom.getUsersRoomId({ email }))
                        .emit("get-mouse-pointer", location, pointerType, dimensions);
                }
            } else if (socket.guest) {
                if (GuestPublicRoom.getUsersRoomId({ id: socket.id }) && GuestPublicRoom.isPlayerArtist({ id: socket.id })) {
                    socket.broadcast.to(GuestPublicRoom.getUsersRoomId({ id: socket.id }))
                        .emit("get-mouse-pointer", location, pointerType, dimensions);
                }
            }
        });
    });
}