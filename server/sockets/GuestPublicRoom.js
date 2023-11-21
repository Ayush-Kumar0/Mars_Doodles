const Guest = require('../models/guest');
const uuidv4 = require('uuid').v4;
const words = require('../data/words');

const guestsInfo = require('./data').guestsInfo; // { player_sid: {id, name, type} }
const removeObjectKey = require('./utils').removeObjectKey;


const startLimit = 2, roomLimit = 31;
const defaultPlayerTime = 30000, defaultTimeBtwRounds = 5000, defaultTimeBtwArtSessions = 3000;
const defaultTotalRounds = 2, defaultPercentWordReveal = 1;
const latencyDelay = 5000;








let guestPublicRoomIds = []; // Undefined values should be cleared after few intervals
// All public room objects
const guestPublicRooms = {}; // {roomid: new GuestPublicRoom()}
// User: Room
const guestsRoom = {}; // {player_sid: roomid}



















class GuestPublicRoom {
    id;
    roomPlayers; // [id(player_sid): {hasDrawnThisRound, score, hasGuessed}]
    lowerLimit;
    playerTime;
    timeBtwRounds;
    timeBtwArtSessions;
    totalRounds;
    roundsCompleted;
    currentWord; // Complete word
    percentWordReveal;
    hiddenWord; // Partially revealed word
    roomSize;
    artistSid;
    artOverRequests;

    hasStarted;
    isArtSessionOver;
    isRoundOver;
    isGameOver;


    constructor(roomId, io) {
        this.id = roomId;
        this.roomPlayers = new Map(); // [id(player_sid): {hasDrawnThisRound, score, hasGuessed}]
        this.artOverRequests = new Set();
        this.lowerLimit = startLimit;
        this.playerTime = defaultPlayerTime;
        this.totalRounds = defaultTotalRounds;
        this.timeBtwRounds = defaultTimeBtwRounds;
        this.timeBtwArtSessions = defaultTimeBtwArtSessions;
        this.percentWordReveal = defaultPercentWordReveal;
        this.hiddenWord = "";
        this.roundsCompleted = 0;
        this.roomSize = 0;
        this.hasStarted = false;
        this.isArtSessionOver = true;
        this.isRoundOver = true;
    }

    // Object info
    getId() {
        return this.id;
    }
    getSize() {
        return this.roomSize;
    }

    // Functions for players
    getPlayers() {
        return this.roomPlayers;
    }
    addPlayer(player) {
        try {
            // Add the player is not present
            this.roomPlayers.set(player.id, { hasDrawnThisRound: false, score: 0, hasGuessed: false });
            this.roomSize++;
            return this;
        } catch (err) {
            // console.log(err);
            return null;
        }
    }
    removePlayer(player, io) {
        if (this.roomPlayers.has(player.id)) {
            // Completely remove the player
            this.roomPlayers.delete(player.id);
            this.roomSize--;
        }
        if (this.getSize() <= 1 && !this.isGameOver) {
            this.isGameOver = true;
            this.endGame(io);
        }
        return this.roomPlayers;
    }

    // Score functions
    updateScore(player, text) {
        try {
            if (this.currentWord && text && this.currentWord.toLowerCase() === text.trim().toLowerCase()) {
                let oldPlayer = this.roomPlayers.get(player.id);
                // // console.log(player.id, this.artistSid);
                if (oldPlayer && !oldPlayer.hasGuessed && !this.isGameOver && player.id != this.artistSid) {
                    // TODO: Add scoring algorithm to give scores correctly
                    const scoreAddition = 100;
                    oldPlayer.score = Number.isInteger(oldPlayer.score) ? (oldPlayer.score + scoreAddition) : scoreAddition;
                    oldPlayer.hasGuessed = true;
                    return scoreAddition;
                }
            }
        } catch (err) {
            // console.log(err);
            return null;
        }
        return null;
    }

    // When should this room be joinalbe
    shouldJoin() {
        if (this.getSize() === 0 || this.isGameOver || this.roundsCompleted >= this.totalRounds)
            return false;
        else {
            return true;
        }
    }


    getReadyForNextArtSession() {
        // Restor room players to let them guess for next drawing
        this.roomPlayers.forEach((value, key, map) => {
            if (key && value) {
                value.hasGuessed = false;
                map.set(key, value);
            }
        });
    }
    getReadyForNextRound() {
        // Restore all players to haven't drawn for next round
        this.roomPlayers.forEach((value, key, map) => {
            if (key && value) {
                value.hasDrawnThisRound = false;
                value.hasGuessed = false;
                map.set(key, value);
            }
        });
    }
    // All events
    nextArtist() {
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Choose player to be artist
        let artistKey = null;
        for (const key of this.roomPlayers.keys()) {
            let obj = this.roomPlayers.get(key);
            if (obj && obj.hasDrawnThisRound === false) {
                artistKey = key;
                break;
            }
        }
        if (artistKey) {
            this.currentWord = words.at(Math.floor(Math.random() * words.length)); // Choose random word
            this.hiddenWord = this.currentWord.replace(/[^ ]/g, '_');
            return this.artistSid = artistKey; // Set the artist for this session
        } else {
            return null;
        }
    }
    emitToNonArtists(io) {
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Send game information to other players in room
        const artistSocket = io.sockets.sockets.get(this.artistSid);
        artistSocket.broadcast.to(this.id).emit("provide-public-artist-info", guestsInfo[this.artistSid], this.hiddenWord, this.roundsCompleted + 1); // Send artist's {id, name, type, picture}
        // console.log('Artist sent to all players');
    }
    emitToArtist(io) {
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Send drawing information to the artist
        this.artOverRequests.clear();
        io.to(this.artistSid).emit("provide-public-word-to-artist", guestsInfo[this.artistSid], this.currentWord, this.roundsCompleted + 1);
        // console.log('Word sent to artist: ' + this.currentWord);
        let obj = this.roomPlayers.get(this.artistSid);
        obj.hasDrawnThisRound = true;
    }
    provideHints(io) {
        this.hint = setInterval(() => {
            let index = Math.floor(Math.random() * this.currentWord.length);
            this.hiddenWord = this.hiddenWord.substring(0, index) + this.currentWord[index] + this.hiddenWord.substring(index + 1);
            io.to(this.id).emit("provide-public-letter-hint", this.hiddenWord);
            // console.log('Hint provided: ' + index);
        }, Math.round((this.playerTime + 3000) / (this.percentWordReveal * (this.currentWord.length !== 0 ? this.currentWord.length : 7))));
    }
    artSessionOver(io) {
        if (this.isArtSessionOver === false) {
            this.isArtSessionOver = true;
            clearInterval(this.hint);
            // Provide the word to all players
            const artistSocket = io.sockets.sockets.get(this.artistSid);
            artistSocket.broadcast.to(this.id).emit("provide-public-artist-over", this.currentWord, guestsInfo[this.artistSid]);
            artistSocket.emit("provide-public-your-turn-over");
            this.artistSid = null;
            this.currentWord = null;
            this.getReadyForNextArtSession();
            setTimeout(() => {
                if (!this.isGameOver)
                    this.startGame(io);
            }, this.timeBtwArtSessions);
        }
    }
    roundOver(io) {
        if (this.isRoundOver === false) {
            this.isRoundOver = true;
            this.roundsCompleted++;
            console.log(this.roundsCompleted, this.totalRounds);
            if (this.roundsCompleted < this.totalRounds) {
                // Provide round results to all players
                io.to(this.id).emit("provide-public-round-over");
                this.getReadyForNextRound();
                setTimeout(() => {
                    if (!this.isGameOver)
                        this.startGame(io);
                }, this.timeBtwRounds);
            } else {
                this.endGame(io);
            }
        }
    }



    // Function to start the game and timers
    start(io) {
        // console.log('Start is called');
        if (!this.hasStarted && !this.isGameOver && this.roundsCompleted < this.totalRounds && this.getSize() >= this.lowerLimit) {
            this.hasStarted = true;
            setTimeout(() => {
                // Wait just a little before starting
                this.startGame(io);
            }, 2000);
        }
    }

    startGame(io) {
        if (this.nextArtist()) {
            //When this round is not over
            this.emitToNonArtists(io);
            this.emitToArtist(io);
            this.provideHints(io);
            setTimeout(() => {
                if (!this.isGameOver && this.isArtSessionOver === false)
                    this.artSessionOver(io);
            }, this.playerTime + latencyDelay);
        } else {
            if (!this.isGameOver)
                this.roundOver(io);
        }
    }

    endGame(io) {
        clearInterval(this.hint);
        this.isGameOver = true;
        io.to(this.id).emit("provide-public-game-ended", "The game has ended");
        // Let players chat even after game is over
        // console.log('Game is over');
        return this.isGameOver;
    }
}





















const addInRoom = (player, io) => {
    return new Promise((resolve, reject) => {
        if (player) {
            // Search for room id using some optimization algorithm

            const findVacantRoomId = new Promise((resolve, reject) => {
                function find(index) {
                    if (index >= guestPublicRoomIds.length) {
                        resolve(null);
                    } else {
                        let id = guestPublicRoomIds[index];
                        let room = guestPublicRooms[id];
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
                let room = guestPublicRooms[id];
                if (room) {
                    // console.log('Added in old room', id);
                    // Add player in existing room
                    let res = room.addPlayer(player);
                    // Update rooms
                    guestsRoom[player.id] = id;
                    return resolve(res);
                } else {
                    // Add player in new room
                    return resolve(addInNewRoom(player, io));
                }
            }).catch(err => {
                // console.log(err);
                reject(err);
            });
        } else {
            // console.log('Player is null');
            return resolve(null);
        }
    });
}


const addInNewRoom = (player, io) => {
    if (!player) return null;
    let id = uuidv4();
    let guestPublicRoom = new GuestPublicRoom(id, io);
    let res = guestPublicRoom.addPlayer(player);
    guestsRoom[player.id] = id;
    // Update rooms
    guestPublicRooms[id] = guestPublicRoom;
    // Update id list
    guestPublicRoomIds.push(id);
    return res;
}

const removePlayer = (player, io) => {
    if (!player) return null;
    let roomid = guestsRoom[player.id];
    let room = guestPublicRooms[roomid];
    if (room) {
        room.removePlayer(player, io);
        if (room.getSize() <= 0) {
            // Delete the room also
            delete guestPublicRooms[roomid];
            guestPublicRoomIds = guestPublicRoomIds.filter(id => id != roomid);
        }
    }
}



const getUsersRoomId = (player) => {
    if (player)
        return guestsRoom[player.id];
    return null;
}


// Serializes the room that the user/guest is part of.
const serializeRoom = (player) => {
    try {
        let roomid = guestsRoom[player.id];
        let room = guestPublicRooms[roomid];
        let players = room?.getPlayers();
        console.log(players);
        if (!players)
            return {};
        let data = [];
        for (let key of players.keys()) {
            if (key && players.get(key)) {
                let sid = key;
                data.push({
                    id: guestsInfo[sid].id,
                    name: guestsInfo[sid].name,
                    type: guestsInfo[sid].type,
                    picture: guestsInfo[sid].picture,
                    score: players.get(key).score,
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
            artist: guestsInfo[room.artistSid],
            hiddenWord: room.hiddenWord,
            hasStarted: room.hasStarted,
            roundsCompleted: room.roundsCompleted,
            totalRounds: room.totalRounds,
        };
        return obj;
    } catch (err) {
        // console.log(err);
        return {};
    }
}


// Give score to the player
const giveScoreToPlayer = (player, text) => {
    const room = guestPublicRooms[guestsRoom[player.id]];
    if (room)
        return room.updateScore(player, text);
    return null;
}


// Is player the artist in their room
const isPlayerArtist = (player) => {
    let roomid = getUsersRoomId(player);
    let room = guestPublicRooms[roomid];
    if (player.id !== room.artistSid)
        return false;
    return true;
}


// Do word hiding
const filterText = (player, text) => {
    // TODO: Message filtering
    return text;
}
























module.exports.removePlayer = removePlayer;
module.exports.getUsersRoomId = getUsersRoomId;
















module.exports.init = (socket, io) => {
    // Public room provider
    socket.on("get-public-room", (options) => {
        // Iff socket is authorized
        if (socket.guest) {
            // Do mapping of {socketid: roomid} also
            try {
                // Store players info
                async function getGuestsInfo(socket) {
                    if (socket.guest) {
                        const guest = await Guest.findById(socket.guest._id);
                        return {
                            id: guest.id,
                            name: guest.name,
                            type: 'guest'
                        };
                    } else
                        return null;
                }
                getGuestsInfo(socket)
                    .then(player => {
                        guestsInfo[socket.id] = player;
                        addInRoom({ id: socket.id }, io)
                            .then(result => {
                                if (result) {
                                    // Emit the room id to user so they can join
                                    socket.join(result.id);
                                    socket.emit("provide-public-room", true);
                                } else
                                    socket.emit("provide-public-room", false);
                            })
                            .catch(err => {
                                console.log("Couldn't add in a room", err);
                                socket.emit("provide-public-room", false);
                            });
                    }).catch(err => {
                        console.log('Could not get players info', err);
                        socket.emit("provide-public-room", false);
                    });
            } catch (err) {
                console.log(err);
                socket.emit("provide-public-room", false);
            }
        } else {
            console.log('Not authorized');
            socket.emit("provide-public-room", false);
        }
    });

    // Providing public rooms current state
    socket.on("get-init-public-room", (options) => {
        if (socket.guest) {
            try {
                let roominfo = serializeRoom({ id: socket.id });
                if (roominfo.roomid) {
                    socket.emit("provide-init-public-room", removeObjectKey(roominfo, "room"));
                    // Broadcast in room when new player joins
                    socket.broadcast.to(roominfo.roomid).emit("provide-new-public-player", guestsInfo[socket.id]);
                    // Call start function
                    if (roominfo.room) {
                        roominfo.room.start(io);
                    }
                }
            } catch (err) {
                // console.log(err);
                socket.emit("provide-init-public-room", null);
            }
        } else {
            socket.emit("provide-init-public-room", null);
        }
    });

    // New chat sent to public room
    socket.on("send-new-public-chat", (text) => {
        try {
            if (text !== '' && socket.guest) {
                let player = guestsInfo[socket.id];
                if (player && !isPlayerArtist({ id: socket.id })) {
                    // Along with message, send the score if scored
                    const score = giveScoreToPlayer({ id: socket.id }, text);
                    if (score) {
                        // Someone guessed
                        socket.broadcast.to(getUsersRoomId({ id: socket.id })).emit("provide-new-public-chat", { sender: player, message: '', score, guessed: true });
                        socket.emit("provide-new-public-chat-self", { sender: player, message: text, score, guessed: true });
                    } else {
                        // Not guessed, but have to filter for any hints
                        const filteredText = filterText({ id: socket.id }, text);
                        socket.broadcast.to(getUsersRoomId({ id: socket.id })).emit("provide-new-public-chat", { sender: player, message: filteredText, score, guessed: false });
                        socket.emit("provide-new-public-chat-self", { sender: player, message: filteredText, score, guessed: false });
                    }
                }
            }
        } catch (err) {
            // console.log(err);
        }
    });

    socket.on("get-public-artist-over", () => {
        let roomid = getUsersRoomId({ id: socket.id });
        let room = guestPublicRooms[roomid];
        if (room) {
            room.artOverRequests.add(socket.id);
            if (room && !room.isGameOver && Math.ceil(room.artOverRequests.size * 100 / room.getSize()) >= 100) {
                room.artSessionOver(io);
            }
        }
    });
}