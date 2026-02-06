import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStates } from "../services/states";
import VideoPreview from "../components/VideoPreview";

import {
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react";


export default function JoinTheater() {
  const navigate = useNavigate();

  // ✅ SINGLE SOURCE OF TRUTH
  const { theaterData } = useStates();

  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  /* ------------------ MIC PREVIEW ------------------ */
  useEffect(() => {
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg);
          animationRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (err) {
        console.error("Mic permission denied", err);
      }
    }

    initMic();

    return () => {
      cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  /* ------------------ CONTROLS ------------------ */
  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current
      .getAudioTracks()
      .forEach(track => (track.enabled = !micEnabled));
    setMicEnabled(!micEnabled);
  };

  const toggleSpeaker = () => {
    setSpeakerEnabled(!speakerEnabled);
  };

  /* ------------------ JOIN ------------------ */
  const joinTheater = () => {
    navigate(`/theater?name=${theaterData.theater_name}&id=${theaterData.theater_id}&?type=${theaterData.source_type}`, {
      state: {
        micEnabled,
        speakerEnabled,
      },
    });
  };

  /* ------------------ GUARD ------------------ */
  if (!theaterData) {
    return (
      <div className="p-6 bg-gray-950 text-white">
        Theater not initialized
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-[600px] space-y-8">

        {/* -------- THEATER INFO (NO BOX) -------- */}
        <div className="text-center border border-gray-800 rounded-xl p-2 py-4">
          <h1 className="text-2xl font-semibold">
            {theaterData?.theater_name}
          </h1>

          <p className="text-sm text-gray-400 mt-1">
            Theater ID: {theaterData?.theater_id}
          </p>

          <p className="text-sm mt-2">
            <span className="text-gray-400">Source Type:</span>{" "}
            <span className="capitalize">
              {theaterData?.source_type}
            </span>
          </p>
        </div>

        {/* -------- AUDIO PREVIEW (BOX) -------- */}
        <div className="border border-gray-800 rounded-2xl p-4 shadow-lg m-auto flex flex-col items-center justify-center gap-3 relative">

          {/* MIC LEVEL */}
          <div className="w-2 h-full bg-gray-700 rounded absolute -left-6 bottom-0 rotate-180">
            <div
              className="h-2 bg-green-500 rounded transition-all"
              style={{ height: `${Math.min(audioLevel, 100)}%` }}
            />
          </div>

          <VideoPreview theaterData={theaterData} />

          {/* CONTROLS */}
          <div className="w-full flex justify-center gap-4">

            {/* MIC TOGGLE */}
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition
      ${micEnabled
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-red-600 hover:bg-red-500"
                }`}
              aria-label="Toggle microphone"
            >
              {micEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            {/* SPEAKER TOGGLE */}
            <button
              onClick={toggleSpeaker}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition
      ${speakerEnabled
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-red-600 hover:bg-red-500"
                }`}
              aria-label="Toggle speaker"
            >
              {speakerEnabled ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </button>

            {/* -------- JOIN BUTTON -------- */}
            <button
              onClick={joinTheater}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 transition rounded-xl text-lg font-medium"
            >
              Join Theater
            </button>

          </div>

        </div>

        {/* -------- METADATA (NO BOX) -------- */}
        <div className="text-center text-sm text-gray-300 space-y-1 flex gap-x-4 flex-wrap">
          <p>
            <span className="text-gray-400">Created by:</span>{" "}
            {theaterData?.creator_name}
          </p>

          <p className="text-gray-400">
            @{theaterData?.creator_username}
          </p>

          <p className="text-gray-400">
            {theaterData?.creator_email}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Created at:{" "}
            {new Date(Number(theaterData?.created_at)).toLocaleString()}
          </p>
        </div>

        {/* -------- DISCLAIMER -------- */}
        <div className="text-xs text-gray-500 leading-relaxed space-y-2">
          <p>
            By joining this theater, you agree to participate respectfully and
            follow community guidelines.
          </p>

          <p>
            Your microphone may be used for real-time voice communication.
            No audio is recorded or stored without consent.
          </p>

          <p>
            Ensure you have permission to view or share streamed content.
          </p>

          <p className="underline underline-offset-2 cursor-pointer hover:text-gray-400">
            Privacy Policy • Terms of Use
          </p>
        </div>

      </div>
    </div>
  );
}
