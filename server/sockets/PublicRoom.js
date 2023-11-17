const uuidv4 = require('uuid').v4;
const words = require('../data/words');
let playersInfo = require('./data').playersInfo; // { socketid: {id, name, type, picture} }


const startLimit = 4, roomLimit = 31;
const defaultPlayerTime = 30000, defaultTotalRounds = 3;

let publicRoomIds = [];
// All public room objects
const publicRooms = new Map(); // {roomid: new PublicRoom()}
// User: Room
const playersRoom = new Map(); // {playerid: roomid}

class PublicRoom {
    id;
    roomPlayers;
    lowerLimit;
    playerTime;
    waitingDuration;
    pivotTime; //at which round started or ended last time
    onPause;
    totalRounds;
    roundsCompleted;
    currentWord;
    constructor(roomId) {
        this.id = roomId;
        this.roomPlayers = []; // [ {player_sid, hasDrawnThisRound} ]
        this.lowerLimit = startLimit;
        this.playerTime = defaultPlayerTime;
        this.totalRounds = defaultTotalRounds;
        this.roundsCompleted = 0;
        this.onPause = true;
        this.waitingDuration = 10000;
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
            this.roomPlayers.push({ ...player, hasDrawnThisRound: false });
            // Start the game once minimum players are there
            return this;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    removePlayer(player) {
        return this.roomPlayers = this.roomPlayers.filter(plr => plr.id != player.id);
    }

    // Function to start the game and timers
    start(io) {
        // pivotTime is undefined when game hasn't started
        if (!this.pivotTime && this.roundsCompleted < this.totalRounds && this.getSize() >= this.lowerLimit) {
            this.startRound(io);
        }
    }
    startRound(io) {
        this.onPause = false;
        const obj = {
            artist: null, // Socket id of artist
            wordToDraw: null, // One word that is to be drawn
        }
        obj.wordToDraw = words.at(Math.floor(Math.random() * words.length)); // Choose random word
        let artistIndex = this.roomPlayers.findIndex((val) => val.hasDrawnThisRound === false); // Choose player to be artist

        const startPlayer = () => {
            this.roomPlayers[artistIndex].hasDrawnThisRound = true;
            obj.artist = this.roomPlayers[artistIndex].id;

            this.pivotTime = Date.now();
            // Send secret information to artist
            io.to(obj.artist).emit("provide-public-to-artist", obj.wordToDraw);
            // Send game information to all players
            io.to(this.id).emit("provide-public-artist-info", playersInfo.get(obj.artist));

            // Hint provider
            let hint = setInterval(() => {
                let index = Math.floor(Math.random() * obj.wordToDraw.length);
                io.to(this.id).emit("provide-public-hint", index, obj.wordToDraw[index]);
            }, this.playerTime / obj.wordToDraw.length / 2);

            // Round timer
            let timer = setTimeout(() => {
                this.onPause = true;
                hint.clearInterval();
                this.pivotTime = Date.now();

                // Start for another player
                io.to(this.id).emit("provide-public-artist-over", playersInfo.get(obj.artist));
                this.startRound(io);
            }, this.playerTime);
        }

        if (artistIndex === -1) {
            // If artistIndex==-1, close this round and start new round
            // Send reults immediately
            io.to(this.id).emit("provide-public-round-over", "These are result of round", "These are net results");
            this.roundsCompleted++;
            if (this.roundsCompleted >= this.totalRounds) {
                return this.endGame();
            } else {
                this.roomPlayers = this.roomPlayers.map((pl) => { pl.hasDrawnThisRound = false; return pl });
                setTimeout(() => {
                    startPlayer();
                }, this.waitingDuration);
            }
        } else {
            // Don't wait if round not over
            startPlayer();
        }
    }
    endGame(io) {
        io.to(this.id).emit("provide-public-game-ended", "The game has ended");
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


// Serializes the room that the user/guest is part of.
const serializeRoom = (player) => {
    try {
        let roomid = playersRoom.get(player.id);
        let players = publicRooms.get(roomid)?.getPlayers();
        if (!players)
            return {};
        let data = [];
        for (let player of players) {
            let sid = player.id;
            data.push({
                id: playersInfo.get(sid).id,
                name: playersInfo.get(sid).name,
                type: playersInfo.get(sid).type,
                picture: playersInfo.get(sid).picture,
            });
        }
        // Return necessary game info for players interactivity
        return { roomid, players: data, playerTime: this.playerTime, waitingDuration: this.waitingDuration };
    } catch (err) {
        console.log(err);
        return {};
    }
}


module.exports.addInRoom = addInRoom;
module.exports.removePlayer = removePlayer;
module.exports.getUsersRoomId = getUsersRoomId;
module.exports.serializeRoom = serializeRoom;