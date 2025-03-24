/**
 * server.js
 * Main entry point for a Node/Express server over HTTPS.
 */

const express = require("express");

const cors = require("cors");
const fs = require("fs");
const http = require("http");
const path = require("path");

// Initialize DB (creates tables if not exist)
require("./server/config/db");

// Initialize localization
const i18nextMiddleware = require('i18next-http-middleware');
const i18next = require("./server/config/i18n");

// Import your routes
const userRoutes = require("./server/routes/userRoutes");
const adminRoutes = require("./server/routes/adminRoutes");
const locationRoutes = require("./server/routes/locationRoutes");
const sessionRoutes = require("./server/routes/sessionRoutes");

const app = express();
app.use(express.json());
app.use(cors());

// load localization
app.use(i18nextMiddleware.handle(i18next));

// Serve front-end from "public"
app.use(express.static(path.join(__dirname, "public")));

// Register API routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/sessions", sessionRoutes);

// Launch HTTPS server on port 3000
const PORT = 3000;
http.createServer(app).listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}/`);
});
