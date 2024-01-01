import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import authContext from '../../contexts/auth/authContext';
import Hamburger from 'hamburger-react';
import Loader from '../../components/Loader/loader';
import { toast } from 'react-toastify';

function SideNav(props) {
    const nav = useNavigate();
    const [isOpen, setOpen] = useState(false);
    const [sidebarState, setSidebarState] = useState(null);

    return (
        <>
            <Nav open={isOpen}>
                <Hamburger className='hamburger-react' toggled={isOpen} toggle={setOpen} onToggle={() => { setSidebarState(!isOpen) }} />
                <Sidebar className='sidebar' open={sidebarState}>
                    <ul className='list'>
                        {props.children}
                    </ul>
                </Sidebar>
                <div className='rightside'>
                    {props.isGuest ? <>
                        <button className='signin-btn' onClick={() => { nav('/signin') }}>Sign In</button>
                    </> : <>
                    </>
                    }
                    <img src={props.icon} className='logo' alt={props.alt} onClick={() => { window.open(props.url, '_self') }} />
                </div>
            </Nav>
        </>
    );
}

function NavItem(props) {
    return (
        <li className='list-item'><NavLink to={props.link ? props.link : '#'} onClick={props.onClick}>&nbsp;{props.children}</NavLink></li>
    );
}

function Navbar() {
    const nav = useNavigate();
    const [player, setPlayer] = useContext(authContext);
    const [prefix] = useState(() => (player.type === 'user' ? '/user' : player.type === 'guest' ? '/guest' : ''));
    const [visible, setVisible] = useState('visible');

    useEffect(() => {
        setVisible(null);
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        setVisible('visible');
        fetch(`${process.env.REACT_APP_SERVER_URL}/auth/logout`, {
            method: 'get',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(result => {
            if (player.type === 'user')
                toast.success('Logged out');
            else if (player.type === 'guest')
                toast.success('Guest account deleted');
            setPlayer({});
            setVisible(null);
            nav('/');
        }).catch(err => {
            if (player.type === 'user')
                toast.error('Unable to log out');
            else if (player.type === 'guest')
                toast.error('Unable to delete guest account');
            console.log(err);
            setVisible(null);
        });
    }

    return (
        <>
            <SideNav isGuest={player.type === 'guest'} icon='/assets/mars_doodles.png' url='#' alt='Mars Doodles'>
                <NavItem link={`${prefix}/`}>Home</NavItem>
                {/* <NavItem link={`${prefix}/profile`}>Profile</NavItem>
                <NavItem link={`${prefix}/store`}>Store</NavItem>
                <NavItem link={`${prefix}/achievements`}>Achievements</NavItem> */}
                {player.type !== null && <NavItem onClick={handleLogout}>{player.type === 'guest' ? 'Delete' : 'Sign Out'}</NavItem>}
            </SideNav>
            <Loader visible={visible} />
        </>
    );
}


const Nav = styled.div`
    position: fixed;
    height: max( var(--navbar_height), 5% );
    width: 100%;
    box-sizing: border-box;
    padding: 3px 20px 3px 20px;
    background-color: var(--charcoal);
    box-shadow: var(--obsidian) 0px 1px 5px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    z-index: 1;

    .hamburger-react {
        color: #ffffff;
        transition: transform 0.3s cubic-bezier(0, 0, 0, 1) 0s !important;
        z-index: 2;
    }
    .rightside {
        height: 100%;
        width: fit-content;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        .signin-btn {
            height: 60%;
            font-size: larger;
            cursor: pointer;
        }
        .logo {
            color: #ffffff;
            height: 90%;
            cursor: pointer;
        }
    }
`;

const Sidebar = styled.div`
    --sidebar_width: 13em;

    position: fixed;
    left: max( calc(var(--sidebar_width) * -1), -100% );
    padding: 20px;
    top: max( var(--navbar_height), 5% );
    padding-top: 20px;
    height: calc( 100vh - max( var(--navbar_height), 5% ) );
    width: min( var(--sidebar_width), 100% );
    background-color: var(--charcoal);
    box-shadow: var(--charcoal) 0px 5px 5px;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    z-index: 2;
    animation: ${props => {
        if (props.open === true)
            return 'fade_in 100ms forwards ease-in';
        else if (props.open === false)
            return 'fade_out 150ms forwards ease-in';
        else return '';
    }};

    @keyframes fade_in {
        0% {
            left: max( calc( var(--sidebar_width) * -1), -100% );
        }
        100% {
            left: 0px;
        }   
    }
    @keyframes fade_out {
        0% {
            left: 0px;
        }
        100% {
            left: max( calc( var(--sidebar_width) * -1), -100% );
        }   
    }
    
    .list {
        list-style-type: none;
        font-size: 1.5em;
        margin: 0px;
        padding: 0px;
        .list-item {
            cursor: pointer;
            margin-bottom: 0.5em;
            width: fit-content;
            color: #ffffff;
            background-image: linear-gradient(0deg, #ffffff 100%, #ffffff 0%);
            background-clip: text;
            -webkit-background-clip: text;
            -moz-background-clip: text;
            -webkit-text-fill-color: transparent;
            -moz-text-fill-color: transparent;
            a {
                text-decoration: none;
            }
        }
        .list-item::after {
            content: '';
            display: block;
            width: 90%;
            height: 10px;
            border-bottom: 2px solid #ffffff;
            animation: decreaseBarLength 200ms forwards ease-in-out;            
        }
        .list-item:hover {
            animation: itemHover 100ms forwards ease-in;
        }
        .list-item:hover::after {
            animation: increaseBarLength 200ms forwards ease-in-out;
        }
        @keyframes itemHover {
            0% {
                /* background-image: linear-gradient(0deg, #056b58, white); */
                /* background-image: linear-gradient(0deg, var(--color3), var(--color1)); */
            }
            100% {
                /* background-image: linear-gradient(0deg, #056b58, white); */
                /* background-image: linear-gradient(0deg, var(--color3), var(--color1)); */
            }
        }
        @keyframes increaseBarLength {
            0% {
                width: 90%;
            }
            100% {
                width: 110%;
            }
        }
        @keyframes decreaseBarLength {
            0% {
                width: 110%;
            }
            100% {
                width: 90%;
            }
        }
    }
`;

export default Navbar;