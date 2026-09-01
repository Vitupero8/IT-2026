const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            age,
            height,
            currentWeight
        } = req.body;

        if (
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !age ||
            !height ||
            !currentWeight
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        const [results] = await db.query(
            "SELECT * FROM Users WHERE Email = ?",
            [email]
        );

        if (results.length > 0) {
            return res.status(400).json({
                message: "Email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO Users
            (FirstName, LastName, Email, PasswordHash, Role, Age, Height, CurrentWeight)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                firstName,
                lastName,
                email,
                hashedPassword,
                "client",
                age,
                height,
                currentWeight
            ]
        );

        return res.status(201).json({
            message: "User registered successfully!"
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const [results] = await db.query(
            "SELECT * FROM Users WHERE Email = ?",
            [email]
        );

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (results[0].IsBanned && results[0].BanExpiresAt && new Date(results[0].BanExpiresAt) <= new Date()) {
            await db.query(
                `UPDATE Users
                SET IsBanned = 0,
                    BanExpiresAt = NULL,
                    ModerationNote = NULL
                WHERE Id = ?`,
                [results[0].Id]
            );
            results[0].IsBanned = 0;
        }

        if (results[0].IsBanned) {
            return res.status(403).json({
                message: results[0].ModerationNote || "This account has been banned.",
                banned: true,
                banExpiresAt: results[0].BanExpiresAt
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            results[0].PasswordHash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: results[0].Id,
                email: results[0].Email,
                role: results[0].Role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            message: "Login successful!",
            token
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [results] = await db.query(
            `SELECT
                Id,
                FirstName,
                Role,
                Age,
                Height,
                CurrentWeight,
                Gender,
                ActivityLevel,
                FitnessGoal,
                TargetCalories,
                TargetProtein,
                TargetCarbs,
                TargetFat,
                Bmi,
                Bmr,
                Tdee,
                RecipePostingBlocked,
                ModerationNote,
                TrustedRecipeCreator,
                IsBanned,
                BanExpiresAt,
                ProfileImageUrl,
                MacroTargetsUpdatedAt
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found!"
            });
        }

        return res.status(200).json(results[0]);
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const updateMacroTargets = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            gender,
            age,
            height,
            currentWeight,
            activityLevel,
            fitnessGoal,
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat,
            bmi,
            bmr,
            tdee
        } = req.body;

        const allowedGenders = ["male", "female"];
        const allowedActivities = ["sedentary", "light", "moderate", "active", "very_active"];
        const allowedGoals = ["deficit", "maintain", "surplus"];

        if (
            !allowedGenders.includes(gender) ||
            !allowedActivities.includes(activityLevel) ||
            !allowedGoals.includes(fitnessGoal)
        ) {
            return res.status(400).json({
                message: "Invalid calculator options."
            });
        }

        const numericValues = [
            age,
            height,
            currentWeight,
            targetCalories,
            targetProtein,
            targetFat,
            bmi,
            bmr,
            tdee
        ].map(Number);

        if (
            numericValues.some(value => !Number.isFinite(value) || value <= 0) ||
            !Number.isFinite(Number(targetCarbs)) ||
            Number(targetCarbs) < 0
        ) {
            return res.status(400).json({
                message: "Calculator values must be valid numbers."
            });
        }

        await db.query(
            `UPDATE Users
            SET
                Age = ?,
                Height = ?,
                CurrentWeight = ?,
                Gender = ?,
                ActivityLevel = ?,
                FitnessGoal = ?,
                TargetCalories = ?,
                TargetProtein = ?,
                TargetCarbs = ?,
                TargetFat = ?,
                Bmi = ?,
                Bmr = ?,
                Tdee = ?,
                MacroTargetsUpdatedAt = CURRENT_TIMESTAMP
            WHERE Id = ?`,
            [
                age,
                height,
                currentWeight,
                gender,
                activityLevel,
                fitnessGoal,
                Math.round(Number(targetCalories)),
                targetProtein,
                targetCarbs,
                targetFat,
                bmi,
                Math.round(Number(bmr)),
                Math.round(Number(tdee)),
                userId
            ]
        );

        return res.status(200).json({
            message: "Macro targets updated.",
            targets: {
                calories: Math.round(Number(targetCalories)),
                protein: Number(targetProtein),
                carbs: Number(targetCarbs),
                fat: Number(targetFat)
            }
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            currentPassword,
            newPassword
        } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({
                message: "Current password and a new password of at least 6 characters are required."
            });
        }

        const [users] = await db.query(
            `SELECT PasswordHash
            FROM Users
            WHERE Id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, users[0].PasswordHash);

        if (!isMatch) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            `UPDATE Users
            SET PasswordHash = ?
            WHERE Id = ?`,
            [
                hashedPassword,
                userId
            ]
        );

        return res.status(200).json({
            message: "Password changed successfully."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const newPassword = String(req.body.newPassword || "");

        if (!email || newPassword.length < 6) {
            return res.status(400).json({
                message: "Email and a new password of at least 6 characters are required."
            });
        }

        const [users] = await db.query(
            `SELECT Id
            FROM Users
            WHERE Email = ?`,
            [email]
        );

        const requestedPasswordHash = await bcrypt.hash(newPassword, 10);

        await db.query(
            `INSERT INTO PasswordResetRequests
            (UserId, Email, RequestedPasswordHash)
            VALUES (?, ?, ?)`,
            [
                users[0]?.Id || null,
                email,
                requestedPasswordHash
            ]
        );

        return res.status(201).json({
            message: "Password reset request sent to admin."
        });
    }
    catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Choose an image to upload."
            });
        }

        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        await db.query(
            `UPDATE Users
            SET ProfileImageUrl = ?
            WHERE Id = ?`,
            [
                imageUrl,
                req.user.id
            ]
        );

        return res.status(200).json({
            message: "Profile picture updated.",
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

module.exports = {
    register,
    login,
    getProfile,
    updateMacroTargets,
    changePassword,
    requestPasswordReset,
    updateProfilePicture
};
