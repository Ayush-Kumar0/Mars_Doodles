import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const ModalWrapper = styled.div`
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease-in-out;
  z-index: 100;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  display: flex;
  gap: 5px;
  margin: 2px;
  position: relative;
`;

const CloseButton = styled.button`
  align-self: flex-end;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  position: absolute;
  top: 0;
  right: 0;
`;


const Modal2 = (props) => {
  const closeModal = () => {
    // Call the close modal function from the parent.
    props.close()
  };

  return (
    <ModalWrapper onClick={closeModal}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={closeModal}><img src='/assets/close.svg' /></CloseButton>
        {props.children}
      </ModalContent>
    </ModalWrapper>
  );
};

export default Modal2;
