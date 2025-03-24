/**
 * fetchAdmin.js
 * - For requests with { contactNumber, deviceId } in the body
 * - Looks up an admin row, attaches to req.adminRow
 */

const db = require("../config/db");

module.exports = function fetchAdmin(req, res, next) {
    const { t } = req; // i18next translation function
    const { contactNumber, deviceId } = req.body;

    if (!contactNumber) {
        return res.status(400).json({
            error: t("common.errors.contactNumberRequired")
        });
    }

    db.get(
        `SELECT * FROM admins WHERE contactNumber=? AND deviceId=?`,
        [contactNumber, deviceId || ""],
        (err, adminRow) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!adminRow) {
                return res.status(404).json({
                    error: t("admin.errors.deviceMismatch")
                });
            }
            req.adminRow = adminRow;
            next();
        }
    );
};
