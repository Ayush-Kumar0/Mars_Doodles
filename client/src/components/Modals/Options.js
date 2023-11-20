import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

function Options() {
    const [chat, setChat] = useState(() => (localStorage.getItem('chatEnabled') === 'true' ? true : false));
    const [maxPlayers, setMaxPlayers] = useState(() => (localStorage.getItem('maxPlayers') ? localStorage.getItem('maxPlayers') : 16)); // 4 to 31

    const handleChatCheckbox = (e) => {
        setChat(prevChat => !prevChat);
    }
    useEffect(() => {
        localStorage.setItem('chatEnabled', chat);
    }, [chat]);

    const handleMaxPlayerEnter = (e) => {
        if (e.key === 'Enter') {
            handleMaxPlayerBlur(e);
            e.target.blur();
            localStorage.setItem('maxPlayers', maxPlayers);
        }
    }

    const handleMaxPlayerBlur = (e) => {
        let val = e.target.value;
        if (val > 31) val = 31;
        if (val < 4) val = 4;
        setMaxPlayers(val);
        localStorage.setItem('maxPlayers', maxPlayers);
    }


    return (
        <OptionsContainer>
            <label>
                Chat:&nbsp;
                <input type='checkbox' checked={chat} onChange={handleChatCheckbox} />
            </label>
            <label>
                Max players:&nbsp;
                <input type='number' width="20px" value={maxPlayers} onChange={(e) => { setMaxPlayers(e.target.value) }} onBlur={handleMaxPlayerBlur} onKeyDown={handleMaxPlayerEnter} />
            </label>
        </OptionsContainer>
    );
}

const OptionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: left;
    align-items: center;
    padding: 20px;
    margin: 0px;
`;

export default Options;