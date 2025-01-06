import React, { useContext, useEffect, useId, useRef, useState } from 'react'
import { CgProfile } from "react-icons/cg";
import { BsFillSendFill } from "react-icons/bs";
import '../App.css'
import { io } from 'socket.io-client';
import axios from 'axios';
import { userContext } from '../Pages/Chat';

const ChatSection = () => {
    const [socket, setsocket] = useState(null)
    const messageRef = useRef(null);
    const userId = localStorage.getItem('userId');
    const { selectedUsers, setselectedUsers } = useContext(userContext);


    useEffect(() => {
        if (userId) {
            const newSocket = io('http://localhost:5000', {
                query: { userId }
            });
            setsocket(newSocket)
            newSocket.on('connect', () => {
                console.log(newSocket._opts.query.userId)
                console.log(newSocket.id)
            })


            newSocket.on('broadcast', ({ socketId, message }) => {
                const msgContainer = document.getElementsByClassName('msg-container')[0];
                if (msgContainer) {
                    const pElement = document.createElement('p');
                    if (userId != selectedUsers) {
                        pElement.className = ' self-end bg-green-700 max-w-[30%] p-2 rounded-lg';
                    } else {
                        pElement.className = 'self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'
                    }
                    pElement.innerText = message;
                    msgContainer.appendChild(pElement);
                }
            })
        }
    }, [userId])

    useEffect(() => {
        const updateUser = async () => {
            try {
                const res = await axios.post('http://localhost:5000/api/user/update-user', { userId, socketId: socket.id })
                console.log(res)
            } catch (error) {
                console.log(error)
            }
        }

        if (socket) {
            updateUser();
        }
    }, [socket])






    useEffect(() => {
        const fetchMsg = async () => {
            try {

                console.log(userId);

                const { data: { allMessage } } = await axios.get("http://localhost:5000/api/message/get-message", {
                    params: {
                        senderId: userId,
                        receiverId: selectedUsers
                    }
                })

                console.log(allMessage)

                const msgContainer = document.getElementsByClassName('msg-container')[0];
                if (msgContainer && allMessage) {
                    allMessage.forEach(element => {
                        const pElement = document.createElement('p');
                        if (userId == element.senderId) {
                            pElement.className = ' self-end bg-green-700 max-w-[30%] p-2 rounded-lg';
                        } else {
                            pElement.className = 'self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'
                        }
                        pElement.innerText = element.text;
                        msgContainer.appendChild(pElement);
                    });
                }
            } catch (error) {
                console.log(error)
            }
        }

        fetchMsg();
    }, [])





    useEffect(() => {
        const getUser = async () => {
            try {
                console.log("..")
                const res = await axios.get("http://localhost:5000/api/user/get-user", {
                    params: {
                        userId: selectedUsers
                    }
                })
                console.log(res)
            } catch (error) {
                console.log(error)
            }
        }

        if (selectedUsers) {
            getUser();
        }
    }, [selectedUsers])



    const sendMessage = async () => {
        const message = messageRef.current.value;
        if (message && socket) {
            socket.emit('message', { message: messageRef.current.value, receiverId: selectedUsers });
            messageRef.current.value = ''
            try {
                const res = await axios.post("http://localhost:5000/api/message/send-message", { senderId: userId, receiverId: selectedUsers, text: message })

                console.log(res)

            } catch (error) {
                console.log(error)
            }
        }
    }



    return (
        <div className=' relative w-full  '>
            <div className='w-full'>
                <div className=' flex items-center gap-4 p-2 bg-gray-900 w-full'>
                    <div ><CgProfile className=' h-10 w-10 rounded-full bg-blue-700 text-gray-300' /></div>
                    <div>Anuj pal</div>
                </div>
                <div className=' max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700  '>
                    <div className=' flex flex-col justify-between gap-2 w-full p-5 msg-container' >
                        {/* <p className=' self-end bg-green-700 max-w-[30%] p-2 rounded-lg'>Hii</p>
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
                        <p className=' self-start  bg-gray-700 max-w-[30%] p-2 rounded-lg'>Byee</p> */}
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
