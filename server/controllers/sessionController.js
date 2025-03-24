/**
 * sessionController.js
 */

const db = require("../config/db");
const { calculateDistance } = require("../utils/distanceCalculator");

exports.startSession = (req, res) => {
  /**
   * Middlewares have run:
   *   req.locationRow => { admin_id, lat, lng, etc. }
   *   req.userRow => user
   *   verifyUserApprovalForLocation => ensures status=approved
   * Body => { locationId, latitude, longitude, contactNumber }
   */
  const { t } = req; // get the translation function
  const { latitude, longitude } = req.body;
  const { locationRow, userRow } = req;

  if (latitude == null || longitude == null) {
    return res
        .status(400)
        .json({ error: t("session.errors.latLongRequired") });
  }

  // distance check
  const dist = calculateDistance(
      locationRow.latitude,
      locationRow.longitude,
      latitude,
      longitude
  );
  if (dist > 100) {
    return res
        .status(403)
        .json({ error: t("session.errors.tooFar") });
  }

  // Insert session
  const startTime = new Date().toISOString();
  db.run(
      `INSERT INTO sessions (user_id, location_id, start_time) VALUES (?, ?, ?)`,
      [userRow.id, locationRow.id, startTime],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: t("session.success.start") });
      }
  );
};

exports.stopSession = (req, res) => {
  /**
   * Middlewares => fetchLocation, fetchUserByContact, verifyUserApprovalForLocation
   */
  const { t } = req;
  const { latitude, longitude } = req.body;
  const { locationRow, userRow } = req;

  if (latitude == null || longitude == null) {
    return res
        .status(400)
        .json({ error: t("session.errors.latLongRequired") });
  }

  const dist = calculateDistance(
      locationRow.latitude,
      locationRow.longitude,
      latitude,
      longitude
  );
  if (dist > 100) {
    return res
        .status(403)
        .json({ error: t("session.errors.tooFar") });
  }

  // End the last active session
  db.get(
      `SELECT * FROM sessions 
     WHERE user_id=? AND end_time IS NULL 
     ORDER BY start_time DESC LIMIT 1`,
      [userRow.id],
      (err, sessionRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!sessionRow) {
          return res
              .status(400)
              .json({ error: t("session.errors.noActiveSession") });
        }
        const endTime = new Date().toISOString();
        db.run(
            `UPDATE sessions SET end_time=? WHERE id=?`,
            [endTime, sessionRow.id],
            function (updErr) {
              if (updErr) return res.status(500).json({ error: updErr.message });
              const durationMinutes = Math.round(
                  (new Date(endTime) - new Date(sessionRow.start_time)) / 60000
              );
              res.json({
                message: t("session.success.stop"),
                duration: durationMinutes
              });
            }
        );
      }
  );
};

exports.getSessionStatus = (req, res) => {
  // { contactNumber }
  const { t } = req;
  const { contactNumber } = req.body;

  if (!contactNumber) {
    return res
        .status(400)
        .json({ error: t("common.errors.contactNumberRequired") });
  }
  db.get(`SELECT id FROM users WHERE contactNumber=?`, [contactNumber], (err, userRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!userRow) {
      return res.json({
        active: false,
        error: t("common.errors.userNotFound")
      });
    }

    db.get(
        `SELECT * FROM sessions
       WHERE user_id=? AND end_time IS NULL
       ORDER BY start_time DESC LIMIT 1`,
        [userRow.id],
        (err2, sessionRow) => {
          if (err2) return res.status(500).json({ error: err2.message });
          if (!sessionRow) return res.json({ active: false });
          res.json({ active: true, start_time: sessionRow.start_time });
        }
    );
  });
};

exports.getActiveSessions = (req, res) => {
  // { adminId }
  const { t } = req;
  const { adminId } = req.body;

  if (!adminId) {
    return res
        .status(400)
        .json({ error: t("common.errors.adminIdRequired") });
  }

  db.all(
      `
    SELECT s.id, u.displayName, u.contactNumber, l.name as locationName, s.start_time
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN locations l ON s.location_id = l.id
    WHERE s.end_time IS NULL
      AND l.admin_id=?
    ORDER BY s.start_time DESC
    `,
      [adminId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
  );
};

/**
 * buildSessionsQuery
 *  - Creates a parameterized SQL string & param array for fetching sessions.
 *  - Supports optional filtering by userId, adminId, locationId, startDate, endDate.
 *  - If requireEnd=true, only returns sessions where end_time IS NOT NULL.
 */
function buildSessionsQuery({
                              userId,       // If set => filter by a specific user
                              adminId,      // If set => filter by a specific admin’s location(s)
                              locationId,   // If set => filter by location
                              startDate,    // If set => sessions >= this date/time
                              endDate,      // If set => sessions <= this date/time
                              requireEnd = false // If true => only ended sessions
                            }) {
  let sql = `
    SELECT s.id, s.start_time, s.end_time,
           l.id AS locationId, l.name AS locationName,
           u.id AS userId, u.displayName, u.contactNumber
    FROM sessions s
    JOIN locations l ON s.location_id = l.id
    JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // If we only want ended sessions:
  if (requireEnd) {
    sql += ` AND s.end_time IS NOT NULL`;
  }

  // Admin-based filter => only sessions from admin’s location(s)
  if (adminId) {
    sql += ` AND l.admin_id = ?`;
    params.push(adminId);
  }

  // Filter by a specific user
  if (userId) {
    sql += ` AND u.id = ?`;
    params.push(userId);
  }

  // Optional location filter
  if (locationId) {
    sql += ` AND l.id = ?`;
    params.push(locationId);
  }

  // Optional date filters (assuming s.start_time / s.end_time are ISO8601 or similar)
  if (startDate) {
    sql += ` AND s.start_time >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND s.end_time <= ?`;
    // Often you append T23:59:59 if it’s a date-only filter
    params.push(endDate + "T23:59:59");
  }

  sql += ` ORDER BY s.start_time DESC`;
  return { sql, params };
}

/**
 * getSessionHistory (Admin route)
 *  - Expects req.body => { adminId, userId?, locationId?, startDate?, endDate? }
 *  - Returns sessions for an admin, optionally filtered by user/location/date range.
 */
exports.getSessionHistory = (req, res) => {
  const { t } = req;
  const { adminId, userId, locationId, startDate, endDate } = req.body;

  if (!adminId) {
    return res
        .status(400)
        .json({ error: t("common.errors.adminIdRequired") });
  }

  const { sql, params } = buildSessionsQuery({
    adminId,
    userId,
    locationId,
    startDate,
    endDate,
    requireEnd: true // for example, only ended sessions
  });

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

/**
 * getUserSessionHistory (User route)
 *  - We rely on fetchUserByContact (or similar middleware) to set req.userRow = { id, ... }.
 *  - Expects req.body => { startDate?, endDate? }
 *  - Returns sessions for the logged-in user, optionally date-filtered.
 */
exports.getUserSessionHistory = (req, res) => {
  const { t } = req;
  if (!req.userRow) {
    return res
        .status(400)
        .json({ error: t("session.errors.userNotInRequest") });
  }
  const userId = req.userRow.id;
  const locationId = req.locationRow.id;
  const { startDate, endDate } = req.body;

  const { sql, params } = buildSessionsQuery({
    userId,
    locationId,
    startDate,
    endDate,
    requireEnd: false // or true, depending on whether you want only ended sessions
  });

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

/**
 * POST /api/sessions/export
 * Body may contain: { adminId, userId, locationId, startDate, endDate, requireEnd }
 * Returns JSON array of all relevant sessions with full detail.
 */
exports.exportSessionData = (req, res) => {
  const { t } = req;
  const {
    adminId,
    userId,
    locationId,
    startDate,
    endDate,
    requireEnd
  } = req.body;

  // Build the query using our helper
  const { sql, params } = buildSessionsQuery({
    adminId,
    userId,
    locationId,
    startDate,
    endDate,
    requireEnd: !!requireEnd // boolean
  });

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return them as JSON
    res.json(rows);
  });
};
