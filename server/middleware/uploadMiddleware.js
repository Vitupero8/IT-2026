const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "..", "uploads");

const ensureDirectory = (directory) => {
    fs.mkdirSync(directory, {
        recursive: true
    });
};

const setUploadFolder = (folder) => (req, res, next) => {
    req.uploadFolder = folder;
    next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.uploadFolder || "images";
        const targetDirectory = path.join(uploadRoot, folder);

        ensureDirectory(targetDirectory);
        cb(null, targetDirectory);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        cb(null, safeName);
    }
});

const imageUpload = multer({
    storage,
    limits: {
        fileSize: 3 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image uploads are allowed."));
            return;
        }

        cb(null, true);
    }
});

module.exports = {
    imageUpload,
    setUploadFolder
};
