import React, { useRef } from 'react';
import styled from 'styled-components';

function Join({ joinButtonPressed }) {
    const roomidRef = useRef(null);


    return (
        <JoinContainer>
            <label>
                Room id:&nbsp;
                <input type='text' placeholder='Enter room id' ref={roomidRef} defaultValue={''} />
            </label>
            <Button onClick={(e) => { joinButtonPressed(e, roomidRef) }}>
                Join
            </Button>
        </JoinContainer>
    );
}

const JoinContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: left;
    align-items: center;
    padding: 20px;
    margin: 0px;
`;

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

export default Join;