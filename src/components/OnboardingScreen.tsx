import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Shield, 
  Navigation, 
  MessageSquare, 
  Check, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck 
} from 'lucide-react';
import BeaconLogo from './BeaconLogo';

interface OnboardingScreenProps {
  onComplete: (name: string, pin: string, locationPerm: boolean, smsPerm: boolean) => void;
  initialName?: string;
  initialPin?: string;
}

export default function OnboardingScreen({ onComplete, initialName = '', initialPin = '' }: OnboardingScreenProps) {
  const [step, setStep] = useState<'profile' | 'permissions'>('profile');
  
  // State for step 1
  const [name, setName] = useState(initialName);
  const [pin, setPin] = useState(initialPin);
  const [confirmPin, setConfirmPin] = useState(initialPin);
  const [profileError, setProfileError] = useState<string | null>(null);

  // State for step 2 (permissions)
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [smsPermission, setSmsPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    // Simple robust validation
    if (!name.trim()) {
      setProfileError("Please enter your name to register your profile.");
      return;
    }
    if (!pin.trim()) {
      setProfileError("Please define a Safe Arrival Password.");
      return;
    }
    if (pin.length < 4 || pin.length > 32) {
      setProfileError("Your Safe Arrival Password should be between 4 and 32 characters.");
      return;
    }
    if (pin !== confirmPin) {
      setProfileError("Password does not match double-confirmation. Please re-enter.");
      return;
    }

    // Double-PIN confirm successful, navigate to permissions text box options!
    setStep('permissions');
  };

  const handleDone = () => {
    if (locationPermission === null) {
      setPermissionError("Please select 'Yes' or 'No' for location data permission.");
      return;
    }
    if (smsPermission === null) {
      setPermissionError("Please select 'Yes' or 'No' for emergency SMS permission.");
      return;
    }

    // Setup completed successfully
    onComplete(name.trim(), pin.trim(), locationPermission, smsPermission);
  };

  return (
    <div className="w-full h-[640px] bg-[#090A0E] text-slate-100 flex flex-col justify-between p-5 font-sans overflow-y-auto select-none" id="onboarding-container-id">
      
      {/* Top Header section */}
      <div className="flex flex-col items-center text-center mt-3 mb-4 space-y-2">
        <BeaconLogo size={42} showBadge={true} />
        <div>
          <h2 className="text-base font-space font-extrabold text-white tracking-tight">
            Welcome to Beacon
          </h2>
          <p className="text-[10px] text-slate-400 font-medium">
            Personal Safety Safe-Walk Navigation Platform
          </p>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="flex-1 flex flex-col justify-center space-y-4 my-2">
        
        {step === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="space-y-3.5 focus-within:translate-y-0 transition-transform">
            <div className="text-center space-y-1 mb-2">
              <span className="text-[9px] font-space font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                Step 1 of 2: Create Profile
              </span>
              <p className="text-xs text-slate-300 leading-snug">
                Configure your safety login credentials
              </p>
            </div>

            {profileError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10.5px] text-rose-400 flex items-start gap-2 animate-bounce-slow">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="leading-snug">{profileError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-[9px] font-space font-bold text-slate-400 uppercase tracking-widest block">
                1) Beacon Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chris Alexander"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-colors"
                  id="onboarding-input-name"
                  required
                />
              </div>
            </div>

             {/* Password Input */}
            <div className="space-y-1">
              <label className="text-[9px] font-space font-bold text-slate-400 uppercase tracking-widest block">
                2) Safe Arrival Password
              </label>
              <span className="block text-[8px] text-slate-500 font-normal mt-0.5" id="pwd-limit-label-1">
                (4-32 characters)
              </span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Password (4 - 32 characters)"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 font-mono tracking-widest transition-colors"
                  id="onboarding-input-pin"
                  required
                />
              </div>
            </div>

            {/* Double Confirm Password Input */}
            <div className="space-y-1">
              <label className="text-[9px] font-space font-bold text-slate-300 uppercase tracking-widest block">
                3) Double-Confirm Safe Arrival Password
              </label>
              <span className="block text-[8px] text-slate-500 font-normal mt-0.5" id="pwd-limit-label-2">
                (4-32 characters)
              </span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="password" 
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Re-type password to confirm"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 font-mono tracking-widest transition-colors"
                  id="onboarding-input-confirm-pin"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-space font-black tracking-wider uppercase shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              id="onboarding-btn-verify"
            >
              Verify Profile & Continue
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-2">
              <span className="text-[9px] font-space font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Step 2 of 2: Permissions
              </span>
              <p className="text-xs text-slate-300 leading-snug">
                Configure your safety permissions
              </p>
            </div>

            {permissionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10.5px] text-rose-450 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{permissionError}</span>
              </div>
            )}

            {/* 1) Location Permission Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5 relative" id="location-permission-box">
              <div className="flex items-center gap-2 text-indigo-400">
                <Navigation className="w-4 h-4" />
                <h4 className="text-xs font-space font-bold text-white">1. Permission to use Location Data</h4>
              </div>
              
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans">
                Location data is <strong className="text-slate-300">not stored on external servers</strong> and is only used to create a safe route home. You can still select <strong className="text-rose-400">"No"</strong>, but an optimized safe route home based on safety features such as lighting and high-foot traffic (real-time data) will not be available.
              </div>

              {/* Yes or No selectable options only */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationPermission(true);
                    setPermissionError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-space font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    locationPermission === true
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                      : 'bg-[#0D0F16] border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                  id="btn-location-perm-yes"
                >
                  <Check className={`w-3.5 h-3.5 transition-all ${locationPermission === true ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                  Yes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocationPermission(false);
                    setPermissionError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-space font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    locationPermission === false
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_8px_rgba(156,163,175,0.1)]'
                      : 'bg-[#0D0F16] border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                  id="btn-location-perm-no"
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5 transition-all ${locationPermission === false ? 'opacity-100' : 'opacity-0'}`} />
                  No
                </button>
              </div>
            </div>

            {/* 2) Distress Messaging Permission Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5 relative" id="sms-permission-box">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <h4 className="text-xs font-space font-bold text-white">2. Emergency Contact Messaging</h4>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans">
                Are you okay with sending emergency text messages to emergency contacts? Selecting <strong className="text-rose-400">"No"</strong> can be chosen but emergency messages will not be sent when the alert button is pressed.
              </div>

              {/* Yes or No selectable options only */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSmsPermission(true);
                    setPermissionError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-space font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    smsPermission === true
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      : 'bg-[#0D0F16] border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                  id="btn-sms-perm-yes"
                >
                  <Check className={`w-3.5 h-3.5 transition-all ${smsPermission === true ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                  Yes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmsPermission(false);
                    setPermissionError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-space font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    smsPermission === false
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_8px_rgba(156,163,175,0.1)]'
                      : 'bg-[#0D0F16] border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                  id="btn-sms-perm-no"
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5 transition-all ${smsPermission === false ? 'opacity-100' : 'opacity-0'}`} />
                  No
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-space font-black tracking-wider uppercase shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              id="onboarding-btn-finalize"
            >
              <ShieldCheck className="w-4 h-4" />
              Complete Setup & Secure Device
            </button>
          </div>
        )}

      </div>

      {/* Decorative footer status log */}
      <div className="pt-2 pb-1 border-t border-slate-850 text-center flex flex-col items-center">
        <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">
          ✦ End-to-End Encrypted Hardware ✦
        </span>
      </div>

    </div>
  );
}
