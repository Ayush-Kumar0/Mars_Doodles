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
    roomPlayers; // [id(player_sid): {hasDrawnThisRound, score}]
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
    artistSid;

    hasStarted;
    waitingForNewArtist;
    waitingForNewRound;
    isGameOver;

    scoreIncrements;

    constructor(roomId) {
        this.id = roomId;
        this.roomPlayers = new Map(); // [id(player_sid): {hasDrawnThisRound, score, hasGuessed}]
        this.scoreIncrements = new Map();
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
            this.roomPlayers.set(player.id, { hasDrawnThisRound: false, score: 0, hasGuessed: false });
            this.roomSize++;
            // Start the game once minimum players are there
            return this;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    removePlayer(player) {
        if (this.roomPlayers.has(player.id)) {
            this.roomPlayers.delete(player.id);
            this.roomSize--;
        }
        return this.roomPlayers;
    }
    updateScore(player, text) {
        try {
            if (this.currentWord && text && this.currentWord.toLowerCase() === text.trim().toLowerCase()) {
                let oldPlayer = this.roomPlayers.get(player.id);
                // console.log(player.id, this.artistSid);
                if (oldPlayer && !oldPlayer.hasGuessed && this.artistSid && !this.isGameOver && player.id != this.artistSid) {
                    // TODO: Add scoring algorithm to give scores correctly
                    const scoreAddition = 100;
                    oldPlayer.score = oldPlayer.score ? oldPlayer.score + scoreAddition : scoreAddition;
                    if (this.scoreIncrements.has(player.id) && Number.isInteger(this.scoreIncrements.get(player.id)))
                        this.scoreIncrements.set(player.id, this.scoreIncrements.get(player.id) + scoreAddition);
                    else
                        this.scoreIncrements.set(player.id, scoreAddition);
                    oldPlayer.hasGuessed = true;
                    this.roomPlayers.set(player.id, oldPlayer);
                    return scoreAddition;
                }
            }
        } catch (err) {
            console.log(err);
        }
        return null;
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


        let artistKey = null; // Choose player to be artist
        for (const key of this.roomPlayers.keys()) {
            let obj = this.roomPlayers.get(key);
            if (obj && obj.hasDrawnThisRound === false) {
                artistKey = key;
                break;
            }
        }
        // Artist might leave just after we decided who is going to be artist
        // In that case its array position will be null


        const startPlayer = () => {
            console.log(this.roomPlayers, artistKey);
            let artist = this.roomPlayers.get(artistKey);
            this.artistSid = artistKey;
            if (artist) {
                // If artist is still in room, then continue the game

                obj.artist = artistKey;

                try {
                    this.onPause = false;
                    this.pivotTime = Date.now();
                    // Send drawing information to the artist
                    io.to(obj.artist).emit("provide-public-word-to-artist", playersInfo.get(obj.artist), obj.wordToDraw);
                    this.currentWord = obj.wordToDraw;
                    console.log('Word sent to artist: ' + obj.wordToDraw);
                    let temp = this.roomPlayers.get(artistKey);
                    temp.hasDrawnThisRound = true;
                    this.roomPlayers.set(artistKey, temp);

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
                    this.artistSid = null;
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
                    this.artistSid = null;
                    io.to(this.id).emit("provide-public-artist-over", playersInfo.get(obj.artist), obj?.wordToDraw);
                    console.log('Artist is over');
                    this.currentWord = null;
                    this.waitingForNewArtist = true;
                    this.onPause = true;
                    this.pivotTime = Date.now();
                    // Restor room players to let them guess for next drawing
                    const mapToArray = Array.from(this.roomPlayers).map(([key, value]) => {
                        if (key && value) {
                            value.hasGuessed = false;
                        }
                        return [key, value];
                    });
                    this.roomPlayers = new Map(mapToArray);
                    // Wait after the artist's session is completed;
                    setTimeout(() => {
                        // Start drawing session for another player
                        return this.startRound(io);
                    }, this.timeBtwArtSessions);
                }, this.playerTime);
            } else {
                // If artist is not there then choose another artist
                this.artistSid = null;
                return this.startRound(io);
            }
        }

        if (artistKey === null) {
            this.artistSid = null;
            // TODO: Delete the room if this room is empty
            // If artistKey==null, close this round and start new round
            // Serializing results
            const serializeScoreIncrements = () => {
                const newArray = Array.from(this.scoreIncrements).map(([key, value]) => {
                    if (key && playersInfo.has(key))
                        return { id: key, scoreIncrement: value };
                    return null;
                });
                return newArray;
            }
            // Send reults immediately
            io.to(this.id).emit("provide-public-round-over", serializeScoreIncrements());
            console.log('Round is over');
            this.waitingForNewRound = true;
            this.onPause = true;
            this.pivotTime = Date.now();
            this.roundsCompleted++;
            this.scoreIncrements.clear();

            if (this.roundsCompleted >= this.totalRounds) {
                return this.endGame(io);
            } else {
                // Restore all players to haven't drawn for next round
                const mapToArray = Array.from(this.roomPlayers).map(([key, value]) => {
                    if (key && value) {
                        value.hasDrawnThisRound = false;
                    }
                    return [key, value];
                });
                this.roomPlayers = new Map(mapToArray);

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
        for (let key of players.keys()) {
            if (key && players.get(key)) {
                let sid = key;
                data.push({
                    id: playersInfo.get(sid).id,
                    name: playersInfo.get(sid).name,
                    type: playersInfo.get(sid).type,
                    picture: playersInfo.get(sid).picture,
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
            artist: playersInfo.get(room.artistSid),
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


// Give score to the player
const giveScoreToPlayer = (player, text) => {
    const room = publicRooms.get(playersRoom.get(player.id));
    if (room)
        return room.updateScore(player, text);
    return null;
}


// Is player the artist in their room
const isPlayerArtist = (player) => {
    let roomid = getUsersRoomId(player);
    let room = publicRooms.get(roomid);
    if (player.id !== room.artistSid)
        return false;
    return true;
}


// Do word hiding
const filterText = (player, text) => {
    // TODO: Message filtering
    return text;
}


module.exports.addInRoom = addInRoom;
module.exports.removePlayer = removePlayer;
module.exports.shouldInformIfPlayerLeaves = shouldInformIfPlayerLeaves;
module.exports.getUsersRoomId = getUsersRoomId;
module.exports.serializeRoom = serializeRoom;
module.exports.giveScoreToPlayer = giveScoreToPlayer;
module.exports.filterText = filterText;
module.exports.isPlayerArtist = isPlayerArtist;