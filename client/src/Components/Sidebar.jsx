import React, { useContext, useEffect, useState } from 'react'
import { FaRegEdit } from "react-icons/fa";
import { IoFilterOutline } from "react-icons/io5";
import "../index.css"
import { axiosInstance } from '../../utils/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import profileImg from '../assets/image/profile.png'


const Sidebar = () => {
    const [users, setusers] = useState()
    const { selectedUser, setSelectedUser } = useChatStore();
    const { logOut, onlineUsers, authUser } = useAuthStore();

    useEffect(() => {
        const getAllUsers = async () => {
            try {
                const { data: { users: usersData } } = await axiosInstance.get('/user/get-all-users');
                const filterUsers = usersData.filter(user => user._id != authUser);
                setusers(filterUsers)
            } catch (error) {
                console.log(error)
            }
        }
        getAllUsers();
    }, [])

    useEffect(() => {
        console.log(selectedUser)
    }, [selectedUser])



    return (
        <div className=' lg:w-[30%] p-5 bg-gray-900 min-h-screen border-r-[1px] border-gray-600 pr-1'>
            <div className=' flex justify-between'>
                <h1 className=' text-2xl font-semibold'>Chats</h1>
                <div className=' flex gap-5 text-2xl'>
                    <div onClick={logOut}><FaRegEdit /></div>
                    <div><IoFilterOutline /></div>
                </div>
            </div>
            <div className='py-5'><input type="text" name="search" id="search" placeholder='Search' autoComplete='off' className=' p-1 w-full px-3 bg-gray-800 border-b-[1px] border-gray-400 rounded-md outline-none appearance-none' /></div>
            <div className=' overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-800 no-scrollbar-arrows flex-grow lg:max-h-[80vh]'>
                <ul className=' space-y-1'>
                    {users && users.map((user, i) => (
                        <li className={` hover:bg-gray-800 p-2 rounded-md transition-all duration-300 ease-in-out ${selectedUser?._id === user._id ? 'bg-gray-800 ' : ""}`} onClick={() => setSelectedUser(user)} key={i}>
                            <div className=' flex items-center gap-5'>
                                <div className='  relative h-10 '><img src={profileImg} alt='profile Img' className=' text-black h-full bg-white rounded-full border-2 border-white  ' />
                                    {onlineUsers && onlineUsers.includes(user._id) && <span className=' h-2 w-2 rounded-full bg-green-500 absolute top-0 right-0'></span>}
                                </div>
                                <div>
                                    <p className=' font-semibold text-xl'>{user.userName}</p>
                                    <p className=' text-sm font-semibold'>{onlineUsers.includes(user._id) ? <span className=' text-green-400'>Online</span> : <span className=' text-gray-300'>Offline</span>}</p>
                                </div>
                            </div>
                        </li>
                    ))}


                </ul>
            </div>
        </div>
    )
}

export default Sidebar
