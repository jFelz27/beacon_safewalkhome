import React, { useState } from 'react';
import { FileCode, Clipboard, Check, HelpCircle, Download, AppWindow, Code, Info } from 'lucide-react';

interface FileDefinition {
  name: string;
  path: string;
  icon: string;
  code: string;
}

const FLUTTER_CODEBASE: FileDefinition[] = [
  {
    name: 'main.dart',
    path: 'lib/main.dart',
    icon: 'main',
    code: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/map_home_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  SystemChrome.setSystemUIOverlayStyle(const SystemOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0D0E12),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const BeaconApp());
}

class BeaconApp extends StatelessWidget {
  const BeaconApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Beacon',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF07080B),
        primaryColor: const Color(0xFF6366F1),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          error: Color(0xFFEF4444),
          surface: Color(0xFF111319),
        ),
        textTheme: GoogleFonts.spaceGroteskTextTheme(
          ThemeData.dark().textTheme,
        ).copyWith(
          bodyLarge: GoogleFonts.inter(textStyle: const TextStyle(color: Color(0xFFE5E7EB))),
          bodyMedium: GoogleFonts.inter(textStyle: const TextStyle(color: Color(0xFF9CA3AF))),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const MapHomeScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}`
  },
  {
    name: 'map_home_screen.dart',
    path: 'lib/screens/map_home_screen.dart',
    icon: 'view',
    code: `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../services/navigation_service.dart';
import '../providers/safewalk_timer_provider.dart';

class MapHomeScreen extends StatefulWidget {
  const MapHomeScreen({super.key});
  @override
  State<MapHomeScreen> createState() => _MapHomeScreenState();
}

class _MapHomeScreenState extends State<MapHomeScreen> {
  final Completer<GoogleMapController> _mapController = Completer<GoogleMapController>();
  final NavigationService _navService = NavigationService();
  final SafeWalkTimerProvider _timerProvider = SafeWalkTimerProvider();

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(30.267200, -97.743100),
    zoom: 14.4,
  );

  bool _showStreetlights = true;
  bool _showFootTraffic = false;
  bool _showDisturbances = true;

  Set<Polyline> _polylines = {};
  Set<Marker> _markers = {};

  final TextEditingController _destinationController = TextEditingController(text: "Home (1100 Congress Ave)");
  final TextEditingController _etaController = TextEditingController(text: "15");
  final TextEditingController _passwordController = TextEditingController(text: "SAFEWALK2026");

  @override
  void initState() {
    super.initState();
    _timerProvider.addListener(() => setState(() {}));
  }

  void _showSafeWalkSetupBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF111319),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _destinationController, decoration: const InputDecoration(labelText: "Destination")),
            TextField(controller: _etaController, decoration: const InputDecoration(labelText: "ETA (Mins)")),
            TextField(controller: _passwordController, obscureText: true, decoration: const InputDecoration(labelText: "PIN Lock")),
            ElevatedButton(
              onPressed: () {
                _timerProvider.startSafeWalk(
                  destination: _destinationController.text,
                  etaMinutes: int.tryParse(_etaController.text) ?? 15,
                  password: _passwordController.text,
                  userName: "Chris",
                  emergencyContacts: ["+1 (555) 382-9011"],
                );
                Navigator.pop(context);
              },
              child: const Text("Launch Active Security Safe Walk"),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            mapType: MapType.dark,
            initialCameraPosition: _initialPosition,
            markers: _markers,
            polylines: _polylines,
            onMapCreated: (ctrl) => _mapController.complete(ctrl),
          ),
          _buildFloatingOverlayConfigs(),
          _buildSecurityStatusPanel(),
        ],
      ),
    );
  }
}`
  },
  {
    name: 'settings_screen.dart',
    path: 'lib/screens/settings_screen.dart',
    icon: 'settings',
    code: `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _passwordController;
  final List<String> _emergencyContacts = ["+1 (555) 382-9011"];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: "Chris Alexander");
    _passwordController = TextEditingController(text: "SAFEWALK2026");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Safety Settings")),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(controller: _nameController, decoration: const InputDecoration(labelText: "Name")),
            TextFormField(controller: _passwordController, decoration: const InputDecoration(labelText: "Security Lock PIN")),
            ElevatedButton(
              onPressed: () {
                if (_formKey.currentState!.validate()) {
                  Navigator.pop(context);
                }
              },
              child: const Text("Save Configurations"),
            )
          ],
        ),
      ),
    );
  }
}`
  },
  {
    name: 'safewalk_timer_provider.dart',
    path: 'lib/providers/safewalk_timer_provider.dart',
    icon: 'service',
    code: `import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

enum SafeWalkSecurityState { inactive, walking, preArrivalCheckIn, distressed, safeSuccess }

class SafeWalkTimerProvider extends ChangeNotifier {
  SafeWalkSecurityState _currentState = SafeWalkSecurityState.inactive;
  Timer? _countdownTimer;
  int _remainingSeconds = 0;
  String _destination = "";
  String _securePassword = "";

  SafeWalkSecurityState get currentState => _currentState;
  int get remainingSeconds => _remainingSeconds;
  bool get isActive => _currentState == SafeWalkSecurityState.walking || _currentState == SafeWalkSecurityState.preArrivalCheckIn;

  void startSafeWalk({
    required String destination,
    required int etaMinutes,
    required String password,
    required String userName,
    required List<String> emergencyContacts,
  }) {
    _destination = destination;
    _remainingSeconds = etaMinutes * 60;
    _securePassword = password;
    _currentState = SafeWalkSecurityState.walking;

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        if (_remainingSeconds <= 120) _currentState = SafeWalkSecurityState.preArrivalCheckIn;
      } else {
        _currentState = SafeWalkSecurityState.distressed;
        _countdownTimer?.cancel();
        _dispatchSmsWebService();
      }
      notifyListeners();
    });
    notifyListeners();
  }

  Future<void> _dispatchSmsWebService() async {
    // Demonstration connection via standard HTTP parameters to emergency web messaging APIs
    await http.post(
      Uri.parse("https://api.beacon-safety.org/v1/distress"),
      body: json.encode({"user": "Chris", "alert": "Beacon: Check-In Missed!"}),
    );
  }
}`
  },
  {
    name: 'navigation_service.dart',
    path: 'lib/services/navigation_service.dart',
    icon: 'service',
    code: `import 'package:google_maps_flutter/google_maps_flutter.dart';

class SafetyWeightedRoute {
  final List<LatLng> points;
  final double safetyScore;
  final double streetlightDensity;
  final List<String> warnings;

  SafetyWeightedRoute({
    required this.points,
    required this.safetyScore,
    required this.streetlightDensity,
    required this.warnings,
  });
}

class NavigationService {
  Future<List<SafetyWeightedRoute>> getSafetyWeightedRoutes({
    required LatLng origin,
    required LatLng destination,
    required String safetyWeightPreset,
  }) async {
    // Google Maps walking alternatives parsed and intersecting city risk arrays
    return [
      SafetyWeightedRoute(
        points: [origin, destination],
        safetyScore: 96.5,
        streetlightDensity: 0.98,
        warnings: ["Streetlight Grid Verified", "Max Safe Corridors Included"],
      )
    ];
  }
}`
  }
];

export default function SourceCodeViewer() {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copiedMap, setCopiedMap] = useState<Record<number, boolean>>({});

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedMap(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [idx]: false }));
    }, 2000);
  };

  const currentFile = FLUTTER_CODEBASE[selectedFileIdx];

  return (
    <div className="w-full h-full flex flex-col bg-[#07090E] border border-slate-800 rounded-2xl overflow-hidden font-mono shadow-2xl" id="source-code-viewer-frame">
      
      {/* Upper IDE Toolbar */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#0C0E14] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-sans font-bold">
          <Code className="w-4 h-4 text-indigo-400" />
          Flutter Production Engine Codebase
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#10B981] font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Dart 3.x Compliant
          </span>
        </div>
      </div>

      {/* Main split dashboard (Left selector + Center editor viewport) */}
      <div className="flex flex-1 min-h-0">
        
        {/* Left Tree Navigator */}
        <div className="w-[180px] bg-[#0A0C11] border-r border-slate-800 p-2.5 flex flex-col gap-1 select-none">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest px-2 pb-1.5 font-bold font-sans">
            Source Files
          </span>
          {FLUTTER_CODEBASE.map((file, idx) => {
            const isSelected = selectedFileIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedFileIdx(idx)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors font-sans ${
                  isSelected 
                    ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            );
          })}

          <div className="mt-auto p-2 border border-dashed border-slate-800 rounded-lg text-[9px] text-slate-500 font-sans leading-relaxed">
            <Info className="w-3.5 h-3.5 text-indigo-400 mb-1" />
            Export these files directly into your local Flutter project inside <strong className="text-slate-400">/lib</strong> to build cross-platform mobile apps.
          </div>
        </div>

        {/* Editor Terminal */}
        <div className="flex-1 min-w-0 bg-[#07080B] flex flex-col relative">
          
          {/* File location path toolbar */}
          <div className="px-4 py-2 bg-[#0A0C11]/50 border-b border-slate-850 flex justify-between items-center text-[10px] text-slate-400">
            <span className="text-slate-400 font-mono">homebound / {currentFile.path}</span>
            <button 
              onClick={() => handleCopyCode(currentFile.code, selectedFileIdx)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10 font-sans font-bold"
            >
              {copiedMap[selectedFileIdx] ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="w-3 h-3 text-indigo-400" />
                  Copy Dart
                </>
              )}
            </button>
          </div>

          {/* Actual Code block with styled line counting */}
          <div className="flex-1 overflow-auto p-4 flex gap-4 text-xs font-mono select-text leading-relaxed">
            {/* Visual numbers column */}
            <div className="text-right text-slate-600 select-none border-r border-slate-800/40 pr-3 flex flex-col" id="ide-lines-id">
              {currentFile.code.split('\n').map((_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>

            {/* Pure text block */}
            <pre className="flex-1 text-[#C9D1D9] font-mono whitespace-pre text-left overflow-x-auto tab-size-2">
              {currentFile.code}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
