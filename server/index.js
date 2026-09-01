require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const foodRoutes = require("./routes/foodRoutes");
const mealRoutes = require("./routes/mealRoutes");
const quickMealRoutes = require("./routes/quickMealsRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const workoutSplitRoutes = require("./routes/workoutSplitRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/quick-meals", quickMealRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/workout-splits", workoutSplitRoutes);
app.use("/api/notifications", notificationRoutes);

// Test database connection
(async () => {
    try {
        await db.query("SELECT 1");
        console.log("Connected to MySQL!");
    } catch (err) {
        console.error("Database connection failed!");
        console.error(err);
    }
})();

app.get("/", (req, res) => {
    res.send("Server is running!");
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
