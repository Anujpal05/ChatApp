import React from 'react'
import useCallStore from '../store/callStore'
import useAuthStore from '../store/authStore';
import { SlCallIn } from "react-icons/sl";
import { SlCallOut } from "react-icons/sl";
import { MdMissedVideoCall } from "react-icons/md";
import { IoVideocam } from "react-icons/io5";
import getCallTime, { getDate, isToday, isYesterDay } from '../utils/getTime';


const CallSidebar = ({ filterCalls }) => {

  const { authUser } = useAuthStore();
  const { setSelectedCall } = useCallStore();

  return (
    <div>
      {filterCalls && <div className=' overflow-y-auto scrollbar-thin scrollbar-track-gray-950 scrollbar-thumb-gray-900 no-scrollbar-arrows flex-grow '>
        <ul className=' space-y-1'>
          {filterCalls.length > 0 && filterCalls.map((call, i) => (
            <li className={` hover:bg-gray-800 p-2 rounded-md transition-all duration-300 ease-in-out`} key={i}>
              <div className=' flex justify-between items-center gap-4 w-full' onClick={() => setSelectedCall(call)}>
                <div className=' flex items-center gap-4 px-1 lg:px-3'>
                  <img src="https://res.cloudinary.com/dcfy1v0ab/image/upload/v1738243131/profile_img.png" alt="profileImg" className='  h-10 w-10 rounded-full bg-blue-500 border-2 border-white text-gray-300 ' />
                  <div className=''>
                    <p className=' font-semibold text-xl text-center'>{call.callerId._id == authUser ? call.receiverId.userName : call.callerId.userName}</p>
                    <p className=' text-gray-400 text-[14px] font-semibold '>{call.callerId._id == authUser ? <span className=' flex items-center gap-2'>{call.kind == "Audio" ? <SlCallOut className=' text-sm' /> : <MdMissedVideoCall className=' text-sm' />}Outgoing</span> : <span className=' flex items-center gap-2'>{call.kind == "Audio" ? <SlCallIn className=' text-sm' /> : <IoVideocam />}Incoming</span>}</p>
                  </div>
                </div>
                <p className=' text-sm font-semibold text-gray-400 text-[14px]  '>{isToday(call.createdAt) ? getCallTime(call.createdAt) : isYesterDay(call.createdAt) ? "Yesterday" : getDate(call.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>}
    </div>
  )
}

export default CallSidebar
