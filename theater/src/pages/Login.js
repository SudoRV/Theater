import { useState, useEffect } from "react";

export default function LoginPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    gender: "male",
  });

  // ✅ Load existing details from localStorage (if any)
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
    alert("Details saved in localStorage!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-md w-80 space-y-4"
      >
        <h2 className="text-xl font-bold text-center">Login</h2>

        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded-lg font-semibold hover:bg-blue-600"
        >
          Save
        </button>
      </form>
    </div>
  );
}
