import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

function Chatbox({ socket, userGuest, handleScoreStorage, amIArtistParent, isPrivate, isChatEnabledParent }) {
    const [text, setText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [userGuestId, setUserGuestId] = useState(null);
    const [amIArtist, setAmIArtist] = useState(amIArtistParent);
    const [isChatEnabled, setIsChatEnabled] = useState(isChatEnabledParent);


    useEffect(() => {
        if (userGuest && userGuest.type === 'user')
            setUserGuestId(userGuest.user._id);
        else if (userGuest && userGuest.type === 'guest')
            setUserGuestId(userGuest.guest._id);
    }, [socket, userGuest]);

    useEffect(() => {
        if (isPrivate) {
            socket.on("provide-new-private-chat", (chat) => {
                handleScoreStorage(chat.sender, chat.score);
                if (chat.isArtist) return;
                if (chat.guessed)
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: `Guessed it.`, className: 'otherguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message }]);
            });
            socket.on("provide-new-private-chat-self", (chat) => {
                handleScoreStorage(chat.sender, chat.score);
                if (chat.isArtist) return;
                if (chat.guessed)
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: "You gessed it : " + chat.message, className: 'youguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message }]);
            });
        } else {
            socket.on("provide-new-public-chat", (chat) => {
                handleScoreStorage(chat.sender, chat.score);
                if (chat.isArtist) return;
                if (chat.guessed)
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: `Guessed it.`, className: 'otherguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message }]);
            });
            socket.on("provide-new-public-chat-self", (chat) => {
                handleScoreStorage(chat.sender, chat.score);
                if (chat.isArtist) return;
                if (chat.guessed)
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: "You gessed it : " + chat.message, className: 'youguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message }]);
            });
        }

        return () => {
            if (isPrivate) {
                socket.off("provide-new-private-chat");
                socket.off("provide-new-private-chat-self");
            } else {
                socket.off("provide-new-public-chat");
                socket.off("provide-new-public-chat-self");
            }
        }
    }, [socket, handleScoreStorage, isPrivate]);

    useEffect(() => {
        setAmIArtist(amIArtistParent);
        if (amIArtistParent)
            setText('');
    }, [amIArtistParent]);

    useEffect(() => {
        setIsChatEnabled(isChatEnabledParent);
    }, [isChatEnabledParent]);





    const handleSendMessage = (e) => {
        if (e.key === 'Enter') {
            // Send message to server for validation
            if (text !== '') {
                if (isPrivate)
                    socket.emit("send-new-private-chat", text);
                else
                    socket.emit("send-new-public-chat", text);
                setText('');
            }
        }
    }


    let key = 0;
    return (
        <>
            <ChatBoxContainer>
                <p className='heading'>Chat{!isChatEnabled && <img className='chatoff' src='/assets/chat_off.svg' />}</p>
                <ChatList>
                    <ul>
                        {chatMessages && chatMessages.map(chatmsg => (
                            (chatmsg && chatmsg.sender && chatmsg.sender.id !== userGuestId)
                                ? <li key={key++} className={chatmsg.className ? chatmsg.className : ''}><span className='sender'>{chatmsg.sender.name}:</span>&nbsp;<span className='message'>{chatmsg.message}</span></li>
                                : <li key={key++} className={chatmsg.className ? chatmsg.className : ''}><span className='sender'>{"me"}:</span>&nbsp;<span className='message'>{chatmsg.message}</span></li>
                        ))}
                        {/* <li><span className='sender'>Ayush:</span>&nbsp;<span className='message'>Orange</span></li> */}
                    </ul>
                </ChatList>
                {amIArtist ?
                    <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} onKeyDown={handleSendMessage} disabled /> :
                    <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} onKeyDown={handleSendMessage} />
                }
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
    @media (max-width:720px) {
        order: 2;
        width: 55vw;
        min-height: unset;
        height: calc(50vh - var(--topbar-height));
    }

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

    .chatoff {
        position: absolute;
        padding-left: 5px;
    }
`;


const ChatList = styled.div`
    width: 100%;
    height: calc(100vh - var(--topbar-height) - var(--chatinput-height) - 44px);
    overflow-y: auto;
    @media (max-width:720px) {
        height: calc(50vh - var(--topbar-height) - var(--chatinput-height) - 44px);
    }

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

        .youguessed {
            background-color: var(--chatgreen);
        }
        .otherguessed {
            background-color: var(--chatred);
        }
    }
`;

export default Chatbox;