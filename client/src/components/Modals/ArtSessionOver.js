import React from 'react';
import Modal2 from '../Modals/Modal2';

function ArtSessionOver({ close, word }) {
    return (
        <Modal2 close={close}>
            The Word was {word}
        </Modal2>
    )
}

export default ArtSessionOver;