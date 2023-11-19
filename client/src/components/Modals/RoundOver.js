import React, { useEffect } from 'react';
import Modal2 from '../Modals/Modal2';

function RoundOver({ close, currentRoundScore }) {
    useEffect(() => {
        console.log(currentRoundScore);
    })
    return (
        <Modal2 close={close}>
            The round results are {"<Table of result appears here>"}
        </Modal2>
    );
}

export default RoundOver;