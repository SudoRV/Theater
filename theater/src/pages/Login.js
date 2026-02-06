import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.redirectTo || "/";

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    gender: "male",
  });

  // Load existing details if already present
  useEffect(() => {
    const saved = localStorage.getItem("my_details");
    if (saved) {
      setForm(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    localStorage.setItem("my_details", JSON.stringify(form));

    // Redirect after login
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-semibold text-center mb-2">
          Welcome to Theater
        </h2>
        <p className="text-sm text-neutral-400 text-center mb-6">
          Enter your details to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-neutral-400">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-neutral-400">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-sm text-neutral-400">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="text-sm text-neutral-400">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 transition-colors py-2 rounded-xl font-medium"
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-neutral-500 text-center mt-6">
          Your details are stored locally on this device
        </p>
      </div>
    </div>
  );
}