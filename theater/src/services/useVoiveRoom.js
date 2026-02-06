// $env:HTTPS="true"
// $env:SSL_KEY_FILE="ssl/key.pem"
// $env:SSL_CRT_FILE="ssl/cert.pem"
// npm start

import { useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { Device } from "mediasoup-client";
import { useStates } from "./states";
import { v4 as uuidv4 } from "uuid";

export function useVoiceRoom() {
    const socketRef = useRef(null);

    const {
        setRemoteStream,
        addRemoteUser,
        removeRemoteUser,
        localAudioRef,
        userType, host
    } = useStates();

    const deviceRef = useRef(null);
    const sendTransportRef = useRef(null);
    const recvTransportRef = useRef(null);

    const producersRef = useRef({});
    const consumersRef = useRef({});
    const user_id = uuidv4();

    const userRef = useRef({
        userId: null,
        name: null,
        email: null,
        roomId: null,
    });

    /* ===============================
       SOCKET INIT
    ================================ */
    function initSocket() {
        if (socketRef.current) return socketRef.current;

        socketRef.current = io(`http://${host}:8001`, {
            path: "/voice_room",
            transports: ["websocket"],
            autoConnect: false,
            secure: true,
        });

        return socketRef.current;
    }

    /* ===============================
       CONNECT + JOIN
    ================================ */
    function connectSocket({ name, email, roomId, micEnabled, speakerEnabled, onRemoteUser }) {
        const socket = initSocket();

        userRef.current = {
            ...userRef.current,
            name,
            email,
            userId: email,
            roomId,
        };
        socket.connect();
        socket.on("connect", () => {
            // console.log("[1] Voice Socket connected");

            socket.emit("joinRoom", {
                roomId,
                userId: userRef.current.userId,
                name,
                email,
            });

            // console.log("[2] Joined room");
        });

        // consume existing producers
        socket.on("existingProducers", async (list) => {
            // console.log("[X] Existing producers received:", list.length);

            for (const { producerId, userId, name } of list) {
                // add user to global state
                addRemoteUser({ userId, name });
                // consume their audio
                await consumeProducer(producerId, userId);
            }
        });


        /* ===============================
           ROUTER RTP CAPS
        ================================ */
        socket.on("routerRtpCapabilities", async (rtpCapabilities) => {
            // console.log("[3] Router RTP capabilities received");

            deviceRef.current = new Device();
            await deviceRef.current.load({
                routerRtpCapabilities: rtpCapabilities,
            });

            await createSendTransport();
            startMic(micEnabled);
            await createRecvTransport();
        });

        /* ===============================
           NEW PRODUCER
        ================================ */
        socket.on("newProducer", async ({ producerId, userId, name }) => {
            onRemoteUser?.({ userId, name });
            addRemoteUser({ userId, name });
            await consumeProducer(producerId, userId);
        });
    }

    /* ===============================
       SEND TRANSPORT
    ================================ */
    async function createSendTransport() {
        // console.log("[5] Send transport requested");

        socketRef.current.emit("createTransport", {
            roomId: userRef.current.roomId,
            userId: userRef.current.userId,
            direction: "send",
        });

        socketRef.current.once("transportCreated", async ({ direction, transportOptions }) => {
            if (direction !== "send") return;

            // console.log("[6] Send transport created");

            sendTransportRef.current =
                await deviceRef.current.createSendTransport(transportOptions);

            sendTransportRef.current.on("connect", ({ dtlsParameters }, cb) => {
                // console.log("[7] Send transport connected");

                socketRef.current.emit("connectTransport", {
                    transportId: sendTransportRef.current.id,
                    dtlsParameters,
                });
                cb();
            });

            sendTransportRef.current.on("produce", ({ kind, rtpParameters }, cb) => {
                socketRef.current.emit(
                    "produce",
                    {
                        userId: userRef.current?.userId,
                        transportId: sendTransportRef.current.id,
                        kind,
                        rtpParameters,
                    },
                    ({ producerId }) => {
                        cb({ id: producerId })
                    }
                );
            });
        });
    }

    /* ===============================
       MIC
    ================================ */
    async function startMic(micEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];

        const producer = await sendTransportRef.current.produce({ track });
        micEnabled ? producer.resume() : producer.pause();
        producersRef.current.audio = producer;

        if (localAudioRef?.current) {
            localAudioRef.current.srcObject = stream;
        }
    }

    /* ===============================
       CONSUME
    ================================ */
    async function consumeProducer(producerId, producerUserId) {
        const recvTransport = recvTransportRef.current;
        socketRef.current.emit(
            "consume",
            {
                roomId: userRef.current.roomId,
                userId: userRef.current.userId,
                producerUserId,
                producerId,
                transportId: recvTransport?.id,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
            },
            async (consumerData) => {
                await createConsumer(consumerData);
            }
        );
    }


    async function createRecvTransport() {
        if (!recvTransportRef.current) {
            socketRef.current.emit("createTransport", {
                roomId: userRef.current.roomId,
                userId: userRef.current.userId,
                direction: "recv",
            });

            socketRef.current.on("transportCreated", async ({ direction, transportOptions }) => {
                if (direction !== "recv") return;

                recvTransportRef.current =
                    await deviceRef.current.createRecvTransport(transportOptions);

                // console.log("[11] Recv transport created");

                socketRef.current.emit("device-loaded", {
                    userId: userRef.current.userId,
                    roomId: userRef.current.roomId
                })

                recvTransportRef.current.on("connect", ({ dtlsParameters }, cb) => {
                    socketRef.current.emit("connectTransport", {
                        transportId: recvTransportRef.current.id,
                        dtlsParameters,
                    });
                    cb();
                });
            });
        }
    }

    async function createConsumer({
        id,
        producerId,
        userId,
        kind,
        rtpParameters,
    }) {
        if (!id) {
            console.error("❌ Consumer id missing", {
                id,
                producerId,
                kind,
            });
            return;
        }

        const consumer = await recvTransportRef.current.consume({
            id,
            producerId,
            kind,
            rtpParameters,
        });

        consumersRef.current[consumer.id] = consumer;

        const { track } = consumer;
        const stream = new MediaStream();
        stream.addTrack(track);

        setRemoteStream(userId ?? producerId, stream);
        // startConsumerDebug(consumer, recvTransportRef.current);

        socketRef.current.emit("resumeConsumer", {
            roomId: userRef.current?.roomId,
            consumerId: consumer.id,
        });

        // console.log("[12] Consumer created:", consumer.id);
    }

    async function unlockAudio() {
        try {
            const ctx = new AudioContext();

            // Create silent buffer
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);

            await ctx.resume();
            // console.log("🔓 Audio unlocked");
            return true;
        } catch (error) {
            // console.log("🔓 Audio unlocked Fialed");
            return false;
        }
    }


    /* ===============================
       CONTROLS
    ================================ */
    function toggleMic(enabled) {
        const producer = producersRef.current.audio;
        if (!producer) return;

        enabled ? producer.resume() : producer.pause();
    }

    function disconnect() {
        socketRef.current?.disconnect();
        socketRef.current = null;
    }

    useEffect(() => {
        window.localStorage.setItem('debug', 'mediasoup-client:Consumer');
        return () => {
            socketRef.current?.off();
            disconnect();
        };
    }, []);

    return {
        connectSocket,
        toggleMic,
        unlockAudio,
        disconnect,
    };


    function startProducerDebug(producer) {
        if (!producer) return;

        let lastBytes = 0;

        const intervalId = setInterval(async () => {
            try {
                const stats = await producer.getStats();

                stats.forEach((report) => {
                    if (report.type === "outbound-rtp" && report.kind === "audio") {
                        const bytes = report.bytesSent || 0;
                        const packets = report.packetsSent || 0;
                        const bitrate =
                            lastBytes > 0 ? ((bytes - lastBytes) * 8) / 1000 : 0;

                        // console.log(
                        //     `🎙️ AUDIO IN | bytes=${bytes} | packets=${packets} | bitrate=${bitrate.toFixed(
                        //         1
                        //     )} kbps`
                        // );

                        lastBytes = bytes;
                    }
                });
            } catch (err) {
                console.warn("Producer stats error:", err);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }

    function startConsumerDebug(consumer, recvTransport) {
        if (!consumer || !recvTransport) return;

        // mediasoup-client internal PC (recv side)
        const pc = recvTransport._handler?._pc;
        if (!pc) {
            // Optionally, show error in UI
            const logDiv = document.getElementById('cons-logs');
            if (logDiv) logDiv.innerText = '❌ recv PeerConnection not ready';
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const stats = await pc.getStats();
                let logMsg = '';
                for (const report of stats.values()) {
                    if (report.type === "media-playout" && report.kind === "audio") {
                        logMsg += `AUDIO PLAYOUT: jitterBufferDelay=${report.jitterBufferDelay}, playoutDelay=${report.totalPlayoutDelay}, concealedSamples=${report.concealedSamples}\n`;
                    }
                }
                if (logMsg) {
                    const logDiv = document.getElementById('cons-logs');
                    if (logDiv) {
                        logDiv.innerText = logMsg;
                    }
                }
            } catch (err) {
                const logDiv = document.getElementById('cons-logs');
                if (logDiv) logDiv.innerText = 'Consumer stats error: ' + err;
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }
}
