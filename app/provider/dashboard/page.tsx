"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

const AVAILABLE_GIGS = [
  "Transportation Services",
  "Tutoring",
  "Complete Household Cleaning"
];

export default function ProviderDashboard() {
  const [myServices, setMyServices] = useState([
    { id: 1, gig: "Complete Household Cleaning", myPrice: 400 }
  ]);
  const [selectedGig, setSelectedGig] = useState(AVAILABLE_GIGS[0]);
  const [priceInput, setPriceInput] = useState("");

  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null); // Tracks if provider is currently busy
  const [userId, setUserId] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const initProvider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Check if this provider already has an active accepted job
      const { data: activeData } = await supabase
        .from('job_requests')
        .select('*')
        .eq('provider_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (activeData) {
        setActiveJob(activeData);
      } else {
        fetchBroadcastingJobs();
      }
    };

    initProvider();

    // Real-time listener for broadcasting jobs
    const channel = supabase
      .channel('provider-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_requests' },
        () => {
          initProvider();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBroadcastingJobs = async () => {
    const { data } = await supabase
      .from('job_requests')
      .select('*')
      .eq('status', 'broadcasting')
      .order('created_at', { ascending: false });
    
    if (data) setLiveJobs(data);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceInput) return;
    
    const newService = {
      id: Date.now(),
      gig: selectedGig,
      myPrice: parseInt(priceInput)
    };
    
    setMyServices([...myServices, newService]);
    setPriceInput("");
  };

  const handleAcceptJob = async (jobId: string) => {
    const { error } = await supabase
      .from('job_requests')
      .update({ status: 'accepted', provider_id: userId })
      .eq('id', jobId);

    if (error) {
      alert("Failed to accept job.");
    } else {
      // Immediately lock the provider view and show the active job pop-up
      const { data: updatedJob } = await supabase.from('job_requests').select('*').eq('id', jobId).single();
      setActiveJob(updatedJob);
    }
  };

  const handleResolveJob = async (status: 'completed' | 'cancelled') => {
    if (!activeJob) return;

    const { error } = await supabase
      .from('job_requests')
      .update({ status: status })
      .eq('id', activeJob.id);

    if (error) {
      alert("Error updating job status.");
    } else {
      setActiveJob(null); // Clear active job, freeing the provider to receive new gigs
      fetchBroadcastingJobs();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 relative pb-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Provider Dashboard</h1>
        <p className="text-gray-600 mb-8">Set your base prices and manage your active workflow.</p>

        {/* Top Section: Provider Profile Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add a Service</h2>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Gig</label>
                <select 
                  value={selectedGig}
                  onChange={(e) => setSelectedGig(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black font-medium"
                >
                  {AVAILABLE_GIGS.map((gigName) => (
                    <option key={gigName} value={gigName} className="text-black">
                      {gigName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Minimum Price (₹)</label>
                <input 
                  type="number" 
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-white text-black font-medium"
                  required
                />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-900 text-white rounded-lg font-bold hover:bg-amber-950 transition-colors">
                Save Service Profile
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Active Services</h2>
            {myServices.length === 0 ? (
              <p className="text-gray-500 italic">You haven't added any services yet.</p>
            ) : (
              <div className="space-y-3">
                {myServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center p-4 border-l-4 border-amber-500 rounded-r-lg bg-gray-50 shadow-sm">
                    <span className="text-lg font-extrabold text-amber-600 tracking-wide">{service.gig}</span>
                    <span className="font-bold text-gray-900 text-lg">₹{service.myPrice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Job Feed (Hidden if provider is busy with an active job) */}
        {!activeJob ? (
          <div>
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
              <span className="animate-pulse">🔴</span> Live Local Broadcasts
            </h2>
            
            {liveJobs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
                <p className="text-gray-500 text-lg">Searching for nearby gigs...</p>
                <p className="text-sm text-gray-400 mt-2">New jobs will appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveJobs.map((job) => (
                  <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900">{job.service_type}</h3>
                      <p className="text-gray-600 mt-1 flex items-center gap-1">
                        <span>📍</span> {job.address}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="text-right flex-grow">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Current Offer</p>
                        <p className="text-3xl font-black text-green-600">₹{job.offer_price}</p>
                      </div>
                      <button 
                        onClick={() => handleAcceptJob(job.id)}
                        className="px-8 py-4 bg-amber-900 text-white rounded-xl font-bold text-lg hover:bg-amber-950 transition-colors shadow-lg active:scale-95 whitespace-nowrap"
                      >
                        Accept Gig
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-500 p-8 rounded-2xl text-center shadow-lg">
            <span className="text-4xl">🛠️</span>
            <h2 className="text-2xl font-extrabold text-amber-900 mt-2">You are currently busy on an active job!</h2>
            <p className="text-gray-600 mt-1">New gig broadcasts are paused until you complete your current assignment.</p>
          </div>
        )}

      </div>

      {/* Persistent Side / Floating Pop-Up for Active Job Workflow */}
      {activeJob && (
        <div className="fixed bottom-6 right-6 bg-white border-2 border-amber-900 p-6 rounded-2xl shadow-2xl max-w-md w-full z-50 animate-bounce-once">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Active Work Initiated
            </span>
            <span className="text-lg font-black text-green-600">₹{activeJob.offer_price}</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900">{activeJob.service_type}</h3>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1 mb-4">
            <span>📍</span> {activeJob.address}
          </p>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => router.push(`/chat/${activeJob.id}`)}
              className="w-full py-3 bg-amber-900 text-white rounded-xl font-bold hover:bg-amber-950 transition-colors shadow-md"
            >
              Open Secure Chat Room
            </button>
            
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => handleResolveJob('completed')}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors text-sm shadow"
              >
                Mark Completed ✅
              </button>
              <button 
                onClick={() => handleResolveJob('cancelled')}
                className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors text-sm"
              >
                Cancel Work ❌
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}