const db = require("../config/db");

const getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query(
            `SELECT
                Id,
                EntityType,
                EntityId,
                EntityName,
                Status,
                AdminMessage,
                CreatedAt
            FROM ModerationNotifications
            WHERE UserId = ?
            AND DismissedAt IS NULL
            ORDER BY CreatedAt DESC
            LIMIT 10`,
            [req.user.id]
        );

        return res.status(200).json(notifications);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const dismissNotification = async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE ModerationNotifications
            SET DismissedAt = CURRENT_TIMESTAMP
            WHERE Id = ?
            AND UserId = ?`,
            [
                req.params.id,
                req.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        return res.status(200).json({
            message: "Notification dismissed."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

module.exports = {
    getNotifications,
    dismissNotification
};
