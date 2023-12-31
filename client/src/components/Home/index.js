import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import authContext from '../../contexts/auth/authContext';
import { toast } from 'react-toastify';
import LoadingModal from '../Loader/loader';

function Home() {
    const nav = useNavigate();
    const [loading, setLoading] = useState('visible');
    const [player, setPlayer] = useContext(authContext);

    useEffect(() => {
        setLoading(null);
    }, []);


    const handleNewGuest = async e => {
        e.preventDefault();
        setLoading('visible');
        fetch(`${process.env.REACT_APP_SERVER_URL}/auth/guest`, {
            method: 'get',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(async result => {
            setLoading(null);
            let body = await result.clone().json();
            if (result.status === 200) {
                // globalize the player
                setPlayer(body.player);
                if (body.type === 'success')
                    toast.success(body.message);
                nav('/guest');
            } else {
                if (body.type === 'warning')
                    toast.warning(body.message);
                else if (body.type === 'error')
                    toast.error(body.message);
            }
        }).catch(err => {
            console.log(err);
            setLoading(null);
            toast.error('Failed');
        });
    }
    return (
        <>
            <HomeStyles>
                <H1>Mars Doodles</H1>
                <NavLink to='/signin'><Button>Sign In</Button></NavLink>
                <NavLink to='/signup'><Button>Sign Up</Button></NavLink>
                <NavLink to='/guest' onClick={handleNewGuest}><Button>Guest</Button></NavLink>
            </HomeStyles>
            <LoadingModal visible={loading} />
        </>
    );
}

const HomeStyles = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    gap: 10px;
    background-color: var(--cotton);
`;
const H1 = styled.h1`
    font-size: 40px;
    color: var(--charcoal);
`;
const Button = styled.button`
    cursor: pointer;
    font-size: 16px;
    width: 100px;
    height: 30px;
    color: var(--obsidian);
    border: 1px solid var(--charcoal);
    border-radius: 2px;
    outline: none;
    &:hover {
        background-color: var(--charcoal);
        color: var(--whitesmoke);
    }
`;

export default Home;