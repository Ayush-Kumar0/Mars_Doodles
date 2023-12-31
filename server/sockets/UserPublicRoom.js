const User = require('../models/user');
const uuidv4 = require('uuid').v4;
const words = require('../data/words');

const addAlreadyPlaying = require('./utils').addAlreadyPlaying;
const isAlreadyPlaying = require('./utils').isAlreadyPlaying;

const usersInfo = require('./data').usersInfo; // { email: {id, name, type, picture} }
const removeObjectKey = require('./utils').removeObjectKey;


const startLimit = 2, roomLimit = 31;
const defaultPlayerTime = 120000, defaultTimeBtwRounds = 5000, defaultTimeBtwArtSessions = 3000;
const defaultTotalRounds = 2, defaultPercentWordReveal = 1;
const latencyDelay = 2000; // Latency should always be less than time between session








// All public room objects
const userPublicRooms = {}; // {roomid: new UserPublicRoom()}
// User: Room
const usersRoom = {}; // {email: roomid}



















class UserPublicRoom {
    id;
    roomPlayers; // [email: {hasDrawnThisRound, score, hasGuessed, isPresent}]
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
    artistEmail;
    artOverRequests;
    artStartTime;
    artSessionTimer;

    hasStarted;
    isArtSessionOver;
    isRoundOver;
    isGameOver;


    constructor(roomId, io) {
        this.id = roomId;
        this.roomPlayers = new Map(); // [email: {hasDrawnThisRound, score, hasGuessed, isPresent}]
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
            // Modify player if present
            if (this.roomPlayers.has(player.email)) {
                let plr = this.roomPlayers.get(player.email);
                plr.sid = player.sid;
                plr.isPresent = true;
            } else {
                // Add the player is not present
                this.roomPlayers.set(player.email, { sid: player.sid, hasDrawnThisRound: false, score: 0, hasGuessed: false, isPresent: true });
            }
            this.roomSize++;
            return this;
        } catch (err) {
            // console.log(err);
            return null;
        }
    }
    removePlayer(player, io) {
        if (this.roomPlayers.has(player.email)) {
            // Partially remove the player
            this.roomPlayers.get(player.email).isPresent = false;
            this.roomSize--;
            if (this.artistEmail === player.email) {
                clearTimeout(this.artSessionTimer);
                if (!this.isGameOver && this.isArtSessionOver === false)
                    this.artSessionOver(io);
            }
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
                let oldPlayer = this.roomPlayers.get(player.email);
                let artistPlayer = this.roomPlayers.get(this.artistEmail);
                // console.log(player.email, this.artistEmail);
                if (oldPlayer && !oldPlayer.hasGuessed && !this.isGameOver && player.email != this.artistEmail) {
                    // TODO: Add scoring algorithm to give scores correctly
                    const calcScore = () => {
                        let timediff = Date.now() - this.artStartTime;
                        let factors = [1.69, 1.44, 1.21, 1.0];
                        let playerScore = Math.floor(((this.playerTime - timediff) / this.playerTime) * 120 + 10);
                        let artistScore = Math.floor(factors[Math.floor(factors.length * timediff / this.playerTime + 0)] * playerScore / (this.getSize() > 0 ? this.getSize() : 1));
                        return [playerScore, artistScore];
                    }
                    const [playerScore, artistScore] = calcScore();
                    oldPlayer.score = Number.isInteger(oldPlayer.score) ? (oldPlayer.score + playerScore) : playerScore;
                    oldPlayer.hasGuessed = true;
                    artistPlayer.score = Number.isInteger(artistPlayer.score) ? (artistPlayer.score + artistScore) : artistScore;
                    return [playerScore, artistScore];
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
        if (this.getSize() === 0 || this.getSize() >= roomLimit || this.isGameOver || this.roundsCompleted >= this.totalRounds)
            return false;
        else {
            return true;
        }
    }


    getReadyForNextArtSession() {
        // Restore room players to let them guess for next drawing
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
        let artistEmail = null;
        for (const key of this.roomPlayers.keys()) {
            let obj = this.roomPlayers.get(key);
            if (obj && obj.isPresent && obj.hasDrawnThisRound === false) {
                artistEmail = key;
                break;
            }
        }
        if (artistEmail) {
            this.currentWord = words.at(Math.floor(Math.random() * words.length)); // Choose random word
            this.hiddenWord = this.currentWord.replace(/[^ ]/g, '_');
            return this.artistEmail = artistEmail; // Set the artist for this session
        } else {
            return null;
        }
    }
    emitToNonArtists(io) {
        this.artStartTime = Date.now();
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Send game information to other players in room
        const artistSocket = io.sockets.sockets.get(this.roomPlayers.get(this.artistEmail).sid);
        artistSocket.broadcast.to(this.id).emit("provide-public-artist-info", usersInfo[this.artistEmail], this.hiddenWord, this.roundsCompleted + 1); // Send artist's {id, name, type, picture}
        // console.log('Artist sent to all players');
    }
    emitToArtist(io) {
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Send drawing information to the artist
        this.artOverRequests.clear();
        io.to(this.roomPlayers.get(this.artistEmail).sid).emit("provide-public-word-to-artist", usersInfo[this.artistEmail], this.currentWord, this.roundsCompleted + 1);
        // console.log('Word sent to artist: ' + this.currentWord);
        let obj = this.roomPlayers.get(this.artistEmail);
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
            const artistSocket = io.sockets.sockets.get(this.roomPlayers.get(this.artistEmail).sid);
            if (artistSocket) {
                artistSocket.broadcast.to(this.id).emit("provide-public-artist-over", this.currentWord, usersInfo[this.artistEmail]);
                artistSocket.emit("provide-public-your-turn-over");
            } else {
                io.to(this.id).emit("provide-public-artist-over", this.currentWord, usersInfo[this.artistEmail]);
            }
            this.artistEmail = null;
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
            // console.log(this.roundsCompleted, this.totalRounds);
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
            this.artSessionTimer = setTimeout(() => {
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
        this.artistEmail = null;
        io.to(this.id).emit("provide-public-game-ended", "The game has ended");
        // Let players chat even after game is over
        // console.log('Game is over');
        return this.isGameOver;
    }
}





















const addInRoom = (player, io) => {
    return new Promise((resolve, reject) => {
        if (player) {
            if (player.roomid && userPublicRooms.hasOwnProperty(player.roomid) && userPublicRooms[player.roomid].isGameOver === false) {
                let room = userPublicRooms[player.roomid];
                let res = room.addPlayer(player);
                usersRoom[player.email] = id;
                resolve(res);
            } else {
                // Search for room id using some optimization algorithm
                let userPublicRoomIds = Object.keys(userPublicRooms);
                const findVacantRoomId = new Promise((resolve, reject) => {
                    function find(index) {
                        if (index >= userPublicRoomIds.length) {
                            resolve(null);
                        } else {
                            let id = userPublicRoomIds[index];
                            let room = userPublicRooms[id];
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
                    let room = userPublicRooms[id];
                    if (room) {
                        // console.log('Added in old room', id);
                        // Add player in existing room
                        let res = room.addPlayer(player);
                        // Update rooms
                        usersRoom[player.email] = id;
                        return resolve(res);
                    } else {
                        // Add player in new room
                        return resolve(addInNewRoom(player, io));
                    }
                }).catch(err => {
                    // console.log(err);
                    reject(err);
                });
            }
        } else {
            // console.log('Player is null');
            return resolve(null);
        }
    });
}


const addInNewRoom = (player, io) => {
    if (!player) return null;
    let id = uuidv4();
    let userPublicRoom = new UserPublicRoom(id, io);
    let res = userPublicRoom.addPlayer(player);
    usersRoom[player.email] = id;
    // Update rooms
    userPublicRooms[id] = userPublicRoom;
    return res;
}

const removePlayer = (player, io) => {
    if (!player) return null;
    let roomid = usersRoom[player.email];
    let room = userPublicRooms[roomid];
    if (room) {
        room.removePlayer(player, io);
        if (room.getSize() <= 0) {
            // Delete the room also
            delete userPublicRooms[roomid];
        }
        delete usersRoom[player.email];
    }
}



const getUsersRoomId = (player) => {
    if (player)
        return usersRoom[player.email];
    return null;
}


// Serializes the room that the user is part of.
const serializeRoom = (player) => {
    try {
        let roomid = usersRoom[player.email];
        let room = userPublicRooms[roomid];
        let players = room?.getPlayers();
        // console.log(players);
        if (!players)
            return {};
        let data = [];
        for (let key of players.keys()) {
            if (key && players.get(key)) {
                let email = key;
                if (players.get(key).isPresent)
                    data.push({
                        id: usersInfo[email].id,
                        name: usersInfo[email].name,
                        type: usersInfo[email].type,
                        picture: usersInfo[email].picture,
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
            artist: usersInfo[room.artistEmail],
            hiddenWord: room.hiddenWord,
            hasStarted: room.hasStarted,
            roundsCompleted: room.roundsCompleted,
            totalRounds: room.totalRounds,
            remainingTime: room.playerTime - (Date.now() - room.artStartTime),
        };
        return obj;
    } catch (err) {
        // console.log(err);
        return {};
    }
}


// Give score to the player
const giveScoreToPlayer = (player, text) => {
    const room = userPublicRooms[usersRoom[player.email]];
    if (room)
        return room.updateScore(player, text);
    return null;
}


// Is player the artist in their room
const isPlayerArtist = (player) => {
    let roomid = getUsersRoomId(player);
    let room = userPublicRooms[roomid];
    if (player.email !== room.artistEmail)
        return false;
    return true;
}


// Do word hiding
const filterText = (player, text) => {
    // TODO: Message filtering
    function isNearMatch(str1, str2, threshold = 1) {
        function calculateLevenshteinDistance(s1, s2) {
            const m = s1.length;
            const n = s2.length;
            const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

            for (let i = 0; i <= m; i++) {
                for (let j = 0; j <= n; j++) {
                    if (i === 0) {
                        dp[i][j] = j;
                    } else if (j === 0) {
                        dp[i][j] = i;
                    } else {
                        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                        dp[i][j] = Math.min(
                            dp[i - 1][j] + 1,
                            dp[i][j - 1] + 1,
                            dp[i - 1][j - 1] + cost
                        );
                    }
                }
            }

            return dp[m][n];
        }

        const distance = calculateLevenshteinDistance(str1, str2);

        return distance <= threshold;
    }

    const guessWord = userPublicRooms[usersRoom[player.email]].currentWord;
    if (guessWord && isNearMatch(text, guessWord, Math.floor(0.3 * guessWord.length)))
        return {
            near: true,
            text: (text + ' (Near Match)')
        };
    else
        return { near: false, text };
}























module.exports.isPlayerArtist = isPlayerArtist;
module.exports.removePlayer = removePlayer;
module.exports.getUsersRoomId = getUsersRoomId;
















module.exports.init = (socket, io) => {
    // Public room provider
    socket.on("get-public-room", (options, roomid) => {
        // Iff socket is authorized
        if (socket.user) {
            // console.log(usersInfo);
            // Email of logged in user
            const email = socket.user.email;
            if (isAlreadyPlaying(socket)) {
                console.log('Simultaneous games not allowed');
                socket.emit("provide-public-room", false, "Simultaneous games not allowed");
                return;
            }
            // Do mapping of {email: roomid} also
            try {
                addAlreadyPlaying(socket);
                // Store players info
                async function getUsersInfo(socket) {
                    if (socket.user) {
                        const user = await User.findById(socket.user._id);
                        return {
                            id: user.id,
                            name: user.name,
                            type: 'user',
                            picture: user.picture
                        };
                    } else
                        return null;
                }
                getUsersInfo(socket)
                    .then(player => {
                        usersInfo[email] = player;
                        addInRoom({ email, sid: socket.id, roomid }, io)
                            .then(result => {
                                if (result) {
                                    // Emit confirm to user so they can join
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
        if (socket.user) {
            const email = socket.user.email;
            try {
                let roominfo = serializeRoom({ email });
                if (roominfo.roomid) {
                    socket.emit("provide-init-public-room", removeObjectKey(roominfo, "room"));
                    // Broadcast in room when new player joins
                    socket.broadcast.to(roominfo.roomid).emit("provide-new-public-player", usersInfo[email]);
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
            if (text !== '' && socket.user) {
                const email = socket.user.email;
                let player = usersInfo[email];
                if (player && !isPlayerArtist({ email })) {
                    // Along with message, send the score if scored
                    const score = giveScoreToPlayer({ email }, text);
                    if (score) {
                        // Someone guessed
                        socket.broadcast.to(getUsersRoomId({ email })).emit("provide-new-public-chat", { sender: player, message: '', score: score[0], guessed: true });
                        socket.emit("provide-new-public-chat-self", { sender: player, message: text, score: score[0], guessed: true });
                        io.to(getUsersRoomId({ email })).emit("provide-new-public-chat", { sender: usersInfo[userPublicRooms[usersRoom[email]].artistEmail], score: score[1], isArtist: true });
                    } else {
                        // Not guessed, but have to filter for any hints
                        const filteredText = filterText({ email }, text);
                        if (!filteredText.near)
                            socket.broadcast.to(getUsersRoomId({ email })).emit("provide-new-public-chat", { sender: player, message: text, score, guessed: false });
                        socket.emit("provide-new-public-chat-self", { sender: player, message: filteredText.text, score, guessed: false });
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    socket.on("get-public-artist-over", () => {
        if (socket.user) {
            const email = socket.user.email;
            let roomid = getUsersRoomId({ email });
            let room = userPublicRooms[roomid];
            if (room) {
                room.artOverRequests.add(socket.id);
                if (room && !room.isGameOver && Math.ceil(room.artOverRequests.size * 100 / room.getSize()) >= 100) {
                    room.artSessionOver(io);
                }
            }
        }
    });
}