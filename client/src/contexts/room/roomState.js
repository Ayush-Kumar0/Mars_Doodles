import React, { useState } from 'react';
import RoomContext from './roomContext';

function RoomState(props) {
    const [socket, setSocket] = useState(null);



    return (
        <RoomContext.Provider value={[socket, setSocket]}>
            {props.children}
        </RoomContext.Provider>
    );
}

export default RoomState;