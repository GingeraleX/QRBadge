const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

// POST /api/locations/info
router.post("/info", locationController.getLocationInfo);

// POST /api/locations/create
router.post("/create", locationController.createLocation);

// POST /api/locations/by-admin
router.post("/by-admin", locationController.listByAdmin);

module.exports = router;
