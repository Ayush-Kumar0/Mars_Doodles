import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

function Chatbox({ socket, userGuest, handleScoreStorage, amIArtistParent, isPrivate, isChatEnabledParent }) {
    const [text, setText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [userGuestId, setUserGuestId] = useState(null);
    const [amIArtist, setAmIArtist] = useState(amIArtistParent);
    const [isChatEnabled, setIsChatEnabled] = useState(isChatEnabledParent);
    const chatListRef = useRef(null);
    const scrollRef = useRef(null);

    const isScrolledToBottom = () => {
        return (chatListRef?.current?.scrollHeight - chatListRef?.current?.scrollTop) <= (chatListRef?.current?.clientHeight * 1.5);
    }


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
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: "You guessed it : " + chat.message, className: 'youguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message, matchFactor: chat.matchFactor, className: ('' + ((chat.matchFactor === 1) ? 'complete-match ' : '') + ((chat.matchFactor === 2) ? 'partial-match' : '')) }]);
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
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: "You guessed it : " + chat.message, className: 'youguessed' }]);
                else
                    setChatMessages(prevChatMessages => [...prevChatMessages, { sender: chat.sender, message: chat.message, matchFactor: chat.matchFactor, className: ('' + ((chat.matchFactor === 1) ? 'complete-match ' : '') + ((chat.matchFactor === 2) ? 'partial-match' : '')) }]);
            });
        }

        if (isScrolledToBottom())
            scrollRef?.current.scrollIntoView();

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

    const sendMessage = (e) => {
        e.preventDefault();
        if (text !== '') {
            if (isPrivate)
                socket.emit("send-new-private-chat", text);
            else
                socket.emit("send-new-public-chat", text);
            setText('');
        }
    }


    let key = 0;
    return (
        <>
            <ChatBoxContainer>
                <p className='heading'>Chat{!isChatEnabled && <img className='chatoff' src='/assets/chat_off.svg' />}</p>
                <ChatList ref={chatListRef}>
                    <ul>
                        {chatMessages && chatMessages.map(chatmsg => (
                            (chatmsg && chatmsg.sender && chatmsg.sender.id !== userGuestId)
                                ? <li key={key++} className={'other ' + (chatmsg.className ? chatmsg.className : '')}><span className='sender'>:{chatmsg.sender.name}</span>&nbsp;<span className='message'>{chatmsg.message}</span></li>
                                : <li key={key++} className={'me ' + (chatmsg.className ? chatmsg.className : '')}><span className='sender'>{chatmsg.sender.name}:</span>&nbsp;<span className='message'>{chatmsg.message}<span>&nbsp;{(chatmsg.matchFactor === 1) ? '(Already guessed)' : (chatmsg.matchFactor === 2) ? '(Near match)' : ''}</span></span></li>
                        ))}
                        <span ref={scrollRef}></span>
                        {/* <li><span className='sender'>Ayush:</span>&nbsp;<span className='message'>Orange</span></li> */}
                    </ul>
                </ChatList>
                <ChatInput>
                    {amIArtist ?
                        <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} onKeyDown={handleSendMessage} disabled /> :
                        <input id='chatinput' placeholder='Enter text' value={text} onChange={(e) => { setText(e.target.value) }} onKeyDown={handleSendMessage} />
                    }
                    <img onClick={sendMessage} className='' src='/assets/send_icon.svg' />
                </ChatInput>
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
    min-height: calc(100svh - var(--topbar-height));
    background-color: var(--whitesmoke);
    @media (max-width:710px) {
        order: 2;
        width: 55vw;
        min-height: unset;
        height: calc(50vh - var(--topbar-height));
        height: calc(50svh - var(--topbar-height));
    }

    .heading {
        text-align: center;
        font-weight: 700;
        margin-bottom: 5px;
        text-decoration: underline;
    }

    .chatoff {
        position: absolute;
        padding-left: 5px;
    }
`;


const ChatInput = styled.div`
    width: 100%;
    height: var(--chatinput-height);
    border-top: 2px solid var(--primary);
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;

    #chatinput {
        height: 100%;
        outline: none;
        border: none;
        padding-left: 5px;
        padding-right: 5px;
        width: inherit;
    }
    img {
        height: 100%;
        cursor: pointer;
    }
    img:active {
        animation: pulse 0.3s ease;
    }
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
        }
    }
`;


const ChatList = styled.div`
    width: 100%;
    height: calc(100vh - var(--topbar-height) - var(--chatinput-height) - 45px);
    height: calc(100svh - var(--topbar-height) - var(--chatinput-height) - 45px);
    overflow-y: auto;
    @media (max-width:710px) {
        height: calc(50vh - var(--topbar-height) - var(--chatinput-height) - 45px);
        height: calc(50svh - var(--topbar-height) - var(--chatinput-height) - 45px);
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
                span {
                    color: var(--chatred);
                }
            }
        }

        .me {
        }
        .other {
            display: flex;
            flex-direction: row-reverse;
        }

        .youguessed {
            background-color: var(--chatgreen);
        }
        .otherguessed {
            background-color: var(--chatgreen);
        }
        .complete-match,.partial-match {
            background-color: unset;
        }
    }
`;

export default Chatbox;