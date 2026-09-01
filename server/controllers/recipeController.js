const db = require("../config/db");
const crypto = require("crypto");

const parseNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const roundMacro = (value) => Number(parseNumber(value).toFixed(2));

const splitTags = (tags) => {
    if (!tags) return [];

    if (Array.isArray(tags)) {
        return tags
            .map(tag => String(tag).trim().toLowerCase())
            .filter(Boolean);
    }

    return String(tags)
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean);
};

const formatRecipeRow = (recipe) => ({
    ...recipe,
    Tags: recipe.Tags
        ? recipe.Tags.split(",").filter(Boolean)
        : [],
    AverageRating: Number(recipe.AverageRating || 0),
    RatingCount: Number(recipe.RatingCount || 0)
});

const getRecipeAccessWhere = () => (
    "(Recipes.CreatedBy = ? OR Recipes.Status = 'Approved')"
);

const getTags = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT Id, Name, Category
            FROM RecipeTags
            ORDER BY
                FIELD(Category, 'Calories', 'Protein', 'Carbs', 'Fat', 'Goal', 'Other'),
                Name ASC`
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

const getRecipes = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            search,
            tags,
            minRating,
            maxCalories,
            minCalories,
            minProtein,
            maxProtein,
            minCarbs,
            maxCarbs,
            minFat,
            maxFat,
            owner = "all",
            sort = "newest"
        } = req.query;

        const where = [owner === "mine" ? "Recipes.CreatedBy = ?" : "Recipes.Status = 'Approved'"];
        const params = owner === "mine" ? [userId] : [];
        const tagFilters = splitTags(tags);

        if (search) {
            where.push("Recipes.Name LIKE ?");
            params.push(`%${search}%`);
        }

        const numericFilters = [
            ["Calories", ">=", minCalories],
            ["Calories", "<=", maxCalories],
            ["Protein", ">=", minProtein],
            ["Protein", "<=", maxProtein],
            ["Carbs", ">=", minCarbs],
            ["Carbs", "<=", maxCarbs],
            ["Fat", ">=", minFat],
            ["Fat", "<=", maxFat]
        ];

        for (const [column, operator, value] of numericFilters) {
            if (value !== undefined && value !== "") {
                where.push(`Recipes.${column} ${operator} ?`);
                params.push(parseNumber(value));
            }
        }

        for (const tag of tagFilters) {
            where.push(
                `EXISTS (
                    SELECT 1
                    FROM RecipeTagLinks FilterLinks
                    JOIN RecipeTags FilterTags
                        ON FilterLinks.TagId = FilterTags.Id
                    WHERE FilterLinks.RecipeId = Recipes.Id
                    AND FilterTags.Name = ?
                )`
            );
            params.push(tag);
        }

        const having = [];
        const havingParams = [];

        if (minRating !== undefined && minRating !== "") {
            having.push("AverageRating >= ?");
            havingParams.push(parseNumber(minRating));
        }

        const orderBy = {
            rating: "AverageRating DESC, RatingCount DESC, Recipes.CreatedAt DESC",
            calories: "Recipes.Calories ASC, Recipes.CreatedAt DESC",
            protein: "Recipes.Protein DESC, Recipes.CreatedAt DESC",
            newest: "Recipes.CreatedAt DESC"
        }[sort] || "Recipes.CreatedAt DESC";

        const [rows] = await db.query(
            `SELECT
                Recipes.Id,
                Recipes.Name,
                Recipes.Description,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.ImageUrl,
                Recipes.CreatedAt,
                Recipes.CreatedBy,
                Users.FirstName AS AuthorName,
                Users.TrustedRecipeCreator AS AuthorTrusted,
                COALESCE(AVG(RecipeRatings.Rating), 0) AS AverageRating,
                COUNT(DISTINCT RecipeRatings.Id) AS RatingCount,
                GROUP_CONCAT(DISTINCT RecipeTags.Name ORDER BY RecipeTags.Name SEPARATOR ',') AS Tags
            FROM Recipes
            JOIN Users
                ON Recipes.CreatedBy = Users.Id
            LEFT JOIN RecipeRatings
                ON Recipes.Id = RecipeRatings.RecipeId
            LEFT JOIN RecipeTagLinks
                ON Recipes.Id = RecipeTagLinks.RecipeId
            LEFT JOIN RecipeTags
                ON RecipeTagLinks.TagId = RecipeTags.Id
            WHERE ${where.join(" AND ")}
            GROUP BY
                Recipes.Id,
                Recipes.Name,
                Recipes.Description,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.ImageUrl,
                Recipes.CreatedAt,
                Recipes.CreatedBy,
                Users.FirstName,
                Users.TrustedRecipeCreator
            ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
            ORDER BY ${orderBy}
            LIMIT 60`,
            [...params, ...havingParams]
        );

        return res.status(200).json(rows.map(formatRecipeRow));
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getRecipe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [recipeRows] = await db.query(
            `SELECT
                Recipes.Id,
                Recipes.CreatedBy,
                Recipes.Name,
                Recipes.Description,
                Recipes.Instructions,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.ImageUrl,
                Recipes.CreatedAt,
                Users.FirstName AS AuthorName,
                Users.TrustedRecipeCreator AS AuthorTrusted,
                COALESCE(AVG(RecipeRatings.Rating), 0) AS AverageRating,
                COUNT(DISTINCT RecipeRatings.Id) AS RatingCount,
                GROUP_CONCAT(DISTINCT RecipeTags.Name ORDER BY RecipeTags.Name SEPARATOR ',') AS Tags,
                MAX(CASE WHEN RecipeRatings.UserId = ? THEN RecipeRatings.Rating END) AS UserRating
            FROM Recipes
            JOIN Users
                ON Recipes.CreatedBy = Users.Id
            LEFT JOIN RecipeRatings
                ON Recipes.Id = RecipeRatings.RecipeId
            LEFT JOIN RecipeTagLinks
                ON Recipes.Id = RecipeTagLinks.RecipeId
            LEFT JOIN RecipeTags
                ON RecipeTagLinks.TagId = RecipeTags.Id
            WHERE Recipes.Id = ?
            AND ${getRecipeAccessWhere()}
            GROUP BY
                Recipes.Id,
                Recipes.CreatedBy,
                Recipes.Name,
                Recipes.Description,
                Recipes.Instructions,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.ImageUrl,
                Recipes.CreatedAt,
                Users.FirstName,
                Users.TrustedRecipeCreator`,
            [userId, id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        const [ingredients] = await db.query(
            `SELECT
                Id,
                FoodId,
                Name,
                Grams,
                CaloriesPer100g,
                ProteinPer100g,
                CarbsPer100g,
                FatPer100g,
                Source
            FROM RecipeIngredients
            WHERE RecipeId = ?
            ORDER BY Id ASC`,
            [id]
        );

        return res.status(200).json({
            recipe: formatRecipeRow(recipeRows[0]),
            ingredients
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const createRecipe = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            description = "",
            instructions = "",
            servings = 1,
            ingredients,
            tags = []
        } = req.body;

        const [userRows] = await db.query(
            `SELECT RecipePostingBlocked, TrustedRecipeCreator
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        if (userRows[0]?.RecipePostingBlocked) {
            return res.status(403).json({
                message: "Recipe posting is disabled for this account."
            });
        }

        if (!name || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                message: "Recipe name and ingredients are required."
            });
        }

        const servingCount = parseNumber(servings, 1);

        if (servingCount <= 0) {
            return res.status(400).json({
                message: "Servings must be greater than zero."
            });
        }

        const normalizedTags = splitTags(tags);
        const normalizedIngredients = [];
        const totalMacros = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };

        for (const ingredient of ingredients) {
            const grams = parseNumber(ingredient.grams ?? ingredient.Grams);

            if (grams <= 0) {
                return res.status(400).json({
                    message: "Ingredient grams must be greater than zero."
                });
            }

            let normalizedIngredient;

            if (ingredient.foodId || ingredient.FoodId) {
                const foodId = Number(ingredient.foodId || ingredient.FoodId);
                const [foodRows] = await db.query(
                    `SELECT Id, Name, Calories, Protein, Carbs, Fat
                    FROM Foods
                    WHERE Id = ?
                    AND DeletedAt IS NULL
                    AND (CreatedBy = ? OR Status = 'Approved')`,
                    [foodId, userId]
                );

                if (foodRows.length === 0) {
                    return res.status(400).json({
                        message: "One of the selected foods is not available."
                    });
                }

                const food = foodRows[0];

                normalizedIngredient = {
                    foodId: food.Id,
                    name: food.Name,
                    grams,
                    caloriesPer100g: parseNumber(food.Calories),
                    proteinPer100g: parseNumber(food.Protein),
                    carbsPer100g: parseNumber(food.Carbs),
                    fatPer100g: parseNumber(food.Fat),
                    source: "FoodDatabase"
                };
            }
            else {
                const ingredientName = String(ingredient.name || ingredient.Name || "").trim();

                if (!ingredientName) {
                    return res.status(400).json({
                        message: "Manual ingredients need a name."
                    });
                }

                normalizedIngredient = {
                    foodId: null,
                    name: ingredientName,
                    grams,
                    caloriesPer100g: parseNumber(ingredient.caloriesPer100g ?? ingredient.CaloriesPer100g),
                    proteinPer100g: parseNumber(ingredient.proteinPer100g ?? ingredient.ProteinPer100g),
                    carbsPer100g: parseNumber(ingredient.carbsPer100g ?? ingredient.CarbsPer100g),
                    fatPer100g: parseNumber(ingredient.fatPer100g ?? ingredient.FatPer100g),
                    source: "Manual"
                };
            }

            if (
                normalizedIngredient.caloriesPer100g < 0 ||
                normalizedIngredient.proteinPer100g < 0 ||
                normalizedIngredient.carbsPer100g < 0 ||
                normalizedIngredient.fatPer100g < 0
            ) {
                return res.status(400).json({
                    message: "Ingredient macros cannot be negative."
                });
            }

            totalMacros.calories += normalizedIngredient.caloriesPer100g * grams / 100;
            totalMacros.protein += normalizedIngredient.proteinPer100g * grams / 100;
            totalMacros.carbs += normalizedIngredient.carbsPer100g * grams / 100;
            totalMacros.fat += normalizedIngredient.fatPer100g * grams / 100;

            normalizedIngredients.push(normalizedIngredient);
        }

        const perServingMacros = {
            calories: roundMacro(totalMacros.calories / servingCount),
            protein: roundMacro(totalMacros.protein / servingCount),
            carbs: roundMacro(totalMacros.carbs / servingCount),
            fat: roundMacro(totalMacros.fat / servingCount)
        };

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const recipeStatus = userRows[0]?.TrustedRecipeCreator
                ? "Approved"
                : "Pending";

            const [recipeResult] = await connection.query(
                `INSERT INTO Recipes
                (CreatedBy, Name, Description, Instructions, Servings, Calories, Protein, Carbs, Fat, Status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    name.trim(),
                    description.trim(),
                    instructions.trim(),
                    servingCount,
                    perServingMacros.calories,
                    perServingMacros.protein,
                    perServingMacros.carbs,
                    perServingMacros.fat,
                    recipeStatus
                ]
            );

            const recipeId = recipeResult.insertId;

            for (const ingredient of normalizedIngredients) {
                await connection.query(
                    `INSERT INTO RecipeIngredients
                    (
                        RecipeId,
                        FoodId,
                        Name,
                        Grams,
                        CaloriesPer100g,
                        ProteinPer100g,
                        CarbsPer100g,
                        FatPer100g,
                        Source
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        recipeId,
                        ingredient.foodId,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.caloriesPer100g,
                        ingredient.proteinPer100g,
                        ingredient.carbsPer100g,
                        ingredient.fatPer100g,
                        ingredient.source
                    ]
                );
            }

            for (const tagName of normalizedTags) {
                const [tagRows] = await connection.query(
                    `SELECT Id
                    FROM RecipeTags
                    WHERE Name = ?`,
                    [tagName]
                );

                if (tagRows.length > 0) {
                    await connection.query(
                        `INSERT IGNORE INTO RecipeTagLinks
                        (RecipeId, TagId)
                        VALUES (?, ?)`,
                        [recipeId, tagRows[0].Id]
                    );
                }
            }

            await connection.commit();

            return res.status(201).json({
                message: recipeStatus === "Approved"
                    ? "Recipe posted."
                    : "Recipe submitted for admin review.",
                recipeId,
                status: recipeStatus,
                macros: perServingMacros
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

const updateRecipe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            name,
            description = "",
            instructions = "",
            servings = 1,
            ingredients,
            tags = []
        } = req.body;

        const [userRows] = await db.query(
            `SELECT RecipePostingBlocked, TrustedRecipeCreator
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        if (userRows[0]?.RecipePostingBlocked) {
            return res.status(403).json({
                message: "Recipe posting is disabled for this account."
            });
        }

        const [recipeRows] = await db.query(
            `SELECT Id
            FROM Recipes
            WHERE Id = ?
            AND CreatedBy = ?`,
            [id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        if (!name || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                message: "Recipe name and ingredients are required."
            });
        }

        const servingCount = parseNumber(servings, 1);

        if (servingCount <= 0) {
            return res.status(400).json({
                message: "Servings must be greater than zero."
            });
        }

        const normalizedTags = splitTags(tags);
        const normalizedIngredients = [];
        const totalMacros = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };

        for (const ingredient of ingredients) {
            const grams = parseNumber(ingredient.grams ?? ingredient.Grams);

            if (grams <= 0) {
                return res.status(400).json({
                    message: "Ingredient grams must be greater than zero."
                });
            }

            let normalizedIngredient;

            if (ingredient.foodId || ingredient.FoodId) {
                const foodId = Number(ingredient.foodId || ingredient.FoodId);
                const [foodRows] = await db.query(
                    `SELECT Id, Name, Calories, Protein, Carbs, Fat
                    FROM Foods
                    WHERE Id = ?
                    AND DeletedAt IS NULL
                    AND (CreatedBy = ? OR Status = 'Approved')`,
                    [foodId, userId]
                );

                if (foodRows.length === 0) {
                    return res.status(400).json({
                        message: "One of the selected foods is not available."
                    });
                }

                const food = foodRows[0];

                normalizedIngredient = {
                    foodId: food.Id,
                    name: food.Name,
                    grams,
                    caloriesPer100g: parseNumber(food.Calories),
                    proteinPer100g: parseNumber(food.Protein),
                    carbsPer100g: parseNumber(food.Carbs),
                    fatPer100g: parseNumber(food.Fat),
                    source: "FoodDatabase"
                };
            }
            else {
                const ingredientName = String(ingredient.name || ingredient.Name || "").trim();

                if (!ingredientName) {
                    return res.status(400).json({
                        message: "Manual ingredients need a name."
                    });
                }

                normalizedIngredient = {
                    foodId: null,
                    name: ingredientName,
                    grams,
                    caloriesPer100g: parseNumber(ingredient.caloriesPer100g ?? ingredient.CaloriesPer100g),
                    proteinPer100g: parseNumber(ingredient.proteinPer100g ?? ingredient.ProteinPer100g),
                    carbsPer100g: parseNumber(ingredient.carbsPer100g ?? ingredient.CarbsPer100g),
                    fatPer100g: parseNumber(ingredient.fatPer100g ?? ingredient.FatPer100g),
                    source: "Manual"
                };
            }

            if (
                normalizedIngredient.caloriesPer100g < 0 ||
                normalizedIngredient.proteinPer100g < 0 ||
                normalizedIngredient.carbsPer100g < 0 ||
                normalizedIngredient.fatPer100g < 0
            ) {
                return res.status(400).json({
                    message: "Ingredient macros cannot be negative."
                });
            }

            totalMacros.calories += normalizedIngredient.caloriesPer100g * grams / 100;
            totalMacros.protein += normalizedIngredient.proteinPer100g * grams / 100;
            totalMacros.carbs += normalizedIngredient.carbsPer100g * grams / 100;
            totalMacros.fat += normalizedIngredient.fatPer100g * grams / 100;

            normalizedIngredients.push(normalizedIngredient);
        }

        const perServingMacros = {
            calories: roundMacro(totalMacros.calories / servingCount),
            protein: roundMacro(totalMacros.protein / servingCount),
            carbs: roundMacro(totalMacros.carbs / servingCount),
            fat: roundMacro(totalMacros.fat / servingCount)
        };

        const recipeStatus = userRows[0]?.TrustedRecipeCreator
            ? "Approved"
            : "Pending";
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE Recipes
                SET
                    Name = ?,
                    Description = ?,
                    Instructions = ?,
                    Servings = ?,
                    Calories = ?,
                    Protein = ?,
                    Carbs = ?,
                    Fat = ?,
                    Status = ?
                WHERE Id = ?
                AND CreatedBy = ?`,
                [
                    name.trim(),
                    description.trim(),
                    instructions.trim(),
                    servingCount,
                    perServingMacros.calories,
                    perServingMacros.protein,
                    perServingMacros.carbs,
                    perServingMacros.fat,
                    recipeStatus,
                    id,
                    userId
                ]
            );

            await connection.query(
                `DELETE FROM RecipeIngredients
                WHERE RecipeId = ?`,
                [id]
            );

            await connection.query(
                `DELETE FROM RecipeTagLinks
                WHERE RecipeId = ?`,
                [id]
            );

            for (const ingredient of normalizedIngredients) {
                await connection.query(
                    `INSERT INTO RecipeIngredients
                    (RecipeId, FoodId, Name, Grams, CaloriesPer100g, ProteinPer100g, CarbsPer100g, FatPer100g, Source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        ingredient.foodId,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.caloriesPer100g,
                        ingredient.proteinPer100g,
                        ingredient.carbsPer100g,
                        ingredient.fatPer100g,
                        ingredient.source
                    ]
                );
            }

            for (const tagName of normalizedTags) {
                const [tagRows] = await connection.query(
                    `SELECT Id
                    FROM RecipeTags
                    WHERE Name = ?`,
                    [tagName]
                );

                if (tagRows.length > 0) {
                    await connection.query(
                        `INSERT IGNORE INTO RecipeTagLinks
                        (RecipeId, TagId)
                        VALUES (?, ?)`,
                        [id, tagRows[0].Id]
                    );
                }
            }

            await connection.commit();

            return res.status(200).json({
                message: recipeStatus === "Approved"
                    ? "Recipe updated."
                    : "Recipe updated and submitted for admin review.",
                status: recipeStatus,
                macros: perServingMacros
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

const uploadRecipeImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                message: "Choose an image to upload."
            });
        }

        const [recipeRows] = await db.query(
            `SELECT Id
            FROM Recipes
            WHERE Id = ?
            AND CreatedBy = ?`,
            [
                id,
                userId
            ]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        const imageUrl = `/uploads/recipes/${req.file.filename}`;

        await db.query(
            `UPDATE Recipes
            SET ImageUrl = ?
            WHERE Id = ?
            AND CreatedBy = ?`,
            [
                imageUrl,
                id,
                userId
            ]
        );

        return res.status(200).json({
            message: "Recipe image uploaded.",
            imageUrl
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const rateRecipe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const rating = Number(req.body.rating);

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }

        const [recipeRows] = await db.query(
            `SELECT Id
            FROM Recipes
            WHERE Id = ?
            AND ${getRecipeAccessWhere()}`,
            [id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        await db.query(
            `INSERT INTO RecipeRatings
            (RecipeId, UserId, Rating)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                Rating = VALUES(Rating),
                UpdatedAt = CURRENT_TIMESTAMP`,
            [id, userId, rating]
        );

        return res.status(200).json({
            message: "Recipe rating saved."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const reportRecipe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const reason = String(req.body.reason || "").trim();

        if (!reason || reason.length > 255) {
            return res.status(400).json({
                message: "Report reason is required and must stay under 255 characters."
            });
        }

        const [recipeRows] = await db.query(
            `SELECT Id
            FROM Recipes
            WHERE Id = ?
            AND ${getRecipeAccessWhere()}`,
            [id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        await db.query(
            `INSERT INTO RecipeReports
            (RecipeId, UserId, Reason)
            VALUES (?, ?, ?)`,
            [
                id,
                userId,
                reason
            ]
        );

        return res.status(201).json({
            message: "Recipe report submitted."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getMyRecipeReports = async (req, res) => {
    try {
        const userId = req.user.id;

        const [reports] = await db.query(
            `SELECT
                RecipeReports.Id,
                RecipeReports.Reason,
                RecipeReports.Status,
                RecipeReports.AdminResponse,
                RecipeReports.CreatedAt,
                RecipeReports.ReviewedAt,
                Recipes.Name AS RecipeName
            FROM RecipeReports
            JOIN Recipes
                ON RecipeReports.RecipeId = Recipes.Id
            WHERE RecipeReports.UserId = ?
            AND RecipeReports.AdminResponse IS NOT NULL
            AND RecipeReports.ReporterDismissedAt IS NULL
            ORDER BY RecipeReports.ReviewedAt DESC,
                RecipeReports.CreatedAt DESC
            LIMIT 8`,
            [userId]
        );

        return res.status(200).json(reports);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const dismissMyRecipeReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE RecipeReports
            SET ReporterDismissedAt = CURRENT_TIMESTAMP
            WHERE Id = ?
            AND UserId = ?`,
            [
                id,
                userId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Report message not found."
            });
        }

        return res.status(200).json({
            message: "Report message dismissed."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const addRecipeToQuickMeals = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [recipeRows] = await db.query(
            `SELECT Id, Name
            FROM Recipes
            WHERE Id = ?
            AND ${getRecipeAccessWhere()}`,
            [id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        const [ingredients] = await db.query(
            `SELECT
                FoodId,
                Name,
                Grams,
                CaloriesPer100g,
                ProteinPer100g,
                CarbsPer100g,
                FatPer100g
            FROM RecipeIngredients
            WHERE RecipeId = ?
            ORDER BY Id ASC`,
            [id]
        );

        if (ingredients.length === 0) {
            return res.status(400).json({
                message: "Recipe has no ingredients."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [mealResult] = await connection.query(
                `INSERT INTO QuickMeals
                (UserId, Name)
                VALUES (?, ?)`,
                [userId, recipeRows[0].Name]
            );

            const quickMealId = mealResult.insertId;

            for (const ingredient of ingredients) {
                let foodId = ingredient.FoodId;

                if (!foodId) {
                    const [foodResult] = await connection.query(
                        `INSERT INTO Foods
                        (Name, ServingSize, Calories, Protein, Carbs, Fat, CreatedBy, Status)
                        VALUES (?, 100, ?, ?, ?, ?, ?, 'Private')`,
                        [
                            ingredient.Name,
                            ingredient.CaloriesPer100g,
                            ingredient.ProteinPer100g,
                            ingredient.CarbsPer100g,
                            ingredient.FatPer100g,
                            userId
                        ]
                    );

                    foodId = foodResult.insertId;
                }

                await connection.query(
                    `INSERT INTO QuickMealItems
                    (QuickMealId, FoodId, Grams)
                    VALUES (?, ?, ?)`,
                    [
                        quickMealId,
                        foodId,
                        ingredient.Grams
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                message: "Recipe saved to quick meals.",
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

const addRecipeToDiary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [recipeRows] = await db.query(
            `SELECT Id, Name
            FROM Recipes
            WHERE Id = ?
            AND ${getRecipeAccessWhere()}`,
            [id, userId]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        const [ingredients] = await db.query(
            `SELECT
                FoodId,
                Name,
                Grams,
                CaloriesPer100g,
                ProteinPer100g,
                CarbsPer100g,
                FatPer100g
            FROM RecipeIngredients
            WHERE RecipeId = ?
            ORDER BY Id ASC`,
            [id]
        );

        if (ingredients.length === 0) {
            return res.status(400).json({
                message: "Recipe has no ingredients."
            });
        }

        const connection = await db.getConnection();
        const recipeLogId = crypto.randomUUID();

        try {
            await connection.beginTransaction();

            for (const ingredient of ingredients) {
                let foodId = ingredient.FoodId;

                if (!foodId) {
                    const [foodResult] = await connection.query(
                        `INSERT INTO Foods
                        (Name, ServingSize, Calories, Protein, Carbs, Fat, CreatedBy, Status)
                        VALUES (?, 100, ?, ?, ?, ?, ?, 'Private')`,
                        [
                            ingredient.Name,
                            ingredient.CaloriesPer100g,
                            ingredient.ProteinPer100g,
                            ingredient.CarbsPer100g,
                            ingredient.FatPer100g,
                            userId
                        ]
                    );

                    foodId = foodResult.insertId;
                }

                await connection.query(
                    `INSERT INTO MealEntries
                    (UserId, FoodId, Grams, RecipeId, RecipeLogId, RecipeName)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        foodId,
                        ingredient.Grams,
                        id,
                        recipeLogId,
                        recipeRows[0].Name
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                message: "Recipe added to diary.",
                recipeLogId
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
};
