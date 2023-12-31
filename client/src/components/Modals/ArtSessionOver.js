import React, { useEffect } from 'react';
import Modal2 from '../Modals/Modal2';
import styled from 'styled-components';

function ArtSessionOver({ close, artOverMsg, wasIArtist }) {
    useEffect(() => {
    }, [wasIArtist])

    return (
        <Modal2 close={close}>
            <Paragraph>
                {wasIArtist ?
                    <span>Waiting for next Drawing...</span>
                    : artOverMsg && artOverMsg.word && artOverMsg.name &&
                    <span>The word was <span className='fullWord'>{artOverMsg.word}</span> by <span className='fullWord'>{artOverMsg.name}</span><br /><br />Waiting for next Drawing...</span>
                }
            </Paragraph>
        </Modal2>
    );
}

const Paragraph = styled.p`
    font-size: 20px;
    text-align: center;

    .fullWord {
        color: #cc0000;
    }
`;

export default ArtSessionOver;