"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

// Define the available country codes and their digit limits
const COUNTRY_CODES = [
  { code: "+91", country: "India", digits: 10 },
  { code: "+1", country: "US/Canada", digits: 10 },
  { code: "+44", country: "UK", digits: 10 },
  { code: "+61", country: "Australia", digits: 9 },
  { code: "+971", country: "UAE", digits: 9 },
];

export default function ProfileManager() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Split phone number into code and digits
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [rawPhone, setRawPhone] = useState("");
  
  const [dob, setDob] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setDob(data.dob || "");
        setAvatarUrl(data.avatar_url || "");
        
        // Parse the saved phone number (e.g., "+91 9876543210")
        if (data.phone_number) {
          const parts = data.phone_number.split(" ");
          if (parts.length === 2) {
            setCountryCode(parts[0]);
            setRawPhone(parts[1]);
          } else {
            setRawPhone(data.phone_number); // Fallback for old data
          }
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingImage(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Remove anything that isn't a number
    const numericValue = e.target.value.replace(/\D/g, "");
    
    // 2. Find the current active country rules
    const activeCountry = COUNTRY_CODES.find(c => c.code === countryCode);
    const maxDigits = activeCountry ? activeCountry.digits : 15;

    // 3. Only update state if it's within the digit limit
    if (numericValue.length <= maxDigits) {
      setRawPhone(numericValue);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
    setRawPhone(""); // Clear the input when changing countries to avoid invalid lengths
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Verify the phone number is the exact required length before saving
    const activeCountry = COUNTRY_CODES.find(c => c.code === countryCode);
    if (activeCountry && rawPhone.length !== activeCountry.digits) {
      alert(`Please enter exactly ${activeCountry.digits} digits for ${activeCountry.country}.`);
      setSaving(false);
      return;
    }

    const fullPhoneNumber = `${countryCode} ${rawPhone}`;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone_number: fullPhoneNumber,
      dob,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert("Error saving profile!");
    } else {
      alert("Profile updated successfully!");
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading profile data...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-amber-900 mb-6">Profile Manager</h1>
        
        <form onSubmit={saveProfile} className="space-y-5">
          
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl overflow-hidden border-2 border-gray-200">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-900 hover:file:bg-amber-100 disabled:opacity-50 cursor-pointer" 
                />
                {uploadingImage && <p className="text-xs text-amber-600 mt-2 font-bold animate-pulse">Uploading image to cloud...</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input type="email" value={email} disabled className="w-full border border-gray-200 rounded-lg p-3 bg-gray-100 text-gray-500 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 text-gray-900" />
          </div>

          {/* New Custom Phone Number Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <div className="flex gap-2">
              <select 
                value={countryCode}
                onChange={handleCountryChange}
                className="w-1/3 border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 bg-gray-50 text-gray-900 font-medium"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.country}
                  </option>
                ))}
              </select>
              
              <input 
                type="tel" 
                value={rawPhone} 
                onChange={handlePhoneChange} 
                placeholder={`Enter ${COUNTRY_CODES.find(c => c.code === countryCode)?.digits} digits`}
                required 
                className="w-2/3 border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 text-gray-900" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-amber-900 text-gray-900" />
          </div>

          <button type="submit" disabled={saving || uploadingImage} className="w-full py-4 bg-amber-900 text-white rounded-xl font-bold text-lg hover:bg-amber-950 transition-colors mt-6 disabled:opacity-50">
            {saving ? "Saving to Database..." : "Save Profile Details"}
          </button>
        </form>
      </div>
    </main>
  );
}