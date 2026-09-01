const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authMiddleware = async (req , res , next) => {

    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({
            message: "Access denied"
        });
    }
    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET
        );

        req.user = decoded;
        const [users] = await db.query(
            `SELECT IsBanned, BanExpiresAt, ModerationNote
            FROM Users
            WHERE Id = ?`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid token."
            });
        }

        if (users[0].IsBanned && users[0].BanExpiresAt && new Date(users[0].BanExpiresAt) <= new Date()) {
            await db.query(
                `UPDATE Users
                SET IsBanned = 0,
                    BanExpiresAt = NULL,
                    ModerationNote = NULL
                WHERE Id = ?`,
                [decoded.id]
            );

            next();
            return;
        }

        if (users[0].IsBanned) {
            return res.status(403).json({
                message: users[0].ModerationNote || "This account has been banned.",
                banned: true,
                banExpiresAt: users[0].BanExpiresAt
            });
        }

        next();

    } catch(err){

        return res.status(401).json({
            message: "Invalid token."
        });
    }

};

module.exports = authMiddleware;
