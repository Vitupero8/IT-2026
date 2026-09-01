const db = require("../config/db");

const MAX_WORKOUT_EXERCISES = 50;

const parseNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const getSplitAccessWhere = () => (
    "(WorkoutSplits.CreatedBy = ? OR WorkoutSplits.Status = 'Approved')"
);

const formatSplitRow = (split) => ({
    ...split,
    AverageRating: Number(split.AverageRating || 0),
    RatingCount: Number(split.RatingCount || 0),
    ExerciseCount: Number(split.ExerciseCount || 0),
    AuthorTrusted: Number(split.AuthorTrusted || 0)
});

const getWorkoutSplits = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            search,
            goal,
            difficulty,
            minRating,
            owner = "all",
            sort = "newest"
        } = req.query;

        const where = [owner === "mine" ? "WorkoutSplits.CreatedBy = ?" : "WorkoutSplits.Status = 'Approved'"];
        const params = owner === "mine" ? [userId] : [];
        const having = [];
        const havingParams = [];

        if (search) {
            where.push("WorkoutSplits.Name LIKE ?");
            params.push(`%${search}%`);
        }

        if (goal) {
            where.push("WorkoutSplits.Goal = ?");
            params.push(goal);
        }

        if (difficulty) {
            where.push("WorkoutSplits.Difficulty = ?");
            params.push(difficulty);
        }

        if (minRating !== undefined && minRating !== "") {
            having.push("AverageRating >= ?");
            havingParams.push(parseNumber(minRating));
        }

        const orderBy = {
            rating: "AverageRating DESC, RatingCount DESC, WorkoutSplits.CreatedAt DESC",
            days: "WorkoutSplits.DaysPerWeek ASC, WorkoutSplits.CreatedAt DESC",
            newest: "WorkoutSplits.CreatedAt DESC"
        }[sort] || "WorkoutSplits.CreatedAt DESC";

        const [rows] = await db.query(
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
                Users.FirstName AS AuthorName,
                Users.TrustedRecipeCreator AS AuthorTrusted,
                COALESCE(AVG(WorkoutSplitRatings.Rating), 0) AS AverageRating,
                COUNT(DISTINCT WorkoutSplitRatings.Id) AS RatingCount,
                COUNT(DISTINCT WorkoutSplitExercises.Id) AS ExerciseCount
            FROM WorkoutSplits
            JOIN Users
                ON WorkoutSplits.CreatedBy = Users.Id
            LEFT JOIN WorkoutSplitRatings
                ON WorkoutSplits.Id = WorkoutSplitRatings.SplitId
            LEFT JOIN WorkoutSplitDays
                ON WorkoutSplits.Id = WorkoutSplitDays.SplitId
            LEFT JOIN WorkoutSplitExercises
                ON WorkoutSplitDays.Id = WorkoutSplitExercises.DayId
            WHERE ${where.join(" AND ")}
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
                Users.TrustedRecipeCreator
            ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
            ORDER BY ${orderBy}
            LIMIT 60`,
            [...params, ...havingParams]
        );

        return res.status(200).json(rows.map(formatSplitRow));
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [splitRows] = await db.query(
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
                Users.FirstName AS AuthorName,
                Users.TrustedRecipeCreator AS AuthorTrusted,
                COALESCE(AVG(WorkoutSplitRatings.Rating), 0) AS AverageRating,
                COUNT(DISTINCT WorkoutSplitRatings.Id) AS RatingCount,
                MAX(CASE WHEN WorkoutSplitRatings.UserId = ? THEN WorkoutSplitRatings.Rating END) AS UserRating,
                MAX(CASE WHEN UserWorkoutSplits.UserId = ? THEN 1 ELSE 0 END) AS IsSelected
            FROM WorkoutSplits
            JOIN Users
                ON WorkoutSplits.CreatedBy = Users.Id
            LEFT JOIN WorkoutSplitRatings
                ON WorkoutSplits.Id = WorkoutSplitRatings.SplitId
            LEFT JOIN UserWorkoutSplits
                ON WorkoutSplits.Id = UserWorkoutSplits.SplitId
            WHERE WorkoutSplits.Id = ?
            AND ${getSplitAccessWhere()}
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
                Users.TrustedRecipeCreator`,
            [userId, userId, id, userId]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        const [days] = await db.query(
            `SELECT
                Id,
                DayNumber,
                Name,
                Focus,
                Notes,
                IsRestDay
            FROM WorkoutSplitDays
            WHERE SplitId = ?
            ORDER BY DayNumber ASC`,
            [id]
        );

        const [exercises] = await db.query(
            `SELECT
                WorkoutSplitExercises.Id,
                WorkoutSplitExercises.DayId,
                WorkoutSplitDays.DayNumber,
                WorkoutSplitExercises.ExerciseName,
                WorkoutSplitExercises.MuscleGroup,
                WorkoutSplitExercises.Sets,
                WorkoutSplitExercises.Reps,
                WorkoutSplitExercises.RestSeconds,
                WorkoutSplitExercises.Tempo,
                WorkoutSplitExercises.Notes,
                WorkoutSplitExercises.SortOrder,
                COALESCE(UserWorkoutExerciseProgress.WeightKg, 0) AS WeightKg,
                UserWorkoutExerciseProgress.CustomExerciseName,
                UserWorkoutExerciseProgress.CustomSets,
                UserWorkoutExerciseProgress.CustomNotes,
                COALESCE(NULLIF(UserWorkoutExerciseProgress.CustomExerciseName, ''), WorkoutSplitExercises.ExerciseName) AS DisplayExerciseName,
                COALESCE(NULLIF(UserWorkoutExerciseProgress.CustomSets, ''), WorkoutSplitExercises.Sets) AS DisplaySets,
                COALESCE(UserWorkoutExerciseProgress.CustomNotes, WorkoutSplitExercises.Notes) AS DisplayNotes
            FROM WorkoutSplitExercises
            LEFT JOIN UserWorkoutExerciseProgress
                ON WorkoutSplitExercises.Id = UserWorkoutExerciseProgress.ExerciseId
                AND UserWorkoutExerciseProgress.UserId = ?
            JOIN WorkoutSplitDays
                ON WorkoutSplitExercises.DayId = WorkoutSplitDays.Id
            WHERE WorkoutSplitDays.SplitId = ?
            ORDER BY WorkoutSplitDays.DayNumber ASC,
                WorkoutSplitExercises.SortOrder ASC,
                WorkoutSplitExercises.Id ASC`,
            [userId, id]
        );

        return res.status(200).json({
            split: formatSplitRow(splitRows[0]),
            days,
            exercises
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const createWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            description = "",
            goal = "general_fitness",
            difficulty = "beginner",
            daysPerWeek = 1,
            equipment = "",
            exercises,
            days = []
        } = req.body;

        const allowedGoals = ["strength", "hypertrophy", "fat_loss", "general_fitness", "athletic"];
        const allowedDifficulties = ["beginner", "intermediate", "advanced"];
        const dayCount = Number(daysPerWeek);

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({
                message: "Split name and exercises are required."
            });
        }

        if (!allowedGoals.includes(goal) || !allowedDifficulties.includes(difficulty)) {
            return res.status(400).json({
                message: "Invalid workout split options."
            });
        }

        if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) {
            return res.status(400).json({
                message: "Days per week must be between 1 and 7."
            });
        }

        if (exercises.length > MAX_WORKOUT_EXERCISES) {
            return res.status(400).json({
                message: `Workout splits can have up to ${MAX_WORKOUT_EXERCISES} exercises.`
            });
        }

        const [userRows] = await db.query(
            `SELECT TrustedRecipeCreator
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        const splitStatus = userRows[0]?.TrustedRecipeCreator
            ? "Approved"
            : "Pending";

        const normalizedDays = Array.from({ length: dayCount }, (_, index) => {
            const dayNumber = index + 1;
            const postedDay = Array.isArray(days)
                ? days.find(day => Number(day.dayNumber) === dayNumber)
                : null;

            return {
                dayNumber,
                name: String(postedDay?.name || `Day ${dayNumber}`).trim() || `Day ${dayNumber}`,
                isRestDay: Boolean(postedDay?.isRestDay)
            };
        });

        const restDays = new Set(
            normalizedDays
                .filter(day => day.isRestDay)
                .map(day => day.dayNumber)
        );

        const normalizedExercises = exercises.map((exercise, index) => {
            const dayNumber = Number(exercise.dayNumber || 1);
            const exerciseName = String(exercise.exerciseName || "").trim();
            const sets = String(exercise.sets || "").trim();

            if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > dayCount) {
                throw new Error("Each exercise needs a valid workout day.");
            }

            if (!exerciseName || !sets) {
                throw new Error("Each exercise needs a name and sets.");
            }

            if (restDays.has(dayNumber)) {
                throw new Error("Exercises cannot be assigned to rest days.");
            }

            return {
                dayNumber,
                exerciseName,
                sets,
                reps: String(exercise.reps || "As described").trim(),
                notes: String(exercise.notes || "").trim(),
                sortOrder: index
            };
        });

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO WorkoutSplits
                (CreatedBy, Name, Description, Goal, Difficulty, DaysPerWeek, Equipment, Status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    name.trim(),
                    description.trim(),
                    goal,
                    difficulty,
                    dayCount,
                    equipment.trim(),
                    splitStatus
                ]
            );

            const splitId = result.insertId;
            const dayIds = new Map();

            for (const day of normalizedDays) {
                const [dayResult] = await connection.query(
                    `INSERT INTO WorkoutSplitDays
                    (SplitId, DayNumber, Name, IsRestDay)
                    VALUES (?, ?, ?, ?)`,
                    [
                        splitId,
                        day.dayNumber,
                        day.name,
                        day.isRestDay ? 1 : 0
                    ]
                );
                dayIds.set(day.dayNumber, dayResult.insertId);
            }

            for (const exercise of normalizedExercises) {
                await connection.query(
                    `INSERT INTO WorkoutSplitExercises
                    (DayId, ExerciseName, Sets, Reps, Notes, SortOrder)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        dayIds.get(exercise.dayNumber),
                        exercise.exerciseName,
                        exercise.sets,
                        exercise.reps,
                        exercise.notes,
                        exercise.sortOrder
                    ]
                );
            }

            await connection.commit();

            return res.status(201).json({
                message: splitStatus === "Approved"
                    ? "Workout split published."
                    : "Workout split submitted for admin review.",
                splitId,
                status: splitStatus
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

        const isValidationError = err.message?.startsWith("Each exercise")
            || err.message === "Exercises cannot be assigned to rest days.";

        const message = isValidationError
            ? err.message
            : "Internal server error.";

        return res.status(isValidationError ? 400 : 500).json({
            message
        });
    }
};

const updateWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            name,
            description = "",
            goal = "general_fitness",
            difficulty = "beginner",
            daysPerWeek = 1,
            equipment = "",
            exercises,
            days = []
        } = req.body;

        const allowedGoals = ["strength", "hypertrophy", "fat_loss", "general_fitness", "athletic"];
        const allowedDifficulties = ["beginner", "intermediate", "advanced"];
        const dayCount = Number(daysPerWeek);

        const [splitRows] = await db.query(
            `SELECT Id
            FROM WorkoutSplits
            WHERE Id = ?
            AND CreatedBy = ?`,
            [id, userId]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({
                message: "Split name and exercises are required."
            });
        }

        if (!allowedGoals.includes(goal) || !allowedDifficulties.includes(difficulty)) {
            return res.status(400).json({
                message: "Invalid workout split options."
            });
        }

        if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) {
            return res.status(400).json({
                message: "Days per week must be between 1 and 7."
            });
        }

        if (exercises.length > MAX_WORKOUT_EXERCISES) {
            return res.status(400).json({
                message: `Workout splits can have up to ${MAX_WORKOUT_EXERCISES} exercises.`
            });
        }

        const [userRows] = await db.query(
            `SELECT TrustedRecipeCreator
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        const splitStatus = userRows[0]?.TrustedRecipeCreator
            ? "Approved"
            : "Pending";

        const normalizedDays = Array.from({ length: dayCount }, (_, index) => {
            const dayNumber = index + 1;
            const postedDay = Array.isArray(days)
                ? days.find(day => Number(day.dayNumber ?? day.DayNumber) === dayNumber)
                : null;

            return {
                dayNumber,
                name: String(postedDay?.name || postedDay?.Name || `Day ${dayNumber}`).trim() || `Day ${dayNumber}`,
                isRestDay: Boolean(postedDay?.isRestDay ?? postedDay?.IsRestDay)
            };
        });

        const restDays = new Set(
            normalizedDays
                .filter(day => day.isRestDay)
                .map(day => day.dayNumber)
        );

        const normalizedExercises = exercises.map((exercise, index) => {
            const dayNumber = Number(exercise.dayNumber ?? exercise.DayNumber ?? 1);
            const exerciseName = String(exercise.exerciseName || exercise.ExerciseName || "").trim();
            const sets = String(exercise.sets || exercise.Sets || "").trim();

            if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > dayCount) {
                throw new Error("Each exercise needs a valid workout day.");
            }

            if (!exerciseName || !sets) {
                throw new Error("Each exercise needs a name and sets.");
            }

            if (restDays.has(dayNumber)) {
                throw new Error("Exercises cannot be assigned to rest days.");
            }

            return {
                dayNumber,
                exerciseName,
                sets,
                reps: String(exercise.reps || exercise.Reps || "As described").trim(),
                notes: String(exercise.notes || exercise.Notes || "").trim(),
                sortOrder: index
            };
        });

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE WorkoutSplits
                SET
                    Name = ?,
                    Description = ?,
                    Goal = ?,
                    Difficulty = ?,
                    DaysPerWeek = ?,
                    Equipment = ?,
                    Status = ?
                WHERE Id = ?
                AND CreatedBy = ?`,
                [
                    name.trim(),
                    description.trim(),
                    goal,
                    difficulty,
                    dayCount,
                    equipment.trim(),
                    splitStatus,
                    id,
                    userId
                ]
            );

            await connection.query(
                `DELETE WorkoutSplitExercises
                FROM WorkoutSplitExercises
                JOIN WorkoutSplitDays
                    ON WorkoutSplitExercises.DayId = WorkoutSplitDays.Id
                WHERE WorkoutSplitDays.SplitId = ?`,
                [id]
            );

            await connection.query(
                `DELETE FROM WorkoutSplitDays
                WHERE SplitId = ?`,
                [id]
            );

            const dayIds = new Map();

            for (const day of normalizedDays) {
                const [dayResult] = await connection.query(
                    `INSERT INTO WorkoutSplitDays
                    (SplitId, DayNumber, Name, IsRestDay)
                    VALUES (?, ?, ?, ?)`,
                    [
                        id,
                        day.dayNumber,
                        day.name,
                        day.isRestDay ? 1 : 0
                    ]
                );
                dayIds.set(day.dayNumber, dayResult.insertId);
            }

            for (const exercise of normalizedExercises) {
                await connection.query(
                    `INSERT INTO WorkoutSplitExercises
                    (DayId, ExerciseName, Sets, Reps, Notes, SortOrder)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        dayIds.get(exercise.dayNumber),
                        exercise.exerciseName,
                        exercise.sets,
                        exercise.reps,
                        exercise.notes,
                        exercise.sortOrder
                    ]
                );
            }

            await connection.commit();

            return res.status(200).json({
                message: splitStatus === "Approved"
                    ? "Workout split updated and published."
                    : "Workout split updated and submitted for admin review.",
                status: splitStatus
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

        const isValidationError = err.message?.startsWith("Each exercise")
            || err.message === "Exercises cannot be assigned to rest days.";

        return res.status(isValidationError ? 400 : 500).json({
            message: isValidationError ? err.message : "Internal server error."
        });
    }
};

const rateWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const rating = Number(req.body.rating);

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }

        const [splitRows] = await db.query(
            `SELECT Id
            FROM WorkoutSplits
            WHERE Id = ?
            AND ${getSplitAccessWhere()}`,
            [id, userId]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        await db.query(
            `INSERT INTO WorkoutSplitRatings
            (SplitId, UserId, Rating)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                Rating = VALUES(Rating),
                UpdatedAt = CURRENT_TIMESTAMP`,
            [id, userId, rating]
        );

        return res.status(200).json({
            message: "Workout split rating saved."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const reportWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const reason = String(req.body.reason || "").trim();

        if (!reason || reason.length > 255) {
            return res.status(400).json({
                message: "Report reason is required and must stay under 255 characters."
            });
        }

        const [splitRows] = await db.query(
            `SELECT Id
            FROM WorkoutSplits
            WHERE Id = ?
            AND ${getSplitAccessWhere()}`,
            [id, userId]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        await db.query(
            `INSERT INTO WorkoutSplitReports
            (SplitId, UserId, Reason)
            VALUES (?, ?, ?)`,
            [
                id,
                userId,
                reason
            ]
        );

        return res.status(201).json({
            message: "Workout split report submitted."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const selectWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const [splitRows] = await db.query(
            `SELECT Id
            FROM WorkoutSplits
            WHERE Id = ?
            AND ${getSplitAccessWhere()}`,
            [id, userId]
        );

        if (splitRows.length === 0) {
            return res.status(404).json({
                message: "Workout split not found."
            });
        }

        await db.query(
            `INSERT INTO UserWorkoutSplits
            (UserId, SplitId)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                SplitId = VALUES(SplitId),
                SelectedAt = CURRENT_TIMESTAMP`,
            [userId, id]
        );

        return res.status(200).json({
            message: "Workout split selected."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getMyWorkoutSplit = async (req, res) => {
    try {
        const userId = req.user.id;

        const [selectedRows] = await db.query(
            `SELECT SplitId
            FROM UserWorkoutSplits
            WHERE UserId = ?`,
            [userId]
        );

        if (selectedRows.length === 0) {
            return res.status(200).json(null);
        }

        req.params.id = selectedRows[0].SplitId;
        return getWorkoutSplit(req, res);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateSelectedExercise = async (req, res) => {
    try {
        const userId = req.user.id;
        const { exerciseId } = req.params;
        const weightKg = parseNumber(req.body.weightKg);
        const exerciseName = req.body.exerciseName === undefined
            ? null
            : String(req.body.exerciseName || "").trim();
        const sets = req.body.sets === undefined
            ? null
            : String(req.body.sets || "").trim();
        const notes = req.body.notes === undefined
            ? null
            : String(req.body.notes || "").trim();

        if (weightKg < 0) {
            return res.status(400).json({
                message: "Weight must be zero or higher."
            });
        }

        if (exerciseName !== null && !exerciseName) {
            return res.status(400).json({
                message: "Exercise name cannot be empty."
            });
        }

        if (sets !== null && !sets) {
            return res.status(400).json({
                message: "Sets cannot be empty."
            });
        }

        const [exerciseRows] = await db.query(
            `SELECT
                WorkoutSplitExercises.Id,
                WorkoutSplitExercises.ExerciseName,
                WorkoutSplitExercises.Sets,
                WorkoutSplitExercises.Notes
            FROM WorkoutSplitExercises
            JOIN WorkoutSplitDays
                ON WorkoutSplitExercises.DayId = WorkoutSplitDays.Id
            JOIN UserWorkoutSplits
                ON WorkoutSplitDays.SplitId = UserWorkoutSplits.SplitId
            WHERE WorkoutSplitExercises.Id = ?
            AND UserWorkoutSplits.UserId = ?`,
            [
                exerciseId,
                userId
            ]
        );

        if (exerciseRows.length === 0) {
            return res.status(404).json({
                message: "Exercise not found on your selected split."
            });
        }

        await db.query(
            `INSERT INTO UserWorkoutExerciseProgress
            (UserId, ExerciseId, WeightKg, CustomExerciseName, CustomSets, CustomNotes)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                WeightKg = VALUES(WeightKg),
                CustomExerciseName = VALUES(CustomExerciseName),
                CustomSets = VALUES(CustomSets),
                CustomNotes = VALUES(CustomNotes),
                UpdatedAt = CURRENT_TIMESTAMP`,
            [
                userId,
                exerciseId,
                weightKg,
                exerciseName ?? exerciseRows[0].ExerciseName,
                sets ?? exerciseRows[0].Sets,
                notes ?? exerciseRows[0].Notes
            ]
        );

        return res.status(200).json({
            message: "Exercise updated."
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
    getWorkoutSplits,
    getWorkoutSplit,
    createWorkoutSplit,
    updateWorkoutSplit,
    rateWorkoutSplit,
    reportWorkoutSplit,
    selectWorkoutSplit,
    getMyWorkoutSplit,
    updateSelectedExercise
};
