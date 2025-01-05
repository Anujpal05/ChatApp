import './App.css'
import Home from './Pages/Home'
import Chat from './Pages/Chat'
import { Routes, Route, BrowserRouter } from 'react-router-dom';


function App() {

  return (
    <>
      <div>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/chat' element={<Chat />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
