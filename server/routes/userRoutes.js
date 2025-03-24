const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// POST /api/users/check-status
router.post("/check-status", userController.checkUserStatus);

// POST /api/users/request-approval
router.post("/request-approval", userController.requestApproval);

// POST /api/users/update-name
router.post("/update-name", userController.updateDisplayName);

// POST /api/users/list-for-admin
router.post("/list-for-admin", userController.getAllUsersForAdmin);

// POST /api/users/revoke
router.post("/revoke", userController.revokeUser);

module.exports = router;
