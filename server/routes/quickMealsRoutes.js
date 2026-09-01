const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
    createQuickMeal,
    getQuickMeals,
    getQuickMeal,
    updateQuickMeal,
    deleteQuickMeal,
    addQuickMealToDiary
} = require("../controllers/quickMealController");

const router = express.Router();

// Create a new quick meal
router.post("/", authMiddleware, createQuickMeal);

// Get all quick meals
router.get("/", authMiddleware, getQuickMeals);

// Add a quick meal to today's diary
router.post("/:id/add-to-diary", authMiddleware, addQuickMealToDiary);

// Get a single quick meal by ID
router.get("/:id", authMiddleware, getQuickMeal);

// Update a quick meal
router.put("/:id", authMiddleware, updateQuickMeal);

// Delete a quick meal
router.delete("/:id", authMiddleware, deleteQuickMeal);

module.exports = router;
