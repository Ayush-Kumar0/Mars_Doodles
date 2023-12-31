import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import roomContext from '../../contexts/room/roomContext';
import { toast } from 'react-toastify';

function Lobby() {
    const { socket } = useContext(roomContext);
    const [options, setOptions] = useState(() => {
        if (localStorage.getItem('private-game-options'))
            return JSON.parse(localStorage.getItem('private-game-options'));
        else
            return {};
    });
    const ref1 = useRef({});
    const ref2 = useRef({});
    const ref3 = useRef({});
    const ref4 = useRef({});
    const ref5 = useRef({});

    useEffect(() => {
        if (socket) {
            socket.on("provide-cannot-start-private-game", (message) => {
                toast.error(message);
            });
        }
        return () => {
            if (socket) socket.off("provide-cannot-start-private-game");
        }
    }, [socket]);



    const handleStartGame = (e) => {
        e.preventDefault();
        // Configure room options to send to server
        const options = {
            isChatEnabled: ref1.current.checked,
            totalRounds: ref2.current.value,
            drawingTime: ref3.current.value,
            minimumPlayers: ref4.current.value,
            maximumPlayers: ref5.current.value,
        }
        localStorage.setItem('private-game-options', JSON.stringify(options));
        if (socket) {
            socket.emit("get-start-private-room", options);
        } else {
            toast.error("Network error");
        }
    }



    return (
        <Container>
            <label className='label'>
                <span>Chat enable:</span>
                {(Object.keys(options).length === 0 || options.isChatEnabled)
                    ? <input type='checkbox' defaultChecked ref={ref1} />
                    : <input type='checkbox' ref={ref1} />
                }
            </label>
            <label className='label'>
                <span>Total Rounds:</span>
                <input type='number' min={1} max={10} defaultValue={options.totalRounds || 2} ref={ref2} />
            </label>
            <label className='label'>
                <span>Drawing Time(s):</span>
                <input type='number' min={20} max={600} defaultValue={options.drawingTime || 120} ref={ref3} />
            </label>
            <label className='label'>
                <span>Minimum players:</span>
                <input type='number' min={2} max={31} defaultValue={options.minimumPlayers || 2} ref={ref4} />
            </label>
            <label className='label'>
                <span>Maximum players:</span>
                <input type='number' min={2} max={31} defaultValue={options.maximumPlayers || 16} ref={ref5} />
            </label>

            <Button onClick={handleStartGame}>Start</Button>
        </Container>
    );
}


const Container = styled.div`
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: var(--whitesmoke);

    .label {
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: repeat(2,140px);
        input {
            text-align: left;
        }
        input[type="checkbox"] {
            width: min-content;
            margin: 0;
        }
    }
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

export default Lobby;