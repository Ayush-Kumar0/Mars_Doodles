const jwt = require('jsonwebtoken');
const PublicRoom = require('./PublicRoom');

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
                    .then(result => {
                        try {
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



        socket.on("disconnect", (reason) => {
            // Player remover from Public room
            if (socket.user) {

            }
            if (socket.guest) {
                PublicRoom.removePlayer({ id: socket.id });
                socket.leave(PublicRoom.getUsersRoomId({ id: socket.id }));
            }
        });
    });
}