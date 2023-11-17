import React, { useContext, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import GamePlayers from '../components/GamePlayers/GamePlayers';
import Canva from '../components/Canva';
import Chatbox from '../components/Chatbox/Chatbox';
import roomContext from '../contexts/room/roomContext';
import authContext from '../contexts/auth/authContext';

function PublicGame() {
    const [userGuest, setUserGuest] = useContext(authContext);
    const [socket, setSocket] = useContext(roomContext);
    const [publicRoom, setPublicRoom] = useState({});
    const [artist, setArtist] = useState(null);
    const [amIArtist, setAmIArtist] = useState(false);
    const [word, setWord] = useState('');
    const [fullWord, setFullWord] = useState(null);

    useEffect(() => {
        // Get the initial state of public room game
        socket.emit("get-init-public-room");
        socket.on("provide-init-public-room", (result) => {
            if (!result) {
                return console.log('Server error');
            }
            // Setting the result of initial state of room
            setPublicRoom(result);
        });
        socket.on("provide-public-artist-info", (artMaker, word) => {
            setArtist(artMaker);
            setWord(word);
        });
        socket.on("provide-public-letter-hint", (revealedWord) => {
            setWord(revealedWord);
        });
        socket.on("provide-public-word-to-artist", (artMaker, fullWord) => {
            setAmIArtist(true);
            setFullWord(fullWord);
            setArtist(artMaker);
        });

        // Remove socket events here
        return () => {
            socket.off("provide-init-public-room");
            socket.off("provide-public-artist-info");
            socket.off("provide-public-letter-hint");
            socket.off("provide-public-word-to-artist");
        }
    }, [socket]);


    return (
        <>
            <GameContainer>
                <Topbar><span>{fullWord ? fullWord : word}</span><Timer className='timer' timer={publicRoom.playerTime} /></Topbar>
                <GamePlayers artistPlayer={artist} initplayers={publicRoom.players} socket={socket} userGuest={userGuest}></GamePlayers>
                <Canva></Canva>
                <Chatbox socket={socket}></Chatbox>
            </GameContainer>
        </>
    );
}





function Timer({ className, timer }) {
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
        let min = Math.floor(time / 1000 / 60);
        let sec = Math.floor(time / 1000) - min * 60;
        return min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    return (
        <span className={className}>{getTime(time)}</span>
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