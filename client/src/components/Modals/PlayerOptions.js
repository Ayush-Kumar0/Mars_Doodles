import React, { useEffect } from 'react';
import Modal2 from '../Modals/Modal2';
import styled from 'styled-components';

function PlayerOptions({ close, id, kickPlayer }) {

    return (
        <Modal2 close={close}>
            <Button onClick={(e) => { kickPlayer(e, id); close(); }}>
                Kickout
            </Button>
        </Modal2>
    );
}

const Button = styled.button`
    cursor: pointer;
    font-size: 16px;
    height: 25px;
    color: var(--obsidian);
    border: 1px solid var(--charcoal);
    border-radius: 2px;
    outline: none;
    &:hover {
        background-color: var(--charcoal);
        color: var(--whitesmoke);
    }
`;



export default PlayerOptions;