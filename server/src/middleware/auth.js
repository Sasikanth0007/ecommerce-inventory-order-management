const admin = require("../config/firebaseAdmin");

async function requireAuth(req, res, next) {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ message: "Firebase Admin is not configured on the server." });
    }

    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Authorization Bearer token" });
    }

    const token = header.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({ message: "Invalid or expired authentication token" });
  }
}

function requireAdmin(req, res, next) {
  const allowedUids = (process.env.ADMIN_UIDS || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);

  if (!allowedUids.includes(req.user.uid)) {
    return res.status(403).json({ message: "Administrator access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
