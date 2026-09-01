SET @schema_name = DATABASE();

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'MealEntries'
    AND INDEX_NAME = 'idx_mealentries_user_loggedat'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE MealEntries ADD INDEX idx_mealentries_user_loggedat (UserId, LoggedAt)',
    'SELECT ''idx_mealentries_user_loggedat already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Foods'
    AND INDEX_NAME = 'idx_foods_owner_status_name'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE Foods ADD INDEX idx_foods_owner_status_name (CreatedBy, Status, Name)',
    'SELECT ''idx_foods_owner_status_name already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'QuickMeals'
    AND INDEX_NAME = 'idx_quickmeals_user_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE QuickMeals ADD INDEX idx_quickmeals_user_created (UserId, CreatedAt)',
    'SELECT ''idx_quickmeals_user_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'QuickMealItems'
    AND INDEX_NAME = 'idx_quickmealitems_meal'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE QuickMealItems ADD INDEX idx_quickmealitems_meal (QuickMealId)',
    'SELECT ''idx_quickmealitems_meal already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Recipes'
    AND INDEX_NAME = 'idx_recipes_status_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE Recipes ADD INDEX idx_recipes_status_created (Status, CreatedAt)',
    'SELECT ''idx_recipes_status_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Recipes'
    AND INDEX_NAME = 'idx_recipes_owner_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE Recipes ADD INDEX idx_recipes_owner_created (CreatedBy, CreatedAt)',
    'SELECT ''idx_recipes_owner_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'WorkoutSplits'
    AND INDEX_NAME = 'idx_workoutsplits_status_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE WorkoutSplits ADD INDEX idx_workoutsplits_status_created (Status, CreatedAt)',
    'SELECT ''idx_workoutsplits_status_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'WorkoutSplits'
    AND INDEX_NAME = 'idx_workoutsplits_owner_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE WorkoutSplits ADD INDEX idx_workoutsplits_owner_created (CreatedBy, CreatedAt)',
    'SELECT ''idx_workoutsplits_owner_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'AdminAuditLogs'
    AND INDEX_NAME = 'idx_adminauditlogs_created'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE AdminAuditLogs ADD INDEX idx_adminauditlogs_created (CreatedAt)',
    'SELECT ''idx_adminauditlogs_created already exists'' AS Message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
