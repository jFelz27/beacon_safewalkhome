import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/map_home_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  // Ensure widgets binding is initialized for native plugins
  WidgetsFlutterBinding.ensureInitialized();
  
  // Force a default orientation and transparent status bars for premium feel
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  SystemChrome.setSystemUIOverlayStyle(const SystemOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0D0E12),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const HomeBoundApp());
}

class HomeBoundApp extends StatelessWidget {
  const HomeBoundApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HomeBound',
      debugShowCheckedModeBanner: false,
      
      // Default to polished, eye-safe Dark Theme to prevent blinding users at night
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF07080B),
        primaryColor: const Color(0xFF6366F1), // Modern Indogo Accent
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981), // Emerald green for safe elements
          error: Color(0xFFEF4444), // Vibrant red for disturbances/timers
          surface: Color(0xFF111319),
          onSurface: Color(0xFFF3F4F6),
          onBackground: Color(0xFFE5E7EB),
        ),
        
        // Custom Font configuration representing Swiss-style elegant display typography
        textTheme: GoogleFonts.spaceGroteskTextTheme(
          ThemeData.dark().textTheme,
        ).copyWith(
          bodyLarge: GoogleFonts.inter(
            textStyle: const TextStyle(color: Color(0xFFE5E7EB)),
          ),
          bodyMedium: GoogleFonts.inter(
            textStyle: const TextStyle(color: Color(0xFF9CA3AF)),
          ),
        ),
        
        // Custom design configurations for Glassmorphism cards and buttons
        cardTheme: CardTheme(
          color: const Color(0xFF111319).withOpacity(0.8),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(
              color: Colors.white.withOpacity(0.08),
              width: 1,
            ),
          ),
        ),
        
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366F1),
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            textStyle: GoogleFonts.spaceGrotesk(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ),
      
      initialRoute: '/',
      routes: {
        '/': (context) => const MapHomeScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}
