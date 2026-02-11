import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Check, X, Send, Mic, MicOff, Volume2, VolumeX, CheckCircle, XCircle, ArrowBigDown, MessageSquare, Info } from "lucide-react";

import Members from "../components/Members";
import Video from "../components/Video";
import { useStates } from "../services/states";
import { useVoiceRoom } from "../services/useVoiveRoom";


export default function Theater() {
  const location = useLocation();
  const { micEnabled, speakerEnabled } = location.state || {};

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [ready, setReady] = useState(false);
  const [micOn, setMicOn] = useState(micEnabled || false);
  const [speakerOn, setSpeakerOn] = useState(speakerEnabled || false);
  const [triggerArrow, setTriggerArrow] = useState(null);
  const permissionRef = useRef(null);

  const { my_details, members, send, askPermission, setAskPermission, setPermissionGranted, message, theaterData } = useStates();

  const { connectSocket, toggleMic } = useVoiceRoom();
  const socketConnectedRef = useRef(false);

  const [audioGesture, setAudioGesture] = useState(null)

  const searchParams = new URLSearchParams(window.location.search);
  const theater_id = searchParams.get("id");

  function saveMessages() {
    if (messages.length <= 0) return;

    window.localStorage.setItem("messages", JSON.stringify({ theater_id: theater_id, messages: messages }));
  }

  // load messages
  useEffect(() => {
    if (!theaterData?.theater_id || !my_details.email) return;

    const msgData = window.localStorage.getItem("messages");
    const loaded_messages = msgData ? JSON.parse(msgData) : {};

    if (loaded_messages.theater_id === null) return;

    if (loaded_messages.theater_id !== theater_id) {
      window.localStorage.removeItem("messages");
    } else {
      setMessages(loaded_messages.messages)
    }

    if (socketConnectedRef.current === false) {
      console.log('connecting to voice room socket')
      connectSocket({ name: my_details.name, email: my_details.email, roomId: theaterData.theater_id, micEnabled, speakerEnabled })
      socketConnectedRef.current = true;
    }
  }, [my_details?.email, theaterData?.theater_id])

  useEffect(() => {
    saveMessages();
  }, [messages])


  useEffect(() => {
    if (message === "") return;
    setMessages([...messages, message])
  }, [message])

  const handleSend = () => {
    if (input.trim() === "") return;

    // broadcast
    const command = {
      command: "message",
      code: 34,
      user: my_details,
      send_type: "all-except-me",
      payload: {
        message: input
      }
    };
    send(command);

    const chat = {
      name: my_details.name,
      email: my_details.email,
      message: input,
      time: new Date()
    }
    setMessages([...messages, chat]);
    setInput("");
  };

  const makeMeReady = () => {
    const me = Array.from(members).find(m => m.email === my_details.email);
    // broadcast your ready status
    const command = {
      command: ready ? "im not ready" : "im ready",
      code: 26,
      user: me,
    };
    send(command);
    setReady(!ready);
  };

  // Trigger arrow whenever askPermission changes
  useEffect(() => {
    if (askPermission) {
      if (askPermission !== null && askPermission !== "Command") {
        setTriggerArrow(true);
      };
    }
  }, [askPermission]);

  // Sync askPermission state (if needed)
  useEffect(() => {
    setAskPermission(askPermission);
  }, [askPermission, setAskPermission]);


  // voice room logic

  return (
    <div className="h-full w-fit grid grid-cols-[320px_1fr] grid-rows-[1fr_auto_auto] gap-2 p-2 text-white bg-neutral-950">

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="
          absolute top-3 left-3 z-10
          p-2 rounded-lg
          bg-neutral-900/80 backdrop-blur
          hover:bg-neutral-800
          active:scale-95
          transition-all
          border border-neutral-700
        "
      >
        {chatOpen ? (
          <X size={20} className="text-red-400" />
        ) : (
          <MessageSquare size={20} className="text-blue-400" />
        )}
      </button>

      {/* Chat Section */}
      <div className={`${chatOpen ? "block" : "hidden"} row-span-1 flex flex-col bg-neutral-900/60 rounded-xl h-full overflow-hidden pt-10`}>

        <div className="flex flex-col flex-1 p-2 h-full overflow-hidden">
          {/* Messages */}
          <div id="audio-temp" className="flex-1 overflow-y-auto mb-2 space-y-2 flex-grow">

            {/* <VoiceChat micOn={micOn} speakerOn={speakerOn} /> */}

            {messages.map((msg, i) => (
              <div key={i} className={
                `p-2 px-3 pt-1 rounded-lg bg-neutral-800 w-fit max-w-[80%] break-words ${msg.email === my_details.email ? "ml-auto" : ""}`
              }>
                {
                  messages[i - 1]?.email === msg.email ? (
                    ""
                  ) : (
                    <>
                      <p>{msg.email === my_details.email ? "You" : msg.name}</p>
                      <hr></hr>
                    </>
                  )
                }
                <p className="mt-1">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="w-full flex gap-4">
            <textarea
              rows={1}
              value={input}
              placeholder="Type a message..."
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="
                flex-1 p-2 px-3 text-sm
                rounded-lg bg-neutral-950
                border border-neutral-800
                text-white focus:outline-none
                resize-none
                h-10
                max-h-32
                overflow-y-auto
              "
            />
            
            <button onClick={handleSend} className="flex-grow flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 transition-background duration-300 rounded hover:bg-blue-500 max-w-[80px] h-10 text-sm">
              <Send size={16} /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Permission display */}
      <div ref={permissionRef} className="row-start-2 col-span-1 flex items-center justify-between bg-neutral-900/60 text-white p-2 rounded-xl gap-2 max-h-20 relative">

        {/* Arrow above container */}
        {triggerArrow && (
          <ArrowBigDown
            className="absolute -top-8 w-12 h-12 text-yellow-300 animate-bounce"
          />
        )}

        {/* Message */}
        <span className="text-[12px] rounded-lg bg-neutral-900/60 p-2 flex-grow overflow-y-auto max-h-14 border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {askPermission || "Command"}
        </span>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            className="p-2 rounded bg-green-600 hover:bg-green-500"
            onClick={() => { setPermissionGranted(true); setTriggerArrow(false) }}
          >
            <Check size={18} />
          </button>
          <button
            className="p-2 rounded bg-red-600 hover:bg-red-500"
            onClick={() => { setPermissionGranted(false); setTriggerArrow(false) }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Controls Section */}
      <div className="row-start-3 col-span-1 p-2.5 py-4 rounded-xl bg-neutral-900/60 flex h-full">
        <div className="w-full flex gap-4 h-full justify-between">
          <button
            onClick={makeMeReady}
            className={`w-full flex justify-center items-center px-4 py-2 rounded-lg flex items-center gap-2 ${ready ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
          >
            {ready ? <CheckCircle size={24} /> : <XCircle size={24} />}
          </button>

          <button
            onClick={() => {
              setMicOn(!micOn);
              toggleMic(!micOn);
            }}
            className="w-full flex justify-center items-center px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center gap-2"
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button
            onClick={() => {
              setSpeakerOn(!speakerOn);
              const remoteAudios = document.querySelectorAll("audio[type='remote']");
              remoteAudios.forEach((audio) => {
                !speakerOn ? audio.play() : audio.pause();
              })
            }}
            className="w-full flex justify-center items-center px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center gap-2"
          >
            {speakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

        </div>
      </div>

      {/* Video Section */}
      <div className={`${chatOpen ? "col-span-1" : "col-span-2 px-12"} row-span-1 flex flex-col items-center justify-center bg-neutral-900/60 rounded-xl relative p-2 2xl:py-6 overflow-hidden`}>

        <div className="w-full pb-2 px-2 flex justify-end items-center gap-3">
          <p className="text-lg font-semibold">
            {theaterData?.theater_name}
          </p>

          <button
            onClick={() => setShowInfo(true)}
            className="
              p-1 rounded-full
              bg-neutral-800 hover:bg-neutral-700
              transition
            "
            title="Theater details"
          >
            <Info size={16} />
          </button>
        </div>

        <Video />
      </div>

      {/* Joined Clients */}
      <div className="relative row-span-2 bg-neutral-900/60 p-2 rounded-xl">
        <Members />
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl p-6 relative">

            {/* Close */}
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-neutral-800"
            >
              <X size={18} />
            </button>

            {/* Title */}
            <h2 className="text-xl font-semibold mb-4">
              Theater Details
            </h2>

            {/* Details */}
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <span className="text-slate-400">Name</span>
                <p className="text-white">{theaterData?.theater_name}</p>
              </div>

              <div>
                <span className="text-slate-400">Theater ID</span>
                <p className="font-mono text-xs">{theaterData?.theater_id}</p>
              </div>

              <div>
                <span className="text-slate-400">Creator</span>
                <p>{theaterData?.creator_name}</p>
              </div>

              <div>
                <span className="text-slate-400">Created At</span>
                <p>
                  {new Date(
                    Number(theaterData?.created_at)
                  ).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  const link = window.location.href;

                  if (navigator.share) {
                    navigator.share({
                      title: "Join my Theater",
                      text: `Join "${theaterData?.theater_name}"`,
                      url: link,
                    });
                  } else {
                    window.open(
                      `mailto:?subject=Join my Theater&body=Join using this link: ${link}`,
                      "_blank"
                    );
                  }
                }}
                className="
            flex-1 py-2 rounded-lg
            bg-indigo-600 hover:bg-blue-500
            transition
          "
              >
                Invite / Send Link
              </button>

              <button
                onClick={() => setShowInfo(false)}
                className="
            px-4 py-2 rounded-lg
            bg-neutral-800 hover:bg-neutral-700
            transition
          "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
