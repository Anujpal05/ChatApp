import React from 'react'
import image from '../assets/image/chatImg.png'
import { FaArrowRight } from "react-icons/fa6";

const Home = () => {
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
                                <input type="text" name="" id="" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Username' />
                            </div>
                            <div className=' flex flex-col gap-1'>
                                <label htmlFor="">Enter Password</label>
                                <input type="text" name="" id="" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Password' />
                            </div>
                            <div className=' flex justify-center'>
                                <button className=' text-gray-800 outline-none bg-teal-500 p-2 rounded-full text-lg lg:text-xl font-bold w-fit px-5 lg:px-10 flex items-center'><span className=' text-purple-900 px-1'>Let's  </span>Start <span className=' px-1'><FaArrowRight /></span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
