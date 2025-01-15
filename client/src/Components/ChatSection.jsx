import React, { useEffect, useRef, useState } from 'react'
import { BsFillSendFill } from "react-icons/bs";
import '../App.css'
import useAuthStore from '../store/authStore.js';
import useChatStore from '../store/chatStore';
import { RxCross2 } from "react-icons/rx";
import profileImg from '../assets/image/profile.png'
import { FaRegImage } from "react-icons/fa6";
import { BsFillChatRightDotsFill } from "react-icons/bs";
import { MdOutlineFileDownload } from "react-icons/md";
import { Comment } from 'react-loader-spinner'
import toast from 'react-hot-toast';
import getMessageTime from '../utils/getTime';
import { IoMdCall } from "react-icons/io";
import CallSection from './CallSection';



const ChatSection = () => {
    const messageRef = useRef(null);
    const [isDisable, setIsDisable] = useState(true)
    const [imagePreview, setimagePreview] = useState(null)
    const [showImg, setshowImg] = useState(null)
    const [showCall, setshowCall] = useState(false)
    const { selectedUser, setSelectedUser, sendMessage, setMessages, getMessages } = useChatStore();
    const { socket, connectSocket, disconnectSocket, authUser } = useAuthStore();
    const inputImg = useRef();
    const messages = useChatStore((state) => state.messages)
    const { onlineUsers } = useAuthStore();

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
        if (!message && !imagePreview) return;

        messageRef.current.value = ''
        setIsDisable(true);
        setimagePreview(null)
        sendMessage({ text: message, image: imagePreview });
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

    const handleImgInput = () => {
        inputImg.current.click();
    }

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file")
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setimagePreview(reader.result)
        }
        reader.readAsDataURL(file)
        event.target.value = '';
    }

    const showImage = (image) => {
        if (image) {
            setshowImg(image);
        }
    }

    const downloadImg = () => {
        const link = document.createElement('a');
        link.href = showImg;
        link.download = 'image.jpg'
        link.click();
    }

    const showCallSection = () => {
        setshowCall(true)
    }

    return (
        <>
            <div className=' relative w-full max-h-screen overflow-hidden  '>
                {selectedUser && <div className='w-full flex flex-col h-screen '>
                    <div className=' flex items-center gap-4 p-2 bg-gray-950 w-full relative'>
                        <div><img src={profileImg} className=' h-10 w-10 rounded-full bg-blue-500 border-2 border-white text-gray-300' /></div>
                        <div className=' flex flex-col'>
                            <span>{selectedUser.userName}</span>
                            {onlineUsers.includes(selectedUser._id) ? <span className=' text-green-400 text-[12px]'>Online</span> : <span className=' text-gray-300 text-[12px]'>Offline</span>}
                        </div>
                        <button className=' absolute text-blue-600 outline-none right-20 text-2xl' onClick={showCallSection}> <IoMdCall /></button>
                        <button className=' absolute right-8 text-2xl outline-none text-red-700 hover:text-[27px] hover:text-red-900' onClick={() => setSelectedUser(null)}><RxCross2 /></button>
                    </div>
                    <div className=' flex-grow overflow-y-auto scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900 mb-10 ' style={{ backgroundImage: `url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1736671906/sigegsbfbfcveg3x4mph.jpg')` }}>
                        {selectedUser && messages && <div className=' flex flex-col gap-2 w-full p-5 msg-container h-full' >
                            {messages.length > 0 && messages.map((message, i) => (
                                <div className='flex flex-col justify-between w-full' key={i}>
                                    {selectedUser._id == message.senderId && <>
                                        <div className=' self-start text-[12px] text-gray-500 font-semibold'>{getMessageTime(message.createdAt)}</div>
                                        <div className='self-start bg-gray-700 max-w-[30%] p-1 px-2 rounded-lg'>
                                            {message.image && <div ><img src={message.image} alt="image" onClick={() => showImage(message.image)} /></div>}
                                            <p onClick={() => getMessageTime(message.createdAt)}>{message.text}</p>
                                        </div>
                                    </>}
                                    {authUser == message.senderId && <>
                                        <div className=' self-end text-[12px] text-gray-500 font-semibold'>{getMessageTime(message.createdAt)}</div>
                                        <div className=' self-end bg-green-700 max-w-[30%] p-1 px-2 rounded-lg'>
                                            {message.image && <div><img src={message.image} alt="image" className=' h-40 w-40' onClick={() => showImage(message.image)} /></div>}
                                            <p onClick={() => getMessageTime(message.createdAt)}>{message.text}</p>
                                        </div>
                                    </>}
                                </div>
                            ))}
                            {messages.length == 0 && <div className=' font-semibold text-center flex flex-col items-center justify-center w-full h-full'>
                                <p className=' text-xl text-blue-500'>Start chatting with <span className=' text-purple-500'>{selectedUser.userName}</span></p>
                                <div className=' py-2' >
                                    <Comment
                                        visible={true}
                                        height="60"
                                        width="60"
                                        ariaLabel="comment-loading"
                                        wrapperStyle={{}}
                                        wrapperClass="comment-wrapper"
                                        color="blue"
                                        backgroundColor="orange"
                                    />
                                </div>
                            </div>}
                        </div>}
                    </div>
                    {imagePreview && <div className=' absolute lg:h-36 lg:w-36 h-20 w-20 bottom-14 left-5 '><img src={imagePreview} alt="imagePreview" className=' h-full w-full object-cover border-2 border-gray-600 rounded-md  ' />
                        <span className=' relative lg:bottom-[146px] lg:left-[130px] text-red-500  bottom-[82px] left-[68px] cursor-pointer ' onClick={() => setimagePreview(null)}><RxCross2 /></span>
                    </div>}
                    <div className=' h-[22vh]'>
                        <div className=' absolute bottom-4 px-5 w-full flex gap-3'>
                            <input ref={messageRef} type="text" name="message" id="message" autoComplete='off' className=' flex-grow p-2 outline-none appearance-none bg-gray-900 px-2 rounded-md text-[15px]' placeholder='Type a message' onKeyDown={handleKeyPress} onChange={handleInput} />
                            <input type="file" accept='image/*' name="" id="" ref={inputImg} className='hidden outline-none' onChange={handleImageChange} />
                            <button className=' text-xl px-1 hover:text-[22px] hover:text-gray-200 outline-none' onClick={handleImgInput}><FaRegImage /></button>
                            <button className={`text-2xl text-blue-600 p-2 outline-none rounded-full hover:scale-105 transition-all duration-300 ease-in-out ${isDisable ? 'bg-gray-500' : 'bg-gray-200'}`} onClick={() => messageSend(messageRef?.current?.value?.trim())} disabled={isDisable} ><BsFillSendFill /></button>
                        </div>
                    </div>
                </div>}
                {!selectedUser && <div className={` h-full lg:flex flex-col justify-center items-center space-y-2 font-semibold text-2xl bg-cover hidden `} style={{ backgroundImage: `url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1736673607/ow6xtpjymtpgtft4ikf2.jpg')` }} >
                    <div className=' text-purple-700'><span className=' text-purple-500'>Let's Start</span> Chatting!</div>
                    <div className=' text-yellow-400'>You can send <span className=' text-yellow-500'> and recieve message!</span></div>
                    <div className=' py-3 chat-icon'><BsFillChatRightDotsFill className=' text-yellow-500 text-4xl' /></div>
                </div>}
            </div>
            {showImg && <div className=' show-image absolute left-0 h-screen w-screen bg-black flex justify-center items-center'>
                <button className=' absolute top-5 lg:right-10 right-5 text-2xl text-red-500 outline-none' onClick={() => setshowImg(null)}><RxCross2 /></button>
                <button className=' absolute top-5 lg:right-20 right-16 text-2xl text-blue-500 outline-none' onClick={downloadImg}><MdOutlineFileDownload /></button>
                <img src={showImg} alt="Image Preview" className=' lg:max-h-[80%]  lg:h-[700px] max-h-[70%] h-[400px] max-w-[90%] bg-blue-500' />
            </div>}

            {showCall && <div className=' '>
                <CallSection showCall={showCall} setshowCall={setshowCall} />
            </div>}
        </>
    )
}

export default ChatSection
