import React, { createContext, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import ChatSection from '../Components/ChatSection'

export const userContext = createContext();
const Chat = () => {
    const [selectedUsers, setselectedUsers] = useState('')

    return (
        <div className=' bg-black min-h-screen w-screen text-white overflow-x-hidden'>
            <userContext.Provider value={{ selectedUsers, setselectedUsers }} >
                <div className=' flex'>
                    <Sidebar />
                    <ChatSection />
                </div>
            </userContext.Provider>
        </div>
    )
}

export default Chat
