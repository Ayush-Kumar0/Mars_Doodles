import React, { useState } from 'react';
import styled from 'styled-components';

function Chatbox() {
    const [text, setText] = useState('');
    return (
        <>
            <ChatBoxContainer>
                <p className='heading'>Chat</p>
                <ChatList>
                    <ul>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: Orange</li>
                        <li>Ayush: OrangeOrangeOrangeOrangeOrangeOrangeOrangeOrangeOrangeOrange</li>
                    </ul>
                </ChatList>
                <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} />
            </ChatBoxContainer>
        </>
    );
}


const ChatBoxContainer = styled.div`
    --chatinput-height:30px;
    width: calc(40vw - var(--gameplayer-width));
    height: 100%;
    box-sizing: border-box;
    border: 2px solid var(--primary);
    min-height: calc(100vh - var(--topbar-height));
    background-color: var(--whitesmoke);

    .heading {
        text-align: center;
        font-weight: 700;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    #chatinput {
        width: 100%;
        height: var(--chatinput-height);
        outline: none;
        border: none;
        border-top: 2px solid var(--primary);
        padding-left: 5px;
        padding-right: 5px;
    }
`;


const ChatList = styled.div`
    width: 100%;
    height: calc(100vh - var(--topbar-height) - var(--chatinput-height) - 44px);
    overflow-y: auto;

    ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
        width: 100%;
        li {
            padding: 2px 5px;
            border-bottom: 0.5px solid var(--charcoal);
            width: 100%;
            word-wrap: break-word;
            &:first-child {
                border-top: 0.5px solid var(--charcoal);
            }
        }
    }
`;

export default Chatbox;