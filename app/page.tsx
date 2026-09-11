"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

export default function GatewayPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.refresh(); // Forces the page to visually update
  };

  if (loading) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Top Navigation Bar */}
      <header className="w-full p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="text-2xl font-black text-amber-900 tracking-tighter">HOME HELP</div>
        <div className="flex gap-4 items-center">
          {!session ? (
            <>
              {/* These stay permanently visible when logged out */}
              <Link href="/login" className="px-6 py-2 text-amber-900 font-bold hover:bg-amber-100 rounded-xl transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="px-6 py-2 bg-amber-900 text-white font-bold rounded-xl hover:bg-amber-950 transition-colors shadow-md">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              {/* Profile & Logout appear when logged in */}
              <Link href="/profile" className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Manage Profile
              </Link>
              <button 
                onClick={handleLogout}
                className="px-6 py-2 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl font-extrabold text-amber-900 mb-6">Welcome to HOME HELP</h1>
          
          {!session ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-4">You must be logged in to access the market.</h2>
              <p className="text-gray-600 mb-8">Join our local community to start requesting or providing services.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login" className="px-8 py-4 bg-amber-100 text-amber-900 rounded-xl font-bold text-lg hover:bg-amber-200 transition-colors inline-block">
                  Log In
                </Link>
                <Link href="/signup" className="px-8 py-4 bg-amber-900 text-white rounded-xl font-bold text-lg hover:bg-amber-950 transition-colors inline-block">
                  Create an Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xl text-gray-600 mb-12">How would you like to use the platform today?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <Link href="/customer/dashboard" className="group block h-full">
                  <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-amber-900 transition-all h-full">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🧹</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">I Need Help</h2>
                    <p className="text-gray-600">Post a gig and hire local professionals instantly.</p>
                  </div>
                </Link>

                <Link href="/provider/dashboard" className="group block h-full">
                  <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-amber-900 transition-all h-full">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💼</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">I Want to Work</h2>
                    <p className="text-gray-600">Browse live gigs in your area and earn money.</p>
                  </div>
                </Link>
                
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}