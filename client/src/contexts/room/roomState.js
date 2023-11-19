import React, { useState } from 'react';
import RoomContext from './roomContext';

function RoomState(props) {
    const [socket, setSocket] = useState(null);
    const [latency, setLatency] = useState(0);



    return (
        <RoomContext.Provider value={{ socket, setSocket, latency, setLatency }}>
            {props.children}
        </RoomContext.Provider>
    );
}

export default RoomState;