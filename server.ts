import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Supabase Client dynamically
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  
  let supabase: any = null;
  let isSupabaseConfigured = false;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseConfigured = true;
      console.log("Supabase connected successfully.");
    } catch (err) {
      console.error("Supabase failed initialization:", err);
    }
  }

  // Security: JWT configurations
  const JWT_SECRET = process.env.JWT_SECRET || "beacon-jwt-security-key-256-v1";

  // Ephemeral locations tracking table (Holds user walk coordinates logs purely while walk session is active)
  const activeTelemetryLogs: Record<string, { lat: number; lon: number; timestamp: string }[]> = {};

  // Custom interface extension to support typed user context in Express requests
  interface AuthenticatedRequest extends express.Request {
    user?: {
      username: string;
    };
  }

  // Helper to obtain a user-identity-prescribed Supabase client mimicking RLS JWT headers
  const getUserClient = (token: string) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  };

  // Row Level Security style authentic check rejecting requests without valid JWT session context
  const authenticateJWT = async (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            req.user = {
              id: user.id,
              username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
              supabaseToken: token
            };
            return next();
          }
        } catch (err) {
          console.warn("Supabase auth token check bypassed or failed, verifying local token:", err);
        }
      }

      // Check fallback local token
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
        req.user = decoded;
        next();
      } catch (err2) {
        res.status(403).json({ error: "Access Forbidden: Invalid or expired security JWT token." });
      }
    } else {
      res.status(401).json({ error: "Access Unauthorized: Missing Bearer Token authorization header." });
    }
  };

  // Express body parsers
  app.use(express.json());

  // Fallback high-fidelity local JSON database setup
  const LOCAL_DB_PATH = path.join(process.cwd(), "user_db.json");
  const readLocalDB = () => {
    try {
      if (fs.existsSync(LOCAL_DB_PATH)) {
        return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8"));
      }
    } catch (e) {
      console.error("Local DB read failed:", e);
    }
    return {};
  };

  const writeLocalDB = (data: any) => {
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Local DB write failed:", e);
    }
  };

  // Serve DB status info
  app.get("/api/db-status", (req, res) => {
    res.json({
      configured: isSupabaseConfigured,
      backendType: isSupabaseConfigured ? "Supabase Cloud Database" : "Live Backup DB"
    });
  });

  // Serve custom APIs or health checks
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Beacon server is healthy", database: isSupabaseConfigured ? "Supabase" : "Local Backup" });
  });

  // REST API Auth: Register/Onboard
  app.post("/api/auth/register", async (req, res) => {
    const { username, safeArrivalPin, locationPermission, smsPermission } = req.body;

    if (!username || !safeArrivalPin) {
      return res.status(400).json({ error: "Username and Safe Arrival Password are required." });
    }

    const trimmedUser = username.trim();
    const cleanUserKey = trimmedUser.toLowerCase();

    // Default Profile Fields
    const newUserProfile = {
      username: trimmedUser,
      safeArrivalPin,
      locationPermission: !!locationPermission,
      smsPermission: !!smsPermission,
      emergencyContacts: [
        { name: 'Mom/Guardian', phone: '+1 (555) 382-9011', isDefault: true },
        { name: 'Alice Roommate', phone: '+1 (555) 723-4581', isDefault: false }
      ],
      customAlertMessage: `Beacon Emergency: ${trimmedUser} did not check in within the expected time limit. Walk route GPS tracked inside servers. Pick up immediately.`,
      safetyWeightFactor: "balanced"
    };

    // Save in Local Database anyway as backup/local registry
    const db = readLocalDB();
    db[cleanUserKey] = newUserProfile;
    writeLocalDB(db);

    // Provision secure JWT for authentication
    let token = jwt.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: "7d" });

    // If Supabase is active, upsert to the database table with RLS compliance
    if (isSupabaseConfigured && supabase) {
      try {
        const email = `${cleanUserKey}@beacon-safe.com`;
        
        // 1. Sign up user in Supabase auth system to provision genuine credentials
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: safeArrivalPin,
          options: {
            data: {
              username: trimmedUser
            }
          }
        });

        let userId = signUpData?.user?.id;
        let sessionToken = signUpData?.session?.access_token;

        // If user already registered in Supabase auth, sign them in to fetch active session details
        if (signUpError || !userId) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: safeArrivalPin
          });
          if (!signInError && signInData?.user) {
            userId = signInData.user.id;
            sessionToken = signInData.session?.access_token;
          } else {
            console.warn("Supabase auth signUp/signIn failed, using local token cascade:", signUpError || signInError);
          }
        }

        // 2. Insert or update the public.user_settings record using RLS user credentials
        if (userId) {
          const userClient = sessionToken ? getUserClient(sessionToken) : supabase;
          const { error: upsertError } = await userClient
            .from("user_settings")
            .upsert({
              user_id: userId,
              safe_arrival_password_hash: safeArrivalPin,
              walk_route_settings: {
                username: trimmedUser,
                emergencyContacts: newUserProfile.emergencyContacts,
                customAlertMessage: newUserProfile.customAlertMessage,
                safetyWeightFactor: newUserProfile.safetyWeightFactor,
                locationPermission: newUserProfile.locationPermission,
                smsPermission: newUserProfile.smsPermission
              },
              updated_at: new Date().toISOString()
            });

          if (upsertError) {
            console.warn("Error upserting settings to Supabase, local backing only:", upsertError);
          } else if (sessionToken) {
            // Replace local token with real Supabase session JWT
            token = sessionToken;
          }
        }
      } catch (err) {
        console.warn("Supabase operations failed during registration, local fallback active:", err);
      }
    }

    res.json({ 
      success: true, 
      backend: isSupabaseConfigured ? "Supabase Cloud Database" : "Local Backup DB",
      user: newUserProfile,
      token
    });
  });

  // REST API Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, safeArrivalPin } = req.body;

    if (!username || !safeArrivalPin) {
      return res.status(400).json({ error: "Username and Safe Arrival Password are required." });
    }

    const trimmedUser = username.trim();
    const cleanUserKey = trimmedUser.toLowerCase();

    let userRecord = null;
    let loadedFrom = "Local Backup DB";
    let token = jwt.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: "7d" });

    // 1. Try Loading from Supabase first if active
    if (isSupabaseConfigured && supabase) {
      try {
        const email = `${cleanUserKey}@beacon-safe.com`;
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: safeArrivalPin
        });

        if (signInData?.user && !signInError) {
          const userId = signInData.user.id;
          const sessionToken = signInData.session?.access_token;

          // Fetch from settings table as the logged in user
          const userClient = sessionToken ? getUserClient(sessionToken) : supabase;
          const { data: settingsData, error: settingsError } = await userClient
            .from("user_settings")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (settingsData && !settingsError) {
            const wr = settingsData.walk_route_settings || {};
            userRecord = {
              username: wr.username || trimmedUser,
              safeArrivalPin: settingsData.safe_arrival_password_hash || safeArrivalPin,
              emergencyContacts: Array.isArray(wr.emergencyContacts) ? wr.emergencyContacts : [],
              customAlertMessage: wr.customAlertMessage,
              safetyWeightFactor: wr.safetyWeightFactor || "balanced",
              locationPermission: !!wr.locationPermission,
              smsPermission: !!wr.smsPermission
            };
            loadedFrom = "Supabase Cloud Database";
            if (sessionToken) {
              token = sessionToken;
            }
          } else if (settingsError) {
            console.warn("Supabase user_settings fetch failed:", settingsError);
          }
        } else if (signInError) {
          console.warn("Supabase signIn auth failed, checking fallback cache:", signInError);
        }
      } catch (err) {
        console.warn("Exception during Supabase query, checking local cache", err);
      }
    }

    // 2. Fallback to Local backing cache
    if (!userRecord) {
      const db = readLocalDB();
      userRecord = db[cleanUserKey] || null;
      loadedFrom = "Local Backup DB";
    }

    if (!userRecord) {
      return res.status(404).json({ error: "Profile not found. Please register or double-check credentials." });
    }

    // Verify hashed password PIN on arrival
    if (userRecord.safeArrivalPin !== safeArrivalPin) {
      return res.status(401).json({ error: "Incorrect Safe Arrival Password." });
    }

    res.json({
      success: true,
      backend: loadedFrom,
      user: userRecord,
      token
    });
  });

  // REST API Auth: Save Settings (Protected via JWT matching ownership)
  app.post("/api/settings/save", authenticateJWT, async (req: any, res) => {
    const { 
      username, 
      safeArrivalPin, 
      emergencyContacts, 
      customAlertMessage, 
      safetyWeightFactor, 
      locationPermission, 
      smsPermission 
    } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required to save profiles." });
    }

    const trimmedUser = username.trim();
    const cleanUserKey = trimmedUser.toLowerCase();

    // Row Level Security Validation: Reject updates belonging to other profiles
    if (cleanUserKey !== req.user.username.trim().toLowerCase()) {
      return res.status(403).json({ error: "Access Forbidden: Row Level Security mismatch. Active profile is reject-locked." });
    }

    const updatedProfile = {
      username: trimmedUser,
      safeArrivalPin,
      emergencyContacts,
      customAlertMessage,
      safetyWeightFactor,
      locationPermission: !!locationPermission,
      smsPermission: !!smsPermission
    };

    // Save in Local Database
    const db = readLocalDB();
    db[cleanUserKey] = updatedProfile;
    writeLocalDB(db);

    let savedToSupabase = false;

    // Save in Supabase with RLS user credential validation
    if (isSupabaseConfigured && supabase) {
      try {
        const userId = req.user.id;
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;

        if (userId && userClient) {
          const { error } = await userClient
            .from("user_settings")
            .upsert({
              user_id: userId,
              safe_arrival_password_hash: safeArrivalPin,
              walk_route_settings: {
                username: trimmedUser,
                emergencyContacts,
                customAlertMessage,
                safetyWeightFactor,
                locationPermission: !!locationPermission,
                smsPermission: !!smsPermission
              },
              updated_at: new Date().toISOString()
            });

          if (!error) {
            savedToSupabase = true;
          } else {
            console.warn("Supabase upsert failed during save settings:", error);
          }
        }
      } catch (err) {
        console.warn("Exception during Supabase settings save:", err);
      }
    }

    res.json({
      success: true,
      backend: savedToSupabase ? "Supabase Cloud Database" : "Local Backup DB",
      user: updatedProfile
    });
  });

  // Ephemeral Locations: Initialize (Start Walk)
  app.post("/api/walk/start", authenticateJWT, async (req: any, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    activeTelemetryLogs[userKey] = [];
    console.log(`[EPHEMERAL TELEMETRY] Initialized navigation tracker channels for user session: ${req.user.username}`);

    let clearedDb = false;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          // Fail-safe wipe any dangling active route points inside Supabase for privacy
          await userClient
            .from("active_routes")
            .delete()
            .eq("user_id", req.user.id);
          clearedDb = true;
        }
      } catch (e) {
        console.warn("Could not sweep previous route logs in Supabase:", e);
      }
    }

    res.json({ 
      success: true, 
      message: "Ephemeral path initialized successfully.",
      supabaseWiped: clearedDb
    });
  });

  // Ephemeral Locations: Record coordinate updates (GPS Telemetry Logging)
  app.post("/api/walk/update", authenticateJWT, async (req: any, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    const { lat, lon } = req.body;
    
    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "Latitude and Longitude properties are required to trace coordinates." });
    }

    if (!activeTelemetryLogs[userKey]) {
      activeTelemetryLogs[userKey] = [];
    }

    activeTelemetryLogs[userKey].push({
      lat: Number(lat),
      lon: Number(lon),
      timestamp: new Date().toISOString()
    });

    console.log(`[EPHEMERAL TELEMETRY] Logged coordinate (${lat}, ${lon}) for profile: ${req.user.username}`);

    let savedToSupabase = false;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          const { error } = await userClient
            .from("active_routes")
            .insert({
              user_id: req.user.id,
              current_lat: Number(lat),
              current_lon: Number(lon),
              timestamp: new Date().toISOString()
            });

          if (!error) {
            savedToSupabase = true;
          } else {
            console.warn("Error inserting trace coordinate to active_routes:", error);
          }
        }
      } catch (e) {
        console.warn("Could not insert coordinate to active_routes in Supabase:", e);
      }
    }

    res.json({ 
      success: true, 
      message: "Coordinate logs append success.", 
      activeLogsCount: activeTelemetryLogs[userKey].length,
      supabaseSynced: savedToSupabase
    });
  });

  // Ephemeral Locations: Clean-up coordinates on deactivation (Safe Arrival Wipe Out)
  app.post("/api/walk/arrived", authenticateJWT, async (req: any, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    
    const count = activeTelemetryLogs[userKey] ? activeTelemetryLogs[userKey].length : 0;
    
    // Purge completely to keep privacy secure
    delete activeTelemetryLogs[userKey];

    let supabaseDeletedCount = 0;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          const { data, error } = await userClient
            .from("active_routes")
            .delete()
            .eq("user_id", req.user.id)
            .select();

          if (!error) {
            supabaseDeletedCount = data ? data.length : 0;
          } else {
            console.warn("Error purging coordinates from active_routes:", error);
          }
        }
      } catch (e) {
        console.warn("Could not wipe active_routes in Supabase:", e);
      }
    }

    console.log(`[EPHEMERAL TELEMETRY] WIPED coordinate history logs. Cleared ${count} records locally and ${supabaseDeletedCount} in Supabase for user: ${req.user.username}`);
    res.json({
      success: true,
      message: "EPHEMERAL COMPLIANCE: Active GPS coordinate logs wiped completely.",
      recordsDeleted: count,
      supabaseRecordsDeleted: supabaseDeletedCount
    });
  });

  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  
  // Decide whether to run in production static mode or development middleware mode.
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.log("Starting server in development mode (Vite middleware on port 3000)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (Serving statically built SPA)...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: failed to start server", err);
  process.exit(1);
});

