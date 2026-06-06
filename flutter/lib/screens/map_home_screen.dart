import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../services/navigation_service.dart';
import '../providers/stroll_timer_provider.dart';

class MapHomeScreen extends StatefulWidget {
  const MapHomeScreen({super.key});

  @override
  State<MapHomeScreen> createState() => _MapHomeScreenState();
}

class _MapHomeScreenState extends State<MapHomeScreen> {
  final Completer<GoogleMapController> _mapController = Completer<GoogleMapController>();
  final NavigationService _navService = NavigationService();
  final StrollTimerProvider _timerProvider = StrollTimerProvider();

  // Map state configuration variables
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(37.774929, -122.419416), // Premium San Francisco Default
    zoom: 14.4,
  );

  // Toggle flags representing the real-time active data overlays
  bool _showStreetlights = true;
  bool _showFootTraffic = false;
  bool _showChillFilter = false;
  bool _showDisturbances = true;
  bool _showRideshareSurg = false;

  // Polyline & marker properties
  Set<Polyline> _polylines = {};
  Set<Marker> _markers = {};
  List<SafetyWeightedRoute> _computedRoutes = [];
  int _selectedRouteIndex = 0;

  // Stroll configuration states
  final TextEditingController _destinationController = TextEditingController(text: "Home (1420 Pine St)");
  final TextEditingController _etaController = TextEditingController(text: "15");
  final TextEditingController _passwordController = TextEditingController(text: "SAFEWALK2026");
  final TextEditingController _authInputController = TextEditingController();

  @override
  void initState() {
    super.override();
    _timerProvider.addListener(_handleTimerStateUpdate);
    _loadSimulatedSafetyOverlays();
  }

  @override
  void dispose() {
    _timerProvider.removeListener(_handleTimerStateUpdate);
    _timerProvider.dispose();
    _destinationController.dispose();
    _etaController.dispose();
    _passwordController.dispose();
    _authInputController.dispose();
    super.dispose();
  }

  void _handleTimerStateUpdate() {
    setState(() {}); // Repaint widgets upon ticker updates or alert statuses
  }

  /// Populates initial markers on the map including lamp posts, live crime logs, and transit hubs
  void _loadSimulatedSafetyOverlays() {
    setState(() {
      _markers = {
        // Lamp Posts (Safe spot glows)
        Marker(
          markerId: const MarkerId("lamp_01"),
          position: const LatLng(37.7760, -122.4182),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow),
          infoWindow: const InfoWindow(title: "Municipal Lamp: Operational (100W LED)"),
        ),
        Marker(
          markerId: const MarkerId("lamp_02"),
          position: const LatLng(37.7735, -122.4210),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow),
          infoWindow: const InfoWindow(title: "Municipal Lamp: Operational (80W LED)"),
        ),
        // Active Disturbances (Red markers)
        Marker(
          markerId: const MarkerId("disturbance_311_1"),
          position: const LatLng(37.7720, -122.4150),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: "311 Noise Log: Active bar crowd discharge"),
        ),
        Marker(
          markerId: const MarkerId("disturbance_crime"),
          position: const LatLng(37.7785, -122.4241),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: const InfoWindow(title: "Police Dispatch Log (Medium alert): Active disturbance reported"),
        ),
      };
    });
  }

  /// Pulls the safety-prioritized routes from the service
  Future<void> _fetchRoutes() async {
    const LatLng start = LatLng(37.7699, -122.4468); // Simulated User Location
    const LatLng end = LatLng(37.7749, -122.4194);   // Target Safespot
    
    final routes = await _navService.getSafetyWeightedRoutes(
      origin: start,
      destination: end,
      safetyWeightPreset: "max-safety",
    );

    setState(() {
      _computedRoutes = routes;
      _selectedRouteIndex = 0;
      _updateMapPolylines();
    });
  }

  void _updateMapPolylines() {
    if (_computedRoutes.isEmpty) return;
    final selectedRoute = _computedRoutes[_selectedRouteIndex];

    setState(() {
      _polylines = {
        Polyline(
          polylineId: const PolylineId("active_safety_path"),
          color: selectedRoute.safetyScore > 80 ? const Color(0xFF10B981) : const Color(0xFFFBBF24),
          width: 5,
          points: selectedRoute.points,
        )
      };
      
      // Pin start and end points
      _markers.add(
        Marker(
          markerId: const MarkerId("user_loc"),
          position: selectedRoute.points.first,
          infoWindow: const InfoWindow(title: "Your Location"),
        ),
      );
      _markers.add(
        Marker(
          markerId: const MarkerId("stroll_dest"),
          position: selectedRoute.points.last,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: "Safe Spot Destination"),
        ),
      );
    });
  }

  /// Opens the setup sheet asking for coordinates, custom arrival ETA, password and details
  void _showStrollSetupBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(
              color: Color(0xFF111319),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSheetHandle(),
                const SizedBox(height: 16),
                Text(
                  "Safeguard Stroll Setup",
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "Configure your walk. A security timer will latch immediately.",
                  style: GoogleFonts.inter(color: const Color(0xFF9CA3AF), fontSize: 13),
                ),
                const SizedBox(height: 20),
                
                // Destination Input
                TextField(
                  controller: _destinationController,
                  decoration: _getInputStyle("Destination Address", Icons.home_outlined),
                ),
                const SizedBox(height: 14),
                
                // Row with ETA and Password
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _etaController,
                        keyboardType: TextInputType.number,
                        decoration: _getInputStyle("ETA (Mins)", Icons.timer_outlined),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: _getInputStyle("Safety Password", Icons.keyboard_alt_outlined),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _startActiveStroll();
                    },
                    child: const Text("Launch Active Security Stroll"),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _startActiveStroll() {
    int parsedEta = int.tryParse(_etaController.text) ?? 15;
    
    _timerProvider.startStroll(
      destination: _destinationController.text,
      etaMinutes: parsedEta,
      password: _passwordController.text,
      userName: "Chris",
      emergencyContacts: ["+1 (555) 382-9011"],
    );
    
    _fetchRoutes(); // Draw safety polyline route automatically
  }

  void _showSafetyVerifyDialog({required bool isCancelling, required bool isModifying}) {
    _authInputController.clear();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF111319),
          title: Text(
            isCancelling ? "Cancel Guard Lock?" : "Extend Active Pathway?",
            style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Entering your password PIN turns off the active emergency distress coordinates.",
                style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF9CA3AF)),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _authInputController,
                obscureText: true,
                decoration: _getInputStyle("Safety PIN", Icons.pin_outlined),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Keep Active", style: TextStyle(color: Color(0xFF9CA3AF))),
            ),
            ElevatedButton(
              onPressed: () {
                bool authSuccess = false;
                if (isCancelling) {
                  authSuccess = _timerProvider.cancelStroll(password: _authInputController.text);
                } else if (isModifying) {
                  // Extend ETA by 15 mins for example
                  int newEta = _timerProvider.etaMinutes + 15;
                  authSuccess = _timerProvider.modifyETA(
                    password: _authInputController.text, 
                    newEtaMinutes: newEta,
                  );
                }
                
                Navigator.pop(context);
                if (authSuccess) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isCancelling ? "Stroll safely cancelled." : "ETA extended successfully!"),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Incorrect password! Security timer remains active!"),
                      backgroundColor: Color(0xFFEF4444),
                    ),
                  );
                }
              },
              child: const Text("Confirm"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Fluid Google Map Container
          GoogleMap(
            mapType: MapType.dark, // Keep night theme active
            initialCameraPosition: _initialPosition,
            markers: _markers,
            polylines: _polylines,
            zoomControlsEnabled: false,
            onMapCreated: (GoogleMapController ctrl) {
              _mapController.complete(ctrl);
            },
          ),
          
          // 2. Glossmorphic Overlay Sidepanel selectors
          _buildFloatingOverlayConfigs(),
          
          // 3. Status Headers / Warning Banner
          _buildAppHeaderAndBanner(),
          
          // 4. Safe Arrival Interactive Widgets
          _buildSecurityStatusPanel(),
        ],
      ),
    );
  }

  Widget _buildAppHeaderAndBanner() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF0D0E12).withOpacity(0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on, color: Color(0xFF6366F1), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    "HomeBound",
                    style: GoogleFonts.spaceGrotesk(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D0E12).withOpacity(0.85),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: const Icon(Icons.settings, color: Colors.white, size: 18),
              ),
              onPressed: () => Navigator.pushNamed(context, '/settings'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingOverlayConfigs() {
    return Positioned(
      top: 100,
      right: 16,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0D0E12).withOpacity(0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        padding: const EdgeInsets.all(8),
        child: Column(
          children: [
            _buildRoundToolbarToggle(
              icon: Icons.light_mode_outlined,
              active: _showStreetlights,
              tooltip: "Lamp Overlays",
              onTap: () => setState(() => _showStreetlights = !_showStreetlights),
            ),
            const SizedBox(height: 8),
            _buildRoundToolbarToggle(
              icon: Icons.people_outline,
              active: _showFootTraffic,
              tooltip: "Pedestrian Density Heatmap",
              onTap: () => setState(() => _showFootTraffic = !_showFootTraffic),
            ),
            const SizedBox(height: 8),
            _buildRoundToolbarToggle(
              icon: Icons.safety_check_outlined,
              active: _showChillFilter,
              tooltip: "Chill routing filter",
              onTap: () => setState(() => _showChillFilter = !_showChillFilter),
            ),
            const SizedBox(height: 8),
            _buildRoundToolbarToggle(
              icon: Icons.warning_amber_rounded,
              active: _showDisturbances,
              tooltip: "Crime Disturbance pins",
              onTap: () => setState(() => _showDisturbances = !_showDisturbances),
            ),
            const SizedBox(height: 8),
            _buildRoundToolbarToggle(
              icon: Icons.local_taxi_outlined,
              active: _showRideshareSurg,
              tooltip: "Surge Transit Density",
              onTap: () => setState(() => _showRideshareSurg = !_showRideshareSurg),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoundToolbarToggle({
    required IconData icon,
    required bool active,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Tooltip(
        message: tooltip,
        child: Container(
          height: 44,
          width: 44,
          decoration: BoxDecoration(
            color: active ? const Color(0xFF6366F1) : Colors.transparent,
            shape: BoxShape.circle,
            border: active ? null : Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Icon(
            icon,
            color: active ? Colors.white : const Color(0xFF9CA3AF),
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildSecurityStatusPanel() {
    return Positioned(
      bottom: 24,
      left: 16,
      right: 16,
      child: Card(
        child: Container(
          padding: const EdgeInsets.all(20),
          child: !_timerProvider.isActive
              ? _buildIdleControlWidget()
              : _buildActiveStrollSecurityWidget(),
        ),
      ),
    );
  }

  Widget _buildIdleControlWidget() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Secure Pathway Off",
                style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 4),
              Text(
                "Tap to map safe lights & activate SMS emergency gates.",
                style: GoogleFonts.inter(color: const Color(0xFF9CA3AF), fontSize: 11),
              ),
            ],
          ),
        ),
        ElevatedButton(
          onPressed: _showStrollSetupBottomSheet,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366F1),
          ),
          child: const Row(
            children: [
              Icon(Icons.play_arrow_rounded, size: 20),
              SizedBox(width: 4),
              Text("Start Stroll"),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActiveStrollSecurityWidget() {
    int totalMinutes = _timerProvider.remainingSeconds ~/ 60;
    int seconds = _timerProvider.remainingSeconds % 60;
    String minuteString = totalMinutes.toString().padLeft(2, '0');
    String secondString = seconds.toString().padLeft(2, '0');

    bool isPendingWarning = _timerProvider.currentState == StrollSecurityState.preArrivalCheckIn;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isPendingWarning ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isPendingWarning ? "CHECK-IN GATE TRIGGERED" : "ACTIVE STROLL MONITORING",
                      style: GoogleFonts.spaceGrotesk(
                        fontWeight: FontWeight.bold, 
                        fontSize: 12,
                        color: isPendingWarning ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  "Goal: ${_timerProvider.destination}",
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            Text(
              "$minuteString:$secondString",
              style: GoogleFonts.spaceGrotesk(
                fontSize: 26, 
                fontWeight: FontWeight.bold,
                color: isPendingWarning ? const Color(0xFFEF4444) : const Color(0xFF6366F1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: _timerProvider.progressRatio,
            backgroundColor: Colors.white.withOpacity(0.08),
            valueColor: AlwaysStoppedAnimation<Color>(
              isPendingWarning ? const Color(0xFFEF4444) : const Color(0xFF10B981),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () => _showSafetyVerifyDialog(isCancelling: true, isModifying: false),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444).withOpacity(0.15),
                  foregroundColor: const Color(0xFFEF4444),
                  side: BorderSide(color: const Color(0xFFEF4444).withOpacity(0.2)),
                ),
                child: const Text("Arrived / Cancel"),
              ),
            ),
            const SizedBox(width: 10),
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: const Icon(Icons.add_alarm, color: Colors.white, size: 20),
              ),
              tooltip: "Extend Walk ETA (By 15 min)",
              onPressed: () => _showSafetyVerifyDialog(isCancelling: false, isModifying: true),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSheetHandle() {
    return Center(
      child: Container(
        width: 38,
        height: 5,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }

  InputDecoration _getInputStyle(String text, IconData icon) {
    return InputDecoration(
      labelText: text,
      labelStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
      prefixIcon: Icon(icon, color: const Color(0xFF6366F1), size: 18),
      filled: true,
      fillColor: const Color(0xFF090A0E),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
      ),
    );
  }
}
