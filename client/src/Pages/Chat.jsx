import React, { createContext, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import ChatSection from '../Components/ChatSection'

export const userContext = createContext();
const Chat = () => {

    return (
        <div className=' bg-black min-h-screen w-screen text-white overflow-x-hidden'>
            <div className=' flex'>
                <Sidebar />
                <ChatSection />
            </div>
        </div>
    )
}

export default Chat
