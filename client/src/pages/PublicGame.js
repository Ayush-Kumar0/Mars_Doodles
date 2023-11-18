import React, { useContext, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import GamePlayers from '../components/GamePlayers/GamePlayers';
import Canva from '../components/Canva';
import Chatbox from '../components/Chatbox/Chatbox';
import roomContext from '../contexts/room/roomContext';
import authContext from '../contexts/auth/authContext';
import ArtSessionOver from '../components/Modals/ArtSessionOver';
import RoundOver from '../components/Modals/RoundOver';
import GameOver from '../components/Modals/GameOver';

function PublicGame() {
    const [userGuest, setUserGuest] = useContext(authContext);
    const [socket, setSocket] = useContext(roomContext);
    const [publicRoom, setPublicRoom] = useState(null);
    const [artist, setArtist] = useState(null);
    const [word, setWord] = useState('');
    // Accessible to the artist only
    const [amIArtist, setAmIArtist] = useState(false);
    const [fullWord, setFullWord] = useState(null);
    // Waiting states
    const [hasStarted, setHasStarted] = useState(false);
    const [waitingForNewArtist, setWaitingForNewArtist] = useState(false);
    const [waitingForNewRound, setWaitingForNewRound] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    // Timer
    const [timer, setTimer] = useState(null);
    const [round, setRound] = useState(0);
    // Modals
    const [artOverModalVisible, setArtOverModalVisible] = useState(false);
    const [roundOverModalVisible, setRoundOverModalVisible] = useState(false);
    const [gameOverModalVisible, setGameOverModalVisible] = useState(false);

    useEffect(() => {
        // roomid,
        // players: data,
        // onPause: room.onPause,
        // playerTime: room.playerTime,
        // timeBtwRounds: room.timeBtwRounds,
        // timeBtwArtSessions: room.timeBtwArtSessions,
        // timer: Date.now()-room.pivotTime,

        // Get the initial state of public room game
        socket.emit("get-init-public-room");
    }, [socket]);

    useEffect(() => {
        socket.on("provide-init-public-room", (result) => {
            console.log(result);
            if (!result) {
                return console.log('Server error');
            }
            // Setting the result of initial state of room
            setPublicRoom(result);
            setHasStarted(result.hasStarted);
            setArtist(result.artist);
            setWord(result.hiddenWord);
            setHasStarted(result.hasStarted);
            setWaitingForNewArtist(result.waitingForNewArtist);
            setWaitingForNewRound(result.waitingForNewRound);
            setIsGameOver(result.isGameOver);
            setRound(result.roundsCompleted);
            if (result.hasStarted && !result.isGameOver && !result.waitingForNewArtist && !result.waitingForNewRound) {
                let val = result.playerTime - result.timeSpent;
                setTimer(val > 0 ? val : 0);
            } else if (result.hasStarted && result.waitingForNewArtist) {
                let val = result.timeBtwArtSessions - result.timeSpent;
                setTimer(val > 0 ? val : 0);
            } else if (result.hasStarted && result.waitingForNewRound) {
                let val = result.timeBtwRounds - result.timeSpent;
                setTimer(val > 0 ? val : 0);
            }
        });

        return () => {
            socket.off("provide-init-public-room");
        }
    }, [socket]);


    useEffect(() => {
        socket.on("provide-public-artist-info", (artMaker, word) => {
            setArtist(artMaker);
            setWord(word);
            setFullWord(null);
            setHasStarted(true);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(false);
            setTimer(publicRoom.playerTime);
            setRound(round => round === 0 ? 1 : round);
            // setArtOverModalVisible(false);
            // setRoundOverModalVisible(false);
        });
        socket.on("provide-public-letter-hint", (revealedWord) => {
            setWord(revealedWord);
        });
        socket.on("provide-public-word-to-artist", (artMaker, fullWord) => {
            setAmIArtist(true);
            setFullWord(fullWord);
            setWord('');
            setArtist(artMaker);
            setHasStarted(true);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(false);
            setTimer(publicRoom.playerTime);
            setRound(round => round === 0 ? 1 : round);
            // setArtOverModalVisible(false);
            // setRoundOverModalVisible(false);
        });
        socket.on("provide-public-artist-over", (overArtist, wordDrawn) => {
            if (overArtist && overArtist.name) {
                console.log(`The word was ${wordDrawn} by ${overArtist.name}\nWaiting...`);
            } else if (artist && artist.name) {
                console.log(`The word was ${wordDrawn} by ${artist.name}\nWaiting...`);
            }
            setWaitingForNewArtist(true);
            setWaitingForNewRound(false);
            console.log(publicRoom.timeBtwArtSessions);
            setTimer(publicRoom.timeBtwArtSessions);
            setArtOverModalVisible(true);
            setRoundOverModalVisible(false);
        });
        socket.on("provide-public-round-over", (roundResults, totalResults) => {
            console.log(`${roundResults}, ${totalResults}\nWaiting..............................`);
            setWaitingForNewArtist(false);
            setWaitingForNewRound(true);
            console.log(publicRoom.timeBtwRounds);
            setTimer(publicRoom.timeBtwRounds);
            setArtOverModalVisible(false);
            setRoundOverModalVisible(true);
            setRound(round => {
                if (round < publicRoom.totalRounds)
                    return round + 1;
                else
                    return round;
            });
        });
        socket.on("provide-public-game-ended", (results) => {
            console.log(`${results}\nGame Over`);
            setIsGameOver(true);
            setWaitingForNewArtist(false)
            setWaitingForNewRound(false);
            setTimer(null);
            setGameOverModalVisible(true);
            setArtOverModalVisible(false);
            setRoundOverModalVisible(false);
        });


        // Remove socket events here
        return () => {
            socket.off("provide-public-artist-info");
            socket.off("provide-public-letter-hint");
            socket.off("provide-public-word-to-artist");
            socket.off("provide-public-artist-over");
            socket.off("provide-public-round-over");
            socket.off("provide-public-game-ended");
        }
    }, [socket, publicRoom]);


    return (
        <>
            <GameContainer>
                <Topbar><span>{fullWord ? fullWord : word}</span><Timer className='timer' timer={timer} roundsCompleted={round} totalRounds={publicRoom?.totalRounds} /></Topbar>
                <GamePlayers artistPlayer={artist} initplayers={publicRoom?.players} socket={socket} userGuest={userGuest}></GamePlayers>
                <Canva></Canva>
                <Chatbox socket={socket}></Chatbox>
            </GameContainer>
            {artOverModalVisible && <ArtSessionOver close={() => setArtOverModalVisible(false)} />}
            {roundOverModalVisible && <RoundOver close={() => setRoundOverModalVisible(false)} />}
            {gameOverModalVisible && <GameOver close={() => setGameOverModalVisible(false)} />}
        </>
    );
}





function Timer({ className, timer, roundsCompleted, totalRounds }) {
    const [time, setTime] = useState(timer);

    useEffect(() => {
        setTime(timer);
        let timeinterval = setInterval(() => {
            setTime(prevTime => {
                if (prevTime <= 1000) {
                    clearInterval(timeinterval);
                    return 0;
                } else
                    return prevTime - 1000;
            });
        }, 1000);

        return () => {
            clearInterval(timeinterval);
        }
    }, [timer]);


    const getTime = (time) => {
        if (time && Number.isInteger(timer)) {
            let min = Math.floor(time / 1000 / 60);
            let sec = Math.floor(time / 1000) - min * 60;
            return min + ':' + (sec < 10 ? '0' : '') + sec;
        } else
            return '';

    }

    return (
        <span className={className}>
            <span>{
                (roundsCompleted !== 0) ? `Round: ${roundsCompleted}/${totalRounds}` : ''
            }</span>
            &nbsp;
            {getTime(time)}</span>
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
    color: white;
    text-transform: uppercase;
    letter-spacing: 2px;
    word-spacing: 5px;

    .timer {
        position: absolute;
        right: 0px;
        margin-right: 10px;
    }
`;

export default PublicGame;