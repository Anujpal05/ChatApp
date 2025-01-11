import React, { useRef } from 'react'
import image from '../assets/image/chatImg.png'
import { FaArrowRight } from "react-icons/fa6";
import useAuthStore from '../store/authStore';

const Home = () => {

    const userNameRef = useRef(null);
    const passwordRef = useRef(null);
    const { login } = useAuthStore();

    const register = async () => {
        const userName = userNameRef.current.value;
        const password = passwordRef.current.value;

        login({ userName, password })
    }

    return (
        <div className=' bg-black min-h-screen w-screen text-white overflow-x-hidden'>
            <p className=' text-center font-semibold text-4xl py-3 underline'>Start Chats</p>
            <div>
                <div className=' flex flex-col items-center lg:flex-row  lg:gap-5 pb-20'>
                    <div className=' h-[400px] lg:h-[90vh] flex items-center lg:px-10'>
                        <img src={image} alt="" className=' h-[80%] opacity-90' />
                    </div>
                    <div className=' flex justify-center lg:flex-grow'>
                        <div className=' flex flex-col justify-center gap-4 bg-zinc-900 p-8 lg:p-16 rounded-md'>
                            <h1 className=' text-2xl font-semibold'><span className=' text-purple-800'>Let's Start</span> Chatting!</h1>
                            <div className=' flex flex-col gap-1'>
                                <label htmlFor="">Enter UserName</label>
                                <input ref={userNameRef} type="text" name="" id="" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Username' />
                            </div>
                            <div className=' flex flex-col gap-1'>
                                <label htmlFor="">Enter Password</label>
                                <input ref={passwordRef} type="text" name="" id="" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Password' />
                            </div>
                            <div className=' flex justify-center'>
                                <button className=' text-gray-800 outline-none bg-teal-500 p-2 rounded-full text-lg lg:text-xl font-bold w-fit px-5 lg:px-10 flex items-center' onClick={register}><span className=' text-purple-900 px-1'>Let's  </span>Start <span className=' px-1'><FaArrowRight /></span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
