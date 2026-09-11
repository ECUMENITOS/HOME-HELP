"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

const AVAILABLE_GIGS = [
  "Transportation Services",
  "Tutoring",
  "Complete Household Cleaning"
];

const MARKET_AVERAGES: Record<string, number> = {
  "Transportation Services": 150,
  "Tutoring": 500,
  "Complete Household Cleaning": 400
};

export default function CustomerDashboard() {
  const [selectedGig, setSelectedGig] = useState(AVAILABLE_GIGS[0]);
  const [address, setAddress] = useState("");
  const [basePrice, setBasePrice] = useState(MARKET_AVERAGES[AVAILABLE_GIGS[0]]);
  const [boostAmount, setBoostAmount] = useState(0);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [acceptedJob, setAcceptedJob] = useState<any>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setBasePrice(MARKET_AVERAGES[selectedGig]);
    setBoostAmount(0);
  }, [selectedGig]);

  // Check if user already has an active job on load
  useEffect(() => {
    const checkActiveJob = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('job_requests')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['broadcasting', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        if (data.status === 'broadcasting') {
          setActiveJobId(data.id);
          setIsBroadcasting(true);
        } else if (data.status === 'accepted') {
          setAcceptedJob(data);
          setActiveJobId(data.id);
        }
      }
    };
    checkActiveJob();
  }, []);

  // Listen for job acceptance or chat messages in real-time
  useEffect(() => {
    if (!activeJobId) return;

    const channel = supabase
      .channel('customer-job-listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'job_requests', filter: `id=eq.${activeJobId}` },
        (payload) => {
          if (payload.new.status === 'accepted') {
            setAcceptedJob(payload.new);
            setIsBroadcasting(false);
          } else if (payload.new.status === 'completed' || payload.new.status === 'cancelled') {
            setAcceptedJob(null);
            setActiveJobId(null);
            setIsBroadcasting(false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${activeJobId}` },
        (payload: any) => {
          // If message is from someone else, trigger notification badge
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.sender_id !== user.id) {
              setHasNewMessage(true);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeJobId]);

  const currentOffer = basePrice + boostAmount;

  const handleBoost = async () => {
    const newOffer = currentOffer + 5;
    setBoostAmount((prev) => prev + 5);

    if (activeJobId) {
      await supabase
        .from('job_requests')
        .update({ offer_price: newOffer })
        .eq('id', activeJobId);
    }
  };

  const handleBroadcast = async () => {
    if (!address.trim()) {
      alert("Please enter a service address before broadcasting.");
      return;
    }

    setIsSubmitting(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      alert("You must be logged in to broadcast a request!");
      setIsSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('job_requests')
      .insert({
        customer_id: user.id,
        service_type: selectedGig,
        address: address,
        offer_price: currentOffer,
        status: 'broadcasting'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting job:", insertError);
      alert("Failed to broadcast job. Check console.");
      setIsSubmitting(false);
      return;
    }

    setActiveJobId(data.id);
    setIsSubmitting(false);
    setIsBroadcasting(true);
  };

  const handleCancelBroadcast = async () => {
    setIsBroadcasting(false);
    
    if (activeJobId) {
      await supabase
        .from('job_requests')
        .update({ status: 'cancelled' })
        .eq('id', activeJobId);
      setActiveJobId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 relative pb-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Request a Service</h1>
        <p className="text-gray-600 mb-8">Post your job at the market rate, or boost it for a faster response.</p>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">What do you need help with?</label>
            <select 
              value={selectedGig}
              onChange={(e) => setSelectedGig(e.target.value)}
              disabled={isBroadcasting || acceptedJob}
              className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:border-amber-900 bg-white text-black font-medium text-lg disabled:opacity-50 disabled:bg-gray-100"
            >
              {AVAILABLE_GIGS.map((gigName) => (
                <option key={gigName} value={gigName} className="text-black">
                  {gigName}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Address</label>
            <input 
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isBroadcasting || acceptedJob}
              placeholder="e.g. Salt Lake, Sector 1, Block AE..."
              className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:border-amber-900 bg-white text-black font-medium text-lg disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>

          <div className={`p-6 rounded-xl border mb-8 flex flex-col items-center justify-center gap-6 transition-all ${isBroadcasting ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500 mb-1">
                {isBroadcasting ? "Live Offer on Feed" : acceptedJob ? "Gig Accepted by Provider!" : "Your Current Offer"}
              </p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-5xl font-extrabold text-amber-900">₹{currentOffer}</span>
              </div>
              <p className="text-xs text-gray-400">Market average: ₹{basePrice}</p>
              {boostAmount > 0 && (
                <span className="inline-block mt-2 text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                  +₹{boostAmount} Boosted
                </span>
              )}
            </div>

            {!isBroadcasting && !acceptedJob ? (
              <button 
                onClick={handleBroadcast}
                disabled={isSubmitting}
                className="w-full py-4 bg-amber-900 text-white rounded-xl font-bold text-lg hover:bg-amber-950 transition-colors shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? "Connecting..." : "Broadcast Request to Local Providers"}
              </button>
            ) : isBroadcasting ? (
              <div className="w-full flex flex-col gap-4">
                <div className="flex items-center justify-center gap-2 text-amber-900 font-bold animate-pulse mb-2">
                  <span className="text-2xl">📡</span> Broadcasting to nearby providers...
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleCancelBroadcast}
                    className="flex-1 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
                  >
                    Stop Search
                  </button>
                  <button 
                    onClick={handleBoost}
                    className="flex-[2] py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">🔥</span> Boost Live (+₹5)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-green-700 font-bold text-lg">
                Provider has accepted your request! Check the notification popup below to chat.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Floating Notification / Chat Pop-Up for Customer */}
      {acceptedJob && (
        <div className="fixed bottom-6 right-6 bg-white border-2 border-amber-900 p-6 rounded-2xl shadow-2xl max-w-md w-full z-50 animate-bounce-once">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span>🟢</span> Provider Assigned
            </span>
            <span className="text-lg font-black text-amber-900">₹{acceptedJob.offer_price}</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900">{acceptedJob.service_type}</h3>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1 mb-4">
            <span>📍</span> {acceptedJob.address}
          </p>

          <button 
            onClick={() => {
              setHasNewMessage(false);
              router.push(`/chat/${acceptedJob.id}`);
            }}
            className="w-full py-4 bg-amber-900 text-white rounded-xl font-bold text-lg hover:bg-amber-950 transition-colors shadow-md relative flex items-center justify-center gap-2"
          >
            <span>💬</span> Open Chat Room
            {hasNewMessage && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full animate-ping">
                New!
              </span>
            )}
            {hasNewMessage && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
                New!
              </span>
            )}
          </button>
        </div>
      )}
    </main>
  );
}