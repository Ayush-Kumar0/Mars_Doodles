import { ToastContainer } from 'react-toastify';
import './App.css';
import AuthState from './contexts/auth/authState';
import AppRoutes from './routes/AppRoutes';
import { HashRouter } from 'react-router-dom';

function App() {
  return (
    <>
      <HashRouter>
        <AuthState>
          <AppRoutes />
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
      </HashRouter>
    </>
  );
}

export default App;
