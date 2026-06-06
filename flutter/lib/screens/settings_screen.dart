import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Settings form states
  late TextEditingController _nameController;
  late TextEditingController _passwordController;
  late TextEditingController _messageController;
  late TextEditingController _newContactController;
  
  final List<String> _emergencyContacts = [
    "+1 (555) 382-9011",
    "+1 (555) 723-4581",
  ];
  
  String _safetyPreset = "balanced";

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: "Chris Alexander");
    _passwordController = TextEditingController(text: "SAFEWALK2026");
    _messageController = TextEditingController(
      text: "Alert from HomeBound: Chris did not make it home within the ETA. Please pick up or check in immediately.",
    );
    _newContactController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _passwordController.dispose();
    _messageController.dispose();
    _newContactController.dispose();
    super.dispose();
  }

  void _addContact() {
    if (_newContactController.text.isNotEmpty) {
      setState(() {
        _emergencyContacts.add(_newContactController.text);
        _newContactController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Emergency contact added successfully!"),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  void _removeContact(int index) {
    setState(() {
      _emergencyContacts.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          "Safety Settings",
          style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF0D0E12),
        elevation: 0,
        centerTitle: true,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF07080B), Color(0xFF0F111A)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeaderSection(),
                const SizedBox(height: 24),
                
                // Account details glass card
                _buildProfileSettings(),
                const SizedBox(height: 20),
                
                // Active Emergency Contacts List
                _buildEmergencyContactsCard(),
                const SizedBox(height: 20),
                
                // Security preset and options
                _buildRoutingPresetCard(),
                const SizedBox(height: 30),
                
                _buildSaveButton(),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
              ),
              child: const Icon(Icons.shield_outlined, color: Color(0xFF6366F1)),
            ),
            const SizedBox(width: 14),
            Text(
              "Profile & Security Hub",
              style: GoogleFonts.spaceGrotesk(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          "Manage emergency pins, custom distress alerts, and safety contacts. Configured info is encrypted locally.",
          style: GoogleFonts.inter(
            fontSize: 14,
            color: const Color(0xFF9CA3AF),
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _buildProfileSettings() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111319).withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "User Profile & Safe Password",
            style: GoogleFonts.spaceGrotesk(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF6366F1),
            ),
          ),
          const SizedBox(height: 16),
          
          // Name field
          TextFormField(
            controller: _nameController,
            style: GoogleFonts.inter(color: Colors.white),
            decoration: _getInputDecoration("Full Name", Icons.person_outline),
          ),
          const SizedBox(height: 16),
          
          // Safety Password gate
          TextFormField(
            controller: _passwordController,
            style: GoogleFonts.inter(color: Colors.white),
            obscureText: true,
            decoration: _getInputDecoration(
              "Safe Arrival Password PIN", 
              Icons.lock_outline,
              helperText: "Used to authenticate check-ins and extend walkways",
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyContactsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111319).withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Emergency Contacts (Distress Recipients)",
            style: GoogleFonts.spaceGrotesk(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF10B981),
            ),
          ),
          const SizedBox(height: 12),
          
          // Contact list builder
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _emergencyContacts.length,
            separatorBuilder: (context, index) => Divider(color: Colors.white.withOpacity(0.05)),
            itemBuilder: (context, index) {
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFF0F172A),
                  child: Icon(Icons.phone_iphone, size: 18, color: Color(0xFF10B981)),
                ),
                title: Text(
                  _emergencyContacts[index],
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 15),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.remove_circle_outline, color: Color(0xFFEF4444)),
                  onPressed: () => _removeContact(index),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          
          // Add new contact row
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _newContactController,
                  keyboardType: TextInputType.phone,
                  style: GoogleFonts.inter(color: Colors.white),
                  decoration: _getInputDecoration("+1 Phone Number", Icons.add_call),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _addContact,
                child: Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.add, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Custom Alert Message input field
          TextFormField(
            controller: _messageController,
            maxLines: 3,
            style: GoogleFonts.inter(color: Colors.white, fontSize: 13),
            decoration: _getInputDecoration(
              "Customizable Distress Alert Broadcast", 
              Icons.sms_outlined,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoutingPresetCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111319).withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Routing Philosophy Weight",
            style: GoogleFonts.spaceGrotesk(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 14),
          _buildPresetRadioOption("balanced", "Balanced Route", "Optimal safety coverage without extreme delays."),
          const SizedBox(height: 10),
          _buildPresetRadioOption("max-safety", "Maximized Lighting & Foot Traffic", "Avoid any segment missing streetlights, even if it adds 15+ mins."),
        ],
      ),
    );
  }

  Widget _buildPresetRadioOption(String value, String title, String subtitle) {
    bool isSelected = _safetyPreset == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _safetyPreset = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF6366F1).withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? const Color(0xFF6366F1).withOpacity(0.5) : Colors.white.withOpacity(0.05),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF4B5563),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(color: const Color(0xFF9CA3AF), fontSize: 12, height: 1.3),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: () {
          if (_formKey.currentState!.validate()) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text("Safety settings updated successfully!"),
                backgroundColor: Color(0xFF6366F1),
              ),
            );
            Navigator.of(context).pop();
          }
        },
        child: const Text("Save Configurations"),
      ),
    );
  }

  InputDecoration _getInputDecoration(String labelText, IconData prefixIcon, {String? helperText}) {
    return InputDecoration(
      labelText: labelText,
      labelStyle: GoogleFonts.inter(color: const Color(0xFF9CA3AF), fontSize: 14),
      helperText: helperText,
      helperStyle: GoogleFonts.inter(color: const Color(0xFF4B5563), fontSize: 11),
      prefixIcon: Icon(prefixIcon, color: const Color(0xFF6366F1), size: 20),
      filled: true,
      fillColor: const Color(0xFF0F111A),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.05)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}
