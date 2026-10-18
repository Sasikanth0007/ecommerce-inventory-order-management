const mongoose = require("mongoose");
const dns = require("dns");

// Some networks refuse MongoDB Atlas SRV lookups through their default DNS.
// Set MONGODB_DNS_SERVERS to a comma-separated resolver list when needed.
const dnsServers = (process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
