import React, { useContext } from 'react';
import { Route, Routes } from 'react-router-dom';
import authContext from '../contexts/auth/authContext';
import Home from '../pages/Home';
import Guest from '../pages/Guest';
import User from '../pages/User';
import Signin from '../pages/Signin';
import Signup from '../pages/Signup';
import GuestPublicGame from '../pages/GuestPublicGame';
import UserPublicGame from '../pages/UserPublicGame';
import RoomState from '../contexts/room/roomState';

function AppRoutes() {
    const [player, setPlayer] = useContext(authContext);
    return (
        <Routes>
            {(player.type === null || player.type === undefined || player.type === 'guest') && <>
                <Route path='/' element={<Home />} />
                <Route path='/signin' element={<Signin />} />
                <Route path='/signup' element={<Signup />} />
            </>}
            {player.type === 'user' &&
                <>
                    <Route path='/user' element={<RoomState><User /></RoomState>} />
                    <Route path='/user/public/' element={<RoomState><UserPublicGame /></RoomState>} />
                </>}
            {player.type === 'guest' &&
                <>
                    <Route path='/guest' element={<RoomState><Guest /></RoomState>} />
                    <Route path='/guest/public/' element={<RoomState><GuestPublicGame /></RoomState>} />
                </>}
        </Routes>
    );
}

export default AppRoutes;