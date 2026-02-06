import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStates } from "../services/states";

const Home = () => {
  const [openJoin, setOpenJoin] = useState(false);
  const [theaterId, setTheaterId] = useState("");
  const [joining, setJoining] = useState(false);

  const { host } = useStates();

  const navigate = useNavigate();
  const location = useLocation();

  // 🔁 Open join modal after login redirect
  useEffect(() => {
    if (location.state?.openJoinAfterLogin) {
      setOpenJoin(true);
      navigate("/", { replace: true });
    }
  }, []);

  const handleCreateTheater = () => {
    const isLoggedIn = localStorage.getItem("my_details");

    if (!isLoggedIn) {
      alert("You must be logged in to create a theater.");

      navigate("/login", {
        state: {
          redirectTo: "/create/theater",
        },
      });
      return;
    }

    navigate("/create/theater");
  };

  const handleJoinClick = () => {
    const isLoggedIn = localStorage.getItem("my_details");

    if (!isLoggedIn) {
      navigate("/login", {
        state: {
          redirectTo: "/",
          openJoinAfterLogin: true,
        },
      });
      return;
    }

    setOpenJoin(true);
  };

  const handleJoinSubmit = async () => {
    if (!theaterId) {
      alert("Please enter a Theater ID");
      return;
    }

    setJoining(true);

    try {
      const res = await fetch(`http://${host}:8000/get-theater-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theater_id: theaterId }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("Invalid Theater ID");
        return;
      }

      const meta = data.metadata || {};
      const name = meta.theater_name || "-";
      const type = meta.source;
      const createdAt = meta.created_at || Date.now();

      const joinUrl = `/join/theater?name=${encodeURIComponent(
        name
      )}&id=${theaterId}&type=${type}&createdat=${createdAt}`;

      window.location.href = joinUrl;
    } catch (err) {
      alert("Failed to join theater");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      {/* HERO */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-6 p-4">
        <h1 className="text-5xl font-bold mb-4">Theater</h1>
        <p className="text-neutral-400 max-w-xl mb-8">
          Watch together. Listen together. Talk together.  
          A synchronized movie experience built for real-time connection.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleCreateTheater}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium"
          >
            Create Theater
          </button>

          <button
            onClick={handleJoinClick}
            className="px-6 py-3 border border-neutral-700 hover:bg-neutral-800 rounded-xl"
          >
            Join Theater
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">About Theater</h2>

        <div className="space-y-5 text-neutral-400 leading-relaxed">
          <p>
            Theater enables synchronized movie watching where all participants
            share the same playback timeline, with integrated voice and chat.
          </p>
          <p>
            Playback remains locked until all members mark themselves as ready,
            ensuring no one misses the start.
          </p>
          <p>
            Seeking is synchronized and requires confirmation from other
            participants to prevent accidental skips.
          </p>
          <p>
            The experience is designed to feel intentional — like sitting in the
            same room.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-800 p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://avatars.githubusercontent.com/u/73533578"
              alt="Creator"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-medium">Created by Rahul Verma</p>
              <a
                href="https://github.com/SudoRV"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-neutral-400 hover:underline"
              >
                github.com/SudoRV
              </a>
            </div>
          </div>

          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Theater
          </p>
        </div>
      </footer>

      {/* JOIN MODAL (INLINE) */}
      {openJoin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Join Theater</h3>

            <input
              type="text"
              placeholder="Enter Theater ID"
              value={theaterId}
              onChange={(e) => setTheaterId(e.target.value)}
              className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpenJoin(false)}
                className="text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={joining}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg"
              >
                {joining ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;