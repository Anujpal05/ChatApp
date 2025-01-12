import React, { useEffect, useRef, useState } from 'react'
import { BsFillSendFill } from "react-icons/bs";
import '../App.css'
import useAuthStore from '../store/authStore.js';
import useChatStore from '../store/chatStore';
import { RxCross2 } from "react-icons/rx";
import profileImg from '../assets/image/profile.png'
import { BsFillChatRightDotsFill } from "react-icons/bs";



const ChatSection = () => {
    const messageRef = useRef(null);
    const [isDisable, setIsDisable] = useState(true)
    const { selectedUser, setSelectedUser, sendMessage, setMessages, getMessages } = useChatStore();
    const { socket, connectSocket, disconnectSocket, authUser } = useAuthStore();
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

    const messageSend = async (message) => {
        messageRef.current.value = ''
        setIsDisable(true);
        if (message) {
            sendMessage(message);
        }
    }


    const handleKeyPress = (event) => {
        const message = messageRef?.current?.value?.trim();
        if (event.key == 'Enter' && message) {
            messageSend(message);
        }
    }

    const handleInput = () => {
        const message = messageRef?.current?.value?.trim();
        setIsDisable(!message);
    }

    return (
        <div className=' relative w-full max-h-screen overflow-hidden  '>
            {selectedUser && <div className='w-full flex flex-col h-screen  '>
                <div className=' flex items-center gap-4 p-2 bg-gray-950 w-full relative'>
                    <div     ><img src={profileImg} className=' h-10 w-10 rounded-full bg-blue-500 border-2 border-white text-gray-300' /></div>
                    <div>{selectedUser.userName}</div>
                    <span className=' absolute right-8 text-2xl text-red-700 hover:text-[27px] hover:text-red-900' onClick={() => setSelectedUser(null)}><RxCross2 /></span>
                </div>
                <div className=' flex-grow overflow-y-auto scrollbar-thin  scrollbar-thumb-gray-700' style={{ backgroundImage: `url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1736671906/sigegsbfbfcveg3x4mph.jpg')` }}>
                    {selectedUser && messages && <div className=' flex flex-col gap-2 w-full p-5 msg-container h-full' >
                        {messages.length > 0 && messages.map((message, i) => (
                            <div className='flex flex-col justify-between w-full' key={i}>
                                {selectedUser._id == message.senderId && <p className='self-start bg-gray-700 max-w-[30%] p-2 rounded-lg'>{message.text}</p>}
                                {authUser == message.senderId && <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>{message.text}</p>}
                            </div>
                        ))}
                        {messages.length == 0 && <div className=' font-semibold text-center flex flex-col items-center justify-center w-full h-full'>
                            <p className=' text-xl text-blue-500'>Start chatting with <span className=' text-purple-500'>{selectedUser.userName}</span></p>
                            <div className=' py-6 chat-icon '><BsFillChatRightDotsFill className=' text-orange-400 text-4xl' /></div>
                        </div>}
                    </div>}
                </div>
                <div className=' absolute bottom-8 px-2 w-full flex justify-center items-center gap-3'>
                    <input ref={messageRef} type="text" name="message" id="message" autoComplete='off' className=' w-[90%] p-2 outline-none appearance-none bg-gray-900 px-2 rounded-md text-[15px]' placeholder='Type a message' onKeyDown={handleKeyPress} onChange={handleInput} />
                    <button className={`text-2xl text-blue-600 p-2 outline-none rounded-full hover:scale-105 transition-all duration-300 ease-in-out ${isDisable ? 'bg-gray-500' : 'bg-gray-200'}`} onClick={() => messageSend(messageRef?.current?.value?.trim())} disabled={isDisable} ><BsFillSendFill /></button>
                </div>
            </div>}
            {!selectedUser && <div className={` h-full lg:flex flex-col justify-center items-center space-y-2 font-semibold text-2xl bg-cover hidden `} style={{ backgroundImage: `url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1736673607/ow6xtpjymtpgtft4ikf2.jpg')` }} >
                <div className=' text-purple-700'><span className=' text-purple-500'>Let's Start</span> Chatting!</div>
                <div className=' text-yellow-400'>You can send <span className=' text-yellow-500'> and recieve message!</span></div>
                <div className=' py-3 chat-icon'><BsFillChatRightDotsFill className=' text-yellow-500 text-4xl' /></div>
            </div>}
        </div>
    )
}

export default ChatSection
