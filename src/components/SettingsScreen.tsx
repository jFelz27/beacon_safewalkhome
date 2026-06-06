import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Lock, 
  Users, 
  Smartphone, 
  MessageSquare, 
  ChevronLeft, 
  Check, 
  Trash2, 
  Plus, 
  Info,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { Contact } from '../types';

interface SettingsScreenProps {
  userName: string;
  setUserName: (val: string) => void;
  emergencyContacts: Contact[];
  setEmergencyContacts: (val: Contact[]) => void;
  safeArrivalPin: string;
  setSafeArrivalPin: (val: string) => void;
  customAlertMessage: string;
  setCustomAlertMessage: (val: string) => void;
  onNavigateBack: () => void;
  onPinSuccess: () => void;
  onPinFailure: () => void;
  consecutiveFailedAttempts: number;
  lockoutCount: number;
  phoneBattery: number;
  locationPermission: boolean;
  setLocationPermission: (val: boolean) => void;
  smsPermission: boolean;
  setSmsPermission: (val: boolean) => void;
  onResetOnboarding: () => void;
}

const getNextLockoutDurationMinutes = (currentLockoutCount: number) => {
  const nextLockoutCount = currentLockoutCount + 1;
  if (nextLockoutCount === 1) return 1;
  if (nextLockoutCount === 2) return 5;
  if (nextLockoutCount === 3) return 30;
  if (nextLockoutCount === 4) return 60; // 1 hour
  return 1440; // 24 hours (1440 minutes)
};

export default function SettingsScreen({
  userName,
  setUserName,
  emergencyContacts,
  setEmergencyContacts,
  safeArrivalPin,
  setSafeArrivalPin,
  customAlertMessage,
  setCustomAlertMessage,
  onNavigateBack,
  onPinSuccess,
  onPinFailure,
  consecutiveFailedAttempts,
  lockoutCount,
  phoneBattery,
  locationPermission,
  setLocationPermission,
  smsPermission,
  setSmsPermission,
  onResetOnboarding
}: SettingsScreenProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [pinInput, setPinInput] = useState(safeArrivalPin);
  const [msgInput, setMsgInput] = useState(customAlertMessage);
  const [locationPermLocal, setLocationPermLocal] = useState(locationPermission);
  const [smsPermLocal, setSmsPermLocal] = useState(smsPermission);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactIsDefault, setNewContactIsDefault] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(emergencyContacts);
  const [presetWeight, setPresetWeight] = useState<'balanced' | 'max-safety'>('max-safety');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  
  // Safe-arrival PIN Lock state
  const [isPinRevealed, setIsPinRevealed] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptPinValue, setPromptPinValue] = useState('');
  const [promptError, setPromptError] = useState('');
  
  // Change PIN state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [confirmCurrentPinValue, setConfirmCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // Save changes authentication prompt
  const [showSavePromptModal, setShowSavePromptModal] = useState(false);
  const [savePromptPinValue, setSavePromptPinValue] = useState('');
  const [savePromptError, setSavePromptError] = useState('');

  // Unsaved changes back-navigation prompts state
  const [showUnsavedBackModal, setShowUnsavedBackModal] = useState(false);
  const [showBackVerifyPinModal, setShowBackVerifyPinModal] = useState(false);
  const [backVerifyPinValue, setBackVerifyPinValue] = useState('');
  const [backVerifyPinError, setBackVerifyPinError] = useState('');
  const [showManageContactListModal, setShowManageContactListModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const [testSmsStatus, setTestSmsStatus] = useState<{
    phone: string;
    loading: boolean;
    success?: boolean;
    msg?: string;
    smsLink?: string;
    waLink?: string;
  } | null>(null);

  const handleTestSMS = (phone: string) => {
    setTestSmsStatus({ phone, loading: true });
    
    const alertBody = `${msgInput || "Security alert triggered!"} LAST KNOWN LOCATION: 123 Main Street, 98.765N 12.3456W`;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(alertBody);
    
    // Standard RFC-compliant SMS protocol
    const smsLink = `sms:${cleanPhone}?body=${encodedBody}`;
    // Backup iOS-specific SMS protocol
    const smsIosLink = `sms:${cleanPhone};body=${encodedBody}`;
    // WhatsApp Web/App free messaging URL
    const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedBody}`;
 
    // Update status to let the user choose which free client to launch
    setTimeout(() => {
      setTestSmsStatus({
        phone,
        loading: false,
        success: true,
        msg: "Client-side web generators successfully prepared! Select how you'd like to dispatch below for 100% free unlimited texting:",
        smsLink,
        waLink
      });
    }, 400);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactPhone.trim()) {
      const alreadyExists = contacts.some(c => c.phone.trim() === newContactPhone.trim());
      if (!alreadyExists) {
        const contactObj: Contact = {
          name: newContactName.trim() || 'Emergency Contact',
          phone: newContactPhone.trim(),
          isDefault: newContactIsDefault
        };
        const updated = [...contacts, contactObj];
        setContacts(updated);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactIsDefault(false);
      }
    }
  };

  const handleRemoveContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
  };

  const handleToggleDefaultContact = (index: number) => {
    const updated = contacts.map((c, i) => {
      if (i === index) {
        return { ...c, isDefault: !c.isDefault };
      }
      return c;
    });
    setContacts(updated);
  };

  const handleSaveChangesClick = () => {
    setSavePromptPinValue('');
    setSavePromptError('');
    setShowSavePromptModal(true);
  };

  const hasUnsavedChanges = 
    nameInput !== userName ||
    pinInput !== safeArrivalPin ||
    msgInput !== customAlertMessage ||
    locationPermLocal !== locationPermission ||
    smsPermLocal !== smsPermission ||
    JSON.stringify(contacts) !== JSON.stringify(emergencyContacts);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedBackModal(true);
    } else {
      onNavigateBack();
    }
  };

  const executeSaveChanges = () => {
    setUserName(nameInput);
    setSafeArrivalPin(pinInput);
    setEmergencyContacts(contacts);
    setCustomAlertMessage(msgInput);
    setLocationPermission(locationPermLocal);
    setSmsPermission(smsPermLocal);
    
    // Show premium brief visual feedback
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onNavigateBack();
    }, 1500);
  };

  return (
    <div className="relative w-full h-[640px] select-none bg-[#090A0E] text-slate-100 overflow-y-auto flex flex-col font-sans" id="homebound-settings-id">
      
      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-20 flex items-center px-4 py-3 bg-[#0D0E12]/90 backdrop-blur-md border-b border-white/5 shadow-md">
        <button 
          onClick={handleBackClick}
          className="p-1 px-2 text-xs font-space font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-white/5 rounded-lg border border-white/10"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Map Back
        </button>
        <span className="flex-1 text-center font-space font-bold text-sm text-white pr-10">
          Safety Configurations
        </span>
      </div>

      {/* 2. Main Scroll Contents */}
      <div className="flex-1 p-4 space-y-4 pb-20">
        
        {/* Title Hub */}
        <div className="flex gap-2.5 items-start bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3">
          <ShieldAlertIcon />
          <div>
            <h4 className="text-xs font-space font-bold text-indigo-300">Local Encrypted Settings Dashboard</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Your PIN codes, emergency logs, and coordinates are processed on-device. Destination GPS are never stored in external servers to maximize personal safety.
            </p>
          </div>
        </div>

        {/* PROFILE CRADLE */}
        <div className="p-4 rounded-xl bg-[#0E1017] border border-white/5 space-y-3.5">
          <span className="text-[11px] font-space font-bold tracking-widest text-[#6366F1] uppercase block">
            User Verification & Lock Code
          </span>
          
          {/* User Name input */}
          <div className="space-y-1">
            <label className="text-[10px] font-space font-semibold text-slate-400 uppercase tracking-widest block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Name"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs focus:outline-none text-white"
              />
            </div>
          </div>

          {/* Secure Safe Password PIN input */}
          <div className="space-y-1">
            <label className="text-[10px] font-space font-semibold text-slate-400 uppercase tracking-widest block">Safe Arrival Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={isPinRevealed ? pinInput : "********"}
                readOnly
                placeholder="Password"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs focus:outline-none text-white font-mono tracking-widest select-none cursor-default"
              />
              <button
                type="button"
                onClick={() => {
                  if (isPinRevealed) {
                    setIsPinRevealed(false);
                  } else {
                    setShowPromptModal(true);
                    setPromptPinValue('');
                    setPromptError('');
                  }
                }}
                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                title={isPinRevealed ? "Hide Password" : "Reveal Password"}
              >
                {isPinRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {/* Link to change password dialogue box */}
            <div className="mt-1 flex justify-start">
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(true);
                  setConfirmCurrentPinValue('');
                  setNewPinValue('');
                  setConfirmPinValue('');
                  setChangePinError('');
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-space font-medium hover:underline cursor-pointer bg-transparent border-0 p-0 flex items-center gap-1"
              >
                ⚙️ Change Safe Arrival Password
              </button>
            </div>
          </div>
        </div>

        {/* EMERGENCY CONTACTS CRADLE */}
        <div className="p-4 rounded-xl bg-[#0E1017] border border-white/5 space-y-3.5">
          <span className="text-[11px] font-space font-bold tracking-widest text-emerald-400 uppercase block">
            Emergency SMS Recipients
          </span>

          {/* Contact Add Form with Name, Phone & Default */}
          <div className="space-y-1">
            <span className="text-[9.5px] font-space font-bold text-slate-400 uppercase tracking-widest block">
              Add Contact
            </span>
            <form onSubmit={handleAddContact} className="space-y-2 p-2.5 rounded-lg bg-slate-950 border border-slate-900">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g. Mom"
                    className="w-full pl-8 pr-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="tel" 
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="e.g. +1 555-382-9011"
                    className="w-full pl-8 pr-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-850">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={newContactIsDefault}
                    onChange={(e) => setNewContactIsDefault(e.target.checked)}
                    className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-[9px] text-slate-400 font-space font-medium">Set As Default Contact</span>
                </label>
                
                <button 
                  type="submit"
                  className="py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-space font-bold transition-all text-[9.5px] flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Contacts List */}
          <div className="space-y-1.5">
            {contacts.map((contact, i) => (
              <div key={i} className="flex justify-between items-center py-2 px-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{contact.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleDefaultContact(i)}
                      title={contact.isDefault ? "Starred default recipient" : "Set as default recipient"}
                      className={`px-1 rounded text-[7.5px] font-space font-bold uppercase tracking-wider transition-all select-none border cursor-pointer ${
                        contact.isDefault 
                          ? 'bg-[#10B981]/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-350'
                      }`}
                    >
                      {contact.isDefault ? '★ Default' : '☆ Pin'}
                    </button>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">{contact.phone}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => handleTestSMS(contact.phone)}
                    disabled={testSmsStatus?.loading}
                    className="px-2 py-0.5 rounded text-[9px] font-space font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {testSmsStatus?.phone === contact.phone && testSmsStatus.loading ? "Sending..." : "Test Send"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleRemoveContact(i)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Manage Contact List Link */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowManageContactListModal(true)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-space font-bold tracking-wide hover:underline cursor-pointer bg-transparent border-0 p-0 flex items-center justify-center gap-1.5 mx-auto"
              id="manage-contacts-link"
            >
              📋 Manage Contact List
            </button>
          </div>

          {testSmsStatus && (
            <div className={`p-2.5 rounded-lg text-[10px] leading-relaxed flex flex-col gap-2 select-text ${
              testSmsStatus.success 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-305'
            }`}>
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-current" />
                <div>
                  <span className="font-bold">{testSmsStatus.phone}: </span>
                  {testSmsStatus.msg}
                </div>
              </div>
              
              {testSmsStatus.smsLink && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <a 
                    href={testSmsStatus.smsLink}
                    target="_self"
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-space font-bold cursor-pointer transition-all flex items-center gap-1 text-[9px] no-underline"
                  >
                    💬 Launch Native SMS App
                  </a>
                  <a 
                    href={testSmsStatus.waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-500/25 text-emerald-400 font-space font-bold cursor-pointer transition-all flex items-center gap-1 text-[9px] no-underline"
                  >
                    📲 Dispatch Web Gateway (WhatsApp)
                  </a>
                  <button
                    type="button"
                    onClick={() => setTestSmsStatus(null)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-space font-bold cursor-pointer text-[9px]"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom distress alert text template input */}
          <div className="space-y-2">
            <label className="text-[10px] font-space font-semibold text-slate-400 uppercase tracking-widest block">
              Emergency SMS Message
            </label>
            
            {!isEditingMsg ? (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850/80 space-y-2">
                <div className="text-[10px] text-slate-300 font-mono leading-relaxed select-text bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap">
                  {msgInput || "Security alert triggered!"} <span className="text-emerald-400 font-bold font-sans">LAST KNOWN LOCATION: 123 Main Street, 98.765N 12.3456W</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingMsg(true)}
                    className="px-2.5 py-1 rounded text-[9px] font-space font-bold bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 border border-indigo-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                  >
                    ✏️ Customize Message Body
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-slate-950 rounded-lg border border-indigo-500/20">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <textarea 
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    rows={2}
                    placeholder="Custom alarm SMS content"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-[10px] leading-relaxed focus:outline-none text-white resize-none"
                    autoFocus
                  />
                </div>
                
                <div className="text-[8px] text-slate-500 leading-normal bg-black/25 p-2 rounded">
                  <span className="font-bold text-[9px] text-slate-400 block mb-0.5 uppercase tracking-wider">Preview with location append:</span>
                  <span className="font-mono text-slate-300 break-words">
                    {msgInput || "Security alert triggered!"} <span className="text-emerald-400/80 font-bold font-sans">LAST KNOWN LOCATION: 123 Main Street, 98.765N 12.3456W</span>
                  </span>
                </div>

                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMsgInput("Urgent distress notification!")}
                    className="px-2 py-0.5 rounded text-[8px] font-space text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMsg(false)}
                    className="px-2.5 py-1 rounded text-[9px] font-space font-bold bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
                  >
                    Save & Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECURITY PRESENTS SELECTOR */}
        <div className="p-4 rounded-xl bg-[#0E1017] border border-white/5 space-y-3">
          <span className="text-[11px] font-space font-bold tracking-widest text-slate-300 uppercase block">
            Safety Prioritization Presets
          </span>

          <div 
            onClick={() => setPresetWeight('balanced')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
              presetWeight === 'balanced' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'border-white/5'
            }`}
          >
            <h5 className="text-[11px] font-space font-bold text-white">Balanced Safety Routing</h5>
            <p className="text-[9px] text-slate-400 mt-0.5">Locks paths with substantial municipal lighting maps without introducing lengthy transit detours.</p>
          </div>

          <div 
            onClick={() => setPresetWeight('max-safety')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
              presetWeight === 'max-safety' 
                ? 'bg-indigo-500/10 border-indigo-500/30' 
                : 'border-white/5'
            }`}
          >
            <h5 className="text-[11px] font-space font-bold text-white">Critical Lighting & Highly Populated</h5>
            <p className="text-[9px] text-slate-400 mt-0.5">Strictly excludes dark alley blocks and desolate segments, routing strictly through highly lit business corridors.</p>
          </div>
        </div>

        {/* PRIVACY & SYSTEM PERMISSIONS */}
        <div className="p-4 rounded-xl bg-[#0E1017] border border-white/5 space-y-3.5">
          <span className="text-[11px] font-space font-bold tracking-widest text-[#EF4444] uppercase block font-sans">
            System & Privacy Permissions
          </span>

          {/* Location Permission Toggle */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-900">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-space font-bold text-slate-205">Location Data Permission</span>
              <button
                type="button"
                onClick={() => setLocationPermLocal(!locationPermLocal)}
                className={`px-2.5 py-1 rounded text-[9px] font-space font-black transition-all cursor-pointer ${
                  locationPermLocal 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {locationPermLocal ? "YES" : "NO"}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal font-sans">
              Used to create optimized safe route home based on lighting and high foot traffic. If denied, location routing metrics won't be available.
            </p>
          </div>

          {/* SMS Permission Toggle */}
          <div className="space-y-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-900">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-space font-bold text-slate-205">Distress SMS Messages</span>
              <button
                type="button"
                onClick={() => setSmsPermLocal(!smsPermLocal)}
                className={`px-2.5 py-1 rounded text-[9px] font-space font-black transition-all cursor-pointer ${
                  smsPermLocal 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {smsPermLocal ? "YES" : "NO"}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal font-sans">
              Determines if emergency text messages should go out to crisis contacts when check-in is missed.
            </p>
          </div>

          {/* Reset App Onboarding Button */}
          <div className="pt-2 border-t border-white/5 flex justify-between items-center gap-2">
            <span className="text-[9px] text-slate-400 font-mono tracking-wide">Flow State Reset:</span>
            <button
              type="button"
              onClick={() => {
                setShowResetConfirmModal(true);
              }}
              className="px-2 py-1 text-[8.5px] font-space font-bold text-rose-400 hover:text-white border border-rose-500/20 hover:bg-rose-500/30 rounded-md cursor-pointer transition-all uppercase tracking-wider"
              id="reset-onboarding-btn"
            >
              🔄 Reset App Onboarding
            </button>
          </div>
        </div>

        {/* 3. Action Complete Save Button */}
        <button 
          onClick={handleSaveChangesClick}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-space font-bold rounded-xl shadow-lg active:scale-98 flex items-center justify-center gap-1.5"
          id="save-settings-btn"
        >
          <Check className="w-4 h-4" />
          Save and Apply Configurations
        </button>

      </div>

      {/* Visual Floating Success Toast */}
      {showSavedToast && (
        <div className="absolute inset-x-4 bottom-5 bg-emerald-950 border border-emerald-500/30 text-emerald-200 text-xs font-space font-semibold rounded-xl py-3 px-4 shadow-2xl flex items-center gap-2.5 animate-fuzzy justify-center z-30">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Safety profiles applied successfully!
        </div>
      )}

      {/* Prompt to Reveal Password Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                Unlock Credentials
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Please enter your current Safe Arrival Password to reveal the security passcode.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (promptPinValue === pinInput) {
                onPinSuccess();
                setIsPinRevealed(true);
                setShowPromptModal(false);
                setPromptPinValue('');
                setPromptError('');
              } else {
                onPinFailure();
                setPromptError('Incorrect password. Please try again.');
              }
            }} className="space-y-3">
              <input 
                type="password"
                value={promptPinValue}
                onChange={(e) => setPromptPinValue(e.target.value)}
                placeholder="Enter Current Password"
                className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                autoFocus
                required
              />

              {promptError && (
                <p className="text-[9px] text-rose-400 text-center leading-normal animate-pulse">
                  ⚠️ {promptError} {5 - consecutiveFailedAttempts} {5 - consecutiveFailedAttempts === 1 ? 'attempt' : 'attempts'} remaining, account will be locked for {getNextLockoutDurationMinutes(lockoutCount)} minutes if unsuccessful log-in attempts are exhausted.
                </p>
              )}

              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowPromptModal(false);
                    setPromptPinValue('');
                    setPromptError('');
                  }}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 font-space cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-space font-bold cursor-pointer"
                >
                  Verify Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Safe Arrival Password Dialog Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Change Password
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Requirements: 4 characters minimum, 32 characters maximum. Any characters allowed.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!confirmCurrentPinValue || !newPinValue || !confirmPinValue) {
                setChangePinError('All fields are required.');
                return;
              }
              if (confirmCurrentPinValue !== pinInput) {
                onPinFailure();
                setChangePinError('Incorrect current password.');
                return;
              }
              onPinSuccess();
              if (newPinValue.length < 4 || newPinValue.length > 32) {
                setChangePinError('New password must be between 4 and 32 characters.');
                return;
              }
              if (newPinValue !== confirmPinValue) {
                setChangePinError('New passwords do not match! Please check entries.');
                return;
              }
              // Successful match
              setPinInput(newPinValue);
              setIsPinRevealed(false); // Hide the new pin by default for security
              setShowChangePinModal(false);
              setConfirmCurrentPinValue('');
              setNewPinValue('');
              setConfirmPinValue('');
              setChangePinError('');
            }} className="space-y-3">
              <div>
                <label className="text-[9px] font-space font-semibold text-slate-400 uppercase tracking-widest block mb-1">Confirm Current Password</label>
                <input 
                  type="text"
                  value={confirmCurrentPinValue}
                  onChange={(e) => setConfirmCurrentPinValue(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-space font-semibold text-slate-400 uppercase tracking-widest block mb-1">Enter New Password</label>
                <input 
                  type="text"
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value)}
                  placeholder="4 to 32 characters"
                  className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-space font-semibold text-slate-400 uppercase tracking-widest block mb-1">Confirm New Password</label>
                <input 
                  type="text"
                  value={confirmPinValue}
                  onChange={(e) => setConfirmPinValue(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                  required
                />
              </div>

              {changePinError && (
                <p className="text-[9px] text-rose-400 text-center leading-normal animate-pulse">
                  ⚠️ {changePinError} {changePinError.includes('Incorrect') && `${5 - consecutiveFailedAttempts} ${5 - consecutiveFailedAttempts === 1 ? 'attempt' : 'attempts'} remaining, account will be locked for ${getNextLockoutDurationMinutes(lockoutCount)} minutes if unsuccessful log-in attempts are exhausted.`}
                </p>
              )}

              <div className="flex gap-2 text-[10px] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePinModal(false);
                    setConfirmCurrentPinValue('');
                    setNewPinValue('');
                    setConfirmPinValue('');
                    setChangePinError('');
                  }}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 font-space cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-space font-bold cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Guard Verification Modal */}
      {showSavePromptModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4 font-sans">
            <div>
              <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                Confirm Changes
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Please enter your active Safe Arrival Password to authorize and apply configurations.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (savePromptPinValue === pinInput) {
                onPinSuccess();
                executeSaveChanges();
                setShowSavePromptModal(false);
                setSavePromptPinValue('');
                setSavePromptError('');
              } else {
                onPinFailure();
                setSavePromptError('Incorrect password. Please try again.');
              }
            }} className="space-y-3">
              <input 
                type="password"
                value={savePromptPinValue}
                onChange={(e) => setSavePromptPinValue(e.target.value)}
                placeholder="Enter Current Password"
                className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                autoFocus
                required
              />

              {savePromptError && (
                <p className="text-[9px] text-rose-400 text-center leading-normal animate-pulse">
                  ⚠️ {savePromptError} {5 - consecutiveFailedAttempts} {5 - consecutiveFailedAttempts === 1 ? 'attempt' : 'attempts'} remaining, account will be locked for {getNextLockoutDurationMinutes(lockoutCount)} minutes if unsuccessful log-in attempts are exhausted.
                </p>
              )}

              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowSavePromptModal(false);
                    setSavePromptPinValue('');
                    setSavePromptError('');
                  }}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 font-space cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-space font-bold cursor-pointer"
                >
                  Save Profiles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BACK NAVIGATION "Save changes?" MODAL */}
      {showUnsavedBackModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4 font-sans text-slate-100">
            <div>
              <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" />
                Unsaved Changes
              </h3>
              <p className="text-xs font-semibold text-slate-200 mt-2">
                Save Settings changes?
              </p>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                You have updated your safety profiles. Do you want to commit these changes to your active device before returning?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1 text-[11px] font-space">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedBackModal(false);
                  setBackVerifyPinValue('');
                  setBackVerifyPinError('');
                  setShowBackVerifyPinModal(true);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer text-center"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedBackModal(false);
                  onNavigateBack();
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-medium rounded-xl transition-colors cursor-pointer text-center"
              >
                No, Go Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedBackModal(false);
                }}
                className="w-full py-1 text-slate-500 hover:text-slate-400 font-medium text-[10px] cursor-pointer text-center"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACK NAVIGATION PIN VERIFICATION MODAL */}
      {showBackVerifyPinModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4 font-sans text-slate-100">
            <div>
              <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                Verify Settings
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Please enter your active Safe Arrival Password to save and navigate back.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (backVerifyPinValue === pinInput) {
                onPinSuccess();
                // Save and navigate back
                executeSaveChanges();
                setShowBackVerifyPinModal(false);
                setBackVerifyPinValue('');
                setBackVerifyPinError('');
              } else {
                onPinFailure();
                setBackVerifyPinError('Incorrect password. Please try again.');
              }
            }} className="space-y-3">
              <input 
                type="password"
                value={backVerifyPinValue}
                onChange={(e) => setBackVerifyPinValue(e.target.value)}
                placeholder="Enter Current Password"
                className="w-full text-center py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                autoFocus
                required
              />

              {backVerifyPinError && (
                <p className="text-[9px] text-rose-400 text-center leading-normal animate-pulse">
                  ⚠️ {backVerifyPinError} {5 - consecutiveFailedAttempts} {5 - consecutiveFailedAttempts === 1 ? 'attempt' : 'attempts'} remaining, account will be locked for {getNextLockoutDurationMinutes(lockoutCount)} minutes if unsuccessful log-in attempts are exhausted.
                </p>
              )}

              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowBackVerifyPinModal(false);
                    setBackVerifyPinValue('');
                    setBackVerifyPinError('');
                  }}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 font-space cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-space font-bold cursor-pointer"
                >
                  Verify & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CONTACT LIST MODAL */}
      {showManageContactListModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 select-none">
          <div className="w-full max-w-[310px] bg-[#0E1017] rounded-2xl border border-slate-800 p-4 shadow-2xl space-y-4 font-sans text-slate-100 flex flex-col max-h-[580px]" id="manage-contact-list-modal">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-space font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-emerald-400">📋</span>
                Manage Contact List
              </h3>
              <button
                type="button"
                onClick={() => setShowManageContactListModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer bg-transparent border-0 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* List with scroll bar if there are many contacts */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {contacts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[10px] text-slate-500">No emergency contacts configured yet.</p>
                </div>
              ) : (
                contacts.map((contact, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">{contact.name}</span>
                        {contact.isDefault ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-space font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Default
                          </span>
                        ) : (
                          <span className="bg-slate-900 text-slate-500 border border-slate-850 text-[7px] font-space font-medium px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Secondary
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-1">{contact.phone}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Toggle Default status directly in list manager */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = contacts.map((c, idx) => ({
                            ...c,
                            isDefault: idx === i ? !c.isDefault : c.isDefault
                          }));
                          setContacts(updated);
                        }}
                        className={`px-1.5 py-1 rounded-md text-[9px] font-space font-bold border transition-all cursor-pointer ${
                          contact.isDefault
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Default Recipient Status"
                      >
                        {contact.isDefault ? '🎯 Default' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = contacts.filter((_, idx) => idx !== i);
                          setContacts(updated);
                        }}
                        className="p-1 rounded bg-slate-900 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowManageContactListModal(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl text-[10.5px] font-space font-black text-slate-300 uppercase tracking-wider cursor-pointer transition-colors"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ONBOARDING CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-[290px] bg-[#0E1017] rounded-3xl border border-rose-500/20 p-5 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center text-rose-500 text-lg animate-pulse">
              ⚠️
            </div>
            <div className="space-y-1.5">
              <h4 className="font-space font-black text-xs uppercase tracking-wider text-rose-450">Confirm Reset</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                This will completely reset you to the first-time onboarding screens. All your saved profile name, custom Safe Arrival Password, custom contacts lists, and message configurations will be cleared from this device!
              </p>
            </div>
            
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-space font-black text-slate-300 uppercase tracking-wider cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  onResetOnboarding();
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-space font-black uppercase tracking-wider cursor-pointer transition-colors"
                id="confirm-onboard-reset-btn"
              >
                Reset Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Sub-Components to keep import lines clean but design pristine
function ShieldAlertIcon() {
  return (
    <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
      <Shield className="w-4 h-4" />
    </div>
  );
}
