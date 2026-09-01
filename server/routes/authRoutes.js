const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
    register,
    login,
    getProfile,
    updateMacroTargets,
    changePassword,
    requestPasswordReset,
    updateProfilePicture
} = require("../controllers/authController");
const {
    imageUpload,
    setUploadFolder
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/password-reset-requests", requestPasswordReset);

router.get(
    "/profile",
    authMiddleware,
    getProfile
);

router.put(
    "/macro-targets",
    authMiddleware,
    updateMacroTargets
);

router.put(
    "/password",
    authMiddleware,
    changePassword
);

router.post(
    "/profile-picture",
    authMiddleware,
    setUploadFolder("profiles"),
    imageUpload.single("image"),
    updateProfilePicture
);

module.exports = router;
