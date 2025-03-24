/**
 * verifyUserApprovalForLocation.js
 * - After fetchLocation & fetchUserByContact
 * - We see if req.userRow is "approved" for req.locationRow.admin_id
 */

const db = require("../config/db");

module.exports = function verifyUserApprovalForLocation(req, res, next) {
    const { t } = req; // i18next translation function
    const userId = req.userRow.id;
    const adminId = req.locationRow.admin_id;

    db.get(
        `SELECT status FROM admin_users WHERE admin_id=? AND user_id=?`,
        [adminId, userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row || row.status !== "approved") {
                return res.status(403).json({
                    error: t("locations.errors.notApproved")
                });
            }
            next();
        }
    );
};
