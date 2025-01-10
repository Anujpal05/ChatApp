import './App.css'
import Home from './Pages/Home'
import Chat from './Pages/Chat'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { Toaster } from 'react-hot-toast';



function App() {
  const { isLogin } = useAuthStore();
  return (
    <>
      <div>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path='/' element={!isLogin ? <Home /> : <Navigate to="/chat-section" />} />
            <Route path='/chat-section' element={isLogin ? <Chat /> : <Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
