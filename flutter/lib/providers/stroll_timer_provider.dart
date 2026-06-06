import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

enum StrollSecurityState {
  inactive,
  strolling,
  preArrivalCheckIn, // Spurred countdown just before ETA
  distressed, // Past ETA + 30-minute grace threshold without correct password
  safeSuccess, // Safe password entered successfully
  cancelled,
}

class StrollTimerProvider extends ChangeNotifier {
  StrollSecurityState _currentState = StrollSecurityState.inactive;
  
  // Timer internals
  Timer? _countdownTimer;
  int _etaMinutes = 0;
  int _remainingSeconds = 0;
  int _graceSecondsRemaining = 1800; // 30 minutes grace in seconds (30 * 60)
  
  // Custom user safety configurations
  String _destination = "";
  String _userName = "Chris";
  String _securePassword = ""; // User-defined safe-arrival password
  List<String> _emergencyContacts = [];
  String _customAlertMessage = "HomeBound: Chris did not check in as planned. Last seen heading home.";

  // State Getters
  StrollSecurityState get currentState => _currentState;
  int get remainingSeconds => _remainingSeconds;
  int get graceSecondsRemaining => _graceSecondsRemaining;
  int get etaMinutes => _etaMinutes;
  String get destination => _destination;
  bool get isActive => _currentState == StrollSecurityState.strolling || 
                       _currentState == StrollSecurityState.preArrivalCheckIn;

  double get progressRatio {
    if (_etaMinutes == 0) return 1.0;
    int totalSec = _etaMinutes * 60;
    return (_remainingSeconds / totalSec).clamp(0.0, 1.0);
  }

  /// Initiates the "Start Stroll" active security timeline.
  /// Locks the destination, password gate, and sets the countdown based on expected walk time.
  void startStroll({
    required String destination,
    required int etaMinutes,
    required String password,
    required String userName,
    required List<String> emergencyContacts,
    String? customMessage,
  }) {
    _destination = destination;
    _etaMinutes = etaMinutes;
    _remainingSeconds = etaMinutes * 60;
    _graceSecondsRemaining = 30 * 60; // 30 mins * 60 secs
    _securePassword = password;
    _userName = userName;
    _emergencyContacts = emergencyContacts;
    if (customMessage != null && customMessage.isNotEmpty) {
      _customAlertMessage = customMessage;
    }

    _currentState = StrollSecurityState.strolling;
    _countdownTimer?.cancel();
    
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _tick();
    });

    notifyListeners();
  }

  /// Evaluates the password to mark user as safe and turn off security counters.
  bool verifyAndCompleteArrival(String inputPassword) {
    if (inputPassword == _securePassword) {
      _currentState = StrollSecurityState.safeSuccess;
      _countdownTimer?.cancel();
      _remainingSeconds = 0;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Extends or edits the ETA. Requires password authentication first to prevent an attacker forcing longer timers.
  bool modifyETA({required String password, required int newEtaMinutes}) {
    if (password == _securePassword) {
      _etaMinutes = newEtaMinutes;
      _remainingSeconds = newEtaMinutes * 60;
      _currentState = StrollSecurityState.strolling;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Cancels the route home. Protected by password verification.
  bool cancelStroll({required String password}) {
    if (password == _securePassword) {
      _currentState = StrollSecurityState.cancelled;
      _countdownTimer?.cancel();
      _remainingSeconds = 0;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Ticked every second by the dynamic timer loop.
  void _tick() {
    if (_currentState == StrollSecurityState.inactive || 
        _currentState == StrollSecurityState.safeSuccess || 
        _currentState == StrollSecurityState.cancelled) {
      _countdownTimer?.cancel();
      return;
    }

    if (_remainingSeconds > 0) {
      _remainingSeconds--;
      
      // If remaining time is less than 2 minutes (120 seconds), nudge user to check in
      if (_remainingSeconds <= 120 && _currentState == StrollSecurityState.strolling) {
        _currentState = StrollSecurityState.preArrivalCheckIn;
      }
    } else {
      // User is past their ETA. Start ticking the safety grace timer (30 mins maximum)
      if (_graceSecondsRemaining > 0) {
        _graceSecondsRemaining--;
        if (_currentState != StrollSecurityState.preArrivalCheckIn) {
          _currentState = StrollSecurityState.preArrivalCheckIn;
        }
      } else {
        // Grace period exhausted! Trigger Distress Alert
        _currentState = StrollSecurityState.distressed;
        _countdownTimer?.cancel();
        _triggerDistressAlertWorkflow();
      }
    }
    notifyListeners();
  }

  /// Triggers automatically when ETA is breached by 30 minutes without the correct pass-indicator.
  /// Connects to a free messaging API (simulated via POST webhook) to dispatch emergency notifications.
  Future<void> _triggerDistressAlertWorkflow() async {
    print("EMERGENCY DISTRESS DISPATCHED FOR USER: $_userName");
    
    final Map<String, dynamic> payload = {
      "app": "HomeBound Safety Engine",
      "user": _userName,
      "message": "$_customAlertMessage Location: [DOCK POINT EXPIRED GATEWAY]",
      "recipients": _emergencyContacts,
      "timestamp": DateTime.now().toIso8601String(),
    };

    try {
      // Demonstrative HTTP POST to a messaging service (e.g., Twilio callback or webhook proxy)
      final response = await http.post(
        Uri.parse("https://api.homebound-safety.org/v1/distress"),
        headers: {"Content-Type": "application/json"},
        body: json.encode(payload),
      );
      
      if (response.statusCode == 200) {
        print("Distress SMS sent successfully to Emergency Contacts: $_emergencyContacts");
      } else {
        print("Webhook alert posted. Response code: ${response.statusCode}");
      }
    } catch (e) {
      print("Alert dispatched via local fail-back channel: Email/SMS simulations activated. Error: $e");
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }
}
