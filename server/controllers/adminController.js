/**
 * adminController.js
 */

const db = require("../config/db");

function addDays(date, days) {
    const copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
}

exports.createAdmin = (req, res) => {
    const { t } = req;
    const { contactNumber, deviceId } = req.body;

    if (!contactNumber) {
        return res
            .status(400)
            .json({ error: t("common.errors.contactNumberRequired") });
    }

    db.run(
        `INSERT INTO admins (contactNumber, deviceId) VALUES (?, ?)`,
        [contactNumber, deviceId || ""],
        function (err) {
            if (err)
                return res.status(500).json({ error: err.message });

            res.json({
                message: t("admin.success.created"),
                adminId: this.lastID
            });
        }
    );
};

exports.checkAdmin = (req, res) => {
    const { t } = req;
    const { contactNumber, deviceId } = req.body;

    if (!contactNumber) {
        return res
            .status(400)
            .json({ error: t("common.errors.contactNumberRequired") });
    }

    db.get(
        `SELECT * FROM admins WHERE contactNumber=? AND deviceId=?`,
        [contactNumber, deviceId || ""],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) {
                return res
                    .status(404)
                    .json({ error: t("admin.errors.deviceMismatch") });
            }
            res.json({
                message: t("admin.success.recognized"),
                adminId: row.id
            });
        }
    );
};

exports.getPendingApprovals = (req, res) => {
    const { t } = req;
    const { adminId } = req.body;

    if (!adminId) {
        return res
            .status(400)
            .json({ error: t("common.errors.adminIdRequired") });
    }

    db.all(
        `
    SELECT u.id as userId, u.displayName, u.contactNumber, u.deviceId
    FROM users u
    JOIN admin_users au ON u.id=au.user_id
    WHERE au.admin_id=? AND au.status='pending'
    `,
        [adminId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
};

exports.approveUser = (req, res) => {
    const { t } = req;
    const { adminId, userId } = req.body;

    if (!adminId || !userId) {
        return res
            .status(400)
            .json({ error: t("common.errors.adminIdUserIdRequired") });
    }

    // 1) Check how many are already approved for this admin
    db.get(
        `SELECT COUNT(*) as userCount
         FROM admin_users
         WHERE admin_id = ? AND status = 'approved'`,
        [adminId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // If the admin already has 10 approved users,
            // we do not allow approving a new one
            if (row.userCount >= 10) {
                return res
                    .status(400)
                    .json({ error: t("admin.errors.userLimitReached") });
            }

            // 2) If not at the limit, proceed to approve
            db.run(
                `UPDATE admin_users
                 SET status='approved', banned_until=NULL
                 WHERE admin_id=? AND user_id=?`,
                [adminId, userId],
                function (updateErr) {
                    if (updateErr) {
                        return res.status(500).json({ error: updateErr.message });
                    }
                    if (this.changes === 0) {
                        return res
                            .status(400)
                            .json({ error: t("admin.errors.noAdminUserLink") });
                    }
                    return res.json({ message: t("admin.success.userApproved") });
                }
            );
        }
    );
};

exports.rejectUser = (req, res) => {
    const { t } = req;
    const { adminId, userId } = req.body;

    if (!adminId || !userId) {
        return res
            .status(400)
            .json({ error: t("admin.errors.adminIdUserIdRequired") });
    }

    const banUntil = addDays(new Date(), 1).toISOString(); // e.g. 1 day ban

    db.run(
        `UPDATE admin_users SET status='rejected', banned_until=?
     WHERE admin_id=? AND user_id=?`,
        [banUntil, adminId, userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res
                    .status(400)
                    .json({ error: t("admin.errors.noAdminUserLink") });
            }

            res.json({
                message: t("admin.success.userRejected", { banDate: banUntil })
            });
        }
    );
};

exports.updateAdminSettings = (req, res) => {
    const { adminId, enableTimer, enableReport } = req.body;
    if (!adminId) return res.status(400).json({ error: "Admin ID required" });

    db.run(
        `UPDATE admin_users SET enable_timer=?, enable_report=? WHERE admin_id=?`,
        [enableTimer ? 1 : 0, enableReport ? 1 : 0, adminId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Settings updated successfully" });
        }
    );
};

exports.getAdminSettings = (req, res) => {
    const { adminId } = req.body;
    if (!adminId) return res.status(400).json({ error: "Admin ID required" });

    db.get(
        `SELECT enable_timer, enable_report FROM admin_users WHERE admin_id=?`,
        [adminId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || { enable_timer: 1, enable_report: 1 }); // Default to enabled
        }
    );
};