const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    addMeal,
    getTodayMeals,
    getMacroHistory,
    getMealHistory,
    deleteMeal,
    deleteMealGroup
} = require("../controllers/mealController");

router.post(
    "/",
    authMiddleware,
    addMeal
);

router.get(
    "/today",
    authMiddleware,
    getTodayMeals
);

router.get(
    "/history",
    authMiddleware,
    getMacroHistory
);

router.get(
    "/history/detail",
    authMiddleware,
    getMealHistory
);

router.delete(
    "/group/:groupId",
    authMiddleware,
    deleteMealGroup
);

router.delete(
    "/:id",
    authMiddleware,
    deleteMeal
);

module.exports = router;
