/**
 * fetchUserByContact.js
 * - For requests containing { contactNumber } in the body
 * - Looks up the user row, attaches to req.userRow
 */

const db = require("../config/db");

module.exports = function fetchUserByContact(req, res, next) {
  const { t } = req; // i18next translation function
  const { contactNumber } = req.body;

  if (!contactNumber) {
    return res.status(400).json({
      error: t("common.errors.contactNumberRequired")
    });
  }

  db.get(
      `SELECT * FROM users WHERE contactNumber=?`,
      [contactNumber],
      (err, userRow) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!userRow) {
          return res.status(404).json({
            error: t("common.errors.userNotFound")
          });
        }

        req.userRow = userRow;
        next();
      }
  );
};
