import React, { useState, useRef, useEffect } from "react";
import { useStates } from "../services/states";

export default function Video() {

  const { send, my_details, members, readyMembers, playRequested, setVideo, currentTime, setCurrentTime, syncing, setSyncing, askPermission, setAskPermission, permissionGranted, setPermissionGranted, requestCurrentTime, setRequestCurrentTime, formatTime } = useStates();
  const videoRef = useRef(null);
  const [dragSeeking, setDragSeeking] = useState(false);
  const [fetchingTime, setFetchingTime] = useState(null);

  const host = window.location.hostname;


  async function setVideoFile() {
    const searchParams = new URLSearchParams(window.location.search);
    const uploadType = searchParams.get("type");
    const theaterName = searchParams.get("name");
    const theater_id = searchParams.get("id");

    const response = await fetch(`https://${host}:8000/get-theater-data`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({theater_id: theater_id})
    })

    const data = await response.json();
    const filename = data.filename;


    if (uploadType === "upload") {
      videoRef.current.src = `https://${host}:8000/theater/video?file=${filename}`;
    }
    videoRef.current.load();
  }

  useEffect(() => {
    setVideoFile();
  }, [])

  const fetchingTimeout = setTimeout(() => {
    setFetchingTime(false);
    clearTimeout(fetchingTimeout);
  }, 500)

  useEffect(() => {
    const video = videoRef.current;
    setVideo(videoRef);

    const handleVideo = () => {
      if (syncing && dragSeeking) return;
      if (readyMembers.length !== members.length) {
        video.pause();
      }

      const command = {
        command: video.paused ? "user paused" : "user playing",
        code: video.paused ? 29 : 28,
        user: my_details,
        send_type: "all-except-me"
      }
      const im_ready = readyMembers?.length ? readyMembers.filter(m => m?.email === my_details?.email)[0]?.email === my_details?.email : false;

      if (im_ready) {
        send(command);
      }
    }

    const handleSeeking = () => {
      if (syncing && !dragSeeking) return;
      if (!video.paused) video.pause();

      if (fetchingTime === false) {
        setSyncing(true);
        setDragSeeking(true);

        // ask for the updateif
        setAskPermission(`You want to seek video to: ${formatTime(video.currentTime)} sec`);
        setPermissionGranted(null);
      }
    }

    const handleSeeked = () => {
      video.pause();
      setTimeout(() => {
        setSyncing(false);
        setDragSeeking(false);
        setFetchingTime(false);
      }, 400)
    }

    video.addEventListener("play", handleVideo);
    video.addEventListener("pause", handleVideo);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("play", handleVideo);
      video.removeEventListener("pause", handleVideo);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
    };

  }, [videoRef, members, readyMembers, syncing, my_details, dragSeeking, fetchingTime])

  // send current time for syncing for new users
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !requestCurrentTime) return;

    if (requestCurrentTime?.toString()?.includes(".com")) {
      send({
        command: "sending current time",
        code: 33,
        user: { email: requestCurrentTime },
        payload: { current_time: video.currentTime },
        send_type: "one"
      })
    } else {
      setFetchingTime(true);
      video.currentTime = requestCurrentTime;
    }

    setRequestCurrentTime(null);
  }, [requestCurrentTime])

  // play pause from other users
  useEffect(() => {
    const video = videoRef.current;
    if (!video || syncing) return;

    if (playRequested) video.play();
    else video.pause();
  }, [playRequested, syncing])

  // send the update command //permison
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (readyMembers.length !== members.length) video.pause();

    // broadcast syncing true
    if (!permissionGranted) {
      if (permissionGranted === false) {
        setAskPermission("Command");
        setPermissionGranted(null);
      }
      return;
    }
    else if (askPermission?.includes("You")) {
      send({
        command: "seeking-start",
        code: 30,
        user: my_details,
        payload: { current_time: video.currentTime },
        send_type: "all-except-me",
      });

      setAskPermission("Command");
      setPermissionGranted(null);
    } else if (currentTime) {
      video.currentTime = currentTime;
      if (readyMembers.length === members.length) {
        setTimeout(() => {
          video.play();
        }, 300);
      }

      setAskPermission("Command");
      setPermissionGranted(null);
      setCurrentTime(null);
    }
  }, [permissionGranted, my_details, readyMembers, members])

  return (
    <video ref={videoRef} style={{ height: "100%" }} className="flex-grow rounded-lg" controls>
      <source src={`https://${host}:8000/theater/video`} type="video/mp4" />
    </video>
  )
}