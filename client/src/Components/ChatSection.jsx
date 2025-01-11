import React, { useEffect, useRef, useState } from 'react'
import { BsFillSendFill } from "react-icons/bs";
import '../App.css'
import useAuthStore from '../store/authStore.js';
import useChatStore from '../store/chatStore';
import { RxCross2 } from "react-icons/rx";
import profileImg from '../assets/image/profile.png'



const ChatSection = () => {
    const messageRef = useRef(null);
    const { selectedUser, setSelectedUser, sendMessage, setMessages, getMessages, clearMessages, subscribeToMessages, unsubscribeFromMessage } = useChatStore();
    const { socket, onlineUsers, connectSocket, disconnectSocket, authUser } = useAuthStore();
    const messages = useChatStore((state) => state.messages)

    useEffect(() => {
        connectSocket();
        return () => disconnectSocket();
    }, [])


    useEffect(() => {
        if (selectedUser) {
            getMessages();
        }

        if (!socket) return;

        if (socket) {

            socket.on("newMessage", (newMessage) => {
                const isMessageSentFromSelectedUser =
                    newMessage.senderId === selectedUser._id;
                if (!isMessageSentFromSelectedUser) return;

                setMessages(newMessage)
            });
        }

    }, [selectedUser, setMessages, getMessages])

    const messageSend = async () => {
        const message = messageRef.current.value;
        if (message) {
            sendMessage(message);
            messageRef.current.value = ''
        }
    }

    return (
        <div className=' relative w-full  '>
            {selectedUser && <div className='w-full'>
                <div className=' flex items-center gap-4 p-2 bg-gray-900 w-full relative'>
                    <div     ><img src={profileImg} className=' h-10 w-10 rounded-full bg-blue-500 border-2 border-white text-gray-300' /></div>
                    <div>{selectedUser.userName}</div>
                    <span className=' absolute right-8 text-2xl text-red-700 hover:text-[27px] hover:text-red-900' onClick={() => setSelectedUser(null)}><RxCross2 /></span>
                </div>
                <div className=' max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700  '>
                    {selectedUser && messages && <div className=' flex flex-col justify-between gap-2 w-full p-5 msg-container' >
                        {messages.length > 0 && messages.map((message, i) => (
                            <div className='flex flex-col justify-between w-full' key={i}>
                                {selectedUser._id == message.senderId && <p className='self-start bg-gray-700 max-w-[30%] p-2 rounded-lg'>{message.text}</p>}
                                {authUser == message.senderId && <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>{message.text}</p>}
                            </div>
                        ))}
                        {messages.length == 0 && <p className=' font-semibold text-center'>Start chatting with {selectedUser.userName}</p>}
                    </div>}
                </div>
                <div className=' absolute bottom-8 px-2 w-full flex justify-center items-center gap-3'>
                    <input ref={messageRef} type="text" name="message" id="message" autoComplete='off' className=' w-[90%] p-2 outline-none appearance-none bg-gray-800 px-2 rounded-md text-[15px]' placeholder='Type a message' />
                    <button className=' text-2xl text-blue-600 p-2 outline-none bg-gray-200 rounded-full hover:scale-105 transition-all duration-300 ease-in-out' onClick={messageSend}><BsFillSendFill /></button>
                </div>
            </div>}
            {!selectedUser && <div className='  h-full flex flex-col justify-center items-center space-y-2 font-semibold text-2xl'>
                <div>Let's Start Chatting!</div>
                <div>You can send and recieve message!</div>
            </div>}
        </div>
    )
}

export default ChatSection
