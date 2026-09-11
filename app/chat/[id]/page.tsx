"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter, useParams } from "next/navigation";

export default function ChatRoom() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!jobId) return;

    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Fetch the job details for the header
      const { data: job } = await supabase.from('job_requests').select('*').eq('id', jobId).single();
      setJobDetails(job);

      // Fetch all past messages
      const { data: pastMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      
      if (pastMessages) setMessages(pastMessages);
    };

    initChat();

    // Supabase Real-time: Listen for incoming messages instantly
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, router]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: userId,
      content: newMessage
    });

    setNewMessage(""); 
  };

  if (!jobDetails || !userId) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Loading secure chat...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-6">
      <div className="w-full h-screen md:h-[85vh] md:max-w-4xl bg-white flex flex-col md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 overflow-hidden">
        
        {/* Chat Header */}
        <div className="bg-amber-900 text-white p-5 flex justify-between items-center shadow-md z-10">
          <div>
            <h2 className="font-extrabold text-xl">{jobDetails.service_type}</h2>
            <p className="text-amber-200 text-sm flex items-center gap-1 mt-1">
              <span>📍</span> {jobDetails.address}
            </p>
          </div>
          <div className="bg-amber-800 px-5 py-2 rounded-xl font-black text-amber-100 text-lg border border-amber-700">
            ₹{jobDetails.offer_price}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 flex flex-col">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 font-medium">Start the conversation...</div>
          ) : (
            messages.map((msg) => {
              const isMe = String(msg.sender_id).trim() === String(userId).trim();
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm text-lg ${
                    isMe 
                      ? 'bg-green-600 text-white rounded-br-sm' 
                      : 'bg-gray-200 text-gray-900 rounded-bl-sm border border-gray-300'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-md">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-full px-6 py-4 focus:outline-none focus:border-amber-900 focus:ring-2 focus:ring-amber-900/20 text-lg text-gray-900"
          />
          <button type="submit" className="bg-amber-900 text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-amber-950 transition-colors active:scale-95 shadow-md">
            Send
          </button>
        </form>

      </div>
    </div>
  );
}