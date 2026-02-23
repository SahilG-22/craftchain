import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const API = import.meta.env.VITE_API_URL;

    const res = await axios.post(`${API}/auth/login`,{ email, password });


    // 🔥 Store token
    localStorage.setItem("token", res.data.token);

    // 🔥 Tell App we logged in
    onLogin();

  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
};


  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg w-96">
        <h2 className="text-white text-2xl mb-6">Login</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-green-500 p-2 rounded text-white"
        >
          Login
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
          className="bg-red-500 px-3 py-1 rounded"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
