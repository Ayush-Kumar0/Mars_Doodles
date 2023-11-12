import React, { useContext } from 'react';
import { Route, Routes } from 'react-router-dom';
import authContext from '../contexts/auth/authContext';
import Home from '../pages/Home';
import Guest from '../pages/Guest';
import User from '../pages/User';
import Signin from '../pages/Signin';
import Signup from '../pages/Signup';

function AppRoutes() {
    const [player, setPlayer] = useContext(authContext);
    return (
        <Routes>
            {(player.type === null || player.type === undefined || player.type === 'guest') && <>
                <Route path='/' element={<Home />} />
                <Route path='/signin' element={<Signin />} />
                <Route path='/signup' element={<Signup />} />
            </>}
            {player.type === 'user' && <Route path='/user' element={<User />} />}
            {player.type === 'guest' && <Route path='/guest' element={<Guest />} />}
        </Routes>
    );
}

export default AppRoutes;