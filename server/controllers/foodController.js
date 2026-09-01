const db = require("../config/db");

const postFood = async (req, res) => {

    try {

        const {
            name,
            servingSize,
            calories,
            protein,
            carbs,
            fat,
            isPublic
        } = req.body;

        const createdBy = req.user.id;

        if (
            !name ||
            servingSize == null ||
            calories == null ||
            protein == null ||
            carbs == null ||
            fat == null
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        const status = isPublic
            ? "Pending"
            : "Private";

        const [result] = await db.query(
            `INSERT INTO Foods
            (
                Name,
                ServingSize,
                Calories,
                Protein,
                Carbs,
                Fat,
                CreatedBy,
                Status
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                servingSize,
                calories,
                protein,
                carbs,
                fat,
                createdBy,
                status
            ]
        );

        return res.status(201).json({
            message: "Food created successfully.",
            foodId: result.insertId
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });

    }

};

const getFoods = async (req, res) => {

    try {

        const userId = req.user.id;
        const scope = req.query.scope || "all";

        let whereClause = "(CreatedBy = ? OR Status = 'Approved') AND DeletedAt IS NULL";
        let whereParams = [userId];

        if (scope === "mine") {
            whereClause = "CreatedBy = ? AND DeletedAt IS NULL";
            whereParams = [userId];
        }

        if (scope === "public") {
            whereClause = "Status = 'Approved' AND DeletedAt IS NULL";
            whereParams = [];
        }

        const [foods] = await db.query(
            `SELECT
                Foods.*,
                CASE
                    WHEN CreatedBy = ? THEN 'mine'
                    ELSE 'public'
                END AS Scope
             FROM Foods
             WHERE ${whereClause}
             ORDER BY Name ASC`,
            [
                userId,
                ...whereParams
            ]
        );

        return res.status(200).json(foods);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });

    }

};

const copyFood = async (req, res) => {

    try {

        const userId = req.user.id;
        const { id } = req.params;

        const [foodRows] = await db.query(
            `SELECT
                Name,
                ServingSize,
                Calories,
                Protein,
                Carbs,
                Fat
            FROM Foods
            WHERE Id = ?
            AND Status = 'Approved'
            AND DeletedAt IS NULL
            AND CreatedBy <> ?`,
            [
                id,
                userId
            ]
        );

        if (foodRows.length === 0) {
            return res.status(404).json({
                message: "Public food not found."
            });
        }

        const food = foodRows[0];
        const [result] = await db.query(
            `INSERT INTO Foods
            (Name, ServingSize, Calories, Protein, Carbs, Fat, CreatedBy, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Private')`,
            [
                food.Name,
                food.ServingSize,
                food.Calories,
                food.Protein,
                food.Carbs,
                food.Fat,
                userId
            ]
        );

        return res.status(201).json({
            message: "Food copied to your database.",
            foodId: result.insertId
        });

    }
    catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });

    }

};

const updateFood = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            servingSize,
            calories,
            protein,
            carbs,
            fat,
            isPublic
        } = req.body;

        const createdBy = req.user.id;

        const status = isPublic
            ? "Pending"
            : "Private";

        const [result] = await db.query(
            `UPDATE Foods
             SET
                Name = ?,
                ServingSize = ?,
                Calories = ?,
                Protein = ?,
                Carbs = ?,
                Fat = ?,
                Status = ?
             WHERE
                Id = ?
             AND
                CreatedBy = ?
             AND
                DeletedAt IS NULL`,
            [
                name,
                servingSize,
                calories,
                protein,
                carbs,
                fat,
                status,
                id,
                createdBy
            ]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Food not found."
            });

        }

        return res.status(200).json({
            message: "Food updated successfully."
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });

    }

};

const deleteFood = async (req, res) => {

    try {

        const { id } = req.params;
        const confirmDiaryDelete = req.query.confirmDiaryDelete === "true";

        const createdBy = req.user.id;

        const [foodRows] = await db.query(
            `SELECT Id, Name
            FROM Foods
            WHERE Id = ?
            AND CreatedBy = ?
            AND DeletedAt IS NULL`,
            [
                id,
                createdBy
            ]
        );

        if (foodRows.length === 0) {

            return res.status(404).json({
                message: "Food not found."
            });

        }

        const [[usage]] = await db.query(
            `SELECT
                COUNT(*) AS DiaryEntryCount,
                SUM(CASE WHEN DATE(LoggedAt) = CURDATE() THEN 1 ELSE 0 END) AS TodayDiaryEntryCount
            FROM MealEntries
            WHERE UserId = ?
            AND FoodId = ?`,
            [
                createdBy,
                id
            ]
        );

        const todayDiaryEntryCount = Number(usage.TodayDiaryEntryCount || 0);
        const diaryEntryCount = Number(usage.DiaryEntryCount || 0);

        if (todayDiaryEntryCount > 0 && !confirmDiaryDelete) {
            return res.status(409).json({
                message: `${foodRows[0].Name} is in today's diary. If you continue, it will be removed from today's food diary.`,
                requiresConfirmation: true,
                todayDiaryEntryCount,
                diaryEntryCount
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            if (confirmDiaryDelete) {
                await connection.query(
                    `DELETE FROM MealEntries
                    WHERE UserId = ?
                    AND FoodId = ?
                    AND DATE(LoggedAt) = CURDATE()`,
                    [
                        createdBy,
                        id
                    ]
                );
            }

            await connection.query(
                `UPDATE Foods
                SET DeletedAt = CURRENT_TIMESTAMP
                WHERE Id = ?
                AND CreatedBy = ?`,
                [
                    id,
                    createdBy
                ]
            );

            await connection.commit();
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }

        return res.status(200).json({
            message: "Food deleted successfully."
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });

    }

};

module.exports = {
    postFood,
    getFoods,
    copyFood,
    updateFood,
    deleteFood
};
