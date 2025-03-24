/**
 * fetchLocation.js
 * - For requests that have { locationId } in the body
 * - Looks up the location in DB
 * - Attaches to req.locationRow
 */

const db = require("../config/db");

module.exports = function fetchLocation(req, res, next) {
  const { t } = req;  // i18next translation function
  const { locationId } = req.body;

  if (!locationId) {
    return res.status(400).json({
      error: t("locations.errors.locationIdRequired")
    });
  }

  db.get(`SELECT * FROM locations WHERE id=?`, [locationId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({
        error: t("locations.errors.locationNotFound")
      });
    }

    req.locationRow = row;
    next();
  });
};
