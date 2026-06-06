var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  let supabase = null;
  let isSupabaseConfigured = false;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
      isSupabaseConfigured = true;
      console.log("Supabase connected successfully.");
    } catch (err) {
      console.error("Supabase failed initialization:", err);
    }
  }
  const JWT_SECRET = process.env.JWT_SECRET || "beacon-jwt-security-key-256-v1";
  const activeTelemetryLogs = {};
  const getUserClient = (token) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  };
  const authenticateJWT = async (req, res, next) => {
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
      try {
        const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
      } catch (err2) {
        res.status(403).json({ error: "Access Forbidden: Invalid or expired security JWT token." });
      }
    } else {
      res.status(401).json({ error: "Access Unauthorized: Missing Bearer Token authorization header." });
    }
  };
  app.use(import_express.default.json());
  const LOCAL_DB_PATH = import_path.default.join(process.cwd(), "user_db.json");
  const readLocalDB = () => {
    try {
      if (import_fs.default.existsSync(LOCAL_DB_PATH)) {
        return JSON.parse(import_fs.default.readFileSync(LOCAL_DB_PATH, "utf8"));
      }
    } catch (e) {
      console.error("Local DB read failed:", e);
    }
    return {};
  };
  const writeLocalDB = (data) => {
    try {
      import_fs.default.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Local DB write failed:", e);
    }
  };
  app.get("/api/db-status", (req, res) => {
    res.json({
      configured: isSupabaseConfigured,
      backendType: isSupabaseConfigured ? "Supabase Cloud Database" : "Live Backup DB"
    });
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Beacon server is healthy", database: isSupabaseConfigured ? "Supabase" : "Local Backup" });
  });
  app.post("/api/auth/register", async (req, res) => {
    const { username, safeArrivalPin, locationPermission, smsPermission } = req.body;
    if (!username || !safeArrivalPin) {
      return res.status(400).json({ error: "Username and Safe Arrival Password are required." });
    }
    const trimmedUser = username.trim();
    const cleanUserKey = trimmedUser.toLowerCase();
    const newUserProfile = {
      username: trimmedUser,
      safeArrivalPin,
      locationPermission: !!locationPermission,
      smsPermission: !!smsPermission,
      emergencyContacts: [
        { name: "Mom/Guardian", phone: "+1 (555) 382-9011", isDefault: true },
        { name: "Alice Roommate", phone: "+1 (555) 723-4581", isDefault: false }
      ],
      customAlertMessage: `Beacon Emergency: ${trimmedUser} did not check in within the expected time limit. Walk route GPS tracked inside servers. Pick up immediately.`,
      safetyWeightFactor: "balanced"
    };
    const db = readLocalDB();
    db[cleanUserKey] = newUserProfile;
    writeLocalDB(db);
    let token = import_jsonwebtoken.default.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: "7d" });
    if (isSupabaseConfigured && supabase) {
      try {
        const email = `${cleanUserKey}@beacon-safe.com`;
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
        if (userId) {
          const userClient = sessionToken ? getUserClient(sessionToken) : supabase;
          const { error: upsertError } = await userClient.from("user_settings").upsert({
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
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (upsertError) {
            console.warn("Error upserting settings to Supabase, local backing only:", upsertError);
          } else if (sessionToken) {
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
  app.post("/api/auth/login", async (req, res) => {
    const { username, safeArrivalPin } = req.body;
    if (!username || !safeArrivalPin) {
      return res.status(400).json({ error: "Username and Safe Arrival Password are required." });
    }
    const trimmedUser = username.trim();
    const cleanUserKey = trimmedUser.toLowerCase();
    let userRecord = null;
    let loadedFrom = "Local Backup DB";
    let token = import_jsonwebtoken.default.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: "7d" });
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
          const userClient = sessionToken ? getUserClient(sessionToken) : supabase;
          const { data: settingsData, error: settingsError } = await userClient.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
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
    if (!userRecord) {
      const db = readLocalDB();
      userRecord = db[cleanUserKey] || null;
      loadedFrom = "Local Backup DB";
    }
    if (!userRecord) {
      return res.status(404).json({ error: "Profile not found. Please register or double-check credentials." });
    }
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
  app.post("/api/settings/save", authenticateJWT, async (req, res) => {
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
    const db = readLocalDB();
    db[cleanUserKey] = updatedProfile;
    writeLocalDB(db);
    let savedToSupabase = false;
    if (isSupabaseConfigured && supabase) {
      try {
        const userId = req.user.id;
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userId && userClient) {
          const { error } = await userClient.from("user_settings").upsert({
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
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
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
  app.post("/api/walk/start", authenticateJWT, async (req, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    activeTelemetryLogs[userKey] = [];
    console.log(`[EPHEMERAL TELEMETRY] Initialized navigation tracker channels for user session: ${req.user.username}`);
    let clearedDb = false;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          await userClient.from("active_routes").delete().eq("user_id", req.user.id);
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
  app.post("/api/walk/update", authenticateJWT, async (req, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    const { lat, lon } = req.body;
    if (lat === void 0 || lon === void 0) {
      return res.status(400).json({ error: "Latitude and Longitude properties are required to trace coordinates." });
    }
    if (!activeTelemetryLogs[userKey]) {
      activeTelemetryLogs[userKey] = [];
    }
    activeTelemetryLogs[userKey].push({
      lat: Number(lat),
      lon: Number(lon),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`[EPHEMERAL TELEMETRY] Logged coordinate (${lat}, ${lon}) for profile: ${req.user.username}`);
    let savedToSupabase = false;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          const { error } = await userClient.from("active_routes").insert({
            user_id: req.user.id,
            current_lat: Number(lat),
            current_lon: Number(lon),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
  app.post("/api/walk/arrived", authenticateJWT, async (req, res) => {
    const userKey = req.user.username.trim().toLowerCase();
    const count = activeTelemetryLogs[userKey] ? activeTelemetryLogs[userKey].length : 0;
    delete activeTelemetryLogs[userKey];
    let supabaseDeletedCount = 0;
    if (isSupabaseConfigured && supabase && req.user.id) {
      try {
        const userClient = req.user.supabaseToken ? getUserClient(req.user.supabaseToken) : supabase;
        if (userClient) {
          const { data, error } = await userClient.from("active_routes").delete().eq("user_id", req.user.id).select();
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
  const distPath = import_path.default.join(process.cwd(), "dist");
  const hasDist = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    console.log("Starting server in development mode (Vite middleware on port 3000)...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (Serving statically built SPA)...");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
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
//# sourceMappingURL=server.cjs.map
