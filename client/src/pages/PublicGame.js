import React, { useContext, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import GamePlayers from '../components/GamePlayers/GamePlayers';
import Canva from '../components/Canva';
import Chatbox from '../components/Chatbox/Chatbox';
import roomContext from '../contexts/room/roomContext';

function PublicGame() {
    const [socket, setSocket] = useContext(roomContext);
    const [publicRoom, setPublicRoom] = useState({});

    useEffect(() => {
        // Get the initial state of public room game
        socket.emit('get-init-public-room');
        socket.on('provide-init-public-room', (result) => {
            if (!result) {
                return console.log('Server error');
            }
            // Setting the result of initial state of room
            setPublicRoom(result);
        });

        // Remove socket events here
        return () => {
            socket.off("provide-init-public-room");
        }
    }, [socket]);


    return (
        <>
            <GameContainer>
                <Topbar></Topbar>
                <GamePlayers initplayers={publicRoom.players} socket={socket}></GamePlayers>
                <Canva></Canva>
                <Chatbox socket={socket}></Chatbox>
            </GameContainer>
        </>
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
`;

export default PublicGame;