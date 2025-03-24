const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

// Middlewares
const fetchLocation = require("../middleware/fetchLocation");
const fetchUserByContact = require("../middleware/fetchUserByContact");
const verifyUserApprovalForLocation = require("../middleware/verifyUserApprovalForLocation");

// POST /api/sessions/start
router.post(
  "/start",
  fetchLocation,
  fetchUserByContact,
  verifyUserApprovalForLocation,
  sessionController.startSession
);

// POST /api/sessions/stop
router.post(
  "/stop",
  fetchLocation,
  fetchUserByContact,
  verifyUserApprovalForLocation,
  sessionController.stopSession
);

// POST /api/sessions/status
router.post("/status", sessionController.getSessionStatus);

// POST /api/sessions/active
router.post("/active", sessionController.getActiveSessions);

// POST /api/sessions/history
router.post("/history", sessionController.getSessionHistory);

// POST /api/sessions/user-history
router.post("/user-history", fetchUserByContact, sessionController.getUserSessionHistory);

// POST /api/sessions/export
router.post("/export", sessionController.exportSessionData);

module.exports = router;
