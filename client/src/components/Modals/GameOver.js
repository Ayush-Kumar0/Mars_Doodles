import React, { useEffect, useState } from 'react';
import Modal2 from '../Modals/Modal2';
import styled from 'styled-components';

function sortByProperty(arr, prop, descending = true) {
    return arr.sort((a, b) => {
        const valueA = a[prop];
        const valueB = b[prop];

        let comparison = 0;

        if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
            comparison = valueA.localeCompare(valueB);
        }

        // Reverse the order if descending is true
        return descending ? comparison * -1 : comparison;
    });
}

function GameOver({ close, currentResults, players }) {
    const [playersNew, setPlayersNew] = useState(players);
    useEffect(() => {
        console.log(currentResults);
        const newPlayers = players.map(value => {
            value.score = currentResults[value.id] || 0;
            return value;
        });
        sortByProperty(newPlayers, 'score');
        setPlayersNew(newPlayers);
        console.log(newPlayers);
    }, [players, currentResults]);
    return (
        <Modal2 close={close}>
            <Container>
                <h2>Game Over</h2>
                <table>
                    <thead>
                        <td>
                            <b>Position</b>
                        </td>
                        <td>
                            <b>Player name</b>
                        </td>
                        <td>
                            <b>Score</b>
                        </td>
                    </thead>
                    <tbody>
                        {playersNew.map((value, i) => {
                            return <tr>
                                <td>
                                    {i + 1}
                                </td>
                                <td>
                                    {value.name}
                                </td>
                                <td>
                                    {value.score}
                                </td>
                            </tr>
                        })}
                    </tbody>
                </table>
            </Container>
        </Modal2>
    )
}


const Container = styled.div`
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
`;


export default GameOver;