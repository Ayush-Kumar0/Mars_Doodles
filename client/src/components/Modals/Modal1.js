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

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const LoadingModalWrapper = styled.div`
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  animation: ${({ isopen }) => (isopen ? fadeIn : fadeOut)} 0.3s ease-in-out;
  z-index: 100;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  display: flex;
  gap: 5px;
`;

const Modal1 = (props) => {
  const closeModal = () => {
    // Call the close modal function from the parent component or handle it here.
    props.setOpen()
  };

  return (
    <LoadingModalWrapper isopen={props.isOpen.toString()} onClick={closeModal}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        {props.children}
      </ModalContent>
    </LoadingModalWrapper>
  );
};

export default Modal1;
