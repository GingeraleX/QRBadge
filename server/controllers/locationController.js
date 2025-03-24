/**
 * locationController.js
 */

const db = require("../config/db");

exports.getLocationInfo = (req, res) => {
    const { t } = req;
    const { locationId } = req.body;

    if (!locationId) {
        return res
            .status(400)
            .json({ error: t("locations.errors.locationIdRequired") });
    }

    db.get(
        `SELECT name, admin_id FROM locations WHERE id=?`,
        [locationId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res
                    .status(404)
                    .json({ error: t("locations.errors.locationNotFound") });
            }
            res.json({ name: row.name, adminId: row.admin_id });
        }
    );
};

exports.createLocation = (req, res) => {
    const { t } = req;
    const { adminId, name, latitude, longitude } = req.body;

    if (!adminId || !name) {
        return res
            .status(400)
            .json({ error: t("locations.errors.adminIdNameRequired") });
    }

    // 1) Check how many locations for this admin
    db.get(
        `SELECT COUNT(*) AS locCount
         FROM locations
         WHERE admin_id = ?`,
        [adminId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (row.locCount >= 50) {
                // The admin already has 50 locations, reject
                return res
                    .status(400)
                    .json({ error: t("locations.errors.locationLimitReached") });
            }

            // 2) Otherwise, proceed to insert
            db.run(
                `INSERT INTO locations (name, latitude, longitude, admin_id)
                 VALUES (?, ?, ?, ?)`,
                [name, latitude || 0, longitude || 0, adminId],
                function (insertErr) {
                    if (insertErr) {
                        return res.status(500).json({ error: insertErr.message });
                    }
                    return res.json({
                        message: t("locations.success.locationCreated"),
                        locationId: this.lastID
                    });
                }
            );
        }
    );
};

exports.listByAdmin = (req, res) => {
    // { adminId }
    const { t } = req;
    const { adminId } = req.body;

    if (!adminId) {
        return res
            .status(400)
            .json({ error: t("common.errors.adminIdRequired") });
    }
    
    const sql = `
    SELECT
      id,
      name,
      latitude,
      longitude,
      admin_id,
      created_at
    FROM locations
    WHERE admin_id=?
    ORDER BY id DESC
  `;

    db.all(sql, [adminId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
};
