import React, { useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import ChatSection from '../Components/ChatSection'
import useChatStore from '../store/chatStore'

const Chat = () => {
    const { selectedUser } = useChatStore();

    return (
        <div className=' bg-black min-h-screen w-screen text-white overflow-x-hidden'>
            <div className=' flex flex-col lg:flex-row '>
                <div className={`${!selectedUser ? 'flex' : ' hidden lg:flex'} lg:w-[30%]`} >
                    <Sidebar />
                </div>
                <div className={`${selectedUser ? 'flex' : 'hidden lg:flex'} flex-grow`}>
                    <ChatSection />
                </div>
            </div>
        </div>
    )
}

export default Chat
