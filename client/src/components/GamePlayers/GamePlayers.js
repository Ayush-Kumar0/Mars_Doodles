import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

function GamePlayers({ initplayers, socket }) {
    const [players, setPlayers] = useState(initplayers);

    useEffect(() => {
        setPlayers(initplayers);
        // When new player joins room
        socket.on("provide-new-public-player", (result) => {
            // console.log(initplayers, result);
            setPlayers(prevPlayers => [...prevPlayers, result]);
        });
        // When a player leaves the room
        socket.on("provide-public-player-left", (result) => {
            setPlayers(prevPlayers => prevPlayers.filter(pl => pl.id !== result.id));
        });

        return () => {
            socket.off("provide-new-public-player");
            socket.off("provide-public-player-left");
        }
    }, [initplayers]);


    return (
        <PlayersContainer>
            <p className='players'>Players</p>
            <ul>
                {players && players.map(player => {
                    return (<li key={player.id}>
                        <img src={(player && player.picture) ? player.picture : '/assets/no_profile_picture.svg'} />
                        <p>{player.name}</p>
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