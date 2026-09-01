const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
    getPendingFoods,
    updateFoodStatus,
    getPendingRecipes,
    updateRecipeStatus,
    getPendingWorkoutSplits,
    updateWorkoutSplitStatus,
    getRecipeReports,
    updateRecipeReportStatus,
    getWorkoutSplitReports,
    updateWorkoutSplitReportStatus,
    getUsers,
    updateUserModeration,
    permanentlyBanUser,
    updateUserTrust,
    getPasswordResetRequests,
    updatePasswordResetRequestStatus,
    getAdminAuditLogs
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/foods/pending", getPendingFoods);
router.patch("/foods/:id/status", updateFoodStatus);
router.get("/recipes/pending", getPendingRecipes);
router.patch("/recipes/:id/status", updateRecipeStatus);
router.get("/workout-splits/pending", getPendingWorkoutSplits);
router.patch("/workout-splits/:id/status", updateWorkoutSplitStatus);
router.get("/recipe-reports", getRecipeReports);
router.patch("/recipe-reports/:id/status", updateRecipeReportStatus);
router.get("/workout-split-reports", getWorkoutSplitReports);
router.patch("/workout-split-reports/:id/status", updateWorkoutSplitReportStatus);
router.get("/users", getUsers);
router.patch("/users/:id/moderation", updateUserModeration);
router.delete("/users/:id/permanent-ban", permanentlyBanUser);
router.patch("/users/:id/trust", updateUserTrust);
router.get("/password-reset-requests", getPasswordResetRequests);
router.patch("/password-reset-requests/:id/status", updatePasswordResetRequestStatus);
router.get("/audit-logs", getAdminAuditLogs);

module.exports = router;
