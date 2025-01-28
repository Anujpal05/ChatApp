import React, { useEffect, useRef, useState } from 'react';
import { PiPhoneDisconnect } from "react-icons/pi";
import { RxCross2 } from "react-icons/rx";
import profileImg from '../assets/image/profile.png'
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import toast from 'react-hot-toast';
import { axiosInstance } from '../../utils/axios';
import useCallStore from '../store/callStore';

const CallSection = ({ showCall, setshowCall, callingType }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const { socket, authUser } = useAuthStore();
    const { selectedUser } = useChatStore();
    const { addNewCall, getAllCall } = useCallStore();

    const configuration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },  // Public Google STUN server
        ]
    };

    const peerConnection = useRef(new RTCPeerConnection(configuration));

    useEffect(() => {
        const MakeCall = async () => {
            try {
                const constraints = {
                    video: callingType == 'video',
                    audio: true
                }

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log(stream)
                if (stream) {
                    localVideoRef.current.srcObject = stream;

                    stream.getTracks().forEach(track => {
                        peerConnection.current.addTrack(track, stream);
                    })

                    peerConnection.current.ontrack = (event) => {
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = event.streams[0];
                        }
                    }


                    peerConnection.current.onicecandidate = (event) => {
                        if (event.candidate) {
                            socket.emit('ice-candidate', { candidate: event.candidate, recieverId: selectedUser?._id });
                        }

                    }
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    socket.emit('offer', { offer, recieverId: selectedUser?._id });
                    socket.emit("calling", { accept: true, callerId: authUser, kind: callingType, recieverId: selectedUser?._id });
                }

            } catch (error) {
                console.log(error)
            }
        }

        if (showCall) {
            const notification = document.getElementsByClassName('.call-notification')[0];
            notification?.remove();
            MakeCall();
        }

        return () => {
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate")
            socket.off("calling");
        }
    }, [showCall])


    useEffect(() => {
        if (socket) {
            try {
                socket.on('offer', async ({ offer }) => {
                    console.log({ "offer": offer })
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

                    const constraints = {
                        video: callingType == 'video',
                        audio: true
                    }

                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (stream) {
                        localVideoRef.current.srcObject = stream;
                        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        socket.emit('answer', { answer, recieverId: selectedUser?._id });
                    }
                })
            } catch (error) {
                console.log(error)
            }


            socket.on("answer", async ({ answer }) => {

                try {
                    console.log({ answer })
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
                    const payload = {
                        callerId: authUser,
                        receiverId: selectedUser?._id,
                        kind: 'Video'
                    }

                    //Add Call Info in database
                    await addNewCall(payload);
                    await getAllCall(authUser);
                } catch (error) {
                    console.log(error)
                }

            })

            socket.on("ice-candidate", async ({ candidate }) => {
                console.log({ candidate })
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            })

            socket.on("calling", (data) => {
                if (!data?.accept) {
                    disconnectCall();
                }
            })
        }
    }, [socket])

    const disconnectCall = () => {
        localVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
        remoteVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
        setshowCall(false);
        toast.success("Call disconnected!");
    }

    const callDisconnected = () => {
        socket?.emit("calling", { accept: false, recieverId: selectedUser?._id });
        disconnectCall();
    }



    return (
        <div className=' absolute top-0 left-0 h-screen w-screen  text-white flex justify-center items-center'>
            <div className='  bg-gray-800 lg:h-[80%] lg:w-[80%] h-full w-full flex justify-center items-center relative bg-cover rounded-md' style={{ backgroundImage: "url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1737040206/brvvhxbkqdta143xtoly.jpg')" }}>
                <div className=' flex justify-center h-[95%] w-[95%]'>
                    <video ref={remoteVideoRef} autoPlay controls={false} playsInline id='peerPlayer' className=' w-full  '  ></video>
                </div>
                <div className=' absolute lg:bottom-[-20px] bottom-2 right-1 lg:right-2 text-white px-3 flex justify-end'>
                    <video ref={localVideoRef} autoPlay id='localPlayer' controls={false} playsInline className=' lg:h-60 lg:w-60 h-36 w-36' ></video>
                </div>

                <button className=' text-gray-400 bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out px-5 rounded-3xl absolute bottom-3  outline-none text-4xl ' onClick={callDisconnected}>
                    <PiPhoneDisconnect />
                </button>
                {callingType != 'video' && <div className=' absolute '>
                    <img src={profileImg} alt="profileImg" className='h-80 bg-gray-700 rounded-full' />
                </div>}
            </div>
        </div>
    )
}

export default CallSection
