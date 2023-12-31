import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import Navbar from '../components/Player/Navbar';
import Start from '../components/Player/Start';
import authContext from '../contexts/auth/authContext';
import { toast } from 'react-toastify';
import LoadingModal from '../components/Loader/loader';
import Modal1 from '../components/Modals/Modal1';
import Options from '../components/Modals/Options';
import GuestPublicGame from '../socket/guestPublicGame';
import { useNavigate } from 'react-router-dom';
import roomContext from '../contexts/room/roomContext';


function Guest() {
    const nav = useNavigate();
    const [player, setPlayer] = useContext(authContext);
    const { socket, setSocket } = useContext(roomContext);
    const [loading, setLoading] = useState(true);
    const [optionsVisible, setOptionsVisible] = useState(false);

    useEffect(() => {
        setLoading(false);
    }, []);

    const changeNameHandler = (name, setName) => {
        setLoading(true)
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

    function handleOptionsOpen(e) {
        setOptionsVisible(!optionsVisible);
    }


    // START the public game on 'PLAY'
    const playButtonPressed = (e) => {
        const guestPublicGame = new GuestPublicGame(nav, toast, setSocket);
        guestPublicGame.getRoom();
    }




    return (
        <>
            <Navbar />
            <Guestcontainer>
                <Start
                    player_name={(player && player.guest && player.guest.name) ? player.guest.name : ''}
                    changeNameHandler={changeNameHandler}
                    picture='/assets/no_profile_picture.svg'
                    handleOptionsButtonClick={handleOptionsOpen}
                    playButtonPressed={playButtonPressed}
                    isUser={false}
                />
            </Guestcontainer>
            {loading === true && <LoadingModal visible='visible' />}
            {optionsVisible && <Modal1 isOpen={optionsVisible} setOpen={handleOptionsOpen}>
                <Options />
            </Modal1>}
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