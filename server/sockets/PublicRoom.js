const uuidv4 = require('uuid').v4;
const words = require('../data/words');
let playersInfo = require('./data').playersInfo; // { player_sid: {id, name, type, picture} }


const startLimit = 2, roomLimit = 31;
const defaultPlayerTime = 30000, defaultTimeBtwRounds = 15000, defaultTimeBtwArtSessions = 10000;
const defaultTotalRounds = 2, defaultPercentWordReveal = 1;

let publicRoomIds = []; // Undefined values should be cleared after few intervals
// All public room objects
const publicRooms = new Map(); // {roomid: new PublicRoom()}
// User: Room
const playersRoom = new Map(); // {player_sid: roomid}

class PublicRoom {
    id;
    roomPlayers;
    lowerLimit;
    playerTime;
    timeBtwRounds;
    timeBtwArtSessions;
    pivotTime; //at which round started or ended last time
    onPause;
    totalRounds;
    roundsCompleted;
    currentWord; // Complete word
    percentWordReveal;
    hiddenWord; // Partially revealed word
    roomSize;
    artist;

    hasStarted;
    waitingForNewArtist;
    waitingForNewRound;
    isGameOver;

    constructor(roomId) {
        this.id = roomId;
        this.roomPlayers = []; // [ {id(player_sid), hasDrawnThisRound} ]
        this.lowerLimit = startLimit;
        this.playerTime = defaultPlayerTime;
        this.totalRounds = defaultTotalRounds;
        this.timeBtwRounds = defaultTimeBtwRounds;
        this.timeBtwArtSessions = defaultTimeBtwArtSessions;
        this.percentWordReveal = defaultPercentWordReveal;
        this.hiddenWord = "";
        this.onPause = true;
        this.roundsCompleted = 0;
        this.roomSize = 0;
        this.hasStarted = false;
        this.waitingForNewArtist = true;
        this.waitingForNewRound = true;
        this.isGameOver = false;
    }
    getId() {
        return this.id;
    }
    getSize() {
        return this.roomSize;
    }
    getPlayers() {
        return this.roomPlayers;
    }
    addPlayer(player) {
        try {
            this.roomPlayers.push({ ...player, hasDrawnThisRound: false });
            this.roomSize++;
            // Start the game once minimum players are there
            return this;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    removePlayer(player) {
        let index = this.roomPlayers.findIndex(plr => (plr && plr.id === player.id));
        this.roomPlayers[index] = null;
        this.roomSize--;
        return this.roomPlayers;
    }

    // When should this room be joinalbe
    shouldJoin() {
        if (this.getSize() === 0 || this.isGameOver || this.roundsCompleted === this.totalRounds)
            return false;
        else if (this.onPause)
            return true;
        else {
            return true;
        }
    }

    // Function to start the game and timers
    start(io) {
        console.log('Start is called');
        // pivotTime is undefined when game hasn't started
        if (!this.hasStarted && !this.isGameOver && this.roundsCompleted < this.totalRounds && this.getSize() >= this.lowerLimit) {
            this.hasStarted = true;
            this.pivotTime = Date.now();
            setTimeout(() => {
                // Wait just a little before starting
                this.onPause = true;
                this.pivotTime = Date.now();
                this.startRound(io);
            }, 2000);
            console.log('Game started');
        }
    }
    startRound(io) {
        const obj = {
            artist: null, // Socket id of artist
            wordToDraw: '', // One word that is to be drawn
        }
        obj.wordToDraw = words.at(Math.floor(Math.random() * words.length)); // Choose random word


        let artistIndex = this.roomPlayers.findIndex((val) => (val && val.hasDrawnThisRound === false)); // Choose player to be artist
        // Artist might leave just after we decided who is going to be artist
        // In that case its array position will be null


        const startPlayer = () => {
            console.log(this.roomPlayers, artistIndex);
            let artist = this.roomPlayers[artistIndex];
            this.artist = artist;
            if (artist) {
                // If artist is still in room, then continue the game

                obj.artist = this.roomPlayers[artistIndex]?.id;

                try {
                    this.onPause = false;
                    this.pivotTime = Date.now();
                    // Send drawing information to the artist
                    io.to(obj.artist).emit("provide-public-word-to-artist", playersInfo.get(obj.artist), obj.wordToDraw);
                    this.currentWord = obj.wordToDraw;
                    console.log('Word sent to artist: ' + obj.wordToDraw);
                    this.roomPlayers[artistIndex].hasDrawnThisRound = true;

                    // Send game information to other players in room
                    this.hiddenWord = obj.wordToDraw.replace(/[^ ]/g, '_');
                    const artistSocket = io.sockets.sockets.get(obj.artist);
                    artistSocket.broadcast.to(this.id).emit("provide-public-artist-info", playersInfo.get(obj.artist), this.hiddenWord); // Send artists {id, name, type, picture}
                    console.log('Artist sent to all players');

                    this.waitingForNewArtist = false;
                    this.waitingForNewRound = false;

                } catch (err) {
                    console.log(err);
                    this.onPause = true;
                    this.pivotTime = Date.now();
                    // Make another artist when current artist leaves and causes error
                    this.artist = null;
                    this.currentWord = null;
                    return this.startRound(io);
                }

                // Hint provider for word reveal to non-artists
                let hint = setInterval(() => {
                    let index = Math.floor(Math.random() * obj.wordToDraw.length);
                    this.hiddenWord = this.hiddenWord.substring(0, index) + obj.wordToDraw[index] + this.hiddenWord.substring(index + 1);
                    io.to(this.id).emit("provide-public-letter-hint", this.hiddenWord);
                    console.log('Hint provided: ' + index);
                }, Math.round((this.playerTime + 3000) / (this.percentWordReveal * (obj.wordToDraw.length !== 0 ? obj.wordToDraw.length : 7))));

                // Artist's timer for drawing
                let timer = setTimeout(() => {
                    clearInterval(hint);
                    // If artist leaves the room, then continue the timer and
                    // handle it on the client side by showing that, artist is still present and
                    // update the artist once their session is completed

                    // Stop drawing session of current artist immediately
                    this.artist = null;
                    io.to(this.id).emit("provide-public-artist-over", playersInfo.get(obj.artist), obj?.wordToDraw);
                    console.log('Artist is over');
                    this.currentWord = null;
                    this.waitingForNewArtist = true;
                    this.onPause = true;
                    this.pivotTime = Date.now();
                    // Wait after the artist's session is completed;
                    setTimeout(() => {
                        // Start drawing session for another player
                        return this.startRound(io);
                    }, this.timeBtwArtSessions);
                }, this.playerTime);
            } else {
                // If artist is not there then choose another artist
                this.artist = null;
                return this.startRound(io);
            }
        }

        if (artistIndex === -1) {
            this.artist = null;
            // TODO: Delete the room if this room is empty
            // If artistIndex==-1, close this round and start new round
            // Send reults immediately
            io.to(this.id).emit("provide-public-round-over", "These are result of round", "These are net results");
            console.log('Round is over');
            this.waitingForNewRound = true;
            this.onPause = true;
            this.pivotTime = Date.now();
            this.roundsCompleted++;

            if (this.roundsCompleted >= this.totalRounds) {
                return this.endGame(io);
            } else {
                this.roomPlayers = this.roomPlayers.map((pl) => {
                    (pl ? pl.hasDrawnThisRound = false : null);
                    return pl;
                });
                setTimeout(() => {
                    return this.startRound(io);
                }, this.timeBtwRounds);
            }
        } else {
            // Start next player to be artist
            return startPlayer();
        }
    }
    endGame(io) {
        this.isGameOver = true;
        io.to(this.id).emit("provide-public-game-ended", "The game has ended");
        // Let players chat even after game is over
        console.log('Game is over');
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
                        if (id && room && room.shouldJoin()) {
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
    playersRoom.delete(roomid);
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

const shouldInformIfPlayerLeaves = (player) => {
    let shouldInformRoomAboutLeavingSocket = true;
    if (!player) return shouldInformRoomAboutLeavingSocket;
    let roomid = playersRoom.get(player.id);
    let room = publicRooms.get(roomid);
    // If removed player is artist then return fales
    if (room && room.artist && room.artist.id === player.id)
        shouldInformRoomAboutLeavingSocket = false;
    return shouldInformRoomAboutLeavingSocket;
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
        let room = publicRooms.get(roomid);
        let players = room?.getPlayers();
        if (!players)
            return {};
        let data = [];
        for (let player of players) {
            if (player) {
                let sid = player.id;
                data.push({
                    id: playersInfo.get(sid).id,
                    name: playersInfo.get(sid).name,
                    type: playersInfo.get(sid).type,
                    picture: playersInfo.get(sid).picture,
                });
            }
        }
        // Return necessary game info for players interactivity
        const obj = {
            roomid,
            room: room,
            players: data,
            playerTime: room.playerTime,
            timeBtwRounds: room.timeBtwRounds,
            timeBtwArtSessions: room.timeBtwArtSessions,
            artist: room.artist,
            hiddenWord: room.hiddenWord,
            onPause: room.onPause,
            hasStarted: room.hasStarted,
            waitingForNewArtist: room.waitingForNewArtist,
            waitingForNewRound: room.waitingForNewRound,
            isGameOver: room.isGameOver,
            timeSpent: Date.now() - room.pivotTime,
            roundsCompleted: room.roundsCompleted,
            totalRounds: room.totalRounds,
        };
        return obj;
    } catch (err) {
        console.log(err);
        return {};
    }
}


module.exports.addInRoom = addInRoom;
module.exports.removePlayer = removePlayer;
module.exports.shouldInformIfPlayerLeaves = shouldInformIfPlayerLeaves;
module.exports.getUsersRoomId = getUsersRoomId;
module.exports.serializeRoom = serializeRoom;