import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

function Chatbox({ socket }) {
    const [text, setText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);

    useEffect(() => {
        socket.on("provide-new-public-chat", (chat) => {
            setChatMessages(prevChatMessages => [...prevChatMessages, chat]);
        });
        socket.on("provide-new-public-chat-self", (chat) => {
            console.log(chat);
            setChatMessages(prevChatMessages => [...prevChatMessages, chat]);
        })

        return () => {
            socket.off("provide-new-public-chat");
            socket.off("provide-new-public-chat-self");
        }
    }, []);

    const handleSendMessage = (e) => {
        if (e.key === 'Enter') {
            // Send message to server for validation
            socket.emit("send-new-public-chat", text);
            setText('');
        }
    }


    let key = 0;
    return (
        <>
            <ChatBoxContainer>
                <p className='heading'>Chat</p>
                <ChatList>
                    <ul>
                        {chatMessages && chatMessages.map(chatmsg => (
                            <li key={key++}><span className='sender'>{chatmsg.sender}:</span>&nbsp;<span className='message'>{chatmsg.message}</span></li>
                        ))}
                        {/* <li><span className='sender'>Ayush:</span>&nbsp;<span className='message'>Orange</span></li> */}
                    </ul>
                </ChatList>
                <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} onKeyDown={handleSendMessage} />
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

            .sender {
                color: var(--primary);
                font-weight: bold;
            }
            .message {
                color: var(--obsidian);
            }
        }
    }
`;

export default Chatbox;