import React, { useEffect, useRef, useState } from 'react';
import { PiPhoneDisconnect } from "react-icons/pi";
import { RxCross2 } from "react-icons/rx";
import profileImg from '../assets/image/profile.png'
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

const CallSection = ({ showCall, setshowCall, callingType }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [remoteStream, setremoteStream] = useState(null)
    const { socket, authUser } = useAuthStore();

    const configuration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },  // Public Google STUN server
        ]
    };

    const peerConnection = useRef(new RTCPeerConnection(configuration));

    useEffect(() => {
        const setupCall = async () => {
            try {
                const constraints = {
                    video: callingType == 'video' ? true : false,
                    audio: true
                }
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (stream) {
                    localVideoRef.current.srcObject = stream;

                    stream.getTracks().forEach(track => {
                        peerConnection.current.addTrack(track, stream);
                    })

                    peerConnection.current.ontrack = (event) => {
                        setremoteStream(event.streams[0]);
                        remoteVideoRef.current.srcObject = event.streams[0];
                        console.log(event);
                    }

                    peerConnection.current.onicecandidate = (event) => {
                        if (event.candidate) {
                            socket.emit('ice-candidate', event.candidate);
                        }

                    }
                    const offer = await peerConnection.current.createOffer();

                    await peerConnection.current.setLocalDescription(offer);
                    socket.emit('offer', offer);
                    socket.emit("calling", { accept: true, callerId: authUser });
                }

            } catch (error) {
                console.log(error)
            }
        }

        if (showCall) {
            setupCall();
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
            socket.on('offer', async (offer) => {
                await peerConnection.current.setRemoteDescription(offer);
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (stream) {
                    localVideoRef.current.srcObject = stream;
                    stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    socket.emit('answer', answer);
                }
            })

            socket.on("answer", async (answer) => {
                await peerConnection.current.setRemoteDescription(answer);
            })

            socket.on("ice-candidate", async (candidate) => {
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
    }

    const callDisconnected = () => {
        socket?.emit("calling", { accept: false });
        disconnectCall();
    }

    return (
        <div className=' absolute top-0 left-0 h-screen w-screen  text-white flex justify-center items-center'>
            <div className='  bg-gray-800 lg:h-[80%] lg:w-[80%] h-full w-full flex justify-center items-center relative bg-cover rounded-md' style={{ backgroundImage: "url('https://res.cloudinary.com/dcfy1v0ab/image/upload/v1737040206/brvvhxbkqdta143xtoly.jpg')" }}>
                <div className=' flex justify-center '>
                    <video ref={remoteVideoRef} autoPlay controls={false} playsInline id='peerPlayer' className='h-[95%] w-[95%] '  ></video>
                </div>
                <div className=' absolute lg:bottom-2 bottom-6 right-2 text-white px-3 flex justify-end'>
                    <video ref={localVideoRef} autoPlay id='localPlayer' controls={false} playsInline className=' lg:h-72 lg:w-72 h-32 w-32' ></video>
                </div>

                <button className=' text-gray-400 bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out px-5 rounded-3xl absolute bottom-3  outline-none text-4xl ' onClick={callDisconnected}>
                    <PiPhoneDisconnect />
                </button>
            </div>
        </div>
    )
}

export default CallSection
