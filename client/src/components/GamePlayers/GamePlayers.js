import React from 'react';
import styled from 'styled-components';

function GamePlayers() {
    return (
        <PlayersContainer>
            <p className='players'>Players</p>
            <ul>
                <li><img src='/assets/no_profile_picture.svg' /><p>Ayush</p></li>
                <li><img src='/assets/mars_doodles.png' />Ayush</li>
                <li><img src='/assets/mars_doodles.png' />Ayush</li>
                <li><img src='/assets/mars_doodles.png' />Ayush</li>
                <li><img src='/assets/mars_doodles.png' />Ayush</li>
                <li><img src='/assets/mars_doodles.png' />Ayush</li>
            </ul>
        </PlayersContainer>
    );
}


const PlayersContainer = styled.div`
    position: relative;
    height: 100%;
    width: var(--gameplayer-width);
    background-color: var(--whitesmoke);
    min-height: calc(100vh - var(--topbar-height));
    box-sizing: border-box;
    border: 2px solid var(--primary);

    .players {
        text-align: center;
        font-weight: 700;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        height: 100%;
        max-height: calc(100vh - var(--topbar-height) - 44px);
        overflow-x: hidden;
        overflow-y: auto;

        li {
            /* height: 50px; */
            border-bottom: 1px solid var(--obsidian);
            padding: 5px 10px;
            display: flex;
            justify-content: left;
            align-items: center;
            gap: 2px;
            /* word-wrap: break-word;
            flex-wrap: wrap; */

            img {
                height: 40px;
                width: 40px;
                border-radius: 50%;
            }

            p {
                margin: 0;
                padding: 0;
                width: calc(100% - 42px);
                word-wrap: break-word;
            }
        }
    }
`;

export default GamePlayers;