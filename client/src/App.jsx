import './App.css'
import Home from './Pages/Home'
import Chat from './Pages/Chat'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';



function App() {
  const { isLogin, logOut } = useAuthStore();


  return (
    <>
      <div>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path='/' element={!isLogin && <Home />} />
            <Route path='/chat-section' element={isLogin && <Chat />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
