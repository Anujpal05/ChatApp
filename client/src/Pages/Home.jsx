import React, { useRef, useState } from 'react'
import { FaArrowRight } from "react-icons/fa6";
import useAuthStore from '../store/authStore';
import { ThreeDots } from 'react-loader-spinner'

const Home = () => {

    const userNameRef = useRef(null);
    const passwordRef = useRef(null);
    const [isDisable, setisDisable] = useState(false);
    const { login } = useAuthStore();



    const register = async () => {
        setisDisable(true);
        const userName = userNameRef.current.value;
        const password = passwordRef.current.value;
        const isLogin = await login({ userName, password })

        if (!isLogin) {
            setisDisable(false);
        }
    }

    return (
        <div className=' bg-black min-h-screen w-screen text-white overflow-x-hidden'>
            <p className=' text-center font-semibold text-2xl lg:text-4xl py-3 text-teal-500 border-b-[1px] border-gray-600'>Start Chats with <span className=' text-purple-700'>Quicktalk</span></p>

            <div>
                <div className=' flex flex-col items-center lg:flex-row  lg:gap-5 pb-20'>
                    <div className=' h-[400px] lg:h-[90vh] flex items-center lg:px-10'>
                        <img src="https://res.cloudinary.com/dcfy1v0ab/image/upload/v1736669568/slog3xcdmqzlkci7fyvy.png" alt="" className=' h-[80%] opacity-90' />
                    </div>
                    <div className=' flex justify-center lg:flex-grow'>
                        <div className=' flex flex-col justify-center gap-4 bg-zinc-900 p-8 lg:p-16 rounded-md'>
                            <h1 className=' text-2xl font-semibold'><span className=' text-purple-800'>Let's Start</span> Chatting!</h1>
                            <div className=' flex flex-col gap-1'>
                                <label htmlFor="">Enter UserName</label>
                                <input ref={userNameRef} type="text" name="username" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Username' />
                            </div>
                            <div className=' flex flex-col gap-1'>
                                <label htmlFor="">Enter Password</label>
                                <input ref={passwordRef} type="password" name="password" className=' bg-zinc-800 border-zinc-700 border-2 p-1 rounded-md outline-none px-3' placeholder='Enter Password' />
                            </div>
                            <div className=' flex justify-center'>
                                <button className=' text-gray-800 outline-none bg-teal-500 p-2 rounded-full text-lg lg:text-xl font-bold w-fit px-5 lg:px-10 flex items-center' onClick={register} disabled={isDisable}>{!isDisable && <><span className=' text-purple-900 px-1'>Let's  </span> Start<span className=' px-1 '> <FaArrowRight /></span></>}{isDisable && <>
                                    <span className=' text-purple-900 px-1'>Starting</span>
                                    <ThreeDots
                                        visible={true}
                                        height="30"
                                        width="30"
                                        color="black"
                                        radius="9"
                                        ariaLabel="three-dots-loading"
                                    />
                                </>}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
