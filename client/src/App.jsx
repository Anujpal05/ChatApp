import './App.css'
import Home from './Pages/Home'
import Chat from './Pages/Chat'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';



function App() {
  const { isLogin, logOut } = useAuthStore();
  console.log(isLogin)

  return (
    <>
      <div>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {!isLogin && <Route path='/' element={<Home />} />}
            {isLogin && <Route path='/chat-section' element={<Chat />} />}
            <Route path='*' element={!isLogin ? <Navigate to={'/'} /> : <Navigate to={'/chat-section'} />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
