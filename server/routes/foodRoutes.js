const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    postFood,
    getFoods,
    copyFood,
    updateFood,
    deleteFood
} = require("../controllers/foodController");

router.post(
    "/",
    authMiddleware,
    postFood
);

router.get(
    "/",
    authMiddleware,
    getFoods
);

router.post(
    "/:id/copy",
    authMiddleware,
    copyFood
);

router.put(
    "/:id",
    authMiddleware,
    updateFood
);

router.delete(
    "/:id",
    authMiddleware,
    deleteFood
);

module.exports = router;
