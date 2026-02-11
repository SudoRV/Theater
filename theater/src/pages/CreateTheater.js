import React, { useRef, useState, useEffect } from "react";
import { useStates } from "../services/states";

export default function UploaderPage() {
  const [file, setFile] = useState(null);
  const [theatreId, setTheatreId] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);
  const [source, setSource] = useState("upload");
  const [theatreName, setTheatreName] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const videoFileRef = useRef(null);
  const { my_details } = useStates();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

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
    if (!theatreName.trim()) return alert("Please enter theatre name");
    if (source === "upload" && !file)
      return alert("Please select a file");

    const old_theater_id = localStorage.getItem("theater_id");

    let id = generateTheatreId();
    localStorage.setItem("theater_id", id);
    setTheatreId(id);

    const generatedJoinUrl = `${window.location.origin}/join/theater?name=${theatreName}&id=${id}&type=${source}&createdat=${Date.now()}`;
    setJoinUrl(generatedJoinUrl);

    if (source === "upload") {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("theater_name", theatreName);
      formData.append("source", source);
      formData.append("old_theater_id", old_theater_id);
      formData.append("theater_id", id);
      formData.append("creator_name", my_details.name);
      formData.append("creator_username", my_details.username);
      formData.append("creator_email", my_details.email);

      try {
        setIsUploading(true);
        setUploadSuccess(false);

        const response = await fetch(`/theater/upload`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message);

        setUploadSuccess(true);
      } catch (err) {
        console.error(err);
        alert("Upload failed: " + err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Theatre</h1>
        <span className="text-sm text-gray-400">
          Create and Share Theatres
        </span>
      </nav>

      <div className="flex flex-1 p-6 gap-6 justify-center items-center">
        <div className="bg-neutral-800/40 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4 max-w-lg border border-zinc-700">
          <h2 className="text-2xl font-bold text-center">
            Create Your Theatre
          </h2>

          {/* Theatre Name */}
          <input
            type="text"
            placeholder="Enter Theatre Name"
            value={theatreName}
            onChange={(e) => setTheatreName(e.target.value)}
            className="w-full border border-zinc-600 bg-zinc-900 text-gray-100 placeholder-gray-500 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          {/* Source Selection */}
          <div className="flex gap-2">
            {["upload", "host", "screenshare"].map((type) => (
              <button
                key={type}
                onClick={() => setSource(type)}
                disabled={
                  type === "host" || type === "screenshare"
                }
                className={`px-4 py-2 rounded-lg transition ${source === type
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                  } ${type === "host" || type === "screenshare"
                    ? "opacity-30 cursor-not-allowed"
                    : ""
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* File Upload */}
          {source === "upload" && (
            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="cursor-pointer w-full border border-zinc-600 bg-zinc-900 text-gray-300 p-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
          )}

          {/* Upload Button */}
          <button
            disabled={isUploading}
            onClick={handleUpload}
            className={`w-full py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition ${isUploading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
              }`}
          >
            {isUploading ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                Uploading...
              </>
            ) : (
              "Upload & Create Theatre"
            )}
          </button>

          {/* Success Section */}
          {theatreId && uploadSuccess && (
            <div className="mt-6 space-y-3">
              <p className="text-lg text-green-400">
                Theatre Created Successfully!
              </p>

              <p className="font-semibold text-lg">
                {theatreName || "Untitled Theatre"}
              </p>

              <p className="font-mono text-gray-400">
                ID: {theatreId}
              </p>

              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-400 underline break-all"
              >
                {joinUrl}
              </a>

              <div className="flex gap-4">
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(joinUrl)
                  }
                  className="py-2 px-4 rounded-lg border border-neutral-700 hover:bg-neutral-800"
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

        {/* Video Preview */}
        {file && (
          <video
            controls
            className="max-w-[590px] rounded-lg border border-zinc-700"
            src={videoUrl}
          />
        )}
      </div>
    </div>
  );
}