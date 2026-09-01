USE macrotracker;

SET @schema_name = DATABASE();

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'IsBanned'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN IsBanned TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT ''Users.IsBanned already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'BanExpiresAt'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN BanExpiresAt TIMESTAMP NULL',
    'SELECT ''Users.BanExpiresAt already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'ProfileImageUrl'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Users ADD COLUMN ProfileImageUrl VARCHAR(255) NULL',
    'SELECT ''Users.ProfileImageUrl already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Foods'
    AND COLUMN_NAME = 'DeletedAt'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Foods ADD COLUMN DeletedAt TIMESTAMP NULL',
    'SELECT ''Foods.DeletedAt already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Recipes'
    AND COLUMN_NAME = 'ImageUrl'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE Recipes ADD COLUMN ImageUrl VARCHAR(255) NULL',
    'SELECT ''Recipes.ImageUrl already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'PasswordResetRequests'
);
SET @sql = IF(@table_exists = 0,
    'CREATE TABLE PasswordResetRequests (
        Id INT NOT NULL AUTO_INCREMENT,
        UserId INT NULL,
        Email VARCHAR(100) NOT NULL,
        RequestedPasswordHash VARCHAR(255) NULL,
        Status ENUM(''Open'',''Reviewed'',''Dismissed'') NOT NULL DEFAULT ''Open'',
        AdminResponse VARCHAR(255) NULL,
        CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        ReviewedAt TIMESTAMP NULL,
        PRIMARY KEY (Id),
        INDEX idx_passwordresetrequests_status_created (Status, CreatedAt),
        CONSTRAINT fk_passwordresetrequests_userid
            FOREIGN KEY (UserId)
            REFERENCES Users(Id)
            ON DELETE SET NULL
    )',
    'SELECT ''PasswordResetRequests already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'PasswordResetRequests'
    AND COLUMN_NAME = 'RequestedPasswordHash'
);
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE PasswordResetRequests ADD COLUMN RequestedPasswordHash VARCHAR(255) NULL AFTER Email',
    'SELECT ''PasswordResetRequests.RequestedPasswordHash already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
