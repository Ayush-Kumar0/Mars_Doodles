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

module.exports = (io) => {
    // Middlewares
    io.use(getCookies);

    // On Connection
    io.on('connection', async (socket) => {
        console.log(socket.id);
    });
}