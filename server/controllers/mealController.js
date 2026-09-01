const db = require("../config/db");

const getHistoryDateFilter = (query, defaultDays = null) => {

    const conditions = ["MealEntries.UserId = ?"];
    const params = [];

    if (query.startDate) {
        conditions.push("DATE(MealEntries.LoggedAt) >= ?");
        params.push(query.startDate);
    }

    if (query.endDate) {
        conditions.push("DATE(MealEntries.LoggedAt) <= ?");
        params.push(query.endDate);
    }

    if (!query.startDate && !query.endDate && defaultDays) {
        conditions.push("MealEntries.LoggedAt >= DATE_SUB(CURDATE(), INTERVAL ? DAY)");
        params.push(defaultDays - 1);
    }

    return {
        conditions,
        params
    };

};

const addMeal = async (req, res) => {

    try {

        const userId = req.user.id;

        const { foodId, grams } = req.body;

        if (!foodId || !grams) {

            return res.status(400).json({

                message: "Food and grams are required."

            });

        }

        const [result] = await db.query(

            `INSERT INTO MealEntries

            (UserId, FoodId, Grams)

            VALUES (?, ?, ?)`,

            [

                userId,

                foodId,

                grams

            ]

        );

        return res.status(201).json({

            message: "Meal added successfully.",

            mealId: result.insertId

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            message: "Internal server error."

        });

    }

};

const getTodayMeals = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT 
                MealEntries.Id, 
                Foods.Name, 
                Foods.Calories, 
                Foods.Protein, 
                Foods.Carbs, 
                Foods.Fat, 
                MealEntries.Grams,
                MealEntries.QuickMealId,
                MealEntries.QuickMealLogId,
                MealEntries.QuickMealName,
                MealEntries.RecipeId,
                MealEntries.RecipeLogId,
                MealEntries.RecipeName,
                MealEntries.LoggedAt
            FROM MealEntries
            JOIN Foods
            ON MealEntries.FoodId = Foods.Id
            WHERE MealEntries.UserId = ?
            AND DATE(MealEntries.LoggedAt) = CURDATE()
            ORDER BY MealEntries.LoggedAt DESC`,
            [userId]
        );

        return res.status(200).json(rows);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getMacroHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const days = req.query.all === "true"
            ? null
            : Math.min(Math.max(Number(req.query.days) || 7, 2), 365);
        const { conditions, params } = getHistoryDateFilter(req.query, days);

        const [rows] = await db.query(
            `SELECT
                DATE_FORMAT(MealEntries.LoggedAt, '%Y-%m-%d') AS Date,
                COALESCE(SUM(Foods.Calories * MealEntries.Grams / 100), 0) AS Calories,
                COALESCE(SUM(Foods.Protein * MealEntries.Grams / 100), 0) AS Protein,
                COALESCE(SUM(Foods.Carbs * MealEntries.Grams / 100), 0) AS Carbs,
                COALESCE(SUM(Foods.Fat * MealEntries.Grams / 100), 0) AS Fat
            FROM MealEntries
            JOIN Foods
                ON MealEntries.FoodId = Foods.Id
            WHERE ${conditions.join(" AND ")}
            GROUP BY DATE_FORMAT(MealEntries.LoggedAt, '%Y-%m-%d')
            ORDER BY Date DESC`,
            [
                userId,
                ...params
            ]
        );

        return res.status(200).json(rows);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getMealHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const days = req.query.all === "true"
            ? null
            : Math.min(Math.max(Number(req.query.days) || 14, 2), 365);
        const { conditions, params } = getHistoryDateFilter(req.query, days);

        const [rows] = await db.query(
            `SELECT
                MealEntries.Id,
                DATE_FORMAT(MealEntries.LoggedAt, '%Y-%m-%d') AS Date,
                Foods.Name,
                Foods.Calories,
                Foods.Protein,
                Foods.Carbs,
                Foods.Fat,
                MealEntries.Grams,
                MealEntries.QuickMealId,
                MealEntries.QuickMealLogId,
                MealEntries.QuickMealName,
                MealEntries.RecipeId,
                MealEntries.RecipeLogId,
                MealEntries.RecipeName,
                MealEntries.LoggedAt
            FROM MealEntries
            JOIN Foods
                ON MealEntries.FoodId = Foods.Id
            WHERE ${conditions.join(" AND ")}
            ORDER BY MealEntries.LoggedAt DESC`,
            [
                userId,
                ...params
            ]
        );

        return res.status(200).json(rows);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const deleteMeal = async (req, res) => {

    try {

        const userId = req.user.id;

        const { id } = req.params;

        const [result] = await db.query(

            `DELETE FROM MealEntries

            WHERE Id = ?

            AND UserId = ?`,

            [

                id,

                userId

            ]

        );

        if(result.affectedRows === 0){

            return res.status(404).json({

                message: "Meal not found."

            });

        }

        return res.status(200).json({

            message: "Meal deleted successfully."

        });

    }

    catch(err){

        console.error(err);

        return res.status(500).json({

            message: "Internal server error."

        });

    }

};

const deleteMealGroup = async (req, res) => {

    try {

        const userId = req.user.id;

        const { groupId } = req.params;

        const [result] = await db.query(

            `DELETE FROM MealEntries

            WHERE (QuickMealLogId = ? OR RecipeLogId = ?)

            AND UserId = ?`,

            [

                groupId,

                groupId,

                userId

            ]

        );

        if (result.affectedRows === 0) {

            return res.status(404).json({

                message: "Meal group not found."

            });

        }

        return res.status(200).json({

            message: "Meal group deleted successfully."

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

    addMeal,

    getTodayMeals,

    getMacroHistory,

    getMealHistory,

    deleteMeal,

    deleteMealGroup

};
