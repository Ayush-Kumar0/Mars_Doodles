import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import GamePlayers from '../components/GamePlayers/GamePlayers';
import Canva from '../components/Canva';
import Chatbox from '../components/Chatbox/Chatbox';
import roomContext from '../contexts/room/roomContext';
import authContext from '../contexts/auth/authContext';
import ArtSessionOver from '../components/Modals/ArtSessionOver';
import RoundOver from '../components/Modals/RoundOver';
import GameOver from '../components/Modals/GameOver';
import { toast } from 'react-toastify';

function UserPrivateGame() {
    const nav = useNavigate();
    const [userGuest, setUserGuest] = useContext(authContext);
    const { socket, setSocket } = useContext(roomContext);
    const [privateRoom, setPrivateRoom] = useState(null);
    const [artist, setArtist] = useState(null);
    const [word, setWord] = useState('');
    const [players, setPlayers] = useState([]); // Current scores are also present in it
    // Admin
    const [admin, setAdmin] = useState(null);
    // Accessible to the artist only
    const [wasIArtist, setWasIArtist] = useState(false);
    const [amIArtist, setAmIArtist] = useState(false);
    const [fullWord, setFullWord] = useState(null);
    // Waiting states
    const [hasStarted, setHasStarted] = useState(false);
    const [hasAdminConfigured, setHasAdminConfigured] = useState(false);
    const [waitingForNewArtist, setWaitingForNewArtist] = useState(false);
    const [waitingForNewRound, setWaitingForNewRound] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    // Timer
    const [timer, setTimer] = useState(null);
    const [round, setRound] = useState(0);
    const getOutOfRoomTimeout = useRef(null);
    // Modals
    const [artOverModalVisible, setArtOverModalVisible] = useState(false);
    const [artOverMsg, setArtOverMsg] = useState('');
    const [roundOverModalVisible, setRoundOverModalVisible] = useState(false);
    const [currentRoundScore, setCurrentRoundScore] = useState([]);
    const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
    // Results
    const [currentResults, setCurrentResults] = useState({});


    // Room joining events
    useEffect(() => {
        socket.emit("get-init-private-room");

        socket.on("provide-init-private-room", (result) => {
            console.log(result);
            if (!result) {
                return console.log('Server error');
            }
            console.log(result);
            setPrivateRoom(result);
            setPlayers(result.players);
            setAdmin(result.admin);
            setArtist(result.artist);
            if (userGuest && userGuest.user && userGuest._id && result.artist && result.artist.id === userGuest.user._id)
                setAmIArtist(true);
            else
                setAmIArtist(false);
            setWord(result.hiddenWord);
            setHasStarted(result.hasStarted);
            setHasAdminConfigured(result.hasAdminConfigured);
            setRound(result.roundsCompleted);
            let scoreObj = {};
            for (let plr of result.players) {
                scoreObj[plr.id] = plr.score;
            }
            setCurrentResults(scoreObj);
        });

        return () => {
            socket.off("provide-init-private-room");
        }
    }, [socket]);


    // Game events
    useEffect(() => {
        socket.on("provide-private-artist-info", (artMaker, word, round) => {
            setAmIArtist(false);
            setWord(word);
            setFullWord(null);
            setArtist(artMaker);
            setHasStarted(true);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(false);
            setTimer(privateRoom.playerTime);
            setRound(round);
            setArtOverModalVisible(false);
            setTimeout(() => {
                socket.emit("get-private-artist-over");
            }, privateRoom.playerTime);
        });
        socket.on("provide-private-letter-hint", (revealedWord) => {
            setWord(revealedWord);
        });
        socket.on("provide-private-word-to-artist", (artMaker, fullWord, round) => {
            setAmIArtist(true);
            setFullWord(fullWord);
            setWord('');
            setArtist(artMaker);
            setHasStarted(true);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(false);
            setTimer(privateRoom.playerTime);
            setRound(round);
            setArtOverModalVisible(false);
            setTimeout(() => {
                socket.emit("get-private-artist-over");
            }, privateRoom.playerTime);
        });

        socket.on("provide-private-artist-over", (completeWord, artMaker) => {
            setArtOverModalVisible(true);
            setWasIArtist(false);
            setArtOverMsg({
                word: completeWord,
                name: artMaker.name
            });
            setWaitingForNewArtist(true);
            setWaitingForNewRound(false);
            // setTimer(privateRoom.timeBtwArtSessions);
            setTimer(0);
        });
        socket.on("provide-private-your-turn-over", () => {
            setWasIArtist(true);
            setAmIArtist(false);
            setWaitingForNewArtist(true);
            setWaitingForNewRound(false);
            setArtOverModalVisible(true);
            // setTimer(privateRoom.timeBtwArtSessions);
            setTimer(0);
        });

        socket.on("provide-private-round-over", (result) => {
            setArtOverModalVisible(false);
            setRoundOverModalVisible(true);
            setCurrentRoundScore([]);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(true);
            // setTimer(privateRoom.timeBtwRounds);
            setTimer(0);
        });

        socket.on("provide-private-game-ended", (result) => {
            setTimer(undefined);
            setWord('');
            setFullWord('');
            setGameOverModalVisible(true);
            setIsGameOver(true);
            setArtOverModalVisible(false);
            setRoundOverModalVisible(false);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(false);
            setAmIArtist(false);
            setArtist(null);
            // Get out of the room yourself after 10 mins
            getOutOfRoomTimeout.current = setTimeout(() => {
                if (socket) {
                    toast.info('Room time expired');
                    socket.disconnect();
                    nav('/user');
                }
            }, 600000);
        });

        socket.on("provide-removed-private-game", (message) => {
            console.log(message);
            if (!isGameOver)
                toast.info(message);
            socket.disconnect();
            nav('/user');
        });

        // Show message that you got kicked
        socket.on("provide-private-got-kicked", () => {
            toast.info("You were kicked by Admin");
            if (socket)
                socket.disconnect();
            nav('/user');
        });



        // Remove socket events here
        return () => {
            socket.off("provide-private-artist-info");
            socket.off("provide-private-letter-hint");
            socket.off("provide-private-word-to-artist");
            socket.off("provide-private-artist-over");
            socket.off("provide-private-your-turn-over");
            socket.off("provide-private-round-over");
            socket.off("provide-private-game-ended");
            socket.off("provide-removed-private-game");
            socket.off("provide-private-got-kicked");
            clearTimeout(getOutOfRoomTimeout?.current);
        }
    }, [socket, privateRoom]);


    // Player add, leave events
    useEffect(() => {
        // When new player joins room
        socket.on("provide-new-private-player", (result) => {
            // console.log(initplayers, result);
            setPlayers(prevPlayers => {
                let index = prevPlayers.findIndex((plr) => plr.id === result.id);
                if (index === -1)
                    return [...prevPlayers, result];
                else
                    return prevPlayers;
            });
        });
        // When a player leaves the room
        socket.on("provide-private-player-left", (result) => {
            setPlayers(prevPlayers => prevPlayers.filter(pl => pl.id !== result.id));
        });

        return () => {
            socket.off("provide-new-private-player");
            socket.off("provide-private-player-left");
        }
    }, [socket]);




    // Score changer
    const handleScoreStorage = (player, score) => {
        console.log(player, score);
        score = Math.floor(score);
        if (player && player.id && Number.isInteger(score)) {
            setCurrentResults(prevResults => {
                const updatedResults = Object.create(prevResults);
                updatedResults[player.id] = (updatedResults[player.id] || 0) + score;
                return updatedResults;
            });
        }
    }

    const exitRoom = (e) => {
        try {
            e.preventDefault();
            if (socket)
                socket.disconnect();
            nav('/user');
        } catch (err) {
            console.log(err);
        }
    }

    // Allow admin to kick any player
    const kickPlayer = (e, playerid) => {
        e.preventDefault();
        console.log(playerid);
        // Tell server to remove the player
        if (socket)
            socket.emit("get-kick-private-player", playerid);
    }

    // Function to copy room id to clipboard on button click
    const copyToClipboard = (e) => {
        navigator.clipboard.writeText(privateRoom?.shortid);
    }

    return (
        <>
            <GameContainer>
                <Topbar>
                    <Leave onClick={exitRoom}><img className='leavebuttonimg' src='/assets/exit_room.svg' /></Leave>
                    <ShareId>{privateRoom?.shortid}{privateRoom?.shortid && <img className='clipboard' src='/assets/copy_to_clipboard.svg' onClick={copyToClipboard} />}</ShareId>
                    <span className='givenword'>{fullWord ? fullWord : word}</span>
                    {isGameOver ? <span className='timer'>Game Over</span> : <Timer className='timer' timer={timer} roundsCompleted={round} totalRounds={privateRoom?.totalRounds} />}
                </Topbar>
                <GamePlayers artistPlayer={artist} adminPlayer={admin} playersParent={players} currentResults={currentResults} socket={socket} userGuest={userGuest} kickPlayer={kickPlayer}></GamePlayers>
                <Canva
                    hasStarted={hasStarted}
                    hasAdminConfigured={hasAdminConfigured}
                    isPublic={false}
                    admin={admin}
                    userGuest={userGuest}
                    amIArtistParent={amIArtist}
                    socket={socket}
                    waitingForNewArtist={waitingForNewArtist}
                ></Canva>
                <Chatbox socket={socket} userGuest={userGuest} handleScoreStorage={handleScoreStorage} amIArtistParent={amIArtist} isPrivate={true} isChatEnabledParent={privateRoom?.isChatEnabled}></Chatbox>
            </GameContainer>
            {artOverModalVisible && <ArtSessionOver close={() => setArtOverModalVisible(false)} artOverMsg={artOverMsg} wasIArtist={wasIArtist} />}
            {roundOverModalVisible && <RoundOver close={() => setRoundOverModalVisible(false)} currentResults={currentResults} players={players} />}
            {gameOverModalVisible && <GameOver close={() => setGameOverModalVisible(false)} />}
        </>
    );
}






function Timer({ className, timer, roundsCompleted, totalRounds }) {
    const [time, setTime] = useState(timer);

    useEffect(() => {
        let startTime;

        function animate(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            setTime((prevTime) => {
                const newTime = timer - elapsed;

                if (newTime <= 0) {
                    return 0;
                } else {
                    return newTime;
                }
            });

            if (elapsed < timer) {
                requestAnimationFrame(animate);
            }
        }

        const animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [timer]);

    const getTime = (time) => {
        time = Math.floor(time);
        if (time && Number.isInteger(time) && !Number.isNaN(timer)) {
            let min = Math.floor(time / 1000 / 60);
            let sec = Math.floor(time / 1000) - min * 60;
            return min + ':' + (sec < 10 ? '0' : '') + sec;
        } else {
            return '';
        }
    };

    return (
        <span className={className}>
            <span>
                {roundsCompleted !== 0 ? `Round: ${roundsCompleted}/${totalRounds}` : ''}
            </span>
            &nbsp;
            {getTime(time)}
        </span>
    );
}





const GameContainer = styled.div`
    --topbar-height: 40px;
    --gameplayer-width: 20ch;

    position: relative;
    display: flex;
    max-width: 100vw;
    min-height: 100vh;
    align-items: center;
    justify-content: space-between;
    margin: 0px;
    padding: 0px;
    padding-top: var(--topbar-height);
    @media (max-width:720px) {
        flex-wrap: wrap;
    }
`;

const Topbar = styled.div`
    width: 100%;
    height: var(--topbar-height);
    position: absolute;
    top: 0px;
    background-color: var(--charcoal);
    display: flex;
    align-items: center;
    justify-content: center;

    .givenword {
        color: white;
        text-transform: uppercase;
        letter-spacing: 2px;
        word-spacing: 5px;
    }

    .timer {
        color: white;
        position: absolute;
        right: 0px;
        margin-right: 10px;
    }
`;

const Leave = styled.button`
    position: absolute;
    left: 5px;
    rotate: 180deg;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    img {
        stroke: white;
    }
    cursor: pointer;
`;

const ShareId = styled.span`
    position: absolute;
    color: var(--whitesmoke);
    left: 45px;
    display: flex;
    justify-content: center;
    align-items: center;

    .clipboard {
        cursor: pointer;
        transition: transform 0.3s ease-in;
    }
    .clipboard:active {
        animation: pulse 0.3s ease;
    }
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
        }
    }
`;

export default UserPrivateGame;