import React from 'react';
import Signup from '../components/Signup/Signup';
import styled from 'styled-components';

function Signuppage() {
    return (
        <SignupStyles>
            <Signup />
        </SignupStyles>
    );
}

const SignupStyles = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    background-color: var(--cotton);
`;

export default Signuppage;