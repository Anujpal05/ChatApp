import React from 'react'
import { RxCross2 } from "react-icons/rx";
import { LuMessageCircleMore } from "react-icons/lu";
import useCallStore from '../store/callStore';
import { FaVideo } from "react-icons/fa";
import { IoMdCall } from "react-icons/io";
import getCallTime, { getDate, isToday, isYesterDay } from '../utils/getTime';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

const CallInfo = () => {
    const { selectedCall, setSelectedCall } = useCallStore();
    const { authUser } = useAuthStore();
    const { setSelectedUser } = useChatStore();

    const showSelectedUser = () => {
        const user = selectedCall.callerId._id == authUser ? selectedCall.receiverId : selectedCall.callerId;
        setSelectedUser(user);
        setSelectedCall(null);
    }

    return (
        <>
            <div className=' border-2 border-gray-700 rounded-md h-fit w-full show-sidebar'>
                <div className=' flex justify-between p-2 lg:p-3 border-b-2 border-gray-700'>
                    <h1 className=' font-semibold'>Call Info</h1>
                    <button className=' outline-none hover:text-[23px] transition-all text-xl duration-300 ease-in-out' onClick={() => setSelectedCall(null)}><RxCross2 /></button>
                </div>
                <div className=' p-3 border-b-2 border-gray-700 flex justify-between'>
                    <div className='  flex items-center gap-4'>
                        <img src="https://res.cloudinary.com/dcfy1v0ab/image/upload/v1738243131/profile_img.png" alt="profileImg" className=' h-10 w-10 rounded-full bg-blue-500 border-2 border-white text-gray-300' />
                        <p className=' font-semibold text-lg text-center'>{selectedCall.callerId._id == authUser ? selectedCall.receiverId.userName : selectedCall.callerId.userName}</p>
                    </div>
                    <button className=' text-2xl px-2 outline-none ' onClick={showSelectedUser}><LuMessageCircleMore /></button>
                </div>
                <div className=' p-3'>
                    <p className=' text-sm font-semibold text-gray-400 text-[14px]  '>{isToday(selectedCall.createdAt) ? 'Today' : isYesterDay(selectedCall.createdAt) ? "Yesterday" : getDate(selectedCall.createdAt)}</p>
                    <div className=' py-3 flex items-center gap-1 text-gray-300 text-[16px]'>
                        <span className=' pr-2'>{selectedCall.kind == "Video" ? <FaVideo /> : <IoMdCall />}</span>
                        <span className=' '>{selectedCall.callerId._id == authUser ? "Outgoing" : "Incoming"}</span>
                        <span>{selectedCall.kind == "Video" ? `video call at ${getCallTime(selectedCall.createdAt)}` : `voice call at ${getCallTime(selectedCall.createdAt)} `}</span>
                    </div>
                </div>
            </div>
        </>
    )
}

export default CallInfo
