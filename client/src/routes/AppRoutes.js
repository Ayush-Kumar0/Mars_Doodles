import React, { useContext } from 'react';
import { Route, Routes } from 'react-router-dom';
import authContext from '../contexts/auth/authContext';
import Home from '../pages/Home';
import Guest from '../pages/Guest';
import User from '../pages/User';
import Signin from '../pages/Signin';
import Signup from '../pages/Signup';

function AppRoutes() {
    const [user] = useContext(authContext);
    return (
        <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/signin' element={<Signin />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/guest' element={<Guest />} />
            <Route path='/user' element={<User />} />
        </Routes>
    );
}

export default AppRoutes;