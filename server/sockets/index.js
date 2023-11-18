const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Guest = require('../models/guest');
const PublicRoom = require('./PublicRoom');

const removeObjectKey = require('./tools').removeObjectKey;

let playersInfo = require('./data').playersInfo; // { player_sid: {id, name, type, picture} }

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
        console.log(socket.id);



        // Public room provider
        socket.on("get-public-room", (options) => {
            // Iff socket is authorized
            if (socket.user || socket.guest) {
                // Do mapping of {socketid: roomid} also
                PublicRoom.addInRoom({ id: socket.id })
                    .then(async result => {
                        try {
                            // Store players info
                            async function getPlayersInfo(socket) {
                                if (socket.user) {
                                    const user = await User.findById(socket.user._id);
                                    return {
                                        id: user.id,
                                        name: user.name,
                                        type: 'user',
                                        picture: user.picture
                                    };
                                } else if (socket.guest) {
                                    const guest = await Guest.findById(socket.guest._id);
                                    return {
                                        id: guest.id,
                                        name: guest.name,
                                        type: 'guest'
                                    };
                                } else
                                    return null;
                            }
                            playersInfo.set(socket.id, await getPlayersInfo(socket));
                            // Emit the room id to user so they can join
                            socket.join(result.id);
                            socket.emit("provide-public-room", true);
                        } catch (err) {
                            console.log(err);
                            socket.emit("provide-public-room", false);
                        }
                    }).catch(err => {
                        console.log(err);
                        socket.emit("provide-public-room", false);
                    });
            } else {
                console.log('Not authorized');
                socket.emit("provide-public-room", false);
            }
        });

        // Providing public rooms current state
        socket.on("get-init-public-room", (options) => {
            if (socket.user || socket.guest) {
                try {
                    let roominfo = PublicRoom.serializeRoom({ id: socket.id }, playersInfo);
                    if (roominfo.roomid) {
                        socket.emit("provide-init-public-room", removeObjectKey(roominfo, "room"));
                        // Broadcast in room when new player joins
                        socket.broadcast.to(roominfo.roomid).emit("provide-new-public-player", playersInfo.get(socket.id));
                        // Call start function
                        if (roominfo.room) {
                            roominfo.room.start(io);
                        }
                    }
                } catch (err) {
                    console.log(err);
                    socket.emit("provide-init-public-room", null);
                }
            } else {
                socket.emit("provide-init-public-room", null);
            }
        });

        socket.on("send-new-public-chat", (text) => {
            try {
                if (socket.user || socket.guest) {
                    let player = playersInfo.get(socket.id);
                    if (player) {
                        socket.broadcast.to(PublicRoom.getUsersRoomId({ id: socket.id })).emit("provide-new-public-chat", { sender: player.name, message: text });
                        socket.emit("provide-new-public-chat-self", { sender: "me", message: text });
                    }
                    // TODO: More when actual guessing game is implemented
                }
            } catch (err) {
                console.log(err);
            }
        });



        socket.on("disconnect", (reason) => {
            // Player remover from Public room
            if (socket.user) {

            }
            if (socket.guest) {
                // Inform others in room that guest has left.
                if (PublicRoom.shouldInformIfPlayerLeaves({ id: socket.id }))
                    socket.broadcast.to(PublicRoom.getUsersRoomId({ id: socket.id })).emit("provide-public-player-left", playersInfo.get(socket.id));
                socket.leave(PublicRoom.getUsersRoomId({ id: socket.id }));
                PublicRoom.removePlayer({ id: socket.id });
            }
            if (playersInfo.has(socket.id))
                playersInfo.delete(socket.id);
        });
    });
}