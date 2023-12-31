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

function RoundOver({ close, currentRoundScore, players }) {
    const [playersNew, setPlayersNew] = useState(players);
    useEffect(() => {
        const newPlayers = players.map(value => {
            if (currentRoundScore[value.id] && !Number.isNaN(currentRoundScore[value.id]))
                value.score = currentRoundScore[value.id].toFixed(0) || 0;
            else
                value.score = 0;
            return value;
        });
        sortByProperty(newPlayers, 'score');
        setPlayersNew(newPlayers);
    }, [players, currentRoundScore]);
    return (
        <Modal2 close={close}>
            <Container>
                <h2>Round results:</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Player name</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {playersNew.map((value, i) => {
                            return <tr key={i}>
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
    );
}

const Container = styled.div`
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
`;

export default RoundOver;