/**
 * fetchAdminUserLink.js
 * - For requests with { adminId, userId }
 * - Looks up bridging row in admin_users, attaches to req.adminUserLink
 */

const db = require("../config/db");

module.exports = function fetchAdminUserLink(req, res, next) {
    const { t } = req; // i18next translation function
    const { adminId, userId } = req.body;

    if (!adminId || !userId) {
        return res.status(400).json({
            error: t("admin.errors.adminIdUserIdRequired")
        });
    }

    db.get(
        `SELECT * FROM admin_users WHERE admin_id=? AND user_id=?`,
        [adminId, userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({
                    error: t("admin.errors.noAdminUserLink")
                });
            }

            req.adminUserLink = row;
            next();
        }
    );
};
