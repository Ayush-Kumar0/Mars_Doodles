import React, { useState } from 'react';
import styled from 'styled-components';


function Start(props) {
    const { player_name,
        changeNameHandler,
        picture,
        handleOptionsButtonClick,
        playButtonPressed
    } = props;

    const [name, setName] = useState(player_name);

    const keyDownHandler = (e) => {
        if (e.key === 'Enter') {
            if (name === '')
                return setName(player_name);
            else {
                e.target.blur();
            }
        }
    }
    const blurHandler = (e) => {
        if (name === '')
            return setName(player_name);
        else
            changeNameHandler(name, setName);
    }

    return (
        <Startcontainer>
            <div className='profile-photo'>
                <img src={picture} alt='Profile photo' />
            </div>
            <div className='name-div'>
                <label htmlFor='name-input'>Display name:</label>
                <input id='name-input' type='text' value={name} onChange={(e) => { setName(e.target.value) }}
                    onKeyDown={keyDownHandler} onBlur={blurHandler} />
            </div>
            <div className='play-div'>
                <Button onClick={playButtonPressed}>Play</Button>
                <Button onClick={handleOptionsButtonClick}><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M200-200v-80h560v80H200Zm14-160 266-400 266 400H214Zm266-80Zm-118 0h236L480-616 362-440Z" /></svg></Button>
            </div>
            <div className='buttons-div'>
                <Button>Create</Button>
                <Button>Join</Button>
            </div>
        </Startcontainer>
    );
}

const Startcontainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    
    .profile-photo {
        border-radius: 50%;
        overflow: hidden;
        height: 200px;
        width: 200px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        img {
            width: 100%;
            height: 100%;
        }
    }
    .name-div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 2px;
        label {
            opacity: 50%;
        }
        input {
            color: var(--primary);
            font-size: 32px;
            border: none;
            outline: none;
            padding: 5px;
            border-radius: 5px;
            text-align: center;
            background-color: transparent;
            &:focus-visible {
                outline: 1px solid #d3cec7;
            }
        }
    }
    .play-div {
        display: flex;
        gap: 0px;
        button:nth-child(1) {
            border-right: none;
            border-top-right-radius: 0px;
            border-bottom-right-radius: 0px;
        }
        button:nth-child(2) {
            border-top-left-radius:0px;
            border-bottom-left-radius: 0px;
            svg {
                fill: var(--obsidian);
            }
            &:hover {
                svg {
                    fill: white;
                }
            }
        }
    }
    .buttons-div {
        display: flex;
        gap: 10px;
    }
`;

const Button = styled.button`
    cursor: pointer;
    font-size: 28px;
    height: 40px;
    color: var(--obsidian);
    border: 1px solid var(--charcoal);
    border-radius: 2px;
    outline: none;
    &:hover {
        background-color: var(--charcoal);
        color: var(--whitesmoke);
    }
`;

export default Start;