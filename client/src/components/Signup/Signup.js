import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingModal from '../Loader/loader';
import authContext from '../../contexts/auth/authContext';

function Signup() {
    const nav = useNavigate();
    const [player, setPlayer] = useContext(authContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState('visible');

    useEffect(() => {
        setLoading(null);
    }, []);

    // const [verificationCode, setVerificationCode] = useState('');

    // Attempted to implement email otp verification
    // const sendVerificationCode = async (e) => {
    //     e.preventDefault();
    //     fetch(`${process.env.REACT_APP_SERVER_URL}/auth/sendcode`, {
    //         method: 'post',
    //         body: JSON.stringify({ email }),
    //         credentials: 'include',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         }
    //     });
    // }

    const handleSignup = (e) => {
        e.preventDefault();
        if (!email || email === '' || !password || password === '' || !confirmPassword || confirmPassword === '')
            return toast.warning('Enter all fields');
        const emailRegex = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;
        if (emailRegex.test(email) === false)
            return toast.error('Invalid email');
        if (password !== confirmPassword)
            return toast.error('Password not matching');
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!\s).+/;
        if (password.length < 8 || passwordRegex.test(password) === false)
            return toast.warning('Weak password');

        setLoading('visible');
        fetch(`${process.env.REACT_APP_SERVER_URL}/auth/signup`, {
            method: 'post',
            body: JSON.stringify({ email, password, confirmPassword }),
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
                nav('/user');
            } else {
                if (body.type === 'warning')
                    toast.warning(body.message);
                else if (body.type === 'error')
                    toast.error(body.message);
            }
        }).catch(err => {
            console.log(err);
            setLoading(null);
            toast.error('Error while signup');
        });
    }

    return (
        <>
            <Container>
                <h1>Sign Up</h1>
                <Box>
                    <div className='input-box'>
                        <label htmlFor='email'>Email: </label>
                        <input id='email' name='email' value={email} type='email' placeholder='Enter email' onChange={(e) => { setEmail(e.target.value) }} />
                    </div>

                    <div className='input-box'>
                        <label htmlFor='password'>Password: </label>
                        <input id='password' name='password' value={password} type='password' placeholder='Enter password' onChange={(e) => { setPassword(e.target.value) }} />
                    </div>

                    <div className='input-box'>
                        <label htmlFor='confirm-password'>Confirm Password: </label>
                        <input id='confirm-password' name='confirm-password' value={confirmPassword} type='password' placeholder='Re-enter password' onChange={(e) => { setConfirmPassword(e.target.value) }} />
                    </div>

                    {/* <div className='input-box'>
                    <label htmlFor='verification-code'>Verification Code: </label>
                    <input id='verification-code' name='verification-code' type='number' placeholder='Enter verification code' onChange={(e) => { setVerificationCode(e.target.value) }} />
                </div> */}
                </Box>
                <ButtonBox>
                    {/* <Button onClick={sendVerificationCode}>Send Code</Button> */}
                    <Button onClick={handleSignup}>Sign Up</Button>
                </ButtonBox>
                <Footer>
                    <NavLink to='/signin'>signin</NavLink>
                </Footer>
            </Container>
            <LoadingModal visible={loading} />
        </>
    );
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    & > h1 {
        text-align: center;
    }
    align-items: center;
    justify-content: center;
`;
const Box = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--whitesmoke);
    gap: 10px;
    border: 1px solid var(--charcoal);
    border-radius: 5px;
    padding: 30px 10px;
    .input-box {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 2%;
        width: 100%;
        label {
            width: 49%;
            text-align: right;
        }
        input {
            width: 49%;
            height: 25px;
            outline: none;
        }
    }
`;
const ButtonBox = styled.div`
display: flex;
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 10px;
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
const Footer = styled.div`
    display: flex;
    width: 100%;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 10px;
    a {
        text-decoration: none;
        &:hover {
            text-decoration: underline;
        }
    }
`;
export default Signup;