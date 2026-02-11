import { useEffect, useRef } from "react";

export default function VideoPreview({ theaterData }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const currentTime = video.currentTime;
      // console.log("Current time:", currentTime);
      // you can store it in state if needed
      if(currentTime > 10) {
        video.pause();
        video.currentTime = 10;
      };
    };

    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);


  return (
    <video
      ref={videoRef}
      className="w-full rounded-xl"
      src={`/theater/video?file=${theaterData.file}`}
      controls
      playsInline
    />
  );
}
