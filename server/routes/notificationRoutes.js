const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
    getNotifications,
    dismissNotification
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.patch("/:id/dismiss", authMiddleware, dismissNotification);

module.exports = router;
