module.exports.removeObjectKey = (originalObject, keyToRemove) => {
    // Destructure the originalObject, omitting the specified key
    const { [keyToRemove]: omittedKey, ...newObject } = originalObject;
    return newObject;
}

const players = {};
module.exports.addAlreadyPlaying = (socket) => {
    if (socket) {
        if (socket.user) {
            players[socket.user.email + 'user'] = true;
        }
        if (socket.guest) {
            players[socket.guest._id + 'guest'] = true;
        }
    }
}

module.exports.isAlreadyPlaying = (socket) => {
    if (socket) {
        if (socket.user) {
            return (players.hasOwnProperty(socket.user.email + 'user'));
        }
        if (socket.guest) {
            return (players.hasOwnProperty(socket.guest._id + 'guest'));
        }
    }
}

module.exports.removeAlreadyPlaying = (socket) => {
    if (socket) {
        if (socket.user) {
            delete players[socket.user.email + 'user'];
        }
        if (socket.guest) {
            delete players[socket.guest._id + 'guest'];
        }
    }
}

//Generate a random/unique string identifier for a room
module.exports.generateUniqueString = (n) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uniqueString = '';

    for (let i = 0; i < (n || 6); i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueString += characters.charAt(randomIndex);
    }

    return uniqueString;
}