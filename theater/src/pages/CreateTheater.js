import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { metadata } from "framer-motion/client";

export default function UploaderPage() {
  const [file, setFile] = useState(null);
  const [theatreId, setTheatreId] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);
  const [uploadType, setUploadType] = useState("upload");
  const [theatreName, setTheatreName] = useState("");
  const videoFileRef = useRef(HTMLInputElement);

  const host = window.location.hostname;

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
    if (uploadType === "upload" && !file) return;

    const id = generateTheatreId();
    setTheatreId(id);
    setJoinUrl(`${window.location.origin}/theater?type=${uploadType}&name=${theatreName}&id=${id}`);

    if (uploadType === "upload") {
      console.log("Uploading file:", file);
      if (!file) return alert("Please select a file");

      const formData = new FormData();
      formData.append("file", file); // must match multer field
      formData.append("theater_id", id);

      try {
        const response = await fetch(`https://${host}:8000/theater/upload`, {
          method: "POST",
          body: formData
        });
        const result = await response.json();
        localStorage.setItem("theater_data", JSON.stringify({upload_type: uploadType, video_file: result.file}));
        alert(result.message);
      } catch (err) {
        console.error(err);
        alert("Upload failed");
      }

    } else if (uploadType === "screenshare") {
      console.log("Screenshare option selected");
      localStorage.setItem("theater_data", JSON.stringify({upload_type: uploadType}));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-zinc-900 to-black text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">🎭 My Theatre</h1>
        <span className="text-sm text-gray-400">Create and Share Theatres</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 p-6 gap-6 justify-center items-center"
      >
        <div className="bg-zinc-800/40 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4 w-full max-w-lg border border-zinc-700">
          <h2 className="text-2xl font-bold text-center text-gray-100">
            Create Your Theatre
          </h2>

          {/* Theatre Name */}
          <input
            type="text"
            placeholder="Enter Theatre Name"
            value={theatreName}
            onChange={(e) => setTheatreName(e.target.value)}
            className="w-full border border-zinc-600 bg-zinc-900 text-gray-100 placeholder-gray-500 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {/* Upload Type Selection */}
          <div className="flex justify-start mt-4 gap-2">
            {["upload", "host", "screenshare"].map((type) => (
              <button
                key={type}
                onClick={() => setUploadType(type)}
                className={`px-4 py-2 rounded-lg border transition ${uploadType === type
                  ? "bg-green-600 text-white border-green-500"
                  : "bg-zinc-700 text-gray-300 border-zinc-600 hover:bg-zinc-600"
                  } 
                  ${
                    type==="host" ? "opacity-30" : "opacity-100"
                  }
                  `}

                  disabled = { type==="host" ? true : false }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {(uploadType === "upload" || uploadType === "host") && (
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
            className="w-full bg-green-600 text-white py-2 px-4 rounded-xl hover:bg-green-700 transition"
            onClick={handleUpload}
          >
            {uploadType === "upload"
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
                  className="bg-zinc-700 text-gray-200 py-2 px-4 rounded-lg hover:bg-zinc-600"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => window.open(joinUrl.replace("/join",""), "_blank")}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Open Theatre
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          {(uploadType === "upload" || uploadType === "host") && file && (
            <video
              controls
              className="max-h-[75vh] rounded-lg border border-zinc-700 mt-4"
              src={URL.createObjectURL(file)}
            />
          )}
        </div>
      </motion.div>

      <footer className="bg-black/40 backdrop-blur-md border-t border-gray-800 text-gray-400 text-sm text-center py-4">
        <p>© 2025 My Theatre. Built with React & Tailwind.</p>
      </footer>
    </div>
  );
}
