import React, { useEffect, useRef, useState } from 'react'
import { FaRegEdit } from "react-icons/fa";
import { BiLogOut } from "react-icons/bi";
import { axiosInstance } from '../../utils/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import profileImg from '../assets/image/profile.png'
import { RotatingLines } from 'react-loader-spinner'


const Sidebar = () => {
    const [users, setusers] = useState()
    const [filterUsers, setfilterUsers] = useState()
    const [loader, setloader] = useState(true);
    const { selectedUser, setSelectedUser } = useChatStore();
    const { logOut, onlineUsers, authUser } = useAuthStore();
    const searchRef = useRef();


    useEffect(() => {
        const getAllUsers = async () => {
            try {
                const { data: { users: usersData } } = await axiosInstance.get('/user/get-all-users');
                const filtered = usersData.filter(user => user._id != authUser);
                setfilterUsers(filtered)
            } catch (error) {
                console.log(error)
            }
        }
        getAllUsers();
    }, [])

    useEffect(() => {
        setusers(filterUsers)
        if (filterUsers) {
            setloader(false)
        }
    }, [filterUsers])


    const handleInput = (e) => {
        const value = e.target?.value?.toLowerCase().trim();
        const filterUser = filterUsers && filterUsers.filter(user => user?.userName?.toLowerCase()?.includes(value));
        setusers(filterUser);
    }

    return (
        <div className=' w-full p-5 bg-gray-950 min-h-screen border-r-[1px] border-gray-600 pr-1'>
            <div className=' flex justify-between'>
                <h1 className=' text-2xl font-semibold'>Chats</h1>
                <div className=' flex text-2xl relative'>
                    <div ><FaRegEdit /></div>
                    <div onClick={logOut} className=' cursor-pointer hover:scale-105 text-red-600 pl-5 pr-3  '><BiLogOut />
                    </div>
                </div>
            </div>
            <div className='py-5'><input ref={searchRef} onChange={handleInput} type="text" name="search" id="search" placeholder='Search' autoComplete='off' className=' p-1 w-full px-3 bg-gray-900 border-b-[1px] border-gray-400 rounded-md outline-none appearance-none' /></div>
            {users && !loader && <div className=' overflow-y-auto scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900 no-scrollbar-arrows flex-grow max-h-[80vh] '>
                <ul className=' space-y-1'>
                    {users.length > 0 && users.map((user, i) => (
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
            </div>}

            {users && users.length == 0 && !loader && <div className=' px-2 text-red-500'> Not Found!</div>}

            {loader && <div className=' flex justify-center py-2 '>
                <RotatingLines
                    visible={true}
                    height="60"
                    width="60"
                    color="grey"
                    strokeWidth="5"
                    animationDuration="0.75"
                    ariaLabel="rotating-lines-loading"
                    wrapperStyle={{}}
                    wrapperClass=""
                />
            </div>}
        </div>
    )
}

export default Sidebar
