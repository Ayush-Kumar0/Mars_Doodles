import React from 'react';
import Modal2 from '../Modals/Modal2';
import styled from 'styled-components';

function ArtSessionOver({ close, artOverMsg }) {
    return (
        <Modal2 close={close}>
            <Paragraph>
                The Word was <span className='fullWord'>{artOverMsg}</span>
                <br />
                Waiting for next Drawing...
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