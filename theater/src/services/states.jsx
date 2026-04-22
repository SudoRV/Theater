import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const StatesContext = createContext();

export const StatesProvider = ({ children }) => {
    // states
    const [myIp, setMyIp] = useState(null);
    const [readyMembers, setReadyMembers] = useState(new Set());
    const [members, setMembers] = useState(new Set());
    const [playRequested, setPlayRequested] = useState(false);
    const [video, setVideo] = useState(null);
    const [currentTime, setCurrentTime] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [seekedUsers, setSeekedUsers] = useState(new Set());
    const [askPermission, setAskPermission] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(null);
    const [requestCurrentTime, setRequestCurrentTime] = useState(null);
    const [videoData, setVideoData] = useState({});
    const [message, setMessage] = useState("");

    const [theaterData, setTheaterData] = useState();
    const host = window.location.hostname;

    const my_details = JSON.parse(localStorage.getItem("my_details")) || {
        name: "Tony",
        username: "tony3000",
        email: "tony@stark.com",
        gender: "male"
    };

    const msgFormat = {
        "code": 1001,
        "command": "join",
        "username": "john123",
        "user_details": {
            "name": "John",
            "username": "john123",
            "email": "john@example.com",
            "gender": "male"
        },
        "payload": {},
    }


    // voice room states
    /* ======================
     DATA (reactive)
  ====================== */
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [localAudioRef, setLocalAudioRef] = useState(null);

    const [userType, setUserType] = useState({})

    /* ======================
       USER ACTIONS
    ====================== */
    const addRemoteUser = (user) => {
        setRemoteUsers((prev) => {
            const exists = prev.some((u) => u.userId === user.userId);
            if (exists) return prev;
            return [...prev, user];
        });
    };

    const removeRemoteUser = (userId) => {
        setRemoteUsers((prev) =>
            prev.filter((u) => u.userId !== userId)
        );

        setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
        });
    };

    /* ======================
       AUDIO STREAM ACTIONS
    ====================== */
    const setRemoteStream = (userId, stream) => {
        setRemoteStreams((prev) => ({
            ...prev,
            [userId]: stream,
        }));
    };

    const clearAll = () => {
        setRemoteUsers([]);
        setRemoteStreams({});
    };

    // ========================================
    // socket
    const socketRef = useRef(null);
    const listenerRef = useRef(null);

    async function setTheaterDataFunc(host, params, theater_id) {
        const response = await fetch(`/get-theater-data`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ theater_id: theater_id })
        })

        const data = await response.json();

        setTheaterData(prev => ({ ...prev, theater_name: params.get("name"), source_type: params.get("type"), ...data.metadata }));
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const theater_id = params.get("id");

        setTheaterDataFunc(host, params, theater_id);

        if (!socketRef.current) {

            socketRef.current = io("/controls", {
                query: { theaterId: theater_id },
            });

            const socket = socketRef.current;

            socket.on("connect", () => {
                console.log("Connected to server controls");

                // send user details
                socket.emit("message", {
                    code: 23,
                    command: "set user details",
                    username: my_details.username,
                    user_details: my_details,
                    payload: { user_details: my_details }
                });

                // fetch current time
                socket.emit("message", {
                    code: 32,
                    command: "fetch current time",
                    username: my_details.username,
                    user: my_details,
                    send_type: "all-except-me"
                });
            });

            socket.on("message", (data) => {
                switch (data.code) {

                    case 24:
                        setMembers(data.payload.members.map(m => ({ ...m, mic: true })));
                        setReadyMembers(data.payload.ready_members);
                        setMembers(prev =>
                            prev.map(m => ({
                                ...m,
                                ready: data.payload.ready_members.some(r => r.email === m.email)
                            }))
                        );
                        break;

                    case 25:
                        setMembers(data.payload.members);
                        setReadyMembers(data.payload.ready_members);
                        break;

                    case 27:
                        setReadyMembers(data.payload.ready_members);
                        break;

                    case 28:
                        if (readyMembers.length === members.length) {
                            setPlayRequested(true);
                        }
                        break;

                    case 29:
                        if (readyMembers.length === members.length) {
                            setPlayRequested(false);
                        }
                        break;

                    case 30:
                        setSyncing(true);
                        setCurrentTime(data.payload.current_time);
                        setAskPermission(
                            `${data.user.name} want to seek video to: ${formatTime(data.payload.current_time)}`
                        );
                        break;

                    case 31:
                        setSyncing(false);
                        break;

                    case 32:
                        setRequestCurrentTime(data.user.email);
                        break;

                    case 33:
                        setRequestCurrentTime(data.payload.current_time);
                        break;

                    case 34:
                        setMessage({
                            name: data.user.name,
                            email: data.user.email,
                            message: data.payload.message
                        });
                        break;

                    default:
                        console.log("Unhandled:", data);
                        break;
                }
            });

            socket.on("disconnect", () => {
                console.log("Disconnected from server");
            });

            socket.on("connect_error", (err) => {
                console.error("Socket error:", err);
            });
        }

        return () => {
            socketRef.current?.disconnect();
        };

    }, []);

    // helper to send messages
    const sendMsg = (msg) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit("message", msg);
        } else {
            console.log("Socket not connected yet");
        }
    };

    function formatTime(seconds) {
        seconds = Math.floor(seconds);

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            // HH:MM:SS
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        } else if (mins > 0) {
            // MM:SS
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        } else {
            // SS
            return `${secs}`;
        }
    }

    // expose everything
    const value = {
        host,
        myIp, setMyIp,
        my_details,
        theaterData, setTheaterData,
        readyMembers, setReadyMembers,
        members, setMembers,
        video, setVideo,
        socket: socketRef,
        send: sendMsg,
        format: msgFormat,
        playRequested,
        currentTime, setCurrentTime,
        syncing, setSyncing,
        seekedUsers, setSeekedUsers,
        askPermission, setAskPermission,
        permissionGranted, setPermissionGranted,
        requestCurrentTime, setRequestCurrentTime,
        formatTime, videoData,
        message,

        // voice room global states export 
        // data
        remoteUsers,
        remoteStreams,
        userType, setUserType,

        // ref
        localAudioRef,
        setLocalAudioRef,

        // actions
        addRemoteUser,
        removeRemoteUser,
        setRemoteStream,
        clearAll,
    };

    return (
        <StatesContext.Provider value={value}>
            {children}
        </StatesContext.Provider>
    );
}

export const useStates = () => useContext(StatesContext);