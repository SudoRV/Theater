import React, { useEffect, useState, useRef } from "react";
import { Check, X, Send, Mic, MicOff, Volume2, VolumeX, CheckCircle, XCircle, ArrowBigDown } from "lucide-react";

import VoiceChat from "../services/voiceChat";

import Members from "../components/Members";
import Video from "../components/Video";
import { useStates } from "../services/states";

export default function Theater() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [triggerArrow, setTriggerArrow] = useState(null);
  const permissionRef = useRef(null);

  const { my_details, members, send, askPermission, setAskPermission, setPermissionGranted, message } = useStates();

  const searchParams = new URLSearchParams(window.location.search);
  const uploadType = searchParams.get("type");
  const theaterName = searchParams.get("name");
  const theater_id = searchParams.get("id");

  function saveMessages() {
    if (messages.length <= 0) return;

    window.localStorage.setItem("messages", JSON.stringify({ theater_id: theater_id, messages: messages }));
  }

  // load messages
  useEffect(() => {
    const msgData = window.localStorage.getItem("messages");
    const loaded_messages = msgData ? JSON.parse(msgData) : {};

    if (loaded_messages.theater_id === null) return;

    if (loaded_messages.theater_id !== theater_id) {
      window.localStorage.removeItem("messages");
    } else {
      setMessages(loaded_messages.messages)
    }
  }, [])


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

  return (
    <div className="h-full grid grid-cols-4 grid-rows-[1fr_auto_auto] gap-2 p-2 text-white overflow-hidden     bg-gradient-to-b from-gray-900 via-zinc-900 to-black">

      {/* Chat Section */}
      <div className={`${chatOpen ? "block col-span-4" : "hidden"} md:col-span-1 md:block row-span-1 flex flex-col bg-gray-900/60 rounded-xl h-full overflow-hidden`}>
        <div className="flex flex-col flex-1 p-2 h-full overflow-hidden">
          {/* Messages */}
          <div id="audio-temp" className="flex-1 overflow-y-auto mb-2 space-y-2 flex-grow">

          <VoiceChat micOn={micOn} speakerOn={speakerOn} />
            
            {messages.map((msg, i) => (
              <div key={i} className={
                `p-2 px-3 pt-1 rounded-lg bg-gray-700 w-fit max-w-[80%] break-words ${msg.email === my_details.email ? "ml-auto" : ""}`
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
          <div className="w-full flex gap-2">
            <input
              type="text"
              className="w-[65%] p-2 rounded bg-gray-700 text-white focus:outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={handleSend} className="flex-grow flex items-center gap-1 px-3 py-2 bg-blue-600 rounded hover:bg-blue-500">
              <Send size={16} /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Permission display */}
      <div ref={permissionRef} className="row-start-2 col-span-1 flex items-center justify-between bg-gray-900/60 text-white p-2 rounded-xl gap-2 max-h-20 relative">

        {/* Arrow above container */}
        {triggerArrow && (
          <ArrowBigDown
            className="absolute -top-8 w-12 h-12 text-yellow-300 animate-bounce"
          />
        )}

        {/* Message */}
        <span className="text-[12px] rounded-lg bg-gray-900/60 p-2 flex-grow overflow-y-auto max-h-14 border border-gray-700 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
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
      <div className="row-start-3 col-span-1 p-4 rounded-xl bg-gray-900/60 flex h-full">
        <div className="w-full flex gap-4 h-full justify-evenly">
          <button
            onClick={makeMeReady}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${ready ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
          >
            {ready ? <CheckCircle size={24} /> : <XCircle size={24} />}
          </button>

          <button
            onClick={() => setMicOn(!micOn)}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-600 flex items-center gap-2"
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button
            onClick={() => setSpeakerOn(!speakerOn)}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-600 flex items-center gap-2"
          >
            {speakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

        </div>
      </div>

      {/* Video Section */}
      <div className="col-span-4 md:col-span-3 row-span-1 flex flex-col items-center justify-center bg-gray-900/60 rounded-xl relative p-2 overflow-hidden">
        <Video />
      </div>

      {/* Joined Clients */}
      <div className="col-span-4 md:col-span-3 row-span-2 bg-gray-900/60 p-2 rounded-xl">
        <Members />
      </div>

    </div>
  );
}
