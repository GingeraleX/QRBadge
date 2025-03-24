const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// POST /api/admin/create
router.post("/create", adminController.createAdmin);

// POST /api/admin/check
router.post("/check", adminController.checkAdmin);

// POST /api/admin/pending-approvals
router.post("/pending-approvals", adminController.getPendingApprovals);

// POST /api/admin/approve
router.post("/approve", adminController.approveUser);

// POST /api/admin/reject
router.post("/reject", adminController.rejectUser);

// POST /api/admin/set-settings
router.post("/set-settings", adminController.updateAdminSettings);

// POST /api/admin/update-settings
router.post("/get-settings", adminController.getAdminSettings);

module.exports = router;
