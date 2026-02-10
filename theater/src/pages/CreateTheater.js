import React, { useEffect, useRef, useState } from "react";
// import { motion } from "framer-motion";
import { useStates } from "../services/states";

export default function UploaderPage() {
  const [file, setFile] = useState(null);
  const [theatreId, setTheatreId] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);
  const [source, setSource] = useState("upload");
  const [theatreName, setTheatreName] = useState("");
  const videoFileRef = useRef(null);

  const { my_details, host } = useStates();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Generate random 12-char ID
  const generateTheatreId = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const handleUpload = async () => {
    if (source === "upload" && !file) return;

    const old_theater_id = localStorage.getItem("theater_id");
    
    let id = generateTheatreId();
    localStorage.setItem("theater_id", id);
    setTheatreId(id);

    setJoinUrl(`${window.location.origin}/join/theater?name=${theatreName}&id=${id}&type=${source}&createdat=${Date.now()}`);

    if (source === "upload") {
      if (!file) return alert("Please select a file");

      const formData = new FormData();
      formData.append("file", file); // must match multer field
      formData.append("theater_name", theatreName);
      formData.append("source", source);
      formData.append("old_theater_id", old_theater_id);
      formData.append("theater_id", id);
      formData.append("creator_name", my_details.name)
      formData.append("creator_username", my_details.username)
      formData.append("creator_email", my_details.email)

      try {
        const response = await fetch(`http://${host}:8000/theater/upload`, {
          method: "POST",
          body: formData
        });
        const result = await response.json();

        alert(result.message);
      } catch (err) {
        console.error(err);
        alert("Upload failed");
      }

    } else if (source === "screenshare") {
      console.log("Screenshare option selected");
    }
  };
  // bg-gradient-to-b from-gray-900 via-zinc-900 to-black
  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Theatre</h1>
        <span className="text-sm text-gray-400">Create and Share Theatres</span>
      </nav>

      <div
        // initial={{ opacity: 0, y: 30 }}
        // animate={{ opacity: 1, y: 0 }}
        // transition={{ duration: 0.5 }}
        className="flex flex-1 p-6 gap-6 justify-center items-center"
      >
        <div className="bg-neutral-800/40 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4 max-w-lg border border-zinc-700">
          <h2 className="text-2xl font-bold text-center text-gray-100">
            Create Your Theatre
          </h2>

          {/* Theatre Name */}
          <input
            type="text"
            placeholder="Enter Theatre Name"
            value={theatreName}
            onChange={(e) => { setTheatreName(e.target.value) }}
            className="w-full border border-zinc-600 bg-zinc-900 text-gray-100 placeholder-gray-500 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          {/* Upload Type Selection */}
          <div className="flex justify-start mt-4 gap-2">
            {["upload", "host", "screenshare"].map((type) => (
              <button
                key={type}
                onClick={() => setSource(type)}
                className={`px-4 py-2 rounded-lg border transition ${source === type
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  : "bg-zinc-700 text-gray-300 border-zinc-600 hover:bg-zinc-600"
                  } 
                  ${(type === "host" || type === "screenshare") ? "opacity-30" : "opacity-100"
                  }
                  `}

                disabled={(type === "host" || type === "screenshare") ? true : false}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {(source === "upload" || source === "host") && (
            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="cursor-pointer w-full border border-zinc-600 bg-zinc-900 text-gray-300 p-2 rounded-lg mt-2 file:mr-4 file:py-2 file:px-4
    file:rounded-md file:border-0
    file:text-sm file:font-semibold
    file:bg-violet-50 file:text-violet-700
    hover:file:bg-violet-100"
            />
          )}

          <button
            className="w-full text-white py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition"
            onClick={handleUpload}
          >
            {source === "upload"
              ? "Upload & Create Theatre"
              : "Start Theatre"}
          </button>

          {theatreId && (
            <div className="mt-6 space-y-3">
              <p className="text-lg text-green-400">Theatre Created!</p>
              <p className="font-semibold text-gray-100 text-lg">
                Theater: {theatreName || "Untitled Theatre"}
              </p>
              <p className="font-mono text-md text-gray-400">ID: {theatreId}</p>
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-400 underline break-all"
              >
                {joinUrl}
              </a>
              <div className="flex justify-start gap-4 mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(joinUrl)}
                  className="text-gray-200 py-2 px-4 rounded-lg border border-neutral-700 hover:bg-neutral-800"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => window.open(joinUrl)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Open Theatre
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          {(source === "upload" || source === "host") && file && (
            <video
              controls
              className="max-w-[590px] rounded-lg border border-zinc-700"
              src={URL.createObjectURL(file)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
