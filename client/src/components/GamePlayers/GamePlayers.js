import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

function GamePlayers({ playersParent, socket, artistPlayer, userGuest, currentResults }) {
    const [players, setPlayers] = useState(playersParent);
    const [artist, setArtist] = useState(artistPlayer);

    useEffect(() => {
        setArtist(artistPlayer);
    }, [artistPlayer]);

    useEffect(() => {
        setPlayers(playersParent);
        console.log(userGuest);
        console.log(playersParent);
    }, [playersParent]);


    useEffect(() => {
        console.log(currentResults);
    }, [currentResults]);

    return (
        <PlayersContainer>
            <p className='players'>Players</p>
            <ul>
                {players && players.map(player => {
                    return (<li key={player.id} className={(((userGuest.guest && userGuest.guest._id === player.id) || (userGuest.user && userGuest.user._id === player.id)) ? 'myself' : '')}>
                        <img className='profile_picture' src={(player && player.picture) ? player.picture : '/assets/no_profile_picture.svg'} />
                        <p>{player.name}</p>
                        <p className='score'>{currentResults[player.id] || 0}</p>
                        {artist && artist.id === player.id &&
                            <img className='draw_icon' src='/assets/draw_icon.svg' />}
                    </li>);
                })}
                {/* <li><img src='/assets/no_profile_picture.svg' /><p>Ayush</p></li> */}
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
    @media (max-width:720px) {
        order: 1;
        width: 45vw;
        min-height: unset;
        height: calc(50vh - var(--topbar-height));
    }

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
        @media (max-width:720px) {
            max-height: unset;
            height: calc(100vh - var(--topbar-height) - var(--chatinput-height) - 44px);
        }

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

            .profile_picture {
                height: 40px;
                width: 40px;
                border-radius: 50%;
            }

            p {
                margin: 0;
                padding: 0;
                width: calc(100% - 42px);
                word-wrap: break-word;
                word-break: break-all;
            }

            .score {
                padding-left: 5px;
                width: fit-content;
                word-break: keep-all;
            }

            .draw_icon {
                height: 20px;
                opacity: 0.5;
            }
        }

        .myself {
            background-color: var(--cotton);
        }
    }
`;

export default GamePlayers;