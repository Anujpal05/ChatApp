import React from 'react'
import Sidebar from '../Components/Sidebar'
import ChatSection from '../Components/ChatSection'
import useChatStore from '../store/chatStore'
import useCallStore from '../store/callStore'
import CallInfo from '../Components/CallInfo';

const Chat = () => {
    const { selectedUser } = useChatStore();
    const { selectedCall } = useCallStore();


    return (
        <div className=' bg-black h-screen w-screen text-white overflow-x-hidden'>
            <div className=' flex flex-col lg:flex-row h-screen'>
                <div className={`${!selectedUser ? 'flex' : ' hidden lg:flex'} lg:w-[30%] `} >
                    <Sidebar />
                </div>

                {!selectedCall && <div className={`${selectedUser ? 'flex' : 'hidden lg:flex'} flex-grow`}>
                    <ChatSection />
                </div>}

                {selectedCall && <div className=' flex flex-grow max-h-screen overflow-hidden p-5 '>
                    <CallInfo />
                </div>}
            </div>
        </div>
    )
}

export default Chat
