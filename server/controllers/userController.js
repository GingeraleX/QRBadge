/**
 * userController.js
 */
const db = require("../config/db");

exports.checkUserStatus = (req, res) => {
    const { t } = req; // i18next translation function
    const { contactNumber, adminId, deviceId } = req.body;

    if (!contactNumber || !adminId || !deviceId) {
        return res.status(400).json({
            error: t("user.errors.contactNumberAdminIdDeviceIdRequired")
        });
    }

    db.get(
        `SELECT id FROM users WHERE contactNumber=? AND deviceId=?`,
        [contactNumber, deviceId],
        (err, userRow) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!userRow) {
                return res.json({ status: t("common.errors.userNotFound") });
            }

            db.get(
                `SELECT status, banned_until FROM admin_users WHERE admin_id=? AND user_id=?`,
                [adminId, userRow.id],
                (err2, auRow) => {
                    if (err2) {
                        return res.status(500).json({ error: err2.message });
                    }
                    if (!auRow) {
                        return res.json({ status: t("user.status.notFound") });
                    }
                    return res.json({
                        status: auRow.status,
                        bannedUntil: auRow.banned_until,
                        userId: userRow.id
                    });
                }
            );
        }
    );
};

exports.requestApproval = (req, res) => {
  const { t } = req;
  const { adminId, contactNumber, displayName, deviceId } = req.body;

  if (!adminId || !contactNumber) {
    return res.status(400).json({
      error: t("user.errors.adminIdContactNumberRequired"),
    });
  }

  db.get(
    `SELECT * FROM users WHERE contactNumber=?`,
    [contactNumber],
    (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // ------------------------------------------------------------
      // (A) If no existing user => create a new user
      // ------------------------------------------------------------
      if (!existingUser) {
        db.run(
          `INSERT INTO users (displayName, contactNumber, deviceId)
           VALUES (?, ?, ?)`,
          [displayName || "", contactNumber, deviceId || ""],
          function (insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: insertErr.message });
            }
            handleBridging(adminId, this.lastID, res, t);
          }
        );
        return;
      }

      // ------------------------------------------------------------
      // (B) Found an existing user => check their admin_users status
      // ------------------------------------------------------------
      db.get(
        `SELECT status, banned_until
         FROM admin_users
         WHERE admin_id=? AND user_id=?`,
        [adminId, existingUser.id],
        (err2, auRow) => {
          if (err2) {
            return res.status(500).json({ error: err2.message });
          }

          // If there's no row in admin_users, user is not linked yet => normal bridging
          if (!auRow) {
            // Also handle if existingUser.deviceId is empty or not:
            return updateDeviceIfAllowed(
              existingUser,
              deviceId,
              displayName,
              null, // means no prior status
              adminId,
              res,
              t
            );
          }

          // If we do have an admin_users row => check status
          if (auRow.status === "revoked") {
            // --------------------------------------------
            // (B1) If user is revoked => ALLOW changing device ID
            //     Then set them to 'pending' so the admin
            //     must approve them again.
            // --------------------------------------------
            return resetDeviceForRevokedUser(
              existingUser,
              deviceId,
              displayName,
              adminId,
              res,
              t
            );
          } else {
            // --------------------------------------------
            // (B2) Normal scenario (approved, pending, etc.)
            //     => follow the usual “don’t allow changes”
            // --------------------------------------------
            return updateDeviceIfAllowed(
              existingUser,
              deviceId,
              displayName,
              auRow.status,
              adminId,
              res,
              t
            );
          }
        }
      );
    }
  );
};

// ============================================================
// Helper: reset device if user was revoked
// ============================================================
function resetDeviceForRevokedUser(existingUser, newDeviceId, newName, adminId, res, t) {
  // You might also check if the banUntil has expired or not.
  // For simplicity, let's just let them reset immediately if they're "revoked."
  const finalName = newName || existingUser.displayName;
  db.run(
    `UPDATE users
     SET displayName=?, deviceId=?
     WHERE id=?`,
    [finalName, newDeviceId || "", existingUser.id],
    (updErr) => {
      if (updErr) {
        return res.status(500).json({ error: updErr.message });
      }
      // Then set admin_users to 'pending'
      db.run(
        `UPDATE admin_users
         SET status='pending', banned_until=NULL
         WHERE admin_id=? AND user_id=?`,
        [adminId, existingUser.id],
        (updErr2) => {
          if (updErr2) {
            return res.status(500).json({ error: updErr2.message });
          }
          return res.json({
            message: t("user.messages.revokedDeviceReset") 
              || "Your device has been updated. Approval requested again.",
          });
        }
      );
    }
  );
}

// ============================================================
// Helper: normal device-logic if user is not 'revoked'
// ============================================================
function updateDeviceIfAllowed(existingUser, newDeviceId, newName, existingStatus, adminId, res, t) {
  // If the user has no deviceId in DB, set it now
  if (!existingUser.deviceId) {
    db.run(
      `UPDATE users
       SET displayName=?, deviceId=?
       WHERE id=?`,
      [newName || existingUser.displayName, newDeviceId || "", existingUser.id],
      (updErr) => {
        if (updErr) return res.status(500).json({ error: updErr.message });
        handleBridging(adminId, existingUser.id, res, t);
      }
    );
    return;
  }

  // If the user already has a deviceId => must match or fail
  if (existingUser.deviceId !== newDeviceId) {
    return res.status(400).json({
      error: t("user.errors.deviceIdMismatch"),
    });
  }

  // Otherwise same device => just update displayName if changed
  db.run(
    `UPDATE users SET displayName=? WHERE id=?`,
    [newName || existingUser.displayName, existingUser.id],
    (updErr) => {
      if (updErr) {
        return res.status(500).json({ error: updErr.message });
      }
      handleBridging(adminId, existingUser.id, res, t);
    }
  );
}

function handleBridging(adminId, userId, res, t) {
    db.get(
        `SELECT status, banned_until FROM admin_users WHERE admin_id=? AND user_id=?`,
        [adminId, userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                // Create a new pending link
                db.run(
                    `INSERT INTO admin_users (admin_id, user_id, status) VALUES (?, ?, 'pending')`,
                    [adminId, userId],
                    (err2) => {
                        if (err2) {
                            return res.status(500).json({ error: err2.message });
                        }
                        return res.json({
                            message: t("user.messages.approvalRequestSent")
                        });
                    }
                );
            } else {
                // Check if previously rejected or revoked
                if (["rejected", "revoked"].includes(row.status)) {
                    const now = Date.now();
                    const banUntil = row.banned_until ? new Date(row.banned_until).getTime() : 0;
                    if (banUntil && banUntil > now) {
                        return res.status(400).json({
                            error: t("user.errors.bannedUntil", {
                                bannedUntil: row.banned_until
                            })
                        });
                    }
                }
                // Otherwise, user already linked => update device ID or inform them of current status
                return res.json({
                    message: t("user.messages.deviceChangedStatus", { status: row.status })
                });
            }
        }
    );
}

exports.updateDisplayName = (req, res) => {
    const { t } = req;
    const { adminId, userId, newName } = req.body;

    if (!adminId || !userId || !newName) {
        return res.status(400).json({
            error: t("user.errors.adminIdUserIdNewNameRequired")
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

            db.run(
                `UPDATE users SET displayName=? WHERE id=?`,
                [newName, userId],
                (updErr) => {
                    if (updErr) {
                        return res.status(500).json({ error: updErr.message });
                    }
                    res.json({ message: t("user.messages.displayNameUpdated") });
                }
            );
        }
    );
};

exports.getAllUsersForAdmin = (req, res) => {
    const { t } = req;
    const { adminId } = req.body;

    if (!adminId) {
        return res.status(400).json({
            error: t("common.errors.adminIdRequired")
        });
    }

    db.all(
        `
    SELECT u.id as userId, u.displayName, u.contactNumber, u.deviceId,
           au.status, au.banned_until
    FROM users u
    JOIN admin_users au ON u.id = au.user_id
    WHERE au.admin_id=?
    `,
        [adminId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
};

exports.revokeUser = (req, res) => {
    const { t } = req;
    const { adminId, userId } = req.body;

    if (!adminId || !userId) {
        return res.status(400).json({
            error: t("user.errors.adminIdUserIdRequired")
        });
    }

    db.run(
        `UPDATE admin_users SET status='revoked', banned_until=NULL
     WHERE admin_id=? AND user_id=?`,
        [adminId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(400).json({
                    error: t("common.errors.noMatchingRecord")
                });
            }
            res.json({ message: t("user.messages.userRevoked") });
        }
    );
};
