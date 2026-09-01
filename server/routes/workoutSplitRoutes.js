const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
    getWorkoutSplits,
    getWorkoutSplit,
    createWorkoutSplit,
    updateWorkoutSplit,
    rateWorkoutSplit,
    reportWorkoutSplit,
    selectWorkoutSplit,
    getMyWorkoutSplit,
    updateSelectedExercise
} = require("../controllers/workoutSplitController");

const router = express.Router();

router.get("/mine/selected", authMiddleware, getMyWorkoutSplit);
router.patch("/mine/exercises/:exerciseId", authMiddleware, updateSelectedExercise);
router.patch("/mine/exercises/:exerciseId/weight", authMiddleware, updateSelectedExercise);
router.get("/", authMiddleware, getWorkoutSplits);
router.post("/", authMiddleware, createWorkoutSplit);
router.get("/:id", authMiddleware, getWorkoutSplit);
router.put("/:id", authMiddleware, updateWorkoutSplit);
router.post("/:id/rating", authMiddleware, rateWorkoutSplit);
router.post("/:id/report", authMiddleware, reportWorkoutSplit);
router.post("/:id/select", authMiddleware, selectWorkoutSplit);

module.exports = router;
