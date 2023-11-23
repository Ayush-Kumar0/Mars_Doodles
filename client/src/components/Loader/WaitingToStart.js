import React from 'react';
import styled, { keyframes } from 'styled-components';

function WaitingToStart() {
    return (
        <Container>
            <Text>Waiting...</Text>
        </Container>
    );
}

const Container = styled.div`
    position: absolute;
    z-index: 100;
    width: 100%;
    height: 100%;
    top: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--whitesmoke);
`;

const typingAnimation = keyframes`
  0% {
    max-width: 0;
  }
  50% {
    max-width: 100%;
  }
  100% {
    max-width: 0;
  }
`;

const Text = styled.div`
  overflow: hidden;
  white-space: nowrap;
  /* border-right: 2px solid #000; Adjust the border styling as needed */
  animation: ${typingAnimation} 3s steps(30) infinite;
`;

export default WaitingToStart;