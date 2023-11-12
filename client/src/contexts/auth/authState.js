import React, { useEffect, useState } from 'react';
import AuthContext from './authContext';
import LoadingModal from '../../components/Loader/loader';
import { useNavigate } from 'react-router-dom';

const userExists = async (nav, setLoading, setPlayer) => {
    setLoading(true);
    // Validating cookies for authentication
    fetch(`${process.env.REACT_APP_SERVER_URL}/auth/exists`, {
        method: 'get',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(async result => {
        setLoading(false);
        let body = await result.clone().json();
        console.log(body);
        // Setting player and Navigating to required page
        // Do not redirect when accessing the profile page of a user
        if (result.status === 200) {
            setPlayer(body);
            if (body.type === 'user')
                nav('/user');
            else if (body.type === 'guest')
                nav('/guest');
        } else {
            nav('/');
        }
    }).catch(err => {
        console.log(err);
        setLoading(false);
    });
}

function AuthState(props) {
    const nav = useNavigate();
    const [loading, setLoading] = useState(true);
    const [player, setPlayer_] = useState({});
    useEffect(() => {
        userExists(nav, setLoading, setPlayer_);
    }, []);

    const setPlayer = (player) => {
        setPlayer_(player);
    }
    return (
        <>
            {
                loading ?
                    <LoadingModal visible='visible' />
                    :
                    <AuthContext.Provider value={[player, setPlayer]}>
                        {props.children}
                    </AuthContext.Provider>
            }
        </>
    );
}

export default AuthState;