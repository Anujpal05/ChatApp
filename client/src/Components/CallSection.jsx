import React, { useEffect, useRef, useState } from 'react';
import { RxCross2 } from "react-icons/rx";
import useAuthStore from '../store/authStore';

const CallSection = ({ showCall, setshowCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [remoteStream, setremoteStream] = useState(null)
    const peerConnection = useRef(new RTCPeerConnection());
    const { socket } = useAuthStore();


    useEffect(() => {
        const showVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                console.log(stream)
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
                }
            } catch (error) {
                console.log(error)
            }
        }

        if (showCall) {
            showVideo();
        }
    }, [])

    if (socket) {
        socket.on('offer', async (offer) => {
            console.log(offer)
            await peerConnection.current.setRemoteDescription(offer);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            localVideoRef.current.srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit('answer', answer);
        })

        socket.on("answer", async (answer) => {
            console.log(answer)
            await peerConnection.current.setRemoteDescription(answer);
        })

        socket.on("ice-candidate", async (candidate) => {
            console.log(candidate)
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        })
    }

    const disconnectCall = () => {
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setshowCall(false);
    }

    return (
        <div className=' absolute top-0 left-0 h-screen w-screen  text-white flex justify-center items-center'>
            <div className='  bg-gray-800 h-[80%] w-[80%] flex justify-center items-center relative'>
                <div>
                    <video ref={localVideoRef} autoPlay id='localPlayer' className=' h-[95%] w-[95%]' muted></video>
                </div>
                <div className=' absolute bottom-2 right-0 text-white px-3'>
                    <video ref={remoteVideoRef} autoPlay id='peerPlayer' className=' h-72 w-72' muted ></video>
                </div>
                <button className=' text-red-500 absolute top-3 right-3 outline-none text-xl' onClick={disconnectCall}>
                    <RxCross2 />
                </button>
            </div>
        </div>
    )
}

export default CallSection
