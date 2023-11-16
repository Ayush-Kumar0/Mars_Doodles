import React from 'react'
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import GamePlayers from '../components/GamePlayers/GamePlayers';
import Canva from '../components/Canva';
import Chatbox from '../components/Chatbox/Chatbox';

function PublicGame() {
    // const { publicGame } = useLocation();
    return (
        <>
            <GameContainer>
                <Topbar></Topbar>
                <GamePlayers></GamePlayers>
                <Canva></Canva>
                <Chatbox></Chatbox>
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