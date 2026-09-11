"use client";

import { useState } from "react";
import Link from "next/link";
// Import the Supabase client we just made
import { createClient } from "../../utils/supabase"; 

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // New states for loading and messages
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // 1. Send the data to Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone_number: phone,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Success! Please check your email to verify your account.");
      // Clear the form
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
    }
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Join HOME HELP</h1>
          <p className="text-gray-600">Create one account to hire help or find work.</p>
        </div>

        {/* Display Error or Success Messages */}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}

        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-900 text-white rounded-lg font-bold hover:bg-amber-950 transition-colors shadow-md mt-4 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-900 font-bold hover:underline">
            Log in here
          </Link>
        </div>
      </div>
    </main>
  );
}