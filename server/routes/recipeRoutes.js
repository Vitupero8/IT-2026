const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
    getTags,
    getRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    uploadRecipeImage,
    rateRecipe,
    reportRecipe,
    getMyRecipeReports,
    dismissMyRecipeReport,
    addRecipeToQuickMeals,
    addRecipeToDiary
} = require("../controllers/recipeController");
const {
    imageUpload,
    setUploadFolder
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/tags", authMiddleware, getTags);
router.get("/my-reports", authMiddleware, getMyRecipeReports);
router.patch("/my-reports/:id/dismiss", authMiddleware, dismissMyRecipeReport);
router.get("/", authMiddleware, getRecipes);
router.post("/", authMiddleware, createRecipe);
router.get("/:id", authMiddleware, getRecipe);
router.put("/:id", authMiddleware, updateRecipe);
router.post("/:id/image", authMiddleware, setUploadFolder("recipes"), imageUpload.single("image"), uploadRecipeImage);
router.post("/:id/rating", authMiddleware, rateRecipe);
router.post("/:id/report", authMiddleware, reportRecipe);
router.post("/:id/add-to-quick-meals", authMiddleware, addRecipeToQuickMeals);
router.post("/:id/add-to-diary", authMiddleware, addRecipeToDiary);

module.exports = router;
