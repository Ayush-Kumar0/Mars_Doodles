import React from 'react';
import Modal2 from '../Modals/Modal2';

function RoundOver({ close, roundResults, currentResults }) {
    return (
        <Modal2 close={close}>
            The round results are {roundResults} {currentResults}
        </Modal2>
    );
}

export default RoundOver;