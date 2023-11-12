import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import Navbar from '../components/Player/Navbar';
import Start from '../components/Player/Start';
import authContext from '../contexts/auth/authContext';
import { toast } from 'react-toastify';
import LoadingModal from '../components/Loader/loader';

function Guest() {
    const [player, setPlayer] = useContext(authContext);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    });

    const changeNameHandler = (name, setName) => {
        setLoading(true)
        console.log(name);
        // Change guest name in server
        fetch(`${process.env.REACT_APP_SERVER_URL}/guest/changename`, {
            method: 'post',
            body: JSON.stringify({ name }),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(async result => {
            const body = await result.clone().json();
            setLoading(false);
            console.log(body);
            if (result.status === 200) {
                body.guest && body.guest.name && setPlayer(body);
            } else {
                if (body.type === 'warning')
                    toast.warning(body.message);
                else if (body.type === 'error')
                    toast.error(body.message);
            }
        }).catch(err => {
            console.log(err);
            setName((player && player.guest && player.guest.name) ? player.guest.name : '');
            setLoading(false);
            toast.error('Error while changing name');
        });
    }

    return (
        <>
            <Navbar />
            <Guestcontainer>
                <Start
                    player_name={(player && player.guest && player.guest.name) ? player.guest.name : ''}
                    changeNameHandler={changeNameHandler}
                    picture='/assets/no_profile_picture.svg'
                />
            </Guestcontainer>
            {loading === true && <LoadingModal visible='visible' />}
        </>
    );
}

const Guestcontainer = styled.div`
    padding-top: var(--navbar_height);
    min-height: 100vh;
    width: 100vw;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: var(--whitesmoke);
`;

export default Guest;