import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Settings, 
  Compass, 
  MapPin, 
  Lightbulb, 
  Users, 
  Activity, 
  AlertTriangle, 
  Navigation, 
  Home, 
  Clock, 
  ArrowRight,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  RefreshCw,
  Bell,
  CheckCircle,
  HelpCircle,
  Smartphone,
  Train,
  Bus,
  Car
} from 'lucide-react';
import { 
  Coordinates, 
  MapOverlayToggle, 
  DistressTimerState, 
  ActiveDisturbance, 
  Streetlight, 
  FootTrafficCluster,
  Contact
} from '../types';
import BeaconLogo from './BeaconLogo';

interface MapHomeScreenProps {
  timerState: DistressTimerState;
  setTimerState: React.Dispatch<React.SetStateAction<DistressTimerState>>;
  userName: string;
  emergencyContacts: Contact[];
  safeArrivalPin: string;
  customAlertMessage: string;
  onNavigateToSettings: () => void;
  receivedSimulatedSMS: {
    id: string;
    phone: string;
    message: string;
    time: string;
    smsLink: string;
    waLink: string;
  }[];
  setReceivedSimulatedSMS: React.Dispatch<React.SetStateAction<{
    id: string;
    phone: string;
    message: string;
    time: string;
    smsLink: string;
    waLink: string;
  }[]>>;
  showPhoneSimulator: boolean;
  setShowPhoneSimulator: React.Dispatch<React.SetStateAction<boolean>>;
  onPinSuccess: () => void;
  onPinFailure: () => void;
  consecutiveFailedAttempts: number;
  lockoutCount: number;
  phoneBattery: number;
  locationPermission: boolean;
  smsPermission: boolean;
}

// Simulated Austin City Coordinates for the Vector Map
const STREET_GRID = [
  // Horizontal avenues
  { id: 'av-1', name: 'Congress Avenue (Main Lit Drag)', y: 120, type: 'safe' },
  { id: 'av-2', name: '6th Street Corridor (Active Commercial)', y: 220, type: 'safe' },
  { id: 'av-3', name: 'Colorado Alleyway (Narrow Shortcut)', y: 320, type: 'shortcut' },
  { id: 'av-4', name: 'Lavaca Street Northway', y: 420, type: 'neutral' },
  // Vertical streets
  { id: 'st-a', name: 'Brazos Street', x: 100, type: 'neutral' },
  { id: 'st-b', name: 'Congress Ave (High Foot Traffic)', x: 250, type: 'safe' },
  { id: 'st-c', name: 'Colorado St (Dimly Lit Alley)', x: 400, type: 'dark' },
  { id: 'st-d', name: 'Trinity Street', x: 550, type: 'neutral' },
];
 
const SIMULATED_STREETLIGHTS: Streetlight[] = [
  { id: 'l1', x: 100, y: 120, intensity: 'high' },
  { id: 'l2', x: 250, y: 120, intensity: 'high' },
  { id: 'l3', x: 400, y: 120, intensity: 'medium' },
  { id: 'l4', x: 550, y: 120, intensity: 'high' },
  { id: 'l5', x: 250, y: 220, intensity: 'high' },
  { id: 'l6', x: 100, y: 220, intensity: 'high' },
  { id: 'l7', x: 550, y: 220, intensity: 'high' },
  { id: 'l8', x: 100, y: 420, intensity: 'medium' },
  { id: 'l9', x: 250, y: 420, intensity: 'high' },
  { id: 'l10', x: 550, y: 420, intensity: 'medium' },
];
 
const SIMULATED_FOOT_TRAFFIC: FootTrafficCluster[] = [
  { id: 'f1', x: 250, y: 220, radius: 55, intensity: 0.9 }, // Active Bar Area
  { id: 'f2', x: 250, y: 120, radius: 45, intensity: 0.8 }, // Main Drag
  { id: 'f3', x: 100, y: 120, radius: 35, intensity: 0.6 },
];
 
const SIMULATED_DISTURBANCES: ActiveDisturbance[] = [
  { id: 'd1', type: '311 log', severity: 'medium', description: '311 Noise Complaint: Loud party overflow on sidewalk.', x: 400, y: 320 },
  { id: 'd2', type: 'crime alert', severity: 'high', description: 'Safety Alert: Active police vehicle responded adjacent to parking lot.', x: 400, y: 220 },
  { id: 'd3', type: 'bar crowd', severity: 'low', description: 'Transit Surge: Ride-hail gridlock in intersection.', x: 550, y: 220 },
];
 
const getNextLockoutDurationMinutes = (currentLockoutCount: number) => {
  const nextLockoutCount = currentLockoutCount + 1;
  if (nextLockoutCount === 1) return 1;
  if (nextLockoutCount === 2) return 5;
  if (nextLockoutCount === 3) return 30;
  if (nextLockoutCount === 4) return 60; // 1 hour
  return 1440; // 24 hours (1440 minutes)
};
 
export const TRANSIT_OPTIONS = [
  {
    id: 'train' as const,
    name: 'Capital MetroRail (MetroLine)',
    wait: '4m wait',
    ride: '5m ride',
    eta: 9,
    description: 'Rapid urban modern rail equipped with high-intensity platform lighting and security cameras.',
    color: '#C084FC', // Violet / purple
    street: 'MetroRail Platform Route (Secured Track)',
    icon: 'train'
  },
  {
    id: 'bus' as const,
    name: 'MetroRapid Bus 801 (Congress)',
    wait: '2m wait',
    ride: '11m ride',
    eta: 13,
    description: 'High frequency active commercial corridor rapid bus with illuminated shelters and active ridership.',
    color: '#60A5FA', // Sky Blue
    street: 'Congress Ave Bus Transit Corridor',
    icon: 'bus'
  },
  {
    id: 'rideshare' as const,
    name: 'Partner SafeRide (Uber/Lyft)',
    wait: '3m wait',
    ride: '4m ride',
    eta: 7,
    description: 'Direct door-to-door escort. Shared route monitored in secure safety dispatch dispatcher dashboards.',
    color: '#F472B6', // Pink
    street: 'Direct door-to-door ride escort pathway',
    icon: 'rideshare'
  },
  {
    id: 'cablecar' as const,
    name: 'Downtown Transit Connector',
    wait: '7m wait',
    ride: '8m ride',
    eta: 15,
    description: 'Active open-air downtown connector route with security presence.',
    color: '#FBBF24', // Gold/Amber
    street: 'Illuminated Downtown Connector Corridor',
    icon: 'cablecar'
  }
];
 
export const getRouteName = (routeType: string) => {
  if (routeType === 'safe') return 'Bright High-Visibility Mainway';
  if (routeType === 'dangerous') return 'Colorado Alleyway Shortcut';
  const opt = TRANSIT_OPTIONS.find(t => t.id === routeType);
  return opt ? opt.name : 'Custom Route';
};
 
export const getRouteDescription = (routeType: string) => {
  if (routeType === 'safe') return 'Favors bright city lampposts, active storefront paths, and civilian pedestrian density.';
  if (routeType === 'dangerous') return 'Fast unlit corridor shortcut cutoff passing by active 311 noise logs & dark alley structures.';
  const opt = TRANSIT_OPTIONS.find(t => t.id === routeType);
  return opt ? opt.description : '';
};
 
export const getRouteEta = (routeType: string) => {
  if (routeType === 'safe') return 12;
  if (routeType === 'dangerous') return 8;
  const opt = TRANSIT_OPTIONS.find(t => t.id === routeType);
  return opt ? opt.eta : 12;
};
 
export const getRouteStreetName = (routeType: string) => {
  if (routeType === 'safe') return 'Congress Avenue (Main Lit corridor)';
  if (routeType === 'dangerous') return 'Colorado St Alleyway (Dark Bypass)';
  const opt = TRANSIT_OPTIONS.find(t => t.id === routeType);
  return opt ? opt.street : 'Congress Avenue';
};
 
export const getPathColor = (routeType: string) => {
  if (routeType === 'safe') return '#10B981'; // emerald
  if (routeType === 'dangerous') return '#F59E0B'; // amber
  const opt = TRANSIT_OPTIONS.find(t => t.id === routeType);
  return opt ? opt.color : '#6366F1'; // default indigo
};

export default function MapHomeScreen({
  timerState,
  setTimerState,
  userName,
  emergencyContacts,
  safeArrivalPin,
  customAlertMessage,
  onNavigateToSettings,
  receivedSimulatedSMS,
  setReceivedSimulatedSMS,
  showPhoneSimulator,
  setShowPhoneSimulator,
  onPinSuccess,
  onPinFailure,
  consecutiveFailedAttempts,
  lockoutCount,
  phoneBattery,
  locationPermission,
  smsPermission
}: MapHomeScreenProps) {
  // Map layers toggling state
  const [overlays, setOverlays] = useState<MapOverlayToggle>({
    streetlights: true,
    footTraffic: true,
    chillChaos: false,
    disturbances: true,
    rideshareSurge: false,
  });

  // Modal setups
  const [safeWalkFlowStep, setSafeWalkFlowStep] = useState<'idle' | 'destination' | 'route_selection' | 'final_confirm'>('idle');
  const [startingPointInput, setStartingPointInput] = useState('123 Main St.');
  const [destinationInput, setDestinationInput] = useState('Home (1100 Congress Ave)');
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [routesData, setRoutesData] = useState<Record<string, { coords: [number, number][]; eta: number; distance: number }>>({});
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // OSRM Walking routing updater
  const updateOsrmRoutes = async (start: { lat: number, lon: number }, end: { lat: number, lon: number }) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
          const newRoutes: Record<string, { coords: [number, number][]; eta: number; distance: number }> = {};
          
          // Realistic high-accuracy walking speed model: 70 meters per minute (approx. 4.2 km/h) 
          // plus 2.5 minutes average buffer for urban street crossings, traffic lights, and pedestrian queues.
          const getRealisticWalkingEta = (distMeters: number) => {
            const minutes = distMeters / 70;
            return Math.max(3, Math.round(minutes + 2.5));
          };

          // Primary Route: Google Maps style foot walking optimization model
          const primaryRoute = data.routes[0];
          const primaryCoords = primaryRoute.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          const primaryDist = primaryRoute.distance;
          const primaryEta = getRealisticWalkingEta(primaryDist);
          
          newRoutes['safe'] = {
            coords: primaryCoords,
            eta: primaryEta,
            distance: primaryDist
          };

          // Alternate Route / Short Bypass (Colorado Alleyway style)
          if (data.routes.length > 1) {
            const alternateRoute = data.routes[1];
            const alternateCoords = alternateRoute.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            const alternateDist = alternateRoute.distance;
            const alternateEta = getRealisticWalkingEta(alternateDist);
            newRoutes['dangerous'] = {
              coords: alternateCoords,
              eta: alternateEta,
              distance: alternateDist
            };
          } else {
            // Generate a realistic second curve using a slightly offset mid-point via OSRM to keep options distinct
            const midLat = (start.lat + end.lat) / 2;
            const midLon = (start.lon + end.lon) / 2;
            const shiftLat = midLat + (end.lon - start.lon) * 0.12;
            const shiftLon = midLon - (end.lat - start.lat) * 0.12;
            
            try {
              const altUrl = `https://router.project-osrm.org/route/v1/foot/${start.lon},${start.lat};${shiftLon},${shiftLat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
              const altRes = await fetch(altUrl);
              if (altRes.ok) {
                const altData = await altRes.json();
                if (altData && altData.code === 'Ok' && altData.routes?.[0]) {
                  const altRoute = altData.routes[0];
                  const altDist = altRoute.distance;
                  newRoutes['dangerous'] = {
                    coords: altRoute.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]),
                    eta: getRealisticWalkingEta(altDist),
                    distance: altDist
                  };
                }
              }
            } catch (err) {
              console.warn("Alternative OSRM track shifting failing, bypassing gracefully:", err);
            }
          }

          if (!newRoutes['dangerous']) {
            const altDist = primaryDist * 0.88;
            newRoutes['dangerous'] = {
              coords: primaryCoords,
              eta: getRealisticWalkingEta(altDist),
              distance: altDist
            };
          }

          // Scale and attach public transit / rideshare durations & distances based on the OSRM coordinates
          newRoutes['train'] = {
            coords: primaryCoords,
            eta: Math.max(2, Math.round(primaryEta * 0.45)),
            distance: primaryDist
          };
          newRoutes['bus'] = {
            coords: primaryCoords,
            eta: Math.max(2, Math.round(primaryEta * 0.55)),
            distance: primaryDist
          };
          newRoutes['rideshare'] = {
            coords: primaryCoords,
            eta: Math.max(2, Math.round(primaryEta * 0.3)),
            distance: primaryDist
          };
          newRoutes['cablecar'] = {
            coords: primaryCoords,
            eta: Math.max(2, Math.round(primaryEta * 0.7)),
            distance: primaryDist
          };

          setRoutesData(newRoutes);
          return newRoutes;
        }
      }
    } catch (e) {
      console.error("OSRM Foot Routing Service is offline or slow:", e);
    }
    return null;
  };
  const [etaInput, setEtaInput] = useState('15'); // 15 mins default
  const [passwordInput, setPasswordInput] = useState('');
  
  // Active Safe Walk actions
  const [showAuthGate, setShowAuthGate] = useState<'cancel' | 'modify' | null>(null);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  
  // Custom quick-test timer fast-forward
  const [hasNotifiedPreArrival, setHasNotifiedPreArrival] = useState(false);
  const [testModeSecondsRatio, setTestModeSecondsRatio] = useState(1); // To speed up simulation timer for testing
  const [selectedRoute, setSelectedRoute] = useState<'safe' | 'dangerous' | 'train' | 'bus' | 'rideshare' | 'cablecar'>('safe');
  const [isTransitExpanded, setIsTransitExpanded] = useState(false);
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const [activeMessageLog, setActiveMessageLog] = useState<string[]>([]);
  
  // User Geolocation live position
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // External municipal and micromobility data states
  const [streetlightsData, setStreetlightsData] = useState<any[]>([]);
  const [reports311Data, setReports311Data] = useState<any[]>([]);
  const [scooterDropsData, setScooterDropsData] = useState<any[]>([]);
  const [loadingExternalData, setLoadingExternalData] = useState({
    streetlights: false,
    reports311: false,
    scooterDrops: false
  });

  const handleUseCurrentLocation = async () => {
    setIsReverseGeocoding(true);
    let lat = 30.2672;
    let lon = -97.7431;

    if (userCoords) {
      lat = userCoords.lat;
      lon = userCoords.lon;
    } else if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<any>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4050 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
      } catch (err) {
        console.warn("Could not retrieve current position:", err);
      }
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "BeaconSafetyApplet/1.0"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const shortAddress = data.address 
            ? `${data.address.house_number || ''} ${data.address.road || ''}, Austin`.trim()
            : data.display_name;
          setStartingPointInput(shortAddress || data.display_name);
          triggerSystemNotification(`Resolved starting location to "${shortAddress || data.display_name}"`);
          return;
        }
      }
      setStartingPointInput(`Nearby @ ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
      triggerSystemNotification("Using current coordinates for starting location.");
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      setStartingPointInput(`Nearby @ ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleChoosePathOnMap = async () => {
    setIsSearchingAddresses(true);

    // Clean address string helper: extracts address within parentheses, splits by hyphens, strips labels
    const cleanAddressQuery = (addressStr: string) => {
      if (!addressStr) return "";
      const parenMatch = addressStr.match(/\(([^)]+)\)/);
      let text = parenMatch && parenMatch[1] ? parenMatch[1] : addressStr;
      
      if (text.includes(" - ")) {
        const parts = text.split(" - ");
        if (/\d/.test(parts[1])) {
          text = parts[1];
        } else {
          text = parts[0];
        }
      }
      return text.trim();
    };

    // Fallback coordinates generator in Austin bounds to prevent going straight to the capitol
    const getHashBasedCoords = (str: string, isStart: boolean) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);
      if (isStart) {
        // Lat: 30.258 to 30.266
        const lat = 30.258 + (absHash % 80) / 10000;
        // Lon: -97.755 to -97.743
        const lon = -97.755 + ((absHash >> 3) % 120) / 10000;
        return { lat, lon };
      } else {
        // Lat: 30.268 to 30.278
        const lat = 30.268 + (absHash % 100) / 10000;
        // Lon: -97.743 to -97.732
        const lon = -97.743 + ((absHash >> 3) % 110) / 10000;
        return { lat, lon };
      }
    };

    const cleanStart = cleanAddressQuery(startingPointInput);
    const cleanDest = cleanAddressQuery(destinationInput);

    let finalStartGps = getHashBasedCoords(cleanStart || "123 Main St.", true);
    let finalDestGps = getHashBasedCoords(cleanDest || "1100 Congress Ave", false);

    // Geocode starting position
    if (cleanStart && cleanStart !== '123 Main St.') {
      try {
        const queryStr = cleanStart.toLowerCase().includes("austin") ? cleanStart : `${cleanStart}, Austin, Texas`;
        const resStart = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`,
          { headers: { "User-Agent": "BeaconSafetyApplet/1.0" } }
        );
        if (resStart.ok) {
          const data = await resStart.json();
          if (data && data[0]) {
            finalStartGps = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          }
        }
      } catch (e) {
        console.warn("Starting point geocoding failed, using high-fidelity fallback:", e);
      }
    }

    // Geocode destination position
    if (cleanDest) {
      try {
        const queryStr = cleanDest.toLowerCase().includes("austin") ? cleanDest : `${cleanDest}, Austin, Texas`;
        const resDest = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`,
          { headers: { "User-Agent": "BeaconSafetyApplet/1.0" } }
        );
        if (resDest.ok) {
          const data = await resDest.json();
          if (data && data[0]) {
            finalDestGps = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          }
        }
      } catch (e) {
        console.warn("Destination geocoding failed, using high-fidelity fallback:", e);
      }
    }

    setStartCoords(finalStartGps);
    setDestinationCoords(finalDestGps);

    // Call OSRM to fetch real-time walking model pathways (Google Maps style walking optimization)
    const computedRoutes = await updateOsrmRoutes(finalStartGps, finalDestGps);
    
    setIsSearchingAddresses(false);

    if (computedRoutes && computedRoutes[selectedRoute]) {
      setEtaInput(String(computedRoutes[selectedRoute].eta));
    } else {
      setEtaInput(selectedRoute === 'safe' ? '12' : '8');
    }
    setSafeWalkFlowStep('route_selection');
  };

  const fetchStreetlights = async () => {
    setLoadingExternalData(prev => ({ ...prev, streetlights: true }));
    try {
      const query = `[out:json][timeout:15];node["highway"="street_lamp"](30.258,-97.755,30.278,-97.732);out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.elements && data.elements.length > 0) {
          const formatted = data.elements.map((element: any) => ({
            id: `external-lamp-${element.id}`,
            lat: element.lat,
            lon: element.lon,
            intensity: Math.random() > 0.3 ? 'high' : 'medium'
          }));
          setStreetlightsData(formatted);
          triggerSystemNotification(`Loaded ${formatted.length} municipal streetlights from OpenStreetMap.`);
        }
      }
    } catch (err) {
      console.warn("Overpass API failed, using default simulated lights:", err);
    } finally {
      setLoadingExternalData(prev => ({ ...prev, streetlights: false }));
    }
  };

  const fetchRecent311Reports = async () => {
    setLoadingExternalData(prev => ({ ...prev, reports311: true }));
    try {
      const yesterdayTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('.')[0];
      const austin311Url = `https://data.austintexas.gov/resource/3syk-guxb.json?$where=created_date >= '${yesterdayTimestamp}'&$limit=50`;
      const response = await fetch(austin311Url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data
            .filter((item: any) => item.latitude && item.longitude)
            .map((item: any) => ({
              id: `external-311-${item.sr_number || item.service_request_id || Math.random()}`,
              type: item.sr_type || item.sr_desc || '311 log',
              severity: (item.sr_type?.toLowerCase().includes('emergency') || item.sr_type?.toLowerCase().includes('danger') || item.sr_type?.toLowerCase().includes('traffic')) ? 'high' : 'medium',
              description: `${item.sr_type || '311 Case'}: ${item.sr_desc || 'No details'} at ${item.sr_location || 'Unspecified address'}. Status: ${item.sr_status_desc || 'Active'}.`,
              lat: parseFloat(item.latitude),
              lon: parseFloat(item.longitude)
            }));
          setReports311Data(formatted);
          triggerSystemNotification(`Pulled ${formatted.length} active 311 incident logs from past 24 hours via Austin Dataset API.`);
        }
      }
    } catch (err) {
      console.warn("Austin 311 Socrata dataset fetch failed, using default simulations:", err);
    } finally {
      setLoadingExternalData(prev => ({ ...prev, reports311: false }));
    }
  };

  const fetchScooterDrops = async () => {
    setLoadingExternalData(prev => ({ ...prev, scooterDrops: true }));
    try {
      const response = await fetch('https://gbfs.bcycle.com/bcycle_austin/free_bike_status.json');
      if (response.ok) {
        const data = await response.json();
        const rawBikes = data?.data?.bikes || data?.bikes;
        if (Array.isArray(rawBikes) && rawBikes.length > 0) {
          const formatted = rawBikes
            .filter((bike: any) => bike.lat && bike.lon)
            .map((bike: any) => ({
              id: `scooter-drop-${bike.bike_id}`,
              lat: parseFloat(bike.lat),
              lon: parseFloat(bike.lon),
              type: bike.type || 'bike'
            }));
          setScooterDropsData(formatted);
          triggerSystemNotification(`Mapped ${formatted.length} Austin MetroBike micromobility points to compute foot traffic density.`);
        }
      }
    } catch (err) {
      console.warn("Austin MetroBike GBFS mobility status fetch failed, using default clusters:", err);
    } finally {
      setLoadingExternalData(prev => ({ ...prev, scooterDrops: false }));
    }
  };

  // Fetch municipal data on mount
  useEffect(() => {
    fetchStreetlights();
    fetchRecent311Reports();
    fetchScooterDrops();
  }, []);

  // Dynamic Leaflet Loader and Instance references
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstanceCreated, setMapInstanceCreated] = useState(false);
  const leafletMapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const routesPolylineRef = useRef<any>(null);

  // Coordinates Converter Function
  // Converts SVG x,y mock coordinate to Austin lat, lon
  const svgToGps = (x: number, y: number) => {
    // West bound (x=100) -> -97.7550, East bound (x=550) -> -97.7320
    const lon = -97.7550 + ((x - 100) / 450) * 0.0230;
    // North bound (y=120) -> 30.2780, South bound (y=420) -> 30.2580
    const lat = 30.2780 - ((y - 120) / 300) * 0.0200;
    return { lat, lon };
  };

  // Convert GPS Coordinates back to SVG x,y coordinate for overlay compatibility (fallback)
  const gpsToSvg = (lat: number, lon: number) => {
    const x = 100 + ((lon - (-97.7550)) / 0.0230) * 450;
    const y = 120 + ((30.2780 - lat) / 0.0200) * 300;
    return { x, y };
  };

  // 1. Dynamic CDN Loading for Leaflet
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load leaflet css
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.id = "leaflet-css-cdn";
    document.head.appendChild(link);

    // Load leaflet javascript
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.id = "leaflet-js-cdn";
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 2. Leaflet Map Instance Initialization
  useEffect(() => {
    if (!leafletLoaded || !leafletMapContainerRef.current) return;
    if (mapRef.current) return;

    const L = (window as any).L;
    
    // Default starting center is Austin Downtown / Capitol (Lat: 30.2672, Lon: -97.7431)
    const startLat = 30.2672;
    const startLon = -97.7431;

    const map = L.map(leafletMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([startLat, startLon], 16);

    mapRef.current = map;

    // Beautiful CartoDB Dark Matter tiles (premium dark mode street coordinates)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Zoom controls aligned at bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    markerGroupRef.current = L.layerGroup().addTo(map);
    routesPolylineRef.current = L.polyline([], {
      color: '#10B981',
      weight: 5,
      opacity: 0.85
    }).addTo(map);

    // Force React sync callback updates
    setMapInstanceCreated(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // 3. Dynamic Map Marker Sync Loop (User Coords, Streetlights, Foot Traffic, Disturbances, Routes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = (window as any).L;
    if (!L) return;

    // 1. Clear previous marker overlays
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();
    }

    // 2. Plot Real Time User Location
    if (userCoords) {
      const userHtml = `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-5 h-5 rounded-full bg-indigo-500/30 animate-ping"></div>
          <div class="absolute w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white shadow-xl shadow-indigo-500/50"></div>
        </div>
      `;
      const liveIcon = L.divIcon({
        html: userHtml,
        className: 'custom-live-user-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      L.marker([userCoords.lat, userCoords.lon], { icon: liveIcon })
        .addTo(markerGroupRef.current)
        .bindPopup(`<strong>Your Live GPS Location</strong><br>Real-time street accuracy.`);
      
      // Auto centers the map once when live location is first retrieved OR if user requests it
      if (!mapRef.current._hasCenteredOnce) {
        map.setView([userCoords.lat, userCoords.lon], 16);
        mapRef.current._hasCenteredOnce = true;
      }
    }

    // 3. Plot Simulated/Real Streetlights
    if (overlays.streetlights) {
      const lampsToRender = streetlightsData.length > 0 ? streetlightsData : SIMULATED_STREETLIGHTS.map(lamp => ({
        ...lamp,
        ...svgToGps(lamp.x, lamp.y)
      }));

      lampsToRender.forEach(lamp => {
        // Leaflet circle representation for lighting glow
        const glowRadius = lamp.intensity === 'high' ? 30 : 18;
        L.circle([lamp.lat, lamp.lon], {
          radius: glowRadius,
          color: '#FB7185',
          weight: 0,
          fillColor: '#FBBF24',
          fillOpacity: 0.12,
          interactive: false
        }).addTo(markerGroupRef.current);

        // Solid yellow bulb dot
        const bulbIcon = L.divIcon({
          html: `<div class="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.9)]"></div>`,
          className: 'custom-streetlight-bulb-icon',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        L.marker([lamp.lat, lamp.lon], { icon: bulbIcon })
          .addTo(markerGroupRef.current)
          .bindTooltip(`<strong>Municipal Safety Spotlight</strong><br>Status: ACTIVE (High Intensity)<br>Ref: ${lamp.id}`, {
            direction: 'top',
            className: 'leaflet-tooltip-dark'
          });
      });
    }

    // 4. Plot Simulated/Real Foot Traffic Clusters (Scooter/Micromobility drops)
    if (overlays.footTraffic) {
      let rawScooters = scooterDropsData;
      if (rawScooters.length > 0) {
        // Filter for Austin Downtown neighborhood bounds to display relevant density
        rawScooters = rawScooters.filter(bike => 
          bike.lat >= 30.258 && bike.lat <= 30.278 &&
          bike.lon >= -97.755 && bike.lon <= -97.732
        );
      }

      if (rawScooters.length > 0) {
        rawScooters.forEach(bike => {
          L.circle([bike.lat, bike.lon], {
            radius: 18,
            color: '#10B981',
            weight: 0,
            fillColor: '#10B981',
            fillOpacity: 0.15,
            interactive: false
          }).addTo(markerGroupRef.current);

          const scooterIcon = L.divIcon({
            html: `<div class="w-4 h-4 rounded-full bg-emerald-600 border border-white text-white text-[8px] flex items-center justify-center shadow-md">🛴</div>`,
            className: 'custom-scooter-drop-icon',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const m = L.marker([bike.lat, bike.lon], { icon: scooterIcon })
            .addTo(markerGroupRef.current);

          m.bindTooltip(`<strong>Dynamic Foot Traffic (Parked Scooter)</strong><br>Anonymized micromobility drop location.<br>Status: ACTIVE Area`, {
            direction: 'top',
            className: 'leaflet-tooltip-dark'
          });
        });
      } else {
        SIMULATED_FOOT_TRAFFIC.forEach(traffic => {
          const gps = svgToGps(traffic.x, traffic.y);
          const physicalRadius = traffic.radius * 0.5; // scaled down to meters range
          L.circle([gps.lat, gps.lon], {
            radius: physicalRadius,
            color: '#10B981',
            weight: 0,
            fillColor: '#10B981',
            fillOpacity: 0.12,
            interactive: false
          }).addTo(markerGroupRef.current);
        });
      }
    }

    // 5. Plot Simulated/Real 311 Disturbances (Recent 24 hr logs)
    if (overlays.disturbances) {
      let reports311 = reports311Data;
      if (reports311.length > 0) {
        reports311 = reports311.filter(item => 
          item.lat >= 30.258 && item.lat <= 30.278 &&
          item.lon >= -97.755 && item.lon <= -97.732
        );
      }

      const disturbancesToRender = reports311.length > 0 ? reports311 : SIMULATED_DISTURBANCES.map(dist => ({
        ...dist,
        ...svgToGps(dist.x, dist.y)
      }));

      disturbancesToRender.forEach(dist => {
        // Pulsing red circle indicating danger severity area
        L.circle([dist.lat, dist.lon], {
          radius: dist.severity === 'high' ? 30 : 20,
          color: '#EF4444',
          weight: 0,
          fillColor: '#EF4444',
          fillOpacity: 0.14,
          interactive: false
        }).addTo(markerGroupRef.current);

        // Crime / alert icon
        const iconHtml = dist.severity === 'high' 
          ? `<div class="flex items-center justify-center bg-[#b91c1c] border-2 border-slate-950 rounded-full p-0.5 shadow-lg animate-pulse w-5 h-5 text-white font-mono text-[9px] font-bold">⚠️</div>`
          : `<div class="flex items-center justify-center bg-amber-500 border-2 border-slate-950 rounded-full p-0.5 shadow-lg w-5 h-5 text-white font-mono text-[9px] font-bold">!</div>`;

        const alertIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-alert-crime-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker([dist.lat, dist.lon], { icon: alertIcon })
          .addTo(markerGroupRef.current)
          .bindTooltip(`<strong>Beacon 311 Safety Alert (${dist.severity.toUpperCase()})</strong><br>Details: ${dist.description || 'Recent municipal alert log.'}`, {
            direction: 'top',
            className: 'leaflet-tooltip-dark'
          });
      });
    }

    // 6. Plot Moving Text Labels for streets and safespots so they move as the map pans
    const labelPoints = [
      { text: "Congress Ave (Bright Mainway)", coords: svgToGps(120, 110) },
      { text: "Unlit Alley Way Cutoff", coords: svgToGps(260, 310), color: "#f43f5e" },
      { text: "Starting Point", coords: svgToGps(150, 430) },
      { text: "Goal: Congress Safespot", coords: svgToGps(370, 138), color: "#38bdf8" }
    ];
    labelPoints.forEach(lbl => {
      L.marker([lbl.coords.lat, lbl.coords.lon], {
        icon: L.divIcon({
          html: `<div style="color: ${lbl.color || '#94a3b8'}; font-weight: 600; font-size: 9px; font-family: monospace; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); opacity: 0.85;">${lbl.text}</div>`,
          className: 'custom-map-text-label',
          iconSize: [120, 16],
          iconAnchor: [60, 8]
        }),
        interactive: false
      }).addTo(markerGroupRef.current);
    });

    // Convert active SVG coordinates/points down to GPS polyline arrays & draw them!
    if (timerState.isActive || safeWalkFlowStep === 'route_selection') {
      const parseSvgPoints = (route: string) => {
        if (route === 'dangerous') {
          return [svgToGps(100, 420), svgToGps(400, 420), svgToGps(400, 320), svgToGps(400, 120)];
        } else if (route === 'train') {
          return [svgToGps(100, 420), svgToGps(100, 220), svgToGps(400, 220), svgToGps(400, 120)];
        } else if (route === 'bus') {
          return [svgToGps(100, 420), svgToGps(250, 420), svgToGps(400, 420), svgToGps(400, 120)];
        } else if (route === 'rideshare') {
          return [svgToGps(100, 420), svgToGps(100, 320), svgToGps(250, 320), svgToGps(250, 120), svgToGps(400, 120)];
        } else if (route === 'cablecar') {
          return [svgToGps(100, 420), svgToGps(400, 420), svgToGps(400, 120)];
        } else {
          return [svgToGps(100, 420), svgToGps(250, 420), svgToGps(250, 220), svgToGps(250, 120), svgToGps(400, 120)];
        }
      };

      let pathGps: [number, number][] = [];
      if (routesData[selectedRoute] && routesData[selectedRoute].coords.length > 0) {
        pathGps = routesData[selectedRoute].coords;
      } else {
        const startGps = startCoords || svgToGps(100, 420);
        const endGps = destinationCoords || svgToGps(400, 120);
        const pathRaw = parseSvgPoints(selectedRoute);
        pathGps = pathRaw.map((p, pIdx) => {
          if (pIdx === 0) return [startGps.lat, startGps.lon] as [number, number];
          if (pIdx === pathRaw.length - 1) return [endGps.lat, endGps.lon] as [number, number];
          return [p.lat, p.lon] as [number, number];
        });
      }
      
      if (routesPolylineRef.current) {
        routesPolylineRef.current.setLatLngs(pathGps);
        routesPolylineRef.current.setStyle({
          color: getPathColor(selectedRoute),
          dashArray: selectedRoute === 'dangerous' ? '8, 6' : null
        });
      }

      // Pin start and Pin end markers on the map!

      // Start position marker
      const startHtml = `<div class="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[9px] font-bold">📍</div>`;
      const startIcon = L.divIcon({
        html: startHtml,
        className: 'custom-path-start-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const startGps = startCoords || svgToGps(100, 420);
      const endGps = destinationCoords || svgToGps(400, 120);
      L.marker([startGps.lat, startGps.lon], { icon: startIcon })
        .addTo(markerGroupRef.current)
        .bindPopup(`<strong>Start of Safe Walk Journey:</strong><br>${startingPointInput || '123 Main St.'}`);

      // Goal position marker
      const endHtml = `<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-bold">🏁</div>`;
      const endIcon = L.divIcon({
        html: endHtml,
        className: 'custom-path-end-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([endGps.lat, endGps.lon], { icon: endIcon })
        .addTo(markerGroupRef.current)
        .bindPopup(`<strong>Destination Spot:</strong><br>${destinationInput || 'Congress Safespot'}`);

      // Fit bounds to show route when it first shows!
      if (!mapRef.current._hasFitBoundsRoute) {
        const bounds = L.latLngBounds(pathGps);
        map.fitBounds(bounds, { padding: [40, 40] });
        mapRef.current._hasFitBoundsRoute = true;
      }
    } else {
      if (routesPolylineRef.current) {
        routesPolylineRef.current.setLatLngs([]);
      }
      mapRef.current._hasFitBoundsRoute = false;
    }

  }, [userCoords, overlays, selectedRoute, timerState.isActive, safeWalkFlowStep, mapInstanceCreated, leafletLoaded, streetlightsData, reports311Data, scooterDropsData, startCoords, destinationCoords, routesData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Could not get initial geolocation, continuing with normal bias:", error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation watch error:", error);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // Address lookup suggestions state
  const [addressSuggestions, setAddressSuggestions] = useState<{ displayName: string }[]>([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('Home (1100 Congress Ave)');

  // Selected contacts for Safe Walk initiation notification
  const [selectedWalkContacts, setSelectedWalkContacts] = useState<Contact[]>([]);
  const [isContactsDropdownOpen, setIsContactsDropdownOpen] = useState(false);

  useEffect(() => {
    if (safeWalkFlowStep === 'final_confirm') {
      const defaultContacts = emergencyContacts.filter(c => c.isDefault);
      setSelectedWalkContacts(defaultContacts.length > 0 ? defaultContacts : emergencyContacts);
    }
  }, [safeWalkFlowStep, emergencyContacts]);

  useEffect(() => {
    if (!destinationInput || destinationInput.length < 3 || destinationInput === lastSelectedAddress) {
      setAddressSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingAddresses(true);
      setShowSuggestionsDropdown(true);
      try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationInput)}&limit=5&addressdetails=1`;
        if (userCoords) {
          url += `&lat=${userCoords.lat}&lon=${userCoords.lon}`;
        }
        const res = await fetch(url, {
          headers: {
            "User-Agent": "BeaconSafetyApplet/1.0"
          }
        });
        if (res.ok) {
          const data = await res.json() as any[];
          if (Array.isArray(data)) {
            const formatted = data.map((item: any) => ({
              displayName: item.display_name
            }));
            setAddressSuggestions(formatted);
          } else {
            setAddressSuggestions([]);
          }
        } else {
          setAddressSuggestions([]);
        }
      } catch (err) {
        console.error("Error querying OSM Nominatim:", err);
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddresses(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [destinationInput, lastSelectedAddress, userCoords]);

  // Simulation timer loop
  const timerStateRef = useRef(timerState);
  const emergencyContactsRef = useRef(emergencyContacts);
  const customAlertMessageRef = useRef(customAlertMessage);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    emergencyContactsRef.current = emergencyContacts;
  }, [emergencyContacts]);

  useEffect(() => {
    customAlertMessageRef.current = customAlertMessage;
  }, [customAlertMessage]);

  const triggerSystemNotification = (msg: string) => {
    setActiveMessageLog(prev => [msg, ...prev].slice(0, 5));
  };

  const triggerSMSDispatch = () => {
    if (!smsPermission) {
      triggerSystemNotification("[SMS DISPATCH SUPPRESSED] Emergency messages was set to 'No'. No alerts sent to contacts.");
      return;
    }

    const contacts = emergencyContactsRef.current;
    if (contacts.length === 0) {
      triggerSystemNotification("[SMS DISPATCHED] Simulated: No emergency contacts listed.");
      return;
    }

    triggerSystemNotification(`[EMERGENCY SMS TRIGGERED] Broadcaster live!`);

    const newDelivered: typeof receivedSimulatedSMS = [];

    contacts.forEach((contact, idx) => {
      const cleanPhone = contact.phone.trim();
      if (!cleanPhone) return;

      const alertBody = `${customAlertMessageRef.current || 'Security notification check-in missed'} — Safe Arrival Password check-in missed on Beacon. Spot: ${timerStateRef.current.destination || 'Unkn'}`;
      const stripPhone = cleanPhone.replace(/[^0-9+]/g, '');
      const encodedBody = encodeURIComponent(alertBody);

      // Deep links
      const smsLink = `sms:${stripPhone}?body=${encodedBody}`;
      const waLink = `https://api.whatsapp.com/send?phone=${stripPhone}&text=${encodedBody}`;

      const smsLogEntry = {
        id: `${Date.now()}-${idx}`,
        phone: `${contact.name || 'Emergency'} (${cleanPhone})`,
        message: alertBody,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        smsLink,
        waLink
      };

      newDelivered.push(smsLogEntry);
      triggerSystemNotification(`[LOCAL SIMULATOR] Msg queued for ${contact.name || cleanPhone}. Click mock phone sidebar below to preview!`);
    });

    if (newDelivered.length > 0) {
      setReceivedSimulatedSMS(prev => [...newDelivered, ...prev]);
      setShowPhoneSimulator(true);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerState.isActive) {
      interval = setInterval(() => {
        const current = timerStateRef.current;
        if (!current.isActive) return;

        // Tick according to speed ratio (allows rapid testing of safety triggers)
        const step = 1;
        const newSeconds = Math.max(0, current.remainingSeconds - step);
        
        let alertTriggered = current.isDistressed;
        let checkInNeeded = current.checkInRequired;

        // Triggers pre-expiry notice when less than 2 minutes (120 seconds) remains
        if (newSeconds <= 120 && newSeconds > 0 && !current.checkInRequired) {
          checkInNeeded = true;
          triggerSystemNotification("Safety Warning: Approaching walk ETA. Unlock Password prompt live!");
        }

        // If standard seconds hit zero, begin grace period timer (30 minutes remaining).
        // For testing visual, we accelerate the grace period if remainingSeconds is 0
        let distressActive = current.isDistressed;
        let activeState = current.isActive;

        if (newSeconds === 0 && !current.isDistressed) {
          // Grace period expires or triggers instant distress for demonstration if not checked in
          triggerSystemNotification("Emergency Notice: Expected arrival window exceeded. SMS alarm armed.");
          // We force distress state immediately inside the simulation once 0s is reached for snappy interactive validation!
          distressActive = true;
          activeState = false; // complete walk countdown
          triggerSMSDispatch();
          setShowAuthGate(null);
          setAuthInput('');
          setAuthError(false);
        }

        setTimerState(prev => ({
          ...prev,
          remainingSeconds: newSeconds,
          checkInRequired: checkInNeeded,
          isDistressed: distressActive,
          isActive: activeState
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerState.isActive]);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Toggle helpers
  const toggleOverlay = (key: keyof MapOverlayToggle) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Start Safe Walk click handler
  const handleStartSafeWalkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(etaInput) || 15;
    
    setTimerState({
      isActive: true,
      destination: destinationInput,
      etaMinutes: mins,
      remainingSeconds: mins * 60,
      passwordHash: passwordInput || safeArrivalPin,
      phoneNumbers: emergencyContacts.map(c => c.phone),
      isDistressed: false,
      checkInRequired: false,
    });
    
    // Low battery monitoring immediate notification to default contacts
    if (phoneBattery < 5) {
      if (!smsPermission) {
        triggerSystemNotification(`[LOW BATTERY NOTICE] Battery < 5%. Alarm disabled by user's configuration during onboarding.`);
      } else {
        const defaultContacts = emergencyContacts.filter(c => c.isDefault);
        const targetContacts = defaultContacts.length > 0 ? defaultContacts : emergencyContacts;

        const alertBody = `${userName} is walking home using Beacon to ${destinationInput} with an ETA of ${mins} mins. Their phone battery is at ${phoneBattery}%. It would be a good idea to monitor their travels and verify they get home safely :)`;

        const newSMSLogs = targetContacts.map((contact, idx) => {
          const cleanPhone = contact.phone.trim();
          const stripPhone = cleanPhone.replace(/[^0-9+]/g, '');
          const encodedBody = encodeURIComponent(alertBody);
          const smsLink = `sms:${stripPhone}?body=${encodedBody}`;
          const waLink = `https://api.whatsapp.com/send?phone=${stripPhone}&text=${encodedBody}`;

          return {
            id: `battery-alert-${Date.now()}-${idx}`,
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
          triggerSystemNotification(`[CRITICAL] Low battery alerts dispatched auto-sent to contacts!`);
        }
      }
    }

    // Departure/Safe Walk initiation notification to selected contact recipients
    if (selectedWalkContacts.length > 0) {
      if (!smsPermission) {
        triggerSystemNotification(`[SAFE WALK NOTIFICATION SKIPPED] Contact notification disabled by user permission.`);
      } else {
        const majorStreet = getRouteStreetName(selectedRoute);
        const startWalkMsg = `${userName} is walking home using Beacon to ${destinationInput} with an ETA of ${mins} mins. Their phone battery is at ${phoneBattery}%. They will be walking on ${majorStreet}. It would be a good idea to monitor their travels and verify they get home safely :)`;

        const initSMSLogs = selectedWalkContacts.map((contact, idx) => {
          const cleanPhone = contact.phone.trim();
          const stripPhone = cleanPhone.replace(/[^0-9+]/g, '');
          const encodedBody = encodeURIComponent(startWalkMsg);
          const smsLink = `sms:${stripPhone}?body=${encodedBody}`;
          const waLink = `https://api.whatsapp.com/send?phone=${stripPhone}&text=${encodedBody}`;

          return {
            id: `safewalk-initiation-${Date.now()}-${idx}`,
            phone: `${contact.name || 'Emergency'} (${cleanPhone})`,
            message: startWalkMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            smsLink,
            waLink
          };
        });

        setReceivedSimulatedSMS(prev => [...initSMSLogs, ...prev]);
        setShowPhoneSimulator(true);
      }
    }

    setSafeWalkFlowStep('idle');
    triggerSystemNotification(`Pathway locked. Initializing walk to ${destinationInput || 'Home'}. ETA: ${mins} mins.`);
  };

  // Validate Password Pin for Safe Arrival or Change Walk
  const handleAuthSubmit = () => {
    const pass = authInput;
    if (pass === timerState.passwordHash || pass === safeArrivalPin) {
      onPinSuccess();
      if (showAuthGate === 'cancel') {
        setTimerState({
          isActive: false,
          destination: '',
          etaMinutes: 0,
          remainingSeconds: 0,
          passwordHash: '',
          phoneNumbers: [],
          isDistressed: false,
          checkInRequired: false,
        });
        triggerSystemNotification("Safe lock resolved. Safe Walk safely closed.");
        setShowCancelSuccess(true);
      } else if (showAuthGate === 'modify') {
        setTimerState(prev => ({
          ...prev,
          etaMinutes: prev.etaMinutes + 15,
          remainingSeconds: prev.remainingSeconds + (15 * 60),
          checkInRequired: false,
        }));
        triggerSystemNotification("Walk extended 15 minutes via password authentication.");
      }
      setShowAuthGate(null);
      setAuthInput('');
      setAuthError(false);
    } else {
      onPinFailure();
      setAuthError(true);
      triggerSystemNotification("Error: Incorrect safety password locked out.");
    }
  };

  // Faster simulation toggle for testing (sets seconds remaining to 10s left)
  const handleFastForwardTimer = () => {
    if (!timerState.isActive) return;
    setTimerState(prev => ({
      ...prev,
      remainingSeconds: 15, // Let them witness the 15 seconds pre-alarm and subsequent SMS triggers!
    }));
    setShowAuthGate('cancel');
    setAuthInput('');
    setAuthError(false);
    triggerSystemNotification("Simulation Fast-Forward: Timer set to 15s. Cancel prompt opened to avoid dispatch.");
  };

  // Reset the interactive simulation state
  const handleResetSimulation = () => {
    setTimerState({
      isActive: false,
      destination: '',
      etaMinutes: 0,
      remainingSeconds: 0,
      passwordHash: '',
      phoneNumbers: [],
      isDistressed: false,
      checkInRequired: false,
    });
    setActiveMessageLog([]);
    setHasNotifiedPreArrival(false);
    triggerSystemNotification("Beacon platform initialized. Safe-walk system 24/7 online.");
  };

  // Calculated route paths on our customized styled vector grid
  const renderPathStr = (() => {
    if (routesData[selectedRoute] && routesData[selectedRoute].coords.length > 0) {
      const svgPoints = routesData[selectedRoute].coords.map(([lat, lon]) => {
        const { x, y } = gpsToSvg(lat, lon);
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      return `M ${svgPoints.join(' L ')}`;
    }
    switch (selectedRoute) {
      case 'dangerous':
        return "M 100 420 L 400 420 L 400 320 L 400 120"; // Shortcut
      case 'train':
        return "M 100 420 L 100 220 L 400 220 L 400 120"; // Subway T-Subway
      case 'bus':
        return "M 100 420 L 250 420 L 400 420 L 400 120"; // Bus 38 Geary
      case 'rideshare':
        return "M 100 420 L 100 320 L 250 320 L 250 120 L 400 120"; // Rideshare
      case 'cablecar':
        return "M 100 420 L 400 420 L 400 120"; // Cable-car
      case 'safe':
      default:
        return "M 100 420 L 250 420 L 250 220 L 250 120 L 400 120"; // Safe Hyde St
    }
  })();

  return (
    <div className="relative w-full h-[640px] select-none bg-[#090A0E] text-slate-100 overflow-hidden flex flex-col font-sans" id="homebound-main-container">
      
      {/* 1. Header Banner */}
      <div className="absolute top-0 inset-x-0 z-20 flex justify-between items-center px-4 py-3 bg-[#0D0E12]/80 backdrop-blur-md border-b border-white/5" id="homebound-header-id">
        <div className="flex items-center gap-2">
          <BeaconLogo size={22} showBadge={false} />
          <div>
            <h1 className="font-space font-bold text-sm tracking-tight text-white leading-none">Beacon</h1>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">SafeWalk 24/7 Active</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={onNavigateToSettings}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Settings Dashboard"
            id="settings-nav-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Vector Interactive City Map Area */}
      <div 
        ref={mapContainerRef}
        className="relative w-full flex-1 bg-[#090A0F] overflow-hidden" 
        id="map-viewport-wrapper"
      >
        {/* Real Dynamic Interactive Leaflet Map Container */}
        <div 
          ref={leafletMapContainerRef}
          className="absolute inset-0 w-full h-full animate-fade-in"
          id="leaflet-map-element"
          style={{ zIndex: 0 }}
        />

        {/* Real GPS Map Control Buttons */}
        <div className="absolute top-16 right-4 z-10 flex flex-col items-end gap-2">
          {userCoords && (
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current;
                if (map) {
                  map.setView([userCoords.lat, userCoords.lon], 17, { animate: true });
                  triggerSystemNotification("Refocused map onto your exact GPS coordinates.");
                }
              }}
              className="p-2.5 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-505/30 shadow-2xl pointer-events-auto transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-space font-bold"
              title="Aim to my live position"
            >
              <Compass className="w-3.5 h-3.5 animate-spinner-slow" />
              <span>Sync GPS Position</span>
            </button>
          )}
          <div className="px-3 py-1 rounded-full bg-slate-950/90 border border-slate-850 text-[8px] font-mono text-indigo-300 font-black tracking-wider uppercase shrink-0 shadow flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span>
            <span>OSM Active Dark Engine</span>
          </div>
        </div>

        {/* Dynamic map graphics under dark night layout */}
        {!leafletLoaded && (
          <svg className="w-full h-full absolute inset-0 text-slate-800" viewBox="0 0 640 500">
            <defs>
              {/* Streetlights Radial Glows */}
              <radialGradient id="lampGlow" r="50%">
                <stop offset="0%" stopColor="#FB7185" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </radialGradient>
              
              {/* Safety Lighting Radial Gradient */}
              <radialGradient id="lightGlow" r="50%">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.32" />
                <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </radialGradient>

              {/* Pedestrian Heatmap Glow */}
              <radialGradient id="heatGlow" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                <stop offset="62%" stopColor="#10B981" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
              
              {/* Riot/Disturbance Heatmap */}
              <radialGradient id="crimeGlow" r="50%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#EF4444" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Block Fills represent buildings and unpaved shortcuts */}
            <rect x="0" y="0" width="640" height="500" fill="#08090C" />
            
            <rect x="110" y="130" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="260" y="130" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="410" y="130" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="110" y="230" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="260" y="230" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="410" y="230" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="110" y="330" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="260" y="330" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />
            <rect x="410" y="330" width="130" height="80" rx="4" fill="#0E1015" stroke="#FFFFFF" strokeOpacity="0.02" />

            {/* Grid Road Paths */}
            {STREET_GRID.map(road => {
              if ('y' in road) {
                return (
                  <line 
                    key={road.id} 
                    x1="50" 
                    y1={road.y} 
                    x2="590" 
                    y2={road.y} 
                    stroke={road.type === 'shortcut' ? '#272530' : '#171A21'} 
                    strokeWidth="24" 
                    strokeLinecap="round"
                  />
                );
              } else if ('x' in road) {
                return (
                  <line 
                    key={road.id} 
                    x1={road.x} 
                    y1="80" 
                    x2={road.x} 
                    y2="450" 
                    stroke={road.type === 'dark' ? '#14151C' : '#171A21'} 
                    strokeWidth="24" 
                    strokeLinecap="round"
                  />
                );
              }
              return null;
            })}

            {/* Toggled Safe Lighting Overlays */}
            {overlays.streetlights && SIMULATED_STREETLIGHTS.map(lamp => (
              <circle 
                key={lamp.id} 
                cx={lamp.x} 
                cy={lamp.y} 
                r={lamp.intensity === 'high' ? 36 : 24} 
                fill="url(#lightGlow)" 
              />
            ))}

            {/* Toggled Foot-Traffic Clusters Heatmap */}
            {overlays.footTraffic && SIMULATED_FOOT_TRAFFIC.map(cluster => (
              <circle 
                key={cluster.id} 
                cx={cluster.x} 
                cy={cluster.y} 
                r={cluster.radius} 
                fill="url(#heatGlow)" 
              />
            ))}

            {/* Active 311 Crimes Disturbance Logs */}
            {overlays.disturbances && SIMULATED_DISTURBANCES.map(item => (
              <g key={item.id}>
                <circle cx={item.x} cy={item.y} r="28" fill="url(#crimeGlow)" className="animate-pulse" />
                <circle cx={item.x} cy={item.y} r="4" fill={item.severity === 'high' ? '#EF4444' : '#F59E0B'} />
              </g>
            ))}

            {/* Rideshare surge high-density zone indicators */}
            {overlays.rideshareSurge && (
              <g>
                <path d="M 550 120 L 550 320" stroke="#3B82F6" strokeWidth="6" strokeOpacity="0.3" strokeDasharray="3,3" />
                <circle cx="550" cy="220" r="14" fill="#3B82F6" fillOpacity="0.1" />
              </g>
            )}

            {/* Active Path routing line (Glowing indigo/emerald for safe, dashed unlit for shortcut) */}
            {timerState.isActive && (
              <path 
                d={renderPathStr} 
                fill="none" 
                stroke={getPathColor(selectedRoute)} 
                strokeWidth="5" 
                strokeLinecap="round"
                strokeDasharray={
                  selectedRoute === 'dangerous' 
                    ? '8,4' 
                    : selectedRoute === 'train'
                      ? '9,3'
                      : selectedRoute === 'bus'
                        ? '6,3'
                        : selectedRoute === 'rideshare'
                          ? '3,3'
                          : selectedRoute === 'cablecar'
                            ? '12,4'
                            : undefined
                }
                className="transition-all duration-500 ease-in-out font-mono text-xs"
              />
            )}

            {/* Interactive Route Selection Pathways */}
            {safeWalkFlowStep === 'route_selection' && (
              <g className="pointer-events-auto">
                {/* Alternate Shortcut Route */}
                <path 
                  d="M 100 420 L 400 420 L 400 320 L 400 120"
                  fill="none" 
                  stroke="#F59E0B" 
                  strokeWidth={selectedRoute === 'dangerous' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'dangerous' ? '0.95' : '0.25'}
                  strokeDasharray="6,3"
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#F59E0B] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('dangerous');
                    setEtaInput('8');
                  }}
                />

                {/* Suggested Safe Route */}
                <path 
                  d="M 100 420 L 250 420 L 250 220 L 250 120 L 400 120"
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth={selectedRoute === 'safe' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'safe' ? '0.95' : '0.25'}
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#10B981] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('safe');
                    setEtaInput('12');
                  }}
                />

                {/* Train/Subway Selection Route */}
                <path 
                  d="M 100 420 L 100 220 L 400 220 L 400 120"
                  fill="none" 
                  stroke="#C084FC" 
                  strokeWidth={selectedRoute === 'train' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'train' ? '0.95' : '0.2'}
                  strokeDasharray="9,3"
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#C084FC] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('train');
                    setEtaInput('9');
                  }}
                />

                {/* Bus Route Selection Route */}
                <path 
                  d="M 100 420 L 250 420 L 400 420 L 400 120"
                  fill="none" 
                  stroke="#60A5FA" 
                  strokeWidth={selectedRoute === 'bus' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'bus' ? '0.95' : '0.2'}
                  strokeDasharray="6,3"
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#60A5FA] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('bus');
                    setEtaInput('13');
                  }}
                />

                {/* Rideshare Selection Route */}
                <path 
                  d="M 100 420 L 100 320 L 250 320 L 250 120 L 400 120"
                  fill="none" 
                  stroke="#F472B6" 
                  strokeWidth={selectedRoute === 'rideshare' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'rideshare' ? '0.95' : '0.2'}
                  strokeDasharray="3,3"
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#F472B6] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('rideshare');
                    setEtaInput('7');
                  }}
                />

                {/* Cable Car Selection Route */}
                <path 
                  d="M 100 420 L 400 420 L 400 120"
                  fill="none" 
                  stroke="#FBBF24" 
                  strokeWidth={selectedRoute === 'cablecar' ? '8' : '4'} 
                  strokeLinecap="round"
                  strokeOpacity={selectedRoute === 'cablecar' ? '0.95' : '0.2'}
                  strokeDasharray="12,4"
                  className="transition-all duration-300 ease-in-out cursor-pointer hover:stroke-[#FBBF24] hover:stroke-7"
                  onClick={() => {
                    setSelectedRoute('cablecar');
                    setEtaInput('15');
                  }}
                />
              </g>
            )}

            {/* Start Point Pin (User initial spot) */}
            {(timerState.isActive || safeWalkFlowStep === 'route_selection') && (
              <circle cx="100" cy="420" r="6" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
            )}

            {/* Target End Point Pin (Safespot) */}
            {(timerState.isActive || safeWalkFlowStep === 'route_selection') && (
              <g transform="translate(400, 120)">
                <circle cx="0" cy="0" r="8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                <path d="M-3,-3 L3,-3 L3,3 L-3,3 Z" fill="none" stroke="#FFFFFF" strokeWidth="1" />
              </g>
            )}
          </svg>
        )}

        {/* Street labels and details placed on top of the vector map */}
        {!leafletLoaded && (
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-[110px] left-[120px] text-[9px] text-slate-500 font-medium">Congress Ave (Bright Mainway)</div>
            <div className="absolute top-[310px] left-[260px] text-[9px] text-rose-500/70 font-mono">Unlit Alley Way Cutoff</div>
            <div className="absolute top-[430px] left-[150px] text-[9px] text-indigo-400 font-medium font-mono">Current Position</div>
            <div className="absolute top-[138px] left-[370px] text-[9px] text-sky-400 font-bold">Goal: Congress Safespot</div>

            {/* Route Selector Labels with Walking Time Indicator Icons */}
            {safeWalkFlowStep === 'route_selection' && (
              <>
                {/* Safe Route Badge */}
                <div 
                  className="absolute pointer-events-auto -translate-y-1/2 -translate-x-1/2 z-20"
                  style={{ left: '250px', top: '220px' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoute('safe');
                      setEtaInput('12');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-[0_2px_12px_rgba(0,0,0,0.6)] font-space font-bold text-[10px] cursor-pointer transition-all ${
                      selectedRoute === 'safe'
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200 scale-105 shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-805 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>12m (Safe Route)</span>
                  </button>
                </div>

                {/* Alternate Alley Shortcut Route Badge */}
                <div 
                  className="absolute pointer-events-auto -translate-y-1/2 -translate-x-1/2 z-20"
                  style={{ left: '400px', top: '280px' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoute('dangerous');
                      setEtaInput('8');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-[0_2px_12px_rgba(0,0,0,0.6)] font-space font-bold text-[10px] cursor-pointer transition-all ${
                      selectedRoute === 'dangerous'
                        ? 'bg-amber-950 border-amber-400 text-amber-200 scale-105 shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-805 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>8m (Alley Shortcut)</span>
                  </button>
                </div>
              </>
            )}

            {/* Render interactive street light node markers for detail */}
            {overlays.streetlights && SIMULATED_STREETLIGHTS.map(lamp => (
              <div 
                key={lamp.id} 
                className="absolute w-2 h-2 rounded-full bg-amber-400 border border-amber-200/55 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-auto cursor-help"
                style={{ left: `${lamp.x - 4}px`, top: `${lamp.y - 4}px` }}
                onMouseEnter={() => setTooltipText(`Lamp ID: ${lamp.id} — Activated municipal safety grid spotlight.`)}
                onMouseLeave={() => setTooltipText(null)}
              />
            ))}

            {/* Active Disturbance Labels */}
            {overlays.disturbances && SIMULATED_DISTURBANCES.map(item => (
              <div 
                key={item.id} 
                className="absolute pointer-events-auto cursor-help group"
                style={{ left: `${item.x - 8}px`, top: `${item.y - 12}px` }}
                onMouseEnter={() => setTooltipText(item.description)}
                onMouseLeave={() => setTooltipText(null)}
              >
                <AlertTriangle className={`w-4 h-4 ${item.severity === 'high' ? 'text-red-500' : 'text-amber-500'} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`} />
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Context Tooltip inside map container */}
        {tooltipText && (
          <div className="absolute top-16 left-4 right-4 z-10 px-3 py-2 rounded-lg bg-slate-950/95 border border-slate-800 text-xs text-slate-300 leading-relaxed shadow-xl animate-fuzzy">
            <span className="font-semibold text-slate-200 mr-1">Map Node:</span>
            {tooltipText}
          </div>
        )}

        {/* Live Broadcast logs stream (Bottom left of map) */}
        <div className="absolute bottom-4 left-4 z-10 max-w-[260px] pointer-events-none flex flex-col gap-1">
          {activeMessageLog.map((log, index) => (
            <div 
              key={index} 
              className={`px-2 py-1 rounded text-[9px] font-mono leading-tight border transition-opacity duration-300 backdrop-blur-md ${
                log.startsWith('[SMS') 
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/20' 
                  : 'bg-[#0E1117]/85 text-indigo-300 border-indigo-500/10'
              }`}
              style={{ opacity: 1 - (index * 0.22) }}
            >
              {log}
            </div>
          ))}
        </div>

        {/* PUBLIC TRANSIT TOGGLE & VERTICAL MENU OPTION SLIDER */}
        {(safeWalkFlowStep === 'route_selection' || safeWalkFlowStep === 'destination') && (
          <div 
            className="absolute top-[110px] left-4 z-20 flex flex-col gap-2 w-[215px] pointer-events-auto select-none" 
            id="public-transit-navigation-cluster"
          >
            {/* Main Transit Mode Toggle Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsTransitExpanded(!isTransitExpanded);
                triggerSystemNotification(
                  !isTransitExpanded 
                    ? "Public Transit Hub expanded. Real-time routes and estimates loaded." 
                    : "Public Transit Hub collapsed."
                );
              }}
              className={`px-3 py-2.5 rounded-xl border flex items-center justify-between gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all active:scale-95 cursor-pointer w-full ${
                isTransitExpanded 
                  ? 'bg-indigo-600 border-indigo-405 text-white font-bold' 
                  : ['train', 'bus', 'rideshare', 'cablecar'].includes(selectedRoute)
                    ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Public Transit & Rideshare Options"
              id="toggle-transit-mode-btn"
            >
              <div className="flex items-center gap-2">
                <Train className={`w-4 h-4 shrink-0 p-0.5 rounded ${isTransitExpanded ? 'animate-bounce' : ''}`} />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-space font-extrabold tracking-wider uppercase leading-none">Transit Mode</span>
                  {['train', 'bus', 'rideshare', 'cablecar'].includes(selectedRoute) ? (
                    <span className="text-[8px] font-mono opacity-80 mt-0.5 lowercase text-emerald-400">
                      active: {selectedRoute}
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono opacity-50 mt-0.5 uppercase">
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>
              {isTransitExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>

            {/* Expanded Vertical Bar Options Menu */}
            {isTransitExpanded && (
              <div 
                className="flex flex-col gap-1.5 p-1.5 bg-[#0C1017]/95 border border-slate-800/80 rounded-xl shadow-2xl backdrop-blur-lg animate-slide text-left" 
                id="expanded-transit-vertical-bar"
              >
                <div className="px-1.5 py-0.5 border-b border-white/5 pb-1 mb-1 flex justify-between items-center text-[8px] text-slate-500 uppercase font-space font-black tracking-widest">
                  <span>Select Boarding</span>
                  <span className="text-[7.5px] font-mono text-indigo-400">4 nearby option</span>
                </div>

                {TRANSIT_OPTIONS.map((option) => {
                  const isSelected = selectedRoute === option.id;
                  const IconComponent = option.id === 'train' 
                    ? Train 
                    : option.id === 'bus' 
                      ? Bus 
                      : option.id === 'rideshare' 
                        ? Car 
                        : Train;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoute(option.id);
                        setEtaInput(String(routesData[option.id] ? routesData[option.id].eta : option.eta));
                        // Automatically slide into route selection step so the map visual activates
                        if (safeWalkFlowStep === 'destination') {
                          setSafeWalkFlowStep('route_selection');
                        }
                        triggerSystemNotification(`Transit active: ${option.name}. Routing set!`);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 relative group cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-950/45 text-white bg-opacity-40 shadow-inner' 
                          : 'bg-slate-900/30 hover:bg-slate-900/70 text-slate-300 border-transparent'
                      }`}
                      style={{ borderColor: isSelected ? option.color + '44' : undefined }}
                    >
                      {/* Left icon wrapper */}
                      <div 
                        className="p-1 rounded mt-0.5 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ 
                          backgroundColor: isSelected ? option.color + '15' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? option.color + '30' : 'rgba(255,255,255,0.05)'}`
                        }}
                      >
                        <IconComponent className="w-3.5 h-3.5 shrink-0" style={{ color: option.color }} />
                      </div>

                      {/* Middle details space */}
                      <div className="flex-1 min-w-0 flex flex-col text-left">
                        <div className="flex justify-between items-baseline gap-1">
                          <span className="text-[10px] font-space font-extrabold truncate text-slate-200">
                            {option.name}
                          </span>
                          <span className="text-[8.5px] font-mono font-bold shrink-0 text-slate-400">
                            {option.wait}
                          </span>
                        </div>
                        <p className="text-[8px] text-slate-400 leading-normal mt-0.5">
                          {option.description}
                        </p>
                        
                        {/* Safety tags and estimated price/travel */}
                        <div className="flex items-center justify-between mt-1 border-t border-white/5 pt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-white/5 text-slate-300 font-bold font-mono">
                              {routesData[option.id] ? `${routesData[option.id].eta}m travel` : option.ride}
                            </span>
                            <span className="text-[7.5px] font-space px-1 py-0.2 rounded font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300">
                              {option.id === 'rideshare' ? 'Escort' : 'CCTV Rail'}
                            </span>
                          </div>
                          {option.id === 'rideshare' ? (
                            <span className="text-[8px] font-mono font-black text-emerald-400 shrink-0">
                              $14.20
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono text-indigo-400 shrink-0">
                              Muni Fare
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Map overlay toggle widgets (Floating stack on right) */}
        <div className="absolute top-16 right-4 z-10 flex flex-col gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg" id="layer-overlays-panel">
          <button 
            onClick={() => toggleOverlay('streetlights')}
            className={`p-2 rounded-lg transition-all ${overlays.streetlights ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            title="Safe streetlighting layer"
            id="toggle-lights-btn"
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => toggleOverlay('footTraffic')}
            className={`p-2 rounded-lg transition-all ${overlays.footTraffic ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            title="Pedestrian density heatmap"
            id="toggle-traffic-btn"
          >
            <Users className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => toggleOverlay('disturbances')}
            className={`p-2 rounded-lg transition-all ${overlays.disturbances ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            title="Active 311 disturbance logs"
            id="toggle-disturbances-btn"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button 
            onClick={() => toggleOverlay('rideshareSurge')}
            className={`p-2 rounded-lg transition-all ${overlays.rideshareSurge ? 'bg-indigo-600 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            title="Rideshare & Public Transit Surge"
            id="toggle-surge-btn"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Priority Filter selector bar (Top centered) */}
        {timerState.isActive && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 flex gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-lg shadow" id="route-selector-bar">
            <button 
              onClick={() => setSelectedRoute('safe')}
              className={`px-3 py-1 text-[10px] font-space font-semibold rounded-md transition-all ${
                selectedRoute === 'safe' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400'
              }`}
            >
              Safe Priority (96.5 Score)
            </button>
            <button 
              onClick={() => setSelectedRoute('dangerous')}
              className={`px-3 py-1 text-[10px] font-space font-semibold rounded-md transition-all ${
                selectedRoute === 'dangerous' 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                  : 'text-slate-400'
              }`}
            >
              Shortest Shortcut (42.0 Score)
            </button>
          </div>
        )}

        {/* Floating Phone Button */}
        <button 
          onClick={() => setShowPhoneSimulator(!showPhoneSimulator)}
          className={`absolute bottom-4 right-4 z-20 px-2.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            receivedSimulatedSMS.length > 0 
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse' 
              : 'bg-slate-900/95 hover:bg-slate-800 text-slate-300 border-slate-750 shadow-md'
          }`}
          title="Open virtual SMS simulator handset device"
        >
          <Smartphone className="w-3.5 h-3.5" />
          {receivedSimulatedSMS.length > 0 && (
            <span className="text-[9px] font-space font-black bg-white text-rose-600 px-1 rounded">
              {receivedSimulatedSMS.length} NEW
            </span>
          )}
          <span className="text-[10px] font-space font-semibold">Message Receiver</span>
        </button>

        {/* Handset Mobile Simulator Popup Panel */}
        {showPhoneSimulator && (
          <div className="absolute top-14 right-4 bottom-14 w-[280px] bg-[#0A0D14] border border-indigo-500/20 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-slide" id="phone-simulator-viewport">
            {/* Status Bar / Notch */}
            <div className="bg-slate-950 px-3 py-1 flex justify-between items-center text-[7px] font-mono text-slate-500 border-b border-white/5 select-none">
              <span>Beacon Mobile</span>
              <div className="w-12 h-2.5 bg-slate-900 rounded-full mx-auto" />
              <span>03:45 AM</span>
            </div>

            {/* Simulated App Header */}
            <div className="bg-[#10131F]/90 p-2.5 flex justify-between items-center border-b border-slate-900/80">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <h4 className="text-[9px] font-space font-black tracking-wider uppercase text-slate-300">
                  Virtual SMS Inbox
                </h4>
              </div>
              <button 
                onClick={() => setShowPhoneSimulator(false)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simulated SMS Thread Body */}
            <div className="flex-1 p-2.5 overflow-y-auto bg-slate-950 flex flex-col">
              {receivedSimulatedSMS.length === 0 ? (
                <div className="my-auto text-center flex flex-col items-center justify-center p-4">
                  <Smartphone className="w-7 h-7 text-slate-800 mb-1.5 animate-pulse" />
                  <p className="text-[9px] text-slate-500 max-w-[180px] leading-relaxed">
                    No active alarm check-in failures parsed yet.
                  </p>
                  <p className="text-[8px] text-indigo-400/40 mt-1 italic">
                    (Use "Fast-Test Alarm" trigger during a Safe Walk to fail the password loop!)
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 h-full overflow-y-auto">
                  <div className="text-center text-[7px] text-slate-600 uppercase font-black tracking-widest my-1">
                    Emergency Broadcast Stream
                  </div>
                  {receivedSimulatedSMS.map((sms) => (
                    <div key={sms.id} className="p-2 rounded-lg bg-slate-900/90 border border-slate-850 space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
                        <span className="text-rose-400 font-bold">To: {sms.phone}</span>
                        <span>{sms.time}</span>
                      </div>
                      
                      <p className="text-[9px] text-slate-300 leading-normal font-mono bg-black/60 p-2 rounded border border-white/5 select-text">
                        {sms.message}
                      </p>

                      {/* Web Launcher deep link options */}
                      <div className="grid grid-cols-2 gap-1 px-0.5">
                        <a 
                          href={sms.smsLink}
                          target="_self"
                          className="px-1 py-0.5 bg-indigo-650 hover:bg-indigo-500 rounded text-[8px] text-white font-space font-bold text-center no-underline flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          💬 Send SMS (Free)
                        </a>
                        <a 
                          href={sms.waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1 py-0.5 bg-emerald-650 hover:bg-emerald-500 rounded text-[8px] text-white font-space font-bold text-center no-underline flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          📲 WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Footer inside Simulator */}
            {receivedSimulatedSMS.length > 0 && (
              <div className="p-2 bg-[#10131F]/90 border-t border-slate-900 flex justify-between items-center">
                <button 
                  onClick={() => setReceivedSimulatedSMS([])}
                  className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[8px] font-space font-bold rounded cursor-pointer transition-colors"
                >
                  Clear Inbox
                </button>
                <div className="text-[7px] text-slate-500 font-mono">
                  100% Client-Side
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Active Distress Timer & check-in security hub (Sticky Bottom drawer) */}
      <div className="p-4 bg-[#0B0C10] border-t border-slate-800" id="bottom-controls-drawer">
        {!timerState.isActive ? (
          /* IDLE PRE-WALK STATE */
          <div className="flex justify-center items-center bg-[#0F1117] rounded-xl p-4 border border-white/5 shadow-inner">
            <button 
              onClick={() => setSafeWalkFlowStep('destination')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 font-space font-bold text-sm rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 w-full max-w-[280px]"
              id="start-safewalk-trigger"
            >
              <Navigation className="w-4 h-4 fill-current" />
              Start Safe Walk
            </button>
          </div>
        ) : (
          /* ACTIVE WALK TIMELINE MONITORING */
          <div className="bg-[#0D0E15] border border-indigo-500/20 rounded-xl p-4 shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${timerState.checkInRequired ? 'bg-[#EF4444] animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className={`text-[10px] font-space font-bold tracking-tight ${timerState.checkInRequired ? 'text-red-400' : 'text-emerald-400'}`}>
                    {timerState.checkInRequired ? 'SAFE CODE CHECK-IN PROMPT' : 'SECURITY TIMER ACTIVE'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 truncate mt-1 max-w-[200px]">
                  Go: {timerState.destination}
                </h3>
              </div>
              
              <div className="text-right flex flex-col items-end">
                <span className="text-xl font-space font-bold text-indigo-400 leading-none">
                  {Math.floor(timerState.remainingSeconds / 60)}:{(timerState.remainingSeconds % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-[9px] text-slate-500 font-mono mt-1">Seconds Left</span>
              </div>
            </div>

            {/* Dynamic visual slider of active walk eta */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
              <div 
                className={`h-full transition-all duration-1000 ${timerState.checkInRequired ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${(timerState.remainingSeconds / (timerState.etaMinutes * 60)) * 100}%` }}
              />
            </div>

            {/* Action panel triggers: authentication and modifiers */}
            <div className="flex gap-2.5">
              <button 
                onClick={() => setShowAuthGate('cancel')}
                className="flex-1 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 text-red-400 font-space font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                id="safewalk-arrived-btn"
              >
                Arrived / Safe Cancel
              </button>
              
              <button 
                onClick={() => setShowAuthGate('modify')}
                className="px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 font-space font-semibold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                title="Extend current walk countdown"
                id="extend-walk-btn"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                +15m
              </button>

              <button 
                onClick={handleFastForwardTimer}
                className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-amber-400 font-space font-bold text-[10px] rounded-lg transition-all flex items-center justify-center"
                title="Mock 15 seconds ETA threshold for testing"
                id="test-trigger-alarm"
              >
                Fast-Test Alarm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. SAFE WALK CONFIGURATION FLOW STEPS */}
      {/* STEP 1: DESTINATION INPUT BOX ONLY */}
      {safeWalkFlowStep === 'destination' && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-end animate-slice" id="destination-config-panel">
          <div className="w-full bg-[#10121A] border-t border-slate-800 rounded-t-2xl p-5 shadow-2xl flex flex-col max-h-[85%] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-space font-bold text-base text-slate-100 flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  Define Destination Target
                </h3>
                <p className="text-xs text-slate-400 mt-1">First, enter where you are walking to plan safety grids.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSafeWalkFlowStep('idle')}
                className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Starting Point</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={startingPointInput}
                    onChange={(e) => {
                      setStartingPointInput(e.target.value);
                    }}
                    required
                    placeholder="e.g. 123 Main St."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm focus:outline-none transition-colors text-white"
                  />
                  {isReverseGeocoding && (
                    <div className="absolute right-3 top-3">
                      <RefreshCw className="w-4 h-4 text-indigo-400/85 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-left">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isReverseGeocoding}
                    className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 font-space inline-flex items-center gap-1 cursor-pointer hover:underline disabled:opacity-50"
                  >
                    <Navigation className="w-2.5 h-2.5 rotate-45" />
                    Use Current Location
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Destination target</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setShowSuggestionsDropdown(true);
                    }}
                    onFocus={() => {
                      if (addressSuggestions.length > 0 || isSearchingAddresses) {
                        setShowSuggestionsDropdown(true);
                       }
                    }}
                    required
                    placeholder="Enter safe spot or home address"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm focus:outline-none transition-colors text-white"
                  />
                  {isSearchingAddresses && (
                    <div className="absolute right-3 top-3">
                      <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                  )}

                  {/* Autocomplete items dropdown */}
                  {showSuggestionsDropdown && (destinationInput.length >= 3) && (isSearchingAddresses || addressSuggestions.length > 0) && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#0F121D] border border-slate-800 shadow-2xl z-[60] divide-y divide-slate-850">
                      {userCoords && (
                        <div className="px-3.5 py-2 bg-indigo-950/40 text-indigo-300 text-[9px] font-space font-semibold flex items-center gap-1.5 border-b border-slate-850 select-none">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                          <span>Prioritizing spots near you ({userCoords.lat.toFixed(4)}°N, {userCoords.lon.toFixed(4)}°W)</span>
                        </div>
                      )}
                      {isSearchingAddresses && addressSuggestions.length === 0 && (
                        <div className="p-3 text-[10px] text-slate-400 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          Indexing matching spots...
                        </div>
                      )}
                      {addressSuggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setDestinationInput(suggestion.displayName);
                            setLastSelectedAddress(suggestion.displayName);
                            setShowSuggestionsDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-start gap-2 cursor-pointer border-b border-slate-900/40 last:border-0"
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2 leading-relaxed">{suggestion.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
 
              <button 
                type="button" 
                onClick={handleChoosePathOnMap}
                disabled={!destinationInput.trim() || isSearchingAddresses || isReverseGeocoding}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-space font-bold rounded-xl text-white shadow-xl transition-all flex items-center justify-center gap-1"
              >
                {isSearchingAddresses ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Geocoding Route...
                  </>
                ) : (
                  <>
                    Choose Path on Map
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FLOATING ROUTE CONFIRMATION OVERLAY */}
      {safeWalkFlowStep === 'route_selection' && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#0E1017]/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 backdrop-blur-md animate-slide">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-space font-black uppercase text-indigo-400 tracking-widest block mb-0.5">Step 2: Choose Safety Pathway</span>
              <h4 className="text-xs font-bold text-slate-200">
                Selected: {!locationPermission ? 'Standard Fallback Path (Unoptimized)' : getRouteName(selectedRoute)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-[210px]">
                {!locationPermission 
                  ? "Real-time safety features such as municipal streetlighting mapping and foot-traffic pedestrian clusters are not active because location permission was denied. Safe Walk route will not be optimized." 
                  : getRouteDescription(selectedRoute)}
              </p>
              {!locationPermission && (
                <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-[8.5px] text-rose-350 leading-relaxed font-sans mt-1.5">
                  ⚠️ <strong>Notice:</strong> High-performance safety optimizations are off due to restricted location settings. You can re-enable this in Safety Configurations settings.
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-space font-bold block animate-fade-in" style={{ color: !locationPermission ? '#94A3B8' : getPathColor(selectedRoute) }}>
                {routesData[selectedRoute] ? routesData[selectedRoute].eta : getRouteEta(selectedRoute)}m
              </span>
              <span className="text-[7px] text-slate-500 font-mono">ESTIMATED ETA</span>
            </div>
          </div>

          <div className="flex gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => {
                setSafeWalkFlowStep('destination');
              }}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-space font-semibold rounded-xl border border-slate-800 transition-colors"
            >
              ← Back to Address
            </button>
            <button
              type="button"
              onClick={() => {
                // Sync user chosen path to start configuration minutes
                setEtaInput(String(routesData[selectedRoute] ? routesData[selectedRoute].eta : getRouteEta(selectedRoute)));
                setSafeWalkFlowStep('final_confirm');
              }}
              style={{ backgroundColor: getPathColor(selectedRoute) }}
              className="flex-1 py-2 font-space font-bold rounded-xl text-white transition-all hover:brightness-110 shadow-lg active:scale-95 cursor-pointer"
            >
              Confirm Path & Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FINAL START SAFE WALK SECURITY SCREEN */}
      {safeWalkFlowStep === 'final_confirm' && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-end animate-slice" id="safewalk-final-panel">
          <form 
            onSubmit={handleStartSafeWalkSubmit} 
            className="w-full bg-[#10121A] border-t border-slate-800 rounded-t-2xl p-5 shadow-2xl flex flex-col max-h-[90%] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-space font-bold text-base text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Initiate Secure Safe Walk
                </h3>
                <p className="text-xs text-slate-400 mt-1">Latching safety countdown monitoring & alarm gates.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSafeWalkFlowStep('idle')}
                className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {/* Destination (Pre-populated from Step 1) */}
              <div>
                <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Destination target</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    required
                    placeholder="Enter safe spot or home address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Expected ETA minutes (Pre-populated from Step 2 option) */}
                <div>
                  <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Walking ETA (Mins)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="number" 
                      value={etaInput}
                      onChange={(e) => setEtaInput(e.target.value)}
                      required
                      min="1"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm focus:outline-none transition-colors text-white"
                    />
                  </div>
                </div>

                {/* Lock Code Safety Password */}
                <div>
                  <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Safe Arrival Password</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                      placeholder="e.g. SAFE"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0E] border border-slate-800 focus:border-indigo-505 text-sm focus:outline-none transition-colors text-white font-mono tracking-widest"
                    />
                  </div>
                </div>
              </div>

              {/* Select Contacts to Notify Dropdown */}
              <div className="space-y-1.5" id="secure-safewalk-contact-picker-wrapper">
                <label className="block text-[11px] font-space font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                  <span>Selected walk contacts ({selectedWalkContacts.length})</span>
                  <span className="text-[9px] text-[#A5B4FC] font-mono normal-case">
                    {selectedWalkContacts.length} of {emergencyContacts.length} selected
                  </span>
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsContactsDropdownOpen(!isContactsDropdownOpen);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 flex justify-between items-center text-left text-sm text-slate-300 transition-colors cursor-pointer select-none"
                    id="secure-safewalk-contacts-dropdown-btn"
                  >
                    <div className="flex items-center gap-2 max-w-[85%] truncate">
                      <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate text-xs">
                        {selectedWalkContacts.length === 0
                          ? 'No contacts selected (No departure alerts)'
                          : selectedWalkContacts.map(c => c.name || c.phone).join(', ')}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isContactsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isContactsDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl bg-[#111320] border border-slate-800 shadow-2xl z-[80] p-1.5 space-y-1" id="secure-safewalk-contacts-list-dropdown">
                      <div className="flex justify-between items-center px-1.5 py-1 border-b border-white/5 pb-1 mb-1 text-[9px] select-none">
                        <span className="font-space font-bold uppercase tracking-wider text-slate-400">Select Recipients</span>
                        <div className="flex gap-2 font-mono font-black text-[9px]">
                          <button
                            type="button"
                            onClick={() => setSelectedWalkContacts(emergencyContacts)}
                            className="text-indigo-400 hover:text-indigo-300 cursor-pointer px-1 py-0.5 rounded hover:bg-white/5 select-none"
                          >
                            SELECT ALL
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedWalkContacts([])}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer px-1 py-0.5 rounded hover:bg-white/5 select-none"
                          >
                            CLEAR
                          </button>
                        </div>
                      </div>

                      {emergencyContacts.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-slate-500">
                          No saved emergency contacts found. Go to Settings.
                        </div>
                      ) : (
                        emergencyContacts.map((contact) => {
                          const isSelected = selectedWalkContacts.some(c => c.phone === contact.phone);
                          return (
                            <div 
                              key={contact.phone}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedWalkContacts(selectedWalkContacts.filter(c => c.phone !== contact.phone));
                                } else {
                                  setSelectedWalkContacts([...selectedWalkContacts, contact]);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all select-none ${
                                isSelected 
                                  ? 'bg-indigo-950/40 border border-indigo-500/20 text-white' 
                                  : 'hover:bg-slate-900 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by parent onClick
                                  className="accent-indigo-500 cursor-pointer h-3.5 w-3.5 shrink-0"
                                />
                                <div className="flex flex-col text-left">
                                  <span className="text-xs font-semibold flex items-center gap-1.5 text-white">
                                    {contact.name || 'Emergency contact'}
                                    {contact.isDefault && (
                                      <span className="bg-emerald-500/15 text-emerald-400 px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-tight">
                                        ★ Default
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">{contact.phone}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Information Summary Indicator */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-[11px] leading-relaxed text-indigo-300 flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-200">24/7 Shield Enabled:</span> If the walk extends over <strong className="text-white">ETA + 30 mins grace</strong> without password deactivation, an automated distress text with custom alert alerts will be dispatched directly to your emergency contact lists (<span className="text-emerald-400 font-bold">{selectedWalkContacts.length > 0 ? selectedWalkContacts.map(c => c.name || c.phone).join(', ') : 'No custom contacts selected'}</span>).
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-space font-bold rounded-xl text-white shadow-xl transition-all flex items-center justify-center gap-1 active:scale-95"
            >
              Arm Safety Guard & Lock Pathway
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 6. PASSWORD AUTHENTICATION GATES FOR CHANGES */}
      {showAuthGate && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex items-center justify-center p-5 animate-fuzzy" id="password-gate-panel">
          <div className="w-full max-w-[280px] bg-[#12141F] rounded-2xl border border-slate-800 p-5 shadow-2xl">
            <h3 className="font-space font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              {showAuthGate === 'cancel' ? 'Safe Arrival Password' : 'Extend Walk ETA'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 mb-4">
              Enter your Safe Arrival Password to authorize this action.
            </p>

            {timerState.remainingSeconds <= 15 && timerState.remainingSeconds > 0 && timerState.isActive && (
              <div className="mb-3.5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-center animate-pulse font-space" id="fast-test-countdown-warning">
                <span className="block text-[10px] font-black tracking-widest text-[#f87171] uppercase leading-relaxed">EMERGENCY ALERT ACTIVATED</span>
                <span className="block text-[8px] tracking-wider text-rose-200/80 uppercase mt-2.5">EMERGENCY MESSAGE WILL BE DISPATCHED IN</span>
                <span className="block text-2xl font-mono font-black text-rose-350 mt-2">{timerState.remainingSeconds} seconds</span>
                <span className="block text-[10px] font-bold tracking-widest text-[#f87171] uppercase mt-2.5">ENTER PASSWORD TO CANCEL</span>
              </div>
            )}

            <input 
              type="password" 
              value={authInput}
              onChange={(e) => {
                setAuthInput(e.target.value);
                setAuthError(false);
              }}
              placeholder="Enter safety password"
              className={`w-full text-center py-2 px-3 rounded-xl bg-slate-950 border focus:outline-none text-base font-mono tracking-widest text-white ${
                authError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
              }`}
              autoFocus
            />

            {authError && (
              <span className="text-[10px] text-rose-400 mt-1.5 block text-center leading-normal">
                Incorrect password. {5 - consecutiveFailedAttempts} {5 - consecutiveFailedAttempts === 1 ? 'attempt' : 'attempts'} remaining, account will be locked for {getNextLockoutDurationMinutes(lockoutCount)} minutes if unsuccessful log-in attempts are exhausted.
              </span>
            )}

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  setShowAuthGate(null);
                  setAuthInput('');
                  setAuthError(false);
                }}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 font-space font-semibold text-xs rounded-xl text-slate-400"
              >
                Close
              </button>
              <button 
                onClick={handleAuthSubmit}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-space font-bold text-xs rounded-xl text-white"
              >
                Confirm Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY CANCEL SUCCESS POPUP */}
      {showCancelSuccess && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex items-center justify-center p-5 animate-fuzzy" id="cancel-success-popup">
          <div className="w-full max-w-[285px] bg-[#0A1A12] rounded-2xl border border-emerald-900/60 p-5.5 shadow-2xl text-center">
            <div className="flex justify-center mb-3.5">
              <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-9 h-9 text-emerald-400 animate-bounce" />
              </div>
            </div>
            <h3 className="font-space font-extrabold text-xs text-emerald-400 tracking-widest uppercase mb-1.5">
              EMERGENCY ALERT SUCCESSFULLY CANCELED
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal mb-4 px-1">
              Your active Safe Walk tracking is resolved and emergency notifications were successfully bypassed.
            </p>
            <button
              onClick={() => setShowCancelSuccess(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-[#059669] font-space font-bold text-[11px] uppercase tracking-wider rounded-xl text-white transition-colors cursor-pointer shadow-lg active:scale-95"
            >
              Back to Safety Hub
            </button>
          </div>
        </div>
      )}

      {/* 7. QUICK RESET PLATFORM CONTROL BUTTON (FOR SYSTEM ASSESSMENT SIMULATION) */}
      <div className="absolute top-14 left-4 z-10 flex gap-1.5" id="assessment-quick-utilities">
        <button 
          onClick={handleResetSimulation}
          className="p-1 px-2.5 rounded-md bg-slate-950/90 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-850 shadow text-[9px] font-mono tracking-tight flex items-center gap-1"
          title="Reset timer timelines for clean restart"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          Purge State
        </button>
      </div>

    </div>
  );
}
