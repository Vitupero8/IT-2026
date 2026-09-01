const db = require("../config/db");

const recordAdminAction = async (adminId, action, entityType, entityId, details = "") => {
    try {
        await db.query(
            `INSERT INTO AdminAuditLogs
            (AdminId, Action, EntityType, EntityId, Details)
            VALUES (?, ?, ?, ?, ?)`,
            [
                adminId || null,
                action,
                entityType,
                entityId || null,
                details || null
            ]
        );
    }
    catch (err) {
        console.error("Failed to record admin action:", err.message);
    }
};

const createModerationNotification = async (userId, entityType, entityId, entityName, status, adminMessage = "") => {
    if (!userId) return;

    await db.query(
        `INSERT INTO ModerationNotifications
        (UserId, EntityType, EntityId, EntityName, Status, AdminMessage)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userId,
            entityType,
            entityId,
            entityName,
            status,
            adminMessage || null
        ]
    );
};

const getPendingFoods = async (req, res) => {
    try {
        const [foods] = await db.query(
            `SELECT
                Foods.Id,
                Foods.Name,
                Foods.ServingSize,
                Foods.Calories,
                Foods.Protein,
                Foods.Carbs,
                Foods.Fat,
                Foods.Status,
                Foods.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email
            FROM Foods
            JOIN Users
                ON Foods.CreatedBy = Users.Id
            WHERE Foods.Status = 'Pending'
            ORDER BY Foods.CreatedAt ASC`
        );

        return res.status(200).json(foods);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateFoodStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminMessage = ""
        } = req.body;
        const allowedStatuses = ["Approved", "Private"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid food status."
            });
        }

        const [foodRows] = await db.query(
            `SELECT Id, CreatedBy, Name
            FROM Foods
            WHERE Id = ?`,
            [id]
        );

        if (foodRows.length === 0) {
            return res.status(404).json({
                message: "Food not found."
            });
        }

        await db.query(
            `UPDATE Foods
            SET Status = ?
            WHERE Id = ?`,
            [
                status,
                id
            ]
        );

        await recordAdminAction(
            req.user.id,
            status === "Approved" ? "food_approved" : "food_rejected",
            "Food",
            id
        );
        await createModerationNotification(
            foodRows[0].CreatedBy,
            "Food",
            id,
            foodRows[0].Name,
            status === "Approved" ? "Approved" : "Rejected",
            adminMessage
        );

        return res.status(200).json({
            message: "Food status updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getPendingRecipes = async (req, res) => {
    try {
        const [recipes] = await db.query(
            `SELECT
                Recipes.Id,
                Recipes.CreatedBy,
                Recipes.Name,
                Recipes.Description,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email,
                Users.TrustedRecipeCreator,
                Users.ModerationNote,
                COUNT(RecipeIngredients.Id) AS IngredientCount,
                COALESCE(SUM(RecipeIngredients.CaloriesPer100g * RecipeIngredients.Grams / 100) / NULLIF(Recipes.Servings, 0), 0) AS IngredientCalories,
                COALESCE(SUM(RecipeIngredients.ProteinPer100g * RecipeIngredients.Grams / 100) / NULLIF(Recipes.Servings, 0), 0) AS IngredientProtein,
                COALESCE(SUM(RecipeIngredients.CarbsPer100g * RecipeIngredients.Grams / 100) / NULLIF(Recipes.Servings, 0), 0) AS IngredientCarbs,
                COALESCE(SUM(RecipeIngredients.FatPer100g * RecipeIngredients.Grams / 100) / NULLIF(Recipes.Servings, 0), 0) AS IngredientFat
            FROM Recipes
            JOIN Users
                ON Recipes.CreatedBy = Users.Id
            LEFT JOIN RecipeIngredients
                ON Recipes.Id = RecipeIngredients.RecipeId
            WHERE Recipes.Status = 'Pending'
            GROUP BY
                Recipes.Id,
                Recipes.CreatedBy,
                Recipes.Name,
                Recipes.Description,
                Recipes.Servings,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Recipes.Status,
                Recipes.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email,
                Users.TrustedRecipeCreator,
                Users.ModerationNote
            ORDER BY Recipes.CreatedAt ASC`
        );

        return res.status(200).json(recipes);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateRecipeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminMessage = ""
        } = req.body;
        const allowedStatuses = ["Approved", "Rejected"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid recipe status."
            });
        }

        const [recipeRows] = await db.query(
            `SELECT Id, CreatedBy, Name
            FROM Recipes
            WHERE Id = ?`,
            [id]
        );

        if (recipeRows.length === 0) {
            return res.status(404).json({
                message: "Recipe not found."
            });
        }

        await db.query(
            `UPDATE Recipes
            SET Status = ?
            WHERE Id = ?`,
            [
                status,
                id
            ]
        );

        await recordAdminAction(req.user.id, `recipe_${status.toLowerCase()}`, "Recipe", id);
        await createModerationNotification(
            recipeRows[0].CreatedBy,
            "Recipe",
            id,
            recipeRows[0].Name,
            status,
            adminMessage
        );

        return res.status(200).json({
            message: "Recipe status updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getPendingWorkoutSplits = async (req, res) => {
    try {
        const [splits] = await db.query(
            `SELECT
                WorkoutSplits.Id,
                WorkoutSplits.CreatedBy,
                WorkoutSplits.Name,
                WorkoutSplits.Description,
                WorkoutSplits.Goal,
                WorkoutSplits.Difficulty,
                WorkoutSplits.DaysPerWeek,
                WorkoutSplits.Equipment,
                WorkoutSplits.Status,
                WorkoutSplits.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email,
                COUNT(WorkoutSplitExercises.Id) AS ExerciseCount
            FROM WorkoutSplits
            JOIN Users
                ON WorkoutSplits.CreatedBy = Users.Id
            LEFT JOIN WorkoutSplitDays
                ON WorkoutSplits.Id = WorkoutSplitDays.SplitId
            LEFT JOIN WorkoutSplitExercises
                ON WorkoutSplitDays.Id = WorkoutSplitExercises.DayId
            WHERE WorkoutSplits.Status = 'Pending'
            GROUP BY
                WorkoutSplits.Id,
                WorkoutSplits.CreatedBy,
                WorkoutSplits.Name,
                WorkoutSplits.Description,
                WorkoutSplits.Goal,
                WorkoutSplits.Difficulty,
                WorkoutSplits.DaysPerWeek,
                WorkoutSplits.Equipment,
                WorkoutSplits.Status,
                WorkoutSplits.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email
            ORDER BY WorkoutSplits.CreatedAt ASC`
        );

        return res.status(200).json(splits);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateWorkoutSplitStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminMessage = ""
        } = req.body;
        const allowedStatuses = ["Approved", "Rejected"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid workout split status."
            });
        }

        const [splitRows] = await db.query(
            `SELECT Id, CreatedBy, Name
            FROM WorkoutSplits
            WHERE Id = ?`,
            [id]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        await db.query(
            `UPDATE WorkoutSplits
            SET Status = ?
            WHERE Id = ?`,
            [
                status,
                id
            ]
        );

        await recordAdminAction(req.user.id, `workout_split_${status.toLowerCase()}`, "WorkoutSplit", id);
        await createModerationNotification(
            splitRows[0].CreatedBy,
            "WorkoutSplit",
            id,
            splitRows[0].Name,
            status,
            adminMessage
        );

        return res.status(200).json({
            message: "Workout split status updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT
                Id,
                FirstName,
                LastName,
                Email,
                Role,
                RecipePostingBlocked,
                ModerationNote,
                TrustedRecipeCreator,
                IsBanned,
                BanExpiresAt,
                ProfileImageUrl,
                CreatedAt
            FROM Users
            ORDER BY CreatedAt DESC`
        );

        return res.status(200).json(users);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateUserModeration = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            recipePostingBlocked = false,
            isBanned = false,
            banExpiresAt = null,
            moderationNote = "",
            moderationAction = ""
        } = req.body;
        const shouldUpdateBan = Object.prototype.hasOwnProperty.call(req.body, "isBanned");

        const [result] = await db.query(
            `UPDATE Users
            SET
                RecipePostingBlocked = ?,
                IsBanned = CASE WHEN ? THEN ? ELSE IsBanned END,
                BanExpiresAt = CASE WHEN ? THEN ? ELSE BanExpiresAt END,
                ModerationNote = ?
            WHERE Id = ?`,
            [
                recipePostingBlocked ? 1 : 0,
                shouldUpdateBan ? 1 : 0,
                isBanned ? 1 : 0,
                shouldUpdateBan ? 1 : 0,
                isBanned ? banExpiresAt : null,
                moderationNote || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        let action = recipePostingBlocked
            ? "user_recipe_blocked"
            : "user_recipe_unblocked";

        if (moderationAction === "warn") {
            action = "user_warned";
        }

        if (moderationAction === "ban") {
            action = isBanned
                ? "user_banned"
                : "user_unbanned";
        }

        await recordAdminAction(req.user.id, action, "User", id, moderationNote);

        return res.status(200).json({
            message: "User moderation updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateUserTrust = async (req, res) => {
    try {
        const { id } = req.params;
        const { trustedRecipeCreator = false } = req.body;

        const [result] = await db.query(
            `UPDATE Users
            SET TrustedRecipeCreator = ?
            WHERE Id = ?`,
            [
                trustedRecipeCreator ? 1 : 0,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        await recordAdminAction(
            req.user.id,
            trustedRecipeCreator ? "user_trusted" : "user_untrusted",
            "User",
            id
        );

        return res.status(200).json({
            message: "User trust updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const permanentlyBanUser = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const targetId = Number(id);

        if (targetId === Number(req.user.id)) {
            return res.status(400).json({
                message: "You cannot permanently delete your own admin account."
            });
        }

        const [userRows] = await connection.query(
            `SELECT Id, Email, FirstName, LastName
            FROM Users
            WHERE Id = ?`,
            [targetId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const user = userRows[0];

        await connection.beginTransaction();

        const [foodRows] = await connection.query(
            `SELECT Id
            FROM Foods
            WHERE CreatedBy = ?`,
            [targetId]
        );
        const foodIds = foodRows.map(food => food.Id);

        const [recipeRows] = await connection.query(
            `SELECT Id
            FROM Recipes
            WHERE CreatedBy = ?`,
            [targetId]
        );
        const recipeIds = recipeRows.map(recipe => recipe.Id);

        const [quickMealRows] = await connection.query(
            `SELECT Id
            FROM QuickMeals
            WHERE UserId = ?`,
            [targetId]
        );
        const quickMealIds = quickMealRows.map(meal => meal.Id);

        await connection.query(
            `DELETE FROM MealEntries
            WHERE UserId = ?`,
            [targetId]
        );

        if (foodIds.length > 0) {
            await connection.query(
                `DELETE FROM MealEntries
                WHERE FoodId IN (?)`,
                [foodIds]
            );

            await connection.query(
                `DELETE FROM QuickMealItems
                WHERE FoodId IN (?)`,
                [foodIds]
            );

            await connection.query(
                `UPDATE RecipeIngredients
                SET FoodId = NULL
                WHERE FoodId IN (?)`,
                [foodIds]
            );
        }

        if (recipeIds.length > 0) {
            await connection.query(
                `DELETE FROM MealEntries
                WHERE RecipeId IN (?)`,
                [recipeIds]
            );
        }

        if (quickMealIds.length > 0) {
            await connection.query(
                `DELETE FROM MealEntries
                WHERE QuickMealId IN (?)`,
                [quickMealIds]
            );
        }

        await connection.query(
            `DELETE FROM Foods
            WHERE CreatedBy = ?`,
            [targetId]
        );

        await connection.query(
            `DELETE FROM PasswordResetRequests
            WHERE UserId = ?
            OR Email = ?`,
            [
                targetId,
                user.Email
            ]
        );

        await connection.query(
            `DELETE FROM Users
            WHERE Id = ?`,
            [targetId]
        );

        await connection.query(
            `INSERT INTO AdminAuditLogs
            (AdminId, Action, EntityType, EntityId, Details)
            VALUES (?, 'user_permanently_banned', 'User', ?, ?)`,
            [
                req.user.id,
                targetId,
                `${user.FirstName} ${user.LastName} (${user.Email}) was permanently banned and deleted.`
            ]
        );

        await connection.commit();

        return res.status(200).json({
            message: "User permanently banned and deleted."
        });
    }
    catch (err) {
        await connection.rollback();
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
    finally {
        connection.release();
    }
};

const getPasswordResetRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT
                PasswordResetRequests.Id,
                PasswordResetRequests.UserId,
                PasswordResetRequests.Email,
                PasswordResetRequests.Status,
                PasswordResetRequests.AdminResponse,
                PasswordResetRequests.CreatedAt,
                PasswordResetRequests.ReviewedAt,
                Users.FirstName,
                Users.LastName,
                Users.Role,
                Users.IsBanned
            FROM PasswordResetRequests
            LEFT JOIN Users
                ON PasswordResetRequests.UserId = Users.Id
            WHERE PasswordResetRequests.Status = 'Open'
            ORDER BY PasswordResetRequests.CreatedAt DESC`
        );

        return res.status(200).json(requests);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updatePasswordResetRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminResponse = ""
        } = req.body;
        const allowedStatuses = ["Reviewed", "Dismissed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid password reset request status."
            });
        }

        const [requestRows] = await db.query(
            `SELECT Id, UserId, Email, RequestedPasswordHash
            FROM PasswordResetRequests
            WHERE Id = ?`,
            [id]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({
                message: "Password reset request not found."
            });
        }

        const request = requestRows[0];

        if (status === "Reviewed") {
            if (!request.UserId || !request.RequestedPasswordHash) {
                return res.status(400).json({
                    message: "This request cannot be applied because no matching user or password was found."
                });
            }

            await db.query(
                `UPDATE Users
                SET PasswordHash = ?
                WHERE Id = ?`,
                [
                    request.RequestedPasswordHash,
                    request.UserId
                ]
            );
        }

        const [result] = await db.query(
            `UPDATE PasswordResetRequests
            SET
                Status = ?,
                AdminResponse = ?,
                ReviewedAt = CURRENT_TIMESTAMP
            WHERE Id = ?`,
            [
                status,
                adminResponse || null,
                id
            ]
        );

        await recordAdminAction(
            req.user.id,
            `password_reset_${status.toLowerCase()}`,
            "PasswordResetRequest",
            id,
            adminResponse
        );

        return res.status(200).json({
            message: "Password reset request updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getRecipeReports = async (req, res) => {
    try {
        const [reports] = await db.query(
            `SELECT
                RecipeReports.Id,
                RecipeReports.RecipeId,
                RecipeReports.UserId,
                RecipeReports.Reason,
                RecipeReports.Status,
                RecipeReports.AdminResponse,
                RecipeReports.CreatedAt,
                RecipeReports.ReviewedAt,
                Recipes.Name AS RecipeName,
                Recipes.Status AS RecipeStatus,
                Recipes.CreatedBy AS RecipeAuthorId,
                Recipes.Calories,
                Recipes.Protein,
                Recipes.Carbs,
                Recipes.Fat,
                Reporter.FirstName AS ReporterFirstName,
                Reporter.LastName AS ReporterLastName,
                Reporter.Email AS ReporterEmail,
                Author.FirstName AS AuthorFirstName,
                Author.LastName AS AuthorLastName,
                Author.Email AS AuthorEmail,
                Author.RecipePostingBlocked AS AuthorRecipePostingBlocked,
                Author.TrustedRecipeCreator AS AuthorTrusted
            FROM RecipeReports
            JOIN Recipes
                ON RecipeReports.RecipeId = Recipes.Id
            JOIN Users AS Reporter
                ON RecipeReports.UserId = Reporter.Id
            JOIN Users AS Author
                ON Recipes.CreatedBy = Author.Id
            WHERE RecipeReports.Status = 'Open'
            ORDER BY RecipeReports.CreatedAt DESC`
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

const updateRecipeReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminResponse = ""
        } = req.body;
        const allowedStatuses = ["Open", "Reviewed", "Dismissed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid report status."
            });
        }

        const [result] = await db.query(
            `UPDATE RecipeReports
            SET
                Status = ?,
                AdminResponse = ?,
                ReviewedAt = CASE WHEN ? = 'Reviewed' THEN CURRENT_TIMESTAMP ELSE ReviewedAt END
            WHERE Id = ?`,
            [
                status,
                adminResponse || null,
                status,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Report not found."
            });
        }

        await recordAdminAction(req.user.id, `report_${status.toLowerCase()}`, "RecipeReport", id, adminResponse);

        return res.status(200).json({
            message: "Report updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getWorkoutSplitReports = async (req, res) => {
    try {
        const [reports] = await db.query(
            `SELECT
                WorkoutSplitReports.Id,
                WorkoutSplitReports.SplitId,
                WorkoutSplitReports.UserId,
                WorkoutSplitReports.Reason,
                WorkoutSplitReports.Status,
                WorkoutSplitReports.AdminResponse,
                WorkoutSplitReports.CreatedAt,
                WorkoutSplitReports.ReviewedAt,
                WorkoutSplits.Name AS SplitName,
                WorkoutSplits.Status AS SplitStatus,
                WorkoutSplits.CreatedBy AS SplitAuthorId,
                Reporter.FirstName AS ReporterFirstName,
                Reporter.LastName AS ReporterLastName,
                Reporter.Email AS ReporterEmail,
                Author.FirstName AS AuthorFirstName,
                Author.LastName AS AuthorLastName,
                Author.Email AS AuthorEmail
            FROM WorkoutSplitReports
            JOIN WorkoutSplits
                ON WorkoutSplitReports.SplitId = WorkoutSplits.Id
            JOIN Users AS Reporter
                ON WorkoutSplitReports.UserId = Reporter.Id
            JOIN Users AS Author
                ON WorkoutSplits.CreatedBy = Author.Id
            WHERE WorkoutSplitReports.Status = 'Open'
            ORDER BY WorkoutSplitReports.CreatedAt DESC`
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

const updateWorkoutSplitReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            adminResponse = ""
        } = req.body;
        const allowedStatuses = ["Open", "Reviewed", "Dismissed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid report status."
            });
        }

        const [result] = await db.query(
            `UPDATE WorkoutSplitReports
            SET
                Status = ?,
                AdminResponse = ?,
                ReviewedAt = CASE WHEN ? = 'Reviewed' THEN CURRENT_TIMESTAMP ELSE ReviewedAt END
            WHERE Id = ?`,
            [
                status,
                adminResponse || null,
                status,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Report not found."
            });
        }

        await recordAdminAction(req.user.id, `workout_report_${status.toLowerCase()}`, "WorkoutSplitReport", id, adminResponse);

        return res.status(200).json({
            message: "Workout split report updated."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getAdminAuditLogs = async (req, res) => {
    try {
        const [logs] = await db.query(
            `SELECT
                AdminAuditLogs.Id,
                AdminAuditLogs.Action,
                AdminAuditLogs.EntityType,
                AdminAuditLogs.EntityId,
                AdminAuditLogs.Details,
                AdminAuditLogs.CreatedAt,
                Users.FirstName,
                Users.LastName,
                Users.Email,
                COALESCE(
                    TargetUser.FirstName,
                    FoodUser.FirstName,
                    RecipeUser.FirstName,
                    WorkoutSplitUser.FirstName,
                    RecipeReporter.FirstName,
                    WorkoutReporter.FirstName
                ) AS TargetFirstName,
                COALESCE(
                    TargetUser.LastName,
                    FoodUser.LastName,
                    RecipeUser.LastName,
                    WorkoutSplitUser.LastName,
                    RecipeReporter.LastName,
                    WorkoutReporter.LastName
                ) AS TargetLastName,
                COALESCE(
                    TargetUser.Email,
                    FoodUser.Email,
                    RecipeUser.Email,
                    WorkoutSplitUser.Email,
                    RecipeReporter.Email,
                    WorkoutReporter.Email
                ) AS TargetEmail
            FROM AdminAuditLogs
            LEFT JOIN Users
                ON AdminAuditLogs.AdminId = Users.Id
            LEFT JOIN Users AS TargetUser
                ON AdminAuditLogs.EntityType = 'User'
                AND AdminAuditLogs.EntityId = TargetUser.Id
            LEFT JOIN Foods
                ON AdminAuditLogs.EntityType = 'Food'
                AND AdminAuditLogs.EntityId = Foods.Id
            LEFT JOIN Users AS FoodUser
                ON Foods.CreatedBy = FoodUser.Id
            LEFT JOIN Recipes
                ON AdminAuditLogs.EntityType = 'Recipe'
                AND AdminAuditLogs.EntityId = Recipes.Id
            LEFT JOIN Users AS RecipeUser
                ON Recipes.CreatedBy = RecipeUser.Id
            LEFT JOIN WorkoutSplits
                ON AdminAuditLogs.EntityType = 'WorkoutSplit'
                AND AdminAuditLogs.EntityId = WorkoutSplits.Id
            LEFT JOIN Users AS WorkoutSplitUser
                ON WorkoutSplits.CreatedBy = WorkoutSplitUser.Id
            LEFT JOIN RecipeReports
                ON AdminAuditLogs.EntityType = 'RecipeReport'
                AND AdminAuditLogs.EntityId = RecipeReports.Id
            LEFT JOIN Users AS RecipeReporter
                ON RecipeReports.UserId = RecipeReporter.Id
            LEFT JOIN WorkoutSplitReports
                ON AdminAuditLogs.EntityType = 'WorkoutSplitReport'
                AND AdminAuditLogs.EntityId = WorkoutSplitReports.Id
            LEFT JOIN Users AS WorkoutReporter
                ON WorkoutSplitReports.UserId = WorkoutReporter.Id
            ORDER BY AdminAuditLogs.CreatedAt DESC
            LIMIT 100`
        );

        return res.status(200).json(logs);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

module.exports = {
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
};
