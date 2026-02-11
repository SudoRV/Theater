import React, { createContext, useContext, useEffect, useRef, useState } from "react";

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
        // loadd theater data
        const params = new URLSearchParams(window.location.search)
        const theater_id = params.get("id")

        setTheaterDataFunc(host, params, theater_id);

        // connect to socket controls
        const socketUrl = `wss://${host}:8000/controls?theaterId=${params.get("id")}`;

        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
            socketRef.current = new WebSocket(socketUrl);

            socketRef.current.addEventListener("open", () => {
                console.log("Connected to server controls");

                // send server user details
                const send_my_details = {
                    code: 23,
                    command: "set user details",
                    username: "rahul1992verma",
                    user_details: my_details,
                    payload: { user_details: my_details }
                };
                sendMsg(send_my_details);

                // fetch current time
                const get_current_time = {
                    code: 32,
                    command: "fetch current time",
                    username: "rahul1992verma",
                    user: my_details,
                    send_type: "all-except-me"
                }
                sendMsg(get_current_time);
            })

            socketRef.current.addEventListener("message", (event) => {
                const data = JSON.parse(event.data);
                // console.log(data);

                switch (data.code) {
                    case 24: //user joined broadcast from server
                        setMembers(data?.payload?.members.map(m => ({...m, mic: true})));
                        setReadyMembers(data.payload.ready_members);
                        setMembers(prevMembers =>
                            prevMembers.map(m => ({
                                ...m,
                                ready: data.payload.ready_members.some(r => r.email === m.email) // if emails match, mark ready
                            }))
                        );
                        break;

                    case 25: // user left broadcast
                        setMembers(data.payload.members);
                        setReadyMembers(data.payload.ready_members);
                        setMembers(prevMembers =>
                            prevMembers.map(m => ({
                                ...m,
                                ready: data.payload.ready_members.some(r => r.email === m.email) // if emails match, mark ready
                            }))
                        );
                        break;

                    case 27: // user ready from server when someone makes it ready
                        setReadyMembers(data.payload.ready_members);
                        setMembers(prevMembers =>
                            prevMembers.map(m => ({
                                ...m,
                                ready: data.payload.ready_members.some(r => r.email === m.email) // if emails match, mark ready
                            }))
                        );
                        break;

                    case 28: // user plays
                        if (readyMembers.length === members.length) {
                            setPlayRequested(true);
                        }
                        break;

                    case 29: // user pause
                        if (readyMembers.length === members.length) {
                            setPlayRequested(false);
                        }
                        break;

                    case 30: // user seeking from server side braodcast
                        setSyncing(true);
                        setCurrentTime(data.payload.current_time);
                        setAskPermission(`${data.user.name} want to seek video to: ${formatTime(data.payload.current_time)}`)
                        break;

                    case 31: // user seeking end from server side braodcast
                        setSyncing(false);
                        break;

                    case 32: //set request current time flag high
                        setRequestCurrentTime(data.user.email);
                        break;

                    case 33: //get current time from already joined members         
                        setRequestCurrentTime(data.payload.current_time);
                        break;

                    case 34: //receive message from users        
                        setMessage({ name: data.user.name, email: data.user.email, message: data.payload.message });
                        break;

                    default:
                        console.log("default", data);
                        break;
                }
            })

            socketRef.current.addEventListener("close", () => console.log("Disconnected from server data"));
            socketRef.current.addEventListener("error", (err) => console.error("WebSocket error:", err));


            // return () => {
            //     // Cleanup listeners
            //     // socketRef.cuurent.removeEventListener("open", handleOpen);
            //     // socket.removeEventListener("message", handleMessage);
            //     // socket.removeEventListener("close", handleClose);
            //     // socket.removeEventListener("error", handleError);

            //     // Close the socket
            //     if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
            //         socketRef.current.close();
            //     }
            // };
        }
    }, [])

    // helper to send messages
    const sendMsg = (msg) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(msg));
        } else {
            console.error("not connected to server");
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