import React, { useEffect, useRef, useState } from 'react'
import { CgProfile } from "react-icons/cg";
import { BsFillSendFill } from "react-icons/bs";
import '../App.css'
import io from 'socket.io-client';
const socket = io('http://localhost:5000');

const ChatSection = () => {
    const [socketId, setsocketId] = useState(null)
    const messageRef = useRef(null);

    const sendMessage = () => {
        const message = messageRef.current.value;
        if (message) {
            socket.emit('message', messageRef.current.value);
            messageRef.current.value = ''
        }
    }

    socket.on('broadcast', ({ socketId, message }) => {
        const msgContainer = document.getElementsByClassName('msg-container')[0];
        if (msgContainer) {
            console.log(socketId, " : ", message);
            <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
            const pElement = document.createElement('p');
            pElement.className = ' self-end bg-green-700 max-w-[30%] p-2 rounded-lg';
            pElement.innerText = message;
            msgContainer.appendChild(pElement);
        }
    })



    return (
        <div className=' relative w-full  '>
            <div className='w-full'>
                <div className=' flex items-center gap-4 p-2 bg-gray-900 w-full'>
                    <div ><CgProfile className=' h-10 w-10 rounded-full bg-blue-700 text-gray-300' /></div>
                    <div>Anuj pal</div>
                </div>
                <div className=' max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700  '>
                    <div className=' flex flex-col justify-between gap-2 w-full p-5 msg-container' >
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kya kar raha hai</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Kuchh nhi</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kal college jayega</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Haa</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kya kar raha hai</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Kuchh nhi</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kal college jayega</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Haa</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kya kar raha hai</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Kuchh nhi</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kal college jayega</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Haa</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Kal se exam start ho raha hai isliye jana padega.</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>thike to sunday ko milte hai</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Good night</p>
                        <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Byee</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Good night</p>
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Byee</p>
                    </div>
                </div>
                <div className=' absolute bottom-8 px-2 w-full flex justify-center items-center gap-3'>
                    <input ref={messageRef} type="text" name="message" id="message" autoComplete='off' className=' w-[90%] p-2 outline-none appearance-none bg-gray-800 px-2 rounded-md text-[15px]' placeholder='Type a message' />
                    <button className=' text-2xl text-blue-600 p-2 outline-none bg-gray-200 rounded-full hover:scale-105 transition-all duration-300 ease-in-out' onClick={sendMessage}><BsFillSendFill /></button>
                </div>
            </div>
        </div>
    )
}

export default ChatSection
