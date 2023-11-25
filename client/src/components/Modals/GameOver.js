import React, { useEffect, useState } from 'react';
import Modal2 from '../Modals/Modal2';

function sortByProperty(arr, prop) {
    return arr.sort((a, b) => {
        // Assuming the property is a number or a string
        const valueA = a[prop];
        const valueB = b[prop];

        // Adjust the comparison based on the data type of the property
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return valueA - valueB;
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
            return valueA.localeCompare(valueB);
        }

        // Add additional cases for other data types if needed

        return 0; // Default case, no change in order
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
        setPlayersNew(newPlayers);
        console.log(newPlayers);
    }, [players, currentResults]);
    return (
        <Modal2 close={close}>
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
        </Modal2>
    )
}

export default GameOver;