const uuidv4 = require('uuid').v4;

const startLimit = 4, roomLimit = 31;

let publicRoomIds = [];
// All public room objects
const publicRooms = new Map(); // {roomid: new PublicRoom()}
// User: Room
const playersRoom = new Map(); // {playerid: roomid}

class PublicRoom {
    id; roomPlayers;
    constructor(roomId) {
        this.id = roomId;
        this.roomPlayers = []; // [ player ]
    }
    getId() {
        return this.id;
    }
    getSize() {
        return this.roomPlayers.length;
    }
    getPlayers() {
        return this.roomPlayers;
    }
    addPlayer(player) {
        try {
            this.roomPlayers.push(player);
            return this;
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    removePlayer(player) {
        return this.roomPlayers = this.roomPlayers.filter(plr => plr.id != player.id);
    }
}


const addInRoom = (player) => {
    return new Promise((resolve, reject) => {
        if (player) {
            // Search for room id using some optimization algorithm

            const findVacantRoomId = new Promise((resolve, reject) => {
                function find(index) {
                    if (index >= publicRoomIds.length) {
                        resolve(null);
                    } else {
                        let id = publicRoomIds[index];
                        let room = publicRooms.get(id);
                        if (id && room && room.getSize() < roomLimit) {
                            // Room found, resolve the promise with the result=
                            resolve(id);
                        } else {
                            find(index + 1);
                        }
                    }
                }
                find(0);
            });

            findVacantRoomId.then(id => {
                let room = publicRooms.get(id);
                if (room) {
                    console.log('Added in old room', id);
                    // Add player in existing room
                    let res = room.addPlayer(player);
                    // Update rooms
                    publicRooms.set(id, room);
                    playersRoom.set(player.id, id);
                    return resolve(res);
                } else {
                    // Add player in new room
                    return resolve(addInNewRoom(player));
                }
            }).catch(err => {
                console.log(err);
                reject(err);
            });
        } else {
            console.log('Player is null');
            return resolve(null);
        }
    });
}


const addInNewRoom = (player) => {
    if (!player) return null;
    let id = uuidv4();
    let publicRoom = new PublicRoom(id);
    let res = publicRoom.addPlayer(player);
    playersRoom.set(player.id, id);
    // Update rooms
    publicRooms.set(id, publicRoom);
    // Update id list
    publicRoomIds.push(id);
    console.log('Added in new room', id);
    return res;
}

const removePlayer = (player) => {
    if (!player) return null;
    let roomid = playersRoom.get(player.id);
    let room = publicRooms.get(roomid);
    if (room) {
        room.removePlayer(player);
        if (room.getSize() <= 0) {
            // Delete the room also
            publicRooms.delete(roomid);
            publicRoomIds = publicRoomIds.filter(id => id != roomid);
        } else {
            // Update the room
            publicRooms.set(roomid, room);
        }
    }
}


const getUsersRoomId = (player) => {
    if (player)
        return playersRoom.get(player.id);
    return null;
}


module.exports.addInRoom = addInRoom;
module.exports.removePlayer = removePlayer;
module.exports.getUsersRoomId = getUsersRoomId;