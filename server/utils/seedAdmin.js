// scripts/seedAdmin.js
const path = require("path");
const crypto = require("crypto");

const db = require("../config/db");

const deviceId = crypto.randomBytes(4).toString("hex");

// Admin contact number (hard-coded for test)
const contactNumber = "390000000000";


db.run(
  `INSERT INTO admins (contactNumber, deviceId) VALUES (?, ?)`,
  [contactNumber, deviceId],
  function (err) {
    if (err) {
        console.log('Admin already inserted');
    } else {
      console.log(`Admin inserted!`);
      console.log(`Contact Number: ${contactNumber}`);
      console.log(`Device ID: ${deviceId}`);
    }
    
    db.close();
  }
);
