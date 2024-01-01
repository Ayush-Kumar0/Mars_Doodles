const User = require('../models/user');
const uuidv4 = require('uuid').v4;
const Filter = require('bad-words');
const words = require('../data/words');

const addAlreadyPlaying = require('./utils').addAlreadyPlaying;
const isAlreadyPlaying = require('./utils').isAlreadyPlaying;
const filter = new Filter();

const usersInfo = require('./data').usersInfo; // { email: {id, name, type, picture} }
const removeObjectKey = require('./utils').removeObjectKey;
const generateUniqueString = require('./utils').generateUniqueString;


const startLimit = 2, roomLimit = 31;
const defaultPlayerTime = 30000, defaultTimeBtwRounds = 5000, defaultTimeBtwArtSessions = 3000;
const defaultTotalRounds = 2, defaultPercentWordReveal = 1;
const latencyDelay = 2000; // Latency should always be less than time between session








// All private room objects
const userPrivateRooms = {}; // {roomid: new UserPrivateRoom()}
// User: Room
const usersRoom = {}; // {email: roomid}
// Shorted room ids
const shortRoomid = {}; // {shortid: roomid}



















class UserPrivateRoom {
    id;
    shortid;
    roomPlayers; // [email: {hasDrawnThisRound, score, hasGuessed, isPresent}]
    adminEmail; //admin's email
    isChatEnabled; // whether chat is enabled or not
    lowerLimit;
    roomLimit;
    playerTime;
    timeBtwRounds;
    timeBtwArtSessions;
    totalRounds;
    roundsCompleted;
    currentWord; // Complete word
    percentWordReveal;
    hiddenWord; // Partially revealed word
    roomSize;
    artistEmail; //Email of artist
    artStartTime;
    artOverRequests;
    artSessionTimer;

    hasStarted;
    hasAdminConfigured;
    isArtSessionOver;
    isRoundOver;
    isGameOver;

    blacklist; // Object containing keys for kicked players


    constructor(roomId, io) {
        this.id = roomId;
        this.roomPlayers = new Map(); // [email: {hasDrawnThisRound, score, hasGuessed, isPresent}]
        this.artOverRequests = new Set();
        this.isChatEnabled = true;
        this.lowerLimit = startLimit;
        this.roomLimit = roomLimit;
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
        this.artStartTime = null;
        this.isRoundOver = true;
        this.hasAdminConfigured = false;
        let uniqueStr = generateUniqueString(6);
        while (shortRoomid.hasOwnProperty(uniqueStr)) uniqueStr = generateUniqueString(6);
        this.shortid = uniqueStr;
        shortRoomid[this.shortid] = this.id;
        this.blacklist = {};
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
        if (this.hasAdminConfigured && this.hasStarted && (this.getSize() <= 1 || player.email === this.adminEmail) && !this.isGameOver) {
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
                if (oldPlayer && artistPlayer && !oldPlayer.hasGuessed && !this.isGameOver && player.email != this.artistEmail) {
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
        artistSocket.broadcast.to(this.id).emit("provide-private-artist-info", usersInfo[this.artistEmail], this.hiddenWord, this.roundsCompleted + 1); // Send artist's {id, name, type, picture}
        // console.log('Artist sent to all players');
    }
    emitToArtist(io) {
        this.isArtSessionOver = false;
        this.isRoundOver = false;
        // Send drawing information to the artist
        this.artOverRequests.clear();
        io.to(this.roomPlayers.get(this.artistEmail).sid).emit("provide-private-word-to-artist", usersInfo[this.artistEmail], this.currentWord, this.roundsCompleted + 1);
        // console.log('Word sent to artist: ' + this.currentWord);
        let obj = this.roomPlayers.get(this.artistEmail);
        obj.hasDrawnThisRound = true;
    }
    provideHints(io) {
        this.hint = setInterval(() => {
            let index = Math.floor(Math.random() * this.currentWord.length);
            this.hiddenWord = this.hiddenWord.substring(0, index) + this.currentWord[index] + this.hiddenWord.substring(index + 1);
            io.to(this.id).emit("provide-private-letter-hint", this.hiddenWord);
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
                artistSocket.broadcast.to(this.id).emit("provide-private-artist-over", this.currentWord, usersInfo[this.artistEmail]);
                artistSocket.emit("provide-private-your-turn-over");
            } else {
                io.to(this.id).emit("provide-private-artist-over", this.currentWord, usersInfo[this.artistEmail]);
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
            if (this.roundsCompleted < this.totalRounds) {
                // Provide round results to all players
                io.to(this.id).emit("provide-private-round-over");
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
        if (!this.hasStarted && this.hasAdminConfigured && !this.isGameOver && this.roundsCompleted < this.totalRounds && this.getSize() >= this.lowerLimit) {
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
        io.to(this.id).emit("provide-private-game-ended", "The game has ended");
        // Let players chat even after game is over
        // console.log('Game is over');
        return this.isGameOver;
    }
}




















// When join requests come
const joinRoom = (player, shortid) => {
    if (shortRoomid.hasOwnProperty(shortid)) {
        const room = userPrivateRooms[shortRoomid[shortid]];
        console.log(room.blacklist);
        if (room && !room.blacklist.hasOwnProperty(player.email)) {
            let res = room.addPlayer(player);
            if (res) {
                usersRoom[player.email] = res.id;
                return res;
            }
        }
    }
    return null;
}


// When create requests come
const createAndJoinRoom = (player, io) => {
    return new Promise((resolve, reject) => {
        if (!player) return null;
        let id = uuidv4();
        let userPrivateRoom = new UserPrivateRoom(id, io);
        let res = userPrivateRoom.addPlayer(player);
        userPrivateRoom.adminEmail = player.email;
        usersRoom[player.email] = id;
        // Update rooms
        userPrivateRooms[id] = userPrivateRoom;
        return resolve(res);
    });
}

const removePlayer = (player, io, socket) => {
    if (!player) return null;
    let roomid = usersRoom[player.email];
    let room = userPrivateRooms[roomid];
    if (room) {
        if (player.email === room.adminEmail) {
            socket.broadcast.to(room.id).emit("provide-removed-private-game", "Game ended by admin");
        }
        room.removePlayer(player, io);
        socket.leave(room.id);
        if (room.getSize() <= 0) {
            // Delete the room also
            delete shortRoomid[this.shortid];
            delete userPrivateRooms[roomid];
        }
        delete usersRoom[player.email];
    }
}


// Kick players from the private room and don't let them join again
const kickPlayerFromRoom = (email) => {
    // Blacklist the user in this room
    const room = userPrivateRooms[usersRoom[email]];
    if (room) {
        room.blacklist[email] = true;
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
        let room = userPrivateRooms[roomid];
        let players = room?.getPlayers();
        let data = [];
        if (players)
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
            room: room,
            roomid,
            shortid: room.shortid,
            players: data,
            playerTime: room.playerTime,
            timeBtwRounds: room.timeBtwRounds,
            timeBtwArtSessions: room.timeBtwArtSessions,
            admin: usersInfo[room.adminEmail],
            artist: usersInfo[room.artistEmail],
            hiddenWord: room.hiddenWord,
            hasStarted: room.hasStarted,
            hasAdminConfigured: room.hasAdminConfigured,
            roundsCompleted: room.roundsCompleted,
            totalRounds: room.totalRounds,
            isChatEnabled: room.isChatEnabled,
            isGameOver: room.isGameOver,
            remainingTime: room.playerTime - (Date.now() - room.artStartTime),
        };
        return obj;
    } catch (err) {
        console.log(err);
        return {};
    }
}


// Give score to the player
const giveScoreToPlayer = (player, text) => {
    const room = userPrivateRooms[usersRoom[player.email]];
    if (room)
        return room.updateScore(player, text);
    return null;
}


// Is player the artist in their room
const isPlayerArtist = (player) => {
    let roomid = getUsersRoomId(player);
    let room = userPrivateRooms[roomid];
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

    const guessWord = userPrivateRooms[usersRoom[player.email]].currentWord;
    if (guessWord?.toLowerCase() === text?.toLowerCase()) {
        return {
            near: 1, // complete match
            text: filter.clean(text)
        };
    } else if (guessWord && isNearMatch(text, guessWord, Math.ceil(0.3 * guessWord.length)))
        return {
            near: 2, // partial match
            text: filter.clean(text)
        };
    else
        return { near: null, text: filter.clean(text) };
}























module.exports.isPlayerArtist = isPlayerArtist;
module.exports.removePlayer = removePlayer;
module.exports.getUsersRoomId = getUsersRoomId;
















module.exports.init = (socket, io) => {
    // Private room provider
    socket.on("get-new-private-room", (options) => {
        // Iff socket is authorized
        if (socket.user) {
            console.log(usersInfo);
            // Email of logged in user
            const email = socket.user.email;
            if (isAlreadyPlaying(socket)) {
                console.log('Simultaneous games not allowed');
                socket.emit("provide-private-room", false, "Simultaneous games not allowed");
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
                        createAndJoinRoom({ email, sid: socket.id }, io)
                            .then(result => {
                                if (result) {
                                    // Emit confirm to user so they can join
                                    socket.join(result.id);
                                    socket.emit("provide-private-room", true);
                                } else
                                    socket.emit("provide-private-room", false);
                            })
                            .catch(err => {
                                console.log("Couldn't add in a room", err);
                                socket.emit("provide-private-room", false);
                            });
                    }).catch(err => {
                        console.log('Could not get players info', err);
                        socket.emit("provide-private-room", false);
                    });
            } catch (err) {
                console.log(err);
                socket.emit("provide-private-room", false);
            }
        } else {
            console.log('Not authorized');
            socket.emit("provide-private-room", false);
        }
    });

    // Providing private rooms current state
    socket.on("get-init-private-room", (options) => {
        if (socket.user) {
            const email = socket.user.email;
            try {
                let roominfo = serializeRoom({ email });
                if (roominfo.roomid) {
                    socket.emit("provide-init-private-room", removeObjectKey(roominfo, "room"));
                    // Broadcast in room when new player joins
                    socket.broadcast.to(roominfo.roomid).emit("provide-new-private-player", usersInfo[email]);
                    // Call start function
                    if (roominfo.room && roominfo.hasAdminConfigured === true) {
                        roominfo.room.start(io);
                    }
                }
            } catch (err) {
                // console.log(err);
                socket.emit("provide-init-private-room", null);
            }
        } else {
            socket.emit("provide-init-private-room", null);
        }
    });

    socket.on("get-start-private-room", (options) => {
        try {
            if (socket.user) {
                const email = socket.user.email;
                if (email) {
                    let room = userPrivateRooms[usersRoom[email]]; // Get room of user
                    // if request sender is admin
                    if (room.adminEmail === email) {
                        if (options.hasOwnProperty('isChatEnabled'))
                            room.isChatEnabled = options.isChatEnabled;
                        if (options.hasOwnProperty('totalRounds'))
                            room.totalRounds = options.totalRounds;
                        if (options.hasOwnProperty('drawingTime'))
                            room.playerTime = options.drawingTime * 1000;
                        if (options.hasOwnProperty('minimumPlayers'))
                            room.lowerLimit = options.minimumPlayers;
                        if (options.hasOwnProperty('maximumPlayers'))
                            room.roomLimit = options.maximumPlayers;
                        room.hasAdminConfigured = true;

                        // Send the updated room to everyone
                        try {
                            let roominfo = serializeRoom({ email });
                            if (roominfo.roomid) {
                                io.to(roominfo.roomid).emit("provide-init-private-room", removeObjectKey(roominfo, "room"));
                                // Call start function
                                if (roominfo.room) {
                                    roominfo.room.start(io);
                                }
                            }
                        } catch (err) {
                            // console.log(err);
                            socket.emit("provide-init-private-room", null);
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    socket.on('get-join-private-room', (shortid) => {
        try {
            if (socket && socket.user) {
                const email = socket.user.email;
                if (email) {
                    if (isAlreadyPlaying(socket)) {
                        console.log('Simultaneous games not allowed');
                        socket.emit("provide-private-room", false, "Simultaneous games not allowed");
                        return;
                    }
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
                            // Store players info in memory
                            usersInfo[email] = player;
                            // Join existing room with room id
                            let res = joinRoom({ email, sid: socket.id }, shortid);
                            if (res) {
                                // Return true to user
                                socket.join(res.id);
                                res.start(io);
                                socket.emit("provide-private-room", true);
                            } else {
                                // Message user that room doesn't exist
                                socket.emit("provide-private-room", false, "Room doesn't exist");
                            }
                        }).catch(err => {
                            console.log('Could not get players info', err);
                            socket.emit("provide-private-room", false);
                        });
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    // New chat sent to private room
    socket.on("send-new-private-chat", (text) => {
        try {
            if (text !== '' && socket.user) {
                const email = socket.user.email;
                let player = usersInfo[email];
                if (player && !isPlayerArtist({ email })) {
                    // Along with message, send the score if scored
                    const score = giveScoreToPlayer({ email }, text);
                    if (score) {
                        // Someone guessed
                        socket.broadcast.to(getUsersRoomId({ email })).emit("provide-new-private-chat", { sender: player, message: '', score: score[0], guessed: true });
                        socket.emit("provide-new-private-chat-self", { sender: player, message: text, score: score[0], guessed: true });
                        io.to(getUsersRoomId({ email })).emit("provide-new-private-chat", { sender: usersInfo[userPrivateRooms[usersRoom[email]].artistEmail], score: score[1], isArtist: true });
                    } else {
                        // Not guessed, but have to filter for any hints
                        const filteredText = filterText({ email }, text);
                        const room = userPrivateRooms[usersRoom[email]];
                        if (room && room.isChatEnabled && !filteredText.near) {
                            socket.broadcast.to(getUsersRoomId({ email })).emit("provide-new-private-chat", { sender: player, message: filteredText.text, score, guessed: false });
                            socket.emit("provide-new-private-chat-self", { sender: player, message: filteredText.text, score, guessed: false });
                        } else {
                            socket.emit("provide-new-private-chat-self", { sender: player, message: filteredText.text, score, guessed: false, matchFactor: filteredText.near });
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    socket.on("get-private-artist-over", () => {
        if (socket.user) {
            const email = socket.user.email;
            let roomid = getUsersRoomId({ email });
            let room = userPrivateRooms[roomid];
            if (room) {
                room.artOverRequests.add(socket.id);
                if (room && !room.isGameOver && Math.ceil(room.artOverRequests.size * 100 / room.getSize()) >= 100) {
                    room.artSessionOver(io);
                }
            }
        }
    });

    socket.on("get-kick-private-player", async (playerid) => {
        try {
            const email = socket.user.email;
            const adminsRoom = userPrivateRooms[usersRoom[email]];
            if (email && playerid && adminsRoom) {
                const kickedPlayer = await User.findById(playerid);
                if (kickedPlayer) {
                    // Remove the player
                    kickPlayerFromRoom(kickedPlayer.email);
                    const room = userPrivateRooms[usersRoom[kickedPlayer.email]];
                    if (room) {
                        const kickedPlayerSocket = io.sockets.sockets.get(room.roomPlayers.get(kickedPlayer.email).sid);
                        if (kickedPlayerSocket) {
                            // Tell others that player has left
                            kickedPlayerSocket.broadcast.to(room.id).emit("provide-private-player-left", usersInfo[kickedPlayer.email]);
                            kickedPlayerSocket.emit("provide-private-got-kicked");
                            removePlayer({ email: kickedPlayer.email, id: kickedPlayerSocket.id }, io, kickedPlayerSocket);
                            delete usersInfo[kickedPlayer.email];
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    });
}