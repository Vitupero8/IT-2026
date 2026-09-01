const db = require("../config/db");
const crypto = require("crypto");

const parseNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const normalizeQuickMealItem = async (connection, item, userId) => {
    const grams = parseNumber(item.grams ?? item.Grams);

    if (grams <= 0) {
        throw new Error("Invalid food item.");
    }

    if (item.foodId || item.FoodId) {
        const foodId = Number(item.foodId || item.FoodId);
        const [foodRows] = await connection.query(
            `SELECT Id
            FROM Foods
            WHERE Id = ?
            AND DeletedAt IS NULL
            AND (CreatedBy = ? OR Status = 'Approved')`,
            [
                foodId,
                userId
            ]
        );

        if (foodRows.length === 0) {
            throw new Error("Food not found.");
        }

        return {
            foodId,
            grams
        };
    }

    const name = String(item.name || item.Name || "").trim();
    const macros = {
        calories: parseNumber(item.calories ?? item.Calories),
        protein: parseNumber(item.protein ?? item.Protein),
        carbs: parseNumber(item.carbs ?? item.Carbs),
        fat: parseNumber(item.fat ?? item.Fat)
    };

    if (
        !name ||
        Object.values(macros).some(value => value < 0)
    ) {
        throw new Error("Custom foods need a name and valid macros.");
    }

    const [foodResult] = await connection.query(
        `INSERT INTO Foods
        (Name, ServingSize, Calories, Protein, Carbs, Fat, CreatedBy, Status)
        VALUES (?, 100, ?, ?, ?, ?, ?, 'Private')`,
        [
            name,
            macros.calories,
            macros.protein,
            macros.carbs,
            macros.fat,
            userId
        ]
    );

    return {
        foodId: foodResult.insertId,
        grams
    };
};

const createQuickMeal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, items } = req.body;

        if (!name || !items || items.length === 0) {
            return res.status(400).json({
                message: "Name and at least one food are required."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [mealResult] = await connection.query(
                `INSERT INTO QuickMeals
                (UserId, Name)
                VALUES (?, ?)`,
                [userId, name]
            );

            const quickMealId = mealResult.insertId;

            for (const item of items) {
                const normalizedItem = await normalizeQuickMealItem(connection, item, userId);

                await connection.query(
                    `INSERT INTO QuickMealItems
                    (QuickMealId, FoodId, Grams)
                    VALUES (?, ?, ?)`,
                    [
                        quickMealId,
                        normalizedItem.foodId,
                        normalizedItem.grams
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                message: "Quick meal created successfully.",
                quickMealId
            });
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


const getQuickMeals = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT
                QuickMeals.Id,
                QuickMeals.Name,
                QuickMeals.CreatedAt,
                COALESCE(
                    SUM(Foods.Calories * QuickMealItems.Grams / 100),
                    0
                ) AS Calories,
                COALESCE(
                    SUM(Foods.Protein * QuickMealItems.Grams / 100),
                    0
                ) AS Protein,
                COALESCE(
                    SUM(Foods.Carbs * QuickMealItems.Grams / 100),
                    0
                ) AS Carbs,
                COALESCE(
                    SUM(Foods.Fat * QuickMealItems.Grams / 100),
                    0
                ) AS Fat
            FROM QuickMeals
            LEFT JOIN QuickMealItems
                ON QuickMeals.Id = QuickMealItems.QuickMealId
            LEFT JOIN Foods
                ON QuickMealItems.FoodId = Foods.Id
            WHERE QuickMeals.UserId = ?
            GROUP BY
                QuickMeals.Id,
                QuickMeals.Name,
                QuickMeals.CreatedAt
            ORDER BY QuickMeals.CreatedAt DESC`,
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


const getQuickMeal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [mealRows] = await db.query(
            `SELECT
                Id,
                Name,
                CreatedAt
            FROM QuickMeals
            WHERE Id = ?
            AND UserId = ?`,
            [id, userId]
        );

        if (mealRows.length === 0) {
            return res.status(404).json({
                message: "Quick meal not found."
            });
        }

        const [items] = await db.query(
            `SELECT
                QuickMealItems.Id,
                QuickMealItems.FoodId,
                QuickMealItems.Grams,
                Foods.Name,
                Foods.Calories,
                Foods.Protein,
                Foods.Carbs,
                Foods.Fat
            FROM QuickMealItems
            JOIN Foods
                ON QuickMealItems.FoodId = Foods.Id
            WHERE QuickMealItems.QuickMealId = ?
            ORDER BY QuickMealItems.Id`,
            [id]
        );

        return res.status(200).json({
            meal: mealRows[0],
            items
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


const updateQuickMeal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, items } = req.body;

        if (!name || !items || items.length === 0) {
            return res.status(400).json({
                message: "Name and at least one food are required."
            });
        }

        const [mealRows] = await db.query(
            `SELECT Id, Name
            FROM QuickMeals
            WHERE Id = ?
            AND UserId = ?`,
            [id, userId]
        );

        if (mealRows.length === 0) {
            return res.status(404).json({
                message: "Quick meal not found."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE QuickMeals
                SET Name = ?
                WHERE Id = ?
                AND UserId = ?`,
                [name, id, userId]
            );

            await connection.query(
                `DELETE FROM QuickMealItems
                WHERE QuickMealId = ?`,
                [id]
            );

            for (const item of items) {
                const normalizedItem = await normalizeQuickMealItem(connection, item, userId);

                await connection.query(
                    `INSERT INTO QuickMealItems
                    (QuickMealId, FoodId, Grams)
                    VALUES (?, ?, ?)`,
                    [
                        id,
                        normalizedItem.foodId,
                        normalizedItem.grams
                    ]
                );
            }

            await connection.commit();

            return res.status(200).json({
                message: "Quick meal updated successfully."
            });
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


const deleteQuickMeal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM QuickMeals
            WHERE Id = ?
            AND UserId = ?`,
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Quick meal not found."
            });
        }

        return res.status(200).json({
            message: "Quick meal deleted successfully."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


const addQuickMealToDiary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [mealRows] = await db.query(
            `SELECT Id, Name
            FROM QuickMeals
            WHERE Id = ?
            AND UserId = ?`,
            [id, userId]
        );

        if (mealRows.length === 0) {
            return res.status(404).json({
                message: "Quick meal not found."
            });
        }

        const [items] = await db.query(
            `SELECT
                FoodId,
                Grams
            FROM QuickMealItems
            WHERE QuickMealId = ?`,
            [id]
        );

        if (items.length === 0) {
            return res.status(400).json({
                message: "Quick meal has no foods."
            });
        }

        const connection = await db.getConnection();
        const quickMealLogId = crypto.randomUUID();

        try {
            await connection.beginTransaction();

            for (const item of items) {
                await connection.query(
                    `INSERT INTO MealEntries
                    (UserId, FoodId, Grams, QuickMealId, QuickMealLogId, QuickMealName)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        item.FoodId,
                        item.Grams,
                        id,
                        quickMealLogId,
                        mealRows[0].Name
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                message: "Quick meal added to diary successfully.",
                quickMealLogId
            });
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


module.exports = {
    createQuickMeal,
    getQuickMeals,
    getQuickMeal,
    updateQuickMeal,
    deleteQuickMeal,
    addQuickMealToDiary
};
