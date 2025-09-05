import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function LoginForm() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#2ea3f2] to-[#1e7bb8] font-inter">
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20 max-w-[420px] w-[90%] text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2ea3f2] to-[#1e7bb8] rounded-xl mb-6 mx-auto flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <path
              d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <h2 className="m-0 mb-2 text-2xl font-semibold text-gray-900 tracking-tight">
          Welcome Back
        </h2>

        <p className="m-0 mb-8 text-base text-gray-500 leading-relaxed">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white text-gray-900 box-border outline-none focus:border-[#2ea3f2] focus:ring-2 focus:ring-[#2ea3f2]/20 transition-colors"
            />
          </div>

          <div className="mb-6">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white text-gray-900 box-border outline-none focus:border-[#2ea3f2] focus:ring-2 focus:ring-[#2ea3f2]/20 transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#2ea3f2] text-white border-none rounded-lg text-base font-medium cursor-pointer transition-colors hover:bg-[#1e7bb8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
