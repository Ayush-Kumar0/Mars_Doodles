import React from 'react';
import Modal2 from '../Modals/Modal2';

function GameOver({ close, currentResults }) {
    return (
        <Modal2 close={close}>
            Game Over<br />
            The round results are {currentResults}
        </Modal2>
    )
}

export default GameOver;