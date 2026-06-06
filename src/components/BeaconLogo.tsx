import React from 'react';

interface BeaconLogoProps {
  className?: string;
  size?: number;
  showBadge?: boolean; // Whether to show the deep blue squircle wrapper or just the lighthouse core
}

export default function BeaconLogo({ className = '', size = 36, showBadge = false }: BeaconLogoProps) {
  // Deep Blue Navy: #061F3F / #091326
  // Accent Yellow: #FBBF24 (Tailwind Amber 400) or #FACC15 (Tailwind Yellow 400)
  // Accent Light Yellow: #FEF08A (Tailwind Yellow 200)
  // Cream Main Structure: #F8FAFC (Tailwind Slate 50) or #FFFBEB (Amber 50)
  
  const width = size;
  const height = size;

  if (showBadge) {
    return (
      <div 
        style={{ width: `${size}px`, height: `${size}px` }} 
        className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-[#0F1E36] to-[#081224] border border-[#1E2E4A]/60 shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${className}`}
        id="beacon-logo-badge"
      >
        <svg
          viewBox="0 0 512 512"
          fill="none"
          stroke="none"
          className="w-full h-full p-[10%]"
        >
          {/* Defs for gradients */}
          <defs>
            {/* Left Beam Gradient */}
            <linearGradient id="beam-left" x1="230" y1="200" x2="30" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBDB2C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Right Beam Gradient */}
            <linearGradient id="beam-right" x1="282" y1="200" x2="482" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBDB2C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Soft Ambient Light Glow behind */}
            <radialGradient id="glow-core" cx="256" cy="200" r="120" fx="256" fy="200">
              <stop offset="0%" stopColor="#FBDB2C" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FBDB2C" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Radial Core Glow */}
          <circle cx="256" cy="200" r="120" fill="url(#glow-core)" />

          {/* Golden Yellow Beams emitting from the lantern */}
          <path d="M 230 185 L 30 150 L 30 250 L 230 215 Z" fill="url(#beam-left)" />
          <path d="M 282 185 L 482 150 L 482 250 L 282 215 Z" fill="url(#beam-right)" />

          {/* Winding road/pathway coming from bottom to tower base */}
          <path 
            d="M 190 370 C 260 365, 305 320, 305 295 C 305 270, 280 260, 280 260 C 280 260, 300 270, 300 295 C 300 325, 255 355, 190 355 Z" 
            fill="#F8FAFC" 
            opacity="0.9"
          />
          <path 
            d="M 170 370 C 250 365, 290 320, 290 295" 
            stroke="#F8FAFC" 
            strokeWidth="10" 
            strokeLinecap="round" 
            fill="none"
            opacity="0.9"
          />

          {/* Lighthouse Base Ground Mound */}
          <path d="M 170 360 C 210 350, 298 350, 342 360" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round" />

          {/* Lighthouse Tower Structure */}
          {/* Main Cream / Off-White Body */}
          <path 
            d="M 224 340 L 234 230 L 278 230 L 288 340 Z" 
            fill="#FFFDEB" 
            stroke="#0F1E36" 
            strokeWidth="8"
            strokeLinejoin="round"
          />
          
          {/* Golden Yellow Vertical Accent Bands on Body */}
          <path d="M 231 230 L 227 280 L 243 280 L 243 230 Z" fill="#FACC15" />
          <path d="M 269 230 L 273 280 L 285 285 L 269 230 Z" fill="#FACC15" />
          <path d="M 245 280 L 241 332 L 253 334 L 253 280 Z" fill="#FACC15" />
          <path d="M 259 280 L 259 334 L 271 332 L 267 280 Z" fill="#FACC15" />

          {/* Window / Gate (Dark Arch near bottom) */}
          <path d="M 246 340 L 246 315 C 246 308, 266 308, 266 315 L 266 340 Z" fill="#0F1E36" />
          
          {/* Window near middle */}
          <path d="M 250 270 L 250 252 C 250 248, 262 248, 262 252 L 262 270 Z" fill="#0F1E36" />

          {/* Top Lantern Room Base Deck */}
          <path 
            d="M 226 230 L 286 230 L 290 220 L 222 220 Z" 
            fill="#FFFDEB" 
            stroke="#0F1E36" 
            strokeWidth="6" 
            strokeLinejoin="round"
          />

          {/* Lantern Glass Room (Yellow glowing source) */}
          <rect 
            x="234" 
            y="185" 
            width="44" 
            height="35" 
            fill="#FBEF39" 
            stroke="#0F1E36" 
            strokeWidth="8" 
            rx="4"
          />
          
          {/* Core Spotlight Bulb */}
          <circle cx="256" cy="202" r="10" fill="#FFFFFF" />

          {/* Dome Cap (Golden Yellow) */}
          <path 
            d="M 230 185 C 230 155, 282 155, 282 185 Z" 
            fill="#FACC15" 
            stroke="#0F1E36" 
            strokeWidth="8" 
            strokeLinejoin="round"
          />
          
          {/* Antenna / Spire on Dome */}
          <line x1="256" y1="155" x2="256" y2="125" stroke="#FACC15" strokeWidth="8" strokeLinecap="round" />
          
          {/* Little Flag at Top */}
          <path d="M 256 125 L 282 135 L 256 145 Z" fill="#FACC15" />
        </svg>
      </div>
    );
  }

  // Pure SVG Core for tiny headers and icons
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      stroke="none"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={className}
    >
      <defs>
        <linearGradient id="beam-left-mini" x1="230" y1="200" x2="30" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="beam-right-mini" x1="282" y1="200" x2="482" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Golden Yellow Beams */}
      <path d="M 230 185 L 30 130 L 30 270 L 230 215 Z" fill="url(#beam-left-mini)" />
      <path d="M 282 185 L 482 130 L 482 270 L 282 215 Z" fill="url(#beam-right-mini)" />

      {/* Winding Path */}
      <path d="M 170 370 C 250 365, 290 320, 290 295" stroke="#F8FAFC" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M 170 360 C 210 350, 298 350, 342 360" stroke="#F8FAFC" strokeWidth="10" strokeLinecap="round" />

      {/* Main tower structure */}
      <path d="M 224 340 L 234 230 L 278 230 L 288 340 Z" fill="#FFFDEB" stroke="#0F1E36" strokeWidth="10" strokeLinejoin="round" />
      
      {/* Decorative colored spots to match the beautiful yellow lighthouse branding */}
      <path d="M 230 230 L 244 230 L 244 336 L 227 336 Z" fill="#FBBF24" />
      <path d="M 268 230 L 282 230 L 285 336 L 268 336 Z" fill="#FBBF24" />

      {/* Window and Door */}
      <path d="M 246 340 L 246 315 C 246 308, 266 308, 266 315 L 266 340 Z" fill="#0F1E36" />
      
      {/* Lantern Gallery Desk */}
      <path d="M 226 230 L 286 230 L 290 220 L 222 220 Z" fill="#FFFDEB" stroke="#0F1E36" strokeWidth="8" strokeLinejoin="round" />

      {/* Lantern glass core */}
      <rect x="234" y="185" width="44" height="35" fill="#FBEF39" stroke="#0F1E36" strokeWidth="10" rx="4" />
      <circle cx="256" cy="202" r="10" fill="#FFFFFF" />

      {/* Cap Dome */}
      <path d="M 230 185 C 230 155, 282 155, 282 185 Z" fill="#FBBF24" stroke="#0F1E36" strokeWidth="10" />

      {/* Top Banner Flag */}
      <line x1="256" y1="155" x2="256" y2="120" stroke="#FBBF24" strokeWidth="10" strokeLinecap="round" />
      <path d="M 256 120 L 286 132 L 256 144 Z" fill="#FBBF24" />
    </svg>
  );
}
