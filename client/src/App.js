import { ToastContainer } from 'react-toastify';
import './App.css';
import AuthState from './contexts/auth/authState';
import AppRoutes from './routes/AppRoutes';
import { BrowserRouter } from 'react-router-dom';
import PublicGame from './pages/PublicGame';

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthState>
          {/* <AppRoutes /> */}
          <PublicGame />
          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthState>
      </BrowserRouter>
    </>
  );
}

export default App;
