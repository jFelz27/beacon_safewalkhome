import React, { useState } from 'react';
import { 
  Shield, 
  Code, 
  Smartphone, 
  Zap, 
  Users, 
  Terminal, 
  HelpCircle, 
  FileText,
  AlertTriangle,
  Lightbulb,
  Lock
} from 'lucide-react';
import MapHomeScreen from './components/MapHomeScreen';
import SettingsScreen from './components/SettingsScreen';
import SourceCodeViewer from './components/SourceCodeViewer';
import BeaconLogo from './components/BeaconLogo';
import OnboardingScreen from './components/OnboardingScreen';
import { DistressTimerState, Contact } from './types';

export default function App() {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'app' | 'flutter'>('app');
  
  // Shared Onboarding States
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('beacon_onboarded') === 'true';
  });
  const [locationPermission, setLocationPermission] = useState<boolean>(() => {
    const saved = localStorage.getItem('beacon_location_permission');
    return saved !== 'false'; // default to true
  });
  const [smsPermission, setSmsPermission] = useState<boolean>(() => {
    const saved = localStorage.getItem('beacon_sms_permission');
    return saved !== 'false'; // default to true
  });

  // Mobile Simulator Routing
  const [mobileRoute, setMobileRoute] = useState<'map' | 'settings'>('map');

  // Shared Global States for Simulator Interactivity
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('beacon_username') || 'Chris Alexander';
  });
  const [safeArrivalPin, setSafeArrivalPin] = useState(() => {
    return localStorage.getItem('beacon_pin') || 'SAFEWALK2026';
  });
  const [emergencyContacts, setEmergencyContacts] = useState<Contact[]>([
    { name: 'Mom/Guardian', phone: '+1 (555) 382-9011', isDefault: true },
    { name: 'Alice Roommate', phone: '+1 (555) 723-4581', isDefault: false }
  ]);
  const [customAlertMessage, setCustomAlertMessage] = useState(() => {
    const savedName = localStorage.getItem('beacon_username') || 'Chris Alexander';
    return `Beacon Emergency: ${savedName} did not check in within the expected time limit. Walk route GPS tracked inside servers. Pick up immediately.`;
  });

  const [phoneBattery, setPhoneBattery] = useState<number>(98);

  // Sync actual device battery state if accessible
  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setPhoneBattery(Math.round(battery.level * 100));
        const handleLevelChange = () => {
          setPhoneBattery(Math.round(battery.level * 100));
        };
        battery.addEventListener('levelchange', handleLevelChange);
        return () => {
          battery.removeEventListener('levelchange', handleLevelChange);
        };
      }).catch(() => {});
    }
  }, []);

  // Lifted SMS Simulator and Lockout states
  const [showPhoneSimulator, setShowPhoneSimulator] = useState(false);
  const [receivedSimulatedSMS, setReceivedSimulatedSMS] = useState<{
    id: string;
    phone: string;
    message: string;
    time: string;
    smsLink: string;
    waLink: string;
  }[]>([]);

  const [consecutiveFailedAttempts, setConsecutiveFailedAttempts] = useState<number>(0);
  const [lockoutCount, setLockoutCount] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutSecs, setRemainingLockoutSecs] = useState<number>(0);

  // Active Security Latch timer state
  const [timerState, setTimerState] = useState<DistressTimerState>({
    isActive: false,
    destination: '',
    etaMinutes: 0,
    remainingSeconds: 0,
    passwordHash: '',
    phoneNumbers: [],
    isDistressed: false,
    checkInRequired: false,
  });

  // Track countdown timer for lockout
  React.useEffect(() => {
    if (!lockoutUntil) {
      setRemainingLockoutSecs(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = lockoutUntil - Date.now();
      if (diff <= 0) {
        setLockoutUntil(null);
        setRemainingLockoutSecs(0);
      } else {
        setRemainingLockoutSecs(Math.ceil(diff / 1000));
      }
    }, 1000);

    const initDiff = lockoutUntil - Date.now();
    if (initDiff > 0) {
      setRemainingLockoutSecs(Math.ceil(initDiff / 1000));
    } else {
      setLockoutUntil(null);
      setRemainingLockoutSecs(0);
    }

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handlePinSuccess = () => {
    setConsecutiveFailedAttempts(0);
  };

  const handlePinFailure = () => {
    setConsecutiveFailedAttempts(prev => {
      const nextFailed = prev + 1;
      if (nextFailed >= 5) {
        const nextLockoutCount = lockoutCount + 1;
        setLockoutCount(nextLockoutCount);

        // Tiered lockout durations: 1m, 5m, 30m, 1h, 24h
        let durationMs = 60 * 1000;
        if (nextLockoutCount === 1) durationMs = 1 * 60 * 1000;
        else if (nextLockoutCount === 2) durationMs = 5 * 60 * 1000;
        else if (nextLockoutCount === 3) durationMs = 30 * 60 * 1000;
        else if (nextLockoutCount === 4) durationMs = 60 * 60 * 1000;
        else durationMs = 24 * 60 * 60 * 1000;

        const unlockTime = Date.now() + durationMs;
        setLockoutUntil(unlockTime);

        // Notify default emergency contacts via simulated SMS
        const defaultContacts = emergencyContacts.filter(c => c.isDefault);
        const targetContacts = defaultContacts.length > 0 ? defaultContacts : emergencyContacts;

        const lockoutDurationDesc = 
          nextLockoutCount === 1 ? "1 minute" :
          nextLockoutCount === 2 ? "5 minutes" :
          nextLockoutCount === 3 ? "30 minutes" :
          nextLockoutCount === 4 ? "1 hour" : "24 hours";

        const alertBody = `[SECURITY NOTICE] Beacon: App account lockout active for 5 consecutive incorrect safety password attempts on ${userName}'s device. Suggesting a safety check-in / wellness call might be a good idea immediately. Device will remain locked for ${lockoutDurationDesc}.`;

        const newSMSLogs = targetContacts.map((contact, idx) => {
          const cleanPhone = contact.phone.trim();
          const stripPhone = cleanPhone.replace(/[^0-9+]/g, '');
          const encodedBody = encodeURIComponent(alertBody);
          const smsLink = `sms:${stripPhone}?body=${encodedBody}`;
          const waLink = `https://api.whatsapp.com/send?phone=${stripPhone}&text=${encodedBody}`;

          return {
            id: `lockout-${Date.now()}-${idx}`,
            phone: `${contact.name || 'Emergency'} (${cleanPhone})`,
            message: alertBody,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            smsLink,
            waLink
          };
        });

        if (newSMSLogs.length > 0) {
          setReceivedSimulatedSMS(prev => [...newSMSLogs, ...prev]);
          setShowPhoneSimulator(true);
        }

        return 0; // reset failures for next cycle
      }
      return nextFailed;
    });
  };

  const handleOnboardingComplete = (name: string, pin: string, locPerm: boolean, smsPerm: boolean) => {
    localStorage.setItem('beacon_username', name);
    localStorage.setItem('beacon_pin', pin);
    localStorage.setItem('beacon_location_permission', locPerm ? 'true' : 'false');
    localStorage.setItem('beacon_sms_permission', smsPerm ? 'true' : 'false');
    localStorage.setItem('beacon_onboarded', 'true');

    setUserName(name);
    setSafeArrivalPin(pin);
    setLocationPermission(locPerm);
    setSmsPermission(smsPerm);
    setCustomAlertMessage(`Beacon Emergency: ${name} did not check in within the expected time limit. Walk route GPS tracked inside servers. Pick up immediately.`);
    setIsOnboarded(true);
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('beacon_username');
    localStorage.removeItem('beacon_pin');
    localStorage.removeItem('beacon_location_permission');
    localStorage.removeItem('beacon_sms_permission');
    localStorage.removeItem('beacon_onboarded');
    localStorage.removeItem('beacon_custom_alert_msg');

    setUserName('Chris Alexander');
    setSafeArrivalPin('SAFEWALK2026');
    setLocationPermission(true);
    setSmsPermission(true);
    setCustomAlertMessage('Beacon Emergency: Chris Alexander did not check in within the expected time limit. Walk route GPS tracked inside servers. Pick up immediately.');
    
    // Also reset device state
    setConsecutiveFailedAttempts(0);
    setLockoutUntil(null);
    setMobileRoute('map');
    setIsOnboarded(false);
  };

  const formatLockoutTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}m ${pad(secs)}s`;
  };

  return (
    <div className="min-h-screen w-full bg-[#050608] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" id="main-application-frame">
      
      {/* Upper Navigation Rail */}
      <header className="px-6 py-4 bg-[#0A0B10] border-b border-slate-850 flex flex-wrap justify-between items-center gap-4 shadow-xl z-25">
        <div className="flex items-center gap-3">
          <BeaconLogo size={36} showBadge={true} />
          <div>
            <h1 className="text-base font-space font-bold tracking-tight text-white leading-none">Beacon</h1>
            <span className="text-[10px] text-indigo-400 font-mono font-semibold tracking-wider uppercase">Safety Navigation Platform</span>
          </div>
        </div>

        {/* Global Tab Switchers */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800" id="global-tabs-dock">
          <button
            onClick={() => setActiveWorkspaceTab('app')}
            className={`px-4 py-2 rounded-lg text-xs font-space font-medium transition-all flex items-center gap-2 ${
              activeWorkspaceTab === 'app'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab-pwa-simulator"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Interactive Simulator
          </button>
          
          <button
            onClick={() => setActiveWorkspaceTab('flutter')}
            className={`px-4 py-2 rounded-lg text-xs font-space font-medium transition-all flex items-center gap-2 ${
              activeWorkspaceTab === 'flutter'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab-flutter-code"
          >
            <Code className="w-3.5 h-3.5" />
            Flutter Source Code ({FLUTTER_FILE_COUNT()})
          </button>
        </div>
      </header>

      {/* Main Container Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col justify-center min-h-0">
        {activeWorkspaceTab === 'app' ? (
          /* WORKSPACE MAIN 1: INTERACTIVE SIMULATOR DEVICE + DESKTOP DETAILS PANES */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch" id="app-workspace-split">
            
            {/* Left Column: Conceptual & Testing Guidelines Panel */}
            <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
              
              {/* Product philosophy card */}
              <div className="p-5 rounded-2xl bg-[#0D0F16] border border-slate-800 shadow-lg space-y-4">
                <span className="px-2.5 py-1 text-[9px] font-space font-bold tracking-wide text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/25 rounded-md inline-block">
                  Design Mission & Objectives
                </span>
                
                <h2 className="text-xl font-space font-bold tracking-tight text-white leading-snug">
                  Safe passage walkways. Active monitoring 24/7.
                </h2>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Beacon</strong> is a high-performance, safe navigation mobile app engineered specifically for women navigating complex urban centers alone at night. Built in Flutter for easily compiling cross-platform web, iOS, and Android formats.
                </p>

                {/* Core Pillars Bullet Grid */}
                <div className="grid grid-cols-1 gap-2.5 pt-1.5" id="concept-pillars-grid">
                  <div className="flex gap-2.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold mt-0.5">✓</div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      <strong className="text-slate-200">Municipal Light Mapping:</strong> Pulls streetlight positions directly from city open-data bases to route walkways along well-illuminated segments.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold mt-0.5">✓</div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      <strong className="text-slate-200">Security Check-In Latch:</strong> Starts lock timers during a Safe Walk. Failsafe passwords prevent forcing larger intervals.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold mt-0.5">✓</div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      <strong className="text-slate-200">Distress SMS Automations:</strong> Fires simulated messaging post triggers to emergency contacts directly if check-ins are missed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Step-by-Step Testing Manual */}
              <div className="p-5 rounded-2xl bg-[#0D0F16] border border-slate-800 shadow-lg space-y-3.5">
                <span className="text-[9px] font-space font-bold tracking-widest text-[#F59E0B] uppercase">
                  How to test timer triggers:
                </span>
                
                <h3 className="text-sm font-space font-bold text-white">Witness Simulated Emergency Dispatches</h3>

                <ol className="space-y-2 text-[11px] text-slate-400" id="instructions-ordered-list">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 font-space font-bold bg-slate-800 text-slate-300 flex items-center justify-center rounded-full flex-shrink-0 text-[10px]">1</span>
                    <span>Click <strong className="text-indigo-400 shadow-indigo-500/10">Start Safe Walk</strong> in the phone mockup, set walk ETA to <strong className="text-slate-200">1 min</strong> or leave default, and tap Lock Pathway.</span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 font-space font-bold bg-slate-800 text-slate-300 flex items-center justify-center rounded-full flex-shrink-0 text-[10px]">2</span>
                    <span>Click the amber <strong className="text-amber-400">Fast-Test Alarm</strong> button inside the active Safe Walk panel. This fast-forwards the timer directly to <strong className="text-slate-200">15 seconds left</strong>.</span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 font-space font-bold bg-slate-800 text-slate-300 flex items-center justify-center rounded-full flex-shrink-0 text-[10px]">3</span>
                    <span>Watch the screen shift to <strong className="text-[#EF4444] animate-pulse">CHECK-IN PROMPT</strong>. Let the seconds expire without typing the Safe Arrival Password.</span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 font-space font-bold bg-slate-800 text-slate-300 flex items-center justify-center rounded-full flex-shrink-0 text-[10px]">4</span>
                    <span>The countdown hit zero, triggering the active distress dispatch to emergency contacts list! System logs update inside the map grid.</span>
                  </li>
                </ol>

                <div className="pt-2 flex gap-2">
                  <span className="px-2 py-1 text-[10px] font-mono rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Test Password: {safeArrivalPin}
                  </span>
                </div>
              </div>

              {/* Mock Device Battery and Hardware Controller */}
              <div id="mock-battery-hardware-controller" className="p-4 rounded-2xl bg-[#0D0F16] border border-slate-800 shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-space font-bold tracking-wider text-rose-450 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#F59E0B]" />
                    Simulator Mock Battery Profile
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${phoneBattery <= 5 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {phoneBattery}% {phoneBattery <= 5 ? 'CRITICAL' : 'OK'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Power percentage level:</span>
                    <span className="font-mono text-white">{phoneBattery}%</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={phoneBattery}
                    onChange={(e) => setPhoneBattery(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPhoneBattery(4)}
                    className="flex-1 py-1 px-2 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-space font-bold text-[9px] uppercase tracking-wider text-center transition-colors cursor-pointer"
                  >
                    ⚠️ Low Battery Mock (4%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneBattery(80)}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700 font-space font-bold text-[9px] uppercase tracking-wider text-center transition-colors cursor-pointer"
                  >
                    🔋 Recharge (80%)
                  </button>
                </div>

                {phoneBattery <= 5 && (
                  <div className="p-2 rounded bg-rose-500/5 border border-rose-500/10 text-[9px] text-rose-300 leading-relaxed font-sans">
                    <strong>Critical Rule Enabled:</strong> Initiating a walk with battery &lt; 5% triggers immediate low battery SMS alarms to emergency contact lists.
                  </div>
                )}
              </div>

              {/* Status Feed for Web Messaging webhooks */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex gap-3 items-center">
                <Terminal className="w-4 h-4 text-indigo-400 animate-pulse flex-shrink-0" />
                <div className="text-[10px] leading-relaxed text-slate-400 font-mono truncate">
                  <span className="font-bold text-slate-300">Beacon API Dispatch Service:</span> Webhooks live on standard HTTP paths. Dispatching broadcast coordinates is active.
                </div>
              </div>

            </div>

            {/* Right Column: Premium High-Fidelity Smartphone Wrapper */}
            <div className="lg:col-span-7 flex justify-center items-center py-4" id="pwa-device-column">
              <div 
                className="relative w-[340px] h-[670px] bg-slate-950 rounded-[44px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[7px] border-[#2C2E3B] transition-transform duration-300"
                id="simulator-device-body"
              >
                
                {/* Smartphone Speaker Ear Piece / Camera Notch cut */}
                <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 z-35 w-24 h-4.5 bg-[#2C2E3B] rounded-b-2xl flex items-center justify-center gap-1.5">
                  <div className="w-8 h-1 rounded-full bg-slate-600" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                </div>

                {/* Smartphone Outer Side Volume buttons (aesthetic details) */}
                <div className="absolute top-[120px] -left-[10px] w-1.5 h-10 bg-[#2C2E3B] rounded-l" />
                <div className="absolute top-[170px] -left-[10px] w-1.5 h-10 bg-[#2C2E3B] rounded-l" />
                <div className="absolute top-[140px] -right-[10px] w-1.5 h-12 bg-[#2C2E3B] rounded-r" />

                {/* Simulated Screen Body Viewport */}
                <div className="w-full h-full rounded-[30px] overflow-hidden border border-slate-900 bg-[#090A0E] flex flex-col relative">
                  
                  {/* Status Bar line detailing times */}
                  <div className="h-6.5 bg-[#0D0E12] px-4 pt-1 flex justify-between items-center text-[9px] text-slate-400 font-medium select-none border-b border-white/5 font-mono">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded bg-indigo-500/20 text-indigo-400 font-sans font-bold flex items-center justify-center scale-90">5G</span>
                      <span className={phoneBattery <= 5 ? 'text-rose-450 font-bold animate-pulse' : ''}>🔋 {phoneBattery}%</span>
                    </div>
                  </div>

                  {/* Dynamic internal routes */}
                  <div className="flex-1 min-h-0 relative">
                    {remainingLockoutSecs > 0 ? (
                      <div className="absolute inset-0 z-50 bg-[#0E1017] p-5 flex flex-col justify-between items-center text-center font-sans">
                        <div className="w-full flex-1 flex flex-col justify-center items-center space-y-4">
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 animate-pulse">
                            <Lock className="w-10 h-10" />
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="font-space font-black text-sm tracking-wide text-rose-500 uppercase">
                              Security Lockout
                            </h3>
                            <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded uppercase font-bold">
                              Incident Occurrence #{lockoutCount}
                            </span>
                          </div>

                          <div className="bg-slate-950 px-4 py-3 border border-slate-900 rounded-xl space-y-0.5 w-full">
                            <span className="text-[10px] font-sans text-slate-500 font-bold uppercase tracking-wider block">
                              Timer Lock Remaining
                            </span>
                            <div className="text-xl font-mono font-bold tracking-widest text-[#EF4444] leading-none">
                              {formatLockoutTime(remainingLockoutSecs)}
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans max-w-[240px]">
                            This device's safety console is currently disabled due to 5 consecutive failed Safe Arrival Password validation entries.
                          </p>

                          <div className="p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/10 text-left w-full space-y-1">
                            <span className="text-[8px] font-space font-bold uppercase tracking-wider text-rose-450 block">
                              📡 Automated Broadcast dispatched:
                            </span>
                            <p className="text-[9px] text-slate-400 leading-normal font-mono">
                              Suggestion warning sent to target crisis contact: <strong className="text-slate-300">{
                                emergencyContacts.filter(c => c.isDefault).map(c => c.name || c.phone).join(', ') || 
                                emergencyContacts[0]?.name || emergencyContacts[0]?.phone || 'None Set'
                              }</strong>
                            </p>
                          </div>
                        </div>

                        <div className="w-full pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLockoutUntil(null);
                              setConsecutiveFailedAttempts(0);
                            }}
                            className="text-[9px] font-mono font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest hover:underline bg-transparent border-0 p-0 cursor-pointer"
                          >
                            🔓 Demo Clear Lockout
                          </button>
                        </div>
                      </div>
                    ) : !isOnboarded ? (
                      <OnboardingScreen 
                        onComplete={handleOnboardingComplete}
                        initialName={userName === 'Chris Alexander' ? '' : userName}
                        initialPin={safeArrivalPin === 'SAFEWALK2026' ? '' : safeArrivalPin}
                      />
                    ) : mobileRoute === 'map' ? (
                      <MapHomeScreen 
                        timerState={timerState}
                        setTimerState={setTimerState}
                        userName={userName}
                        emergencyContacts={emergencyContacts}
                        safeArrivalPin={safeArrivalPin}
                        customAlertMessage={customAlertMessage}
                        onNavigateToSettings={() => setMobileRoute('settings')}
                        receivedSimulatedSMS={receivedSimulatedSMS}
                        setReceivedSimulatedSMS={setReceivedSimulatedSMS}
                        showPhoneSimulator={showPhoneSimulator}
                        setShowPhoneSimulator={setShowPhoneSimulator}
                        onPinSuccess={handlePinSuccess}
                        onPinFailure={handlePinFailure}
                        consecutiveFailedAttempts={consecutiveFailedAttempts}
                        lockoutCount={lockoutCount}
                        phoneBattery={phoneBattery}
                        locationPermission={locationPermission}
                        smsPermission={smsPermission}
                      />
                    ) : (
                      <SettingsScreen 
                        userName={userName}
                        setUserName={setUserName}
                        emergencyContacts={emergencyContacts}
                        setEmergencyContacts={setEmergencyContacts}
                        safeArrivalPin={safeArrivalPin}
                        setSafeArrivalPin={setSafeArrivalPin}
                        customAlertMessage={customAlertMessage}
                        setCustomAlertMessage={setCustomAlertMessage}
                        onNavigateBack={() => setMobileRoute('map')}
                        onPinSuccess={handlePinSuccess}
                        onPinFailure={handlePinFailure}
                        consecutiveFailedAttempts={consecutiveFailedAttempts}
                        lockoutCount={lockoutCount}
                        phoneBattery={phoneBattery}
                        locationPermission={locationPermission}
                        setLocationPermission={setLocationPermission}
                        smsPermission={smsPermission}
                        setSmsPermission={setSmsPermission}
                        onResetOnboarding={handleResetOnboarding}
                      />
                    )}
                  </div>

                </div>

              </div>
            </div>

          </div>
        ) : (
          /* WORKSPACE MAIN 2: FLUTTER NATIVE DEVELOPMENT ENGINE FILE BROWSER */
          <div className="flex-1 min-h-0 py-4" id="flutter-code-section">
            <SourceCodeViewer />
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="py-5 bg-[#050608] text-center text-[10.5px] text-slate-500 font-mono tracking-wider border-t border-slate-850 mt-auto flex-shrink-0">
        © 2026 Beacon Safety Systems Inc. All safety logs encrypted locally on-device.
      </footer>
    </div>
  );
}

function FLUTTER_FILE_COUNT() {
  return 5;
}
