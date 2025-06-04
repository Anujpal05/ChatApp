import React, { useEffect, useRef, useState } from 'react'
import { LuMessageCircleMore } from "react-icons/lu";
import { MdAddCall } from "react-icons/md";
import { BiLogOut } from "react-icons/bi";
import { axiosInstance } from '../../utils/axios';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { RotatingLines } from 'react-loader-spinner'
import useCallStore from '../store/callStore';
import CallSidebar from './CallSidebar';


const Sidebar = () => {
    const [users, setusers] = useState()
    const [filterUsers, setfilterUsers] = useState()
    const [filterCalls, setfilterCalls] = useState();
    const [showBox, setshowBox] = useState('messageBox');
    const [loader, setloader] = useState(true);
    const { callHistory, getAllCall, selectedCall, setSelectedCall } = useCallStore();
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
        const fetch = async () => {
            try {
                await getAllCall(authUser);
            } catch (error) {
                console.log(error)
            }
        }

        if (authUser) {
            fetch();
        }

    }, [authUser])

    useEffect(() => {
        setfilterCalls(callHistory);
    }, [callHistory])


    useEffect(() => {
        setusers(filterUsers)
        if (filterUsers) {
            setloader(false)
        }
    }, [filterUsers])

    const handleInput = (e) => {
        const value = e.target?.value?.toLowerCase().trim();
        if (showBox == 'messageBox') {
            const filterUser = filterUsers && filterUsers.filter(user => user?.userName?.toLowerCase()?.includes(value));
            setusers(filterUser);
        } else if (showBox == 'callBox') {
            const filterCall = callHistory && callHistory.filter(call => call?.callerId?.userName?.toLowerCase().includes(value));
            setfilterCalls(filterCall)
        }
    }

    return (
        <div className=' w-full flex flex-col bg-gray-950 border-r-[1px] border-gray-600 pr-1 lg:h-screen lg:max-h-screen'>
            <div className=' max-h-[20vh] px-3 py-2'>
                <div className=' flex justify-between'>
                    <h1 className=' text-2xl font-semibold'>Chats</h1>
                    <div className=' flex text-2xl relative gap-4'>
                        <button className=' cursor-pointer outline-none text-yellow-500' onClick={() => { setshowBox('messageBox'); setSelectedCall(null); }}><LuMessageCircleMore /></button>
                        <button className=' cursor-pointer outline-none text-blue-500' onClick={() => setshowBox("callBox")}><MdAddCall /></button>
                        <button onClick={logOut} className=' cursor-pointer hover:scale-105 text-red-600 outline-none '><BiLogOut />
                        </button>
                    </div>
                </div>
                <div className={`py-2 ${selectedCall ? "hidden lg:block " : "block"}`}><input ref={searchRef} onChange={handleInput} type="text" name="search" id="search" placeholder='Search' autoComplete='off' className=' p-1 w-full px-3 bg-gray-900 border-b-[1px] border-gray-400 rounded-md outline-none appearance-none' /></div>
            </div>
            {showBox == 'messageBox' && users && !loader && <div className=' overflow-y-auto scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900 no-scrollbar-arrows flex-grow pb-2 show-sidebar'>
                <ul className=' space-y-1'>
                    {users.length > 0 && users.map((user, i) => (
                        <li className={` hover:bg-gray-800 p-2 rounded-md transition-all duration-300 ease-in-out ${selectedUser?._id === user._id ? 'bg-gray-800 ' : ""}`} onClick={() => setSelectedUser(user)} key={i}>
                            <div className=' flex items-center gap-5'>
                                <div className='  relative h-10 '><img src="https://res.cloudinary.com/dcfy1v0ab/image/upload/v1738243131/profile_img.png" alt='profileImg' className=' text-black h-10 w-10 bg-white rounded-full border-2 border-white  ' />
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

            {
                showBox == 'callBox' && <div className={` overflow-y-auto scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900 no-scrollbar-arrows flex-grow pb-2 show-sidebar ${!selectedCall ? 'block' : ' hidden lg:block'}`}>
                    <CallSidebar filterCalls={filterCalls} />
                </div>
            }

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
