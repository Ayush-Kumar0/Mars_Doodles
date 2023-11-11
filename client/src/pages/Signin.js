import React from 'react';
import Signin from '../components/Signin/Signin';
import styled from 'styled-components';

function Signinpage() {
    return (
        <SigninStyles>
            <Signin />
        </SigninStyles>
    );
}

const SigninStyles = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    background-color: var(--cotton);
`;

export default Signinpage;