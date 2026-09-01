USE macrotracker;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'WorkoutSplitDays'
        AND COLUMN_NAME = 'IsRestDay'
);
SET @statement = IF(
    @column_exists = 0,
    'ALTER TABLE WorkoutSplitDays ADD COLUMN IsRestDay TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT ''WorkoutSplitDays.IsRestDay already exists'' AS Message'
);
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'UserWorkoutExerciseProgress'
        AND COLUMN_NAME = 'CustomExerciseName'
);
SET @statement = IF(
    @column_exists = 0,
    'ALTER TABLE UserWorkoutExerciseProgress ADD COLUMN CustomExerciseName VARCHAR(140) NULL',
    'SELECT ''UserWorkoutExerciseProgress.CustomExerciseName already exists'' AS Message'
);
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'UserWorkoutExerciseProgress'
        AND COLUMN_NAME = 'CustomSets'
);
SET @statement = IF(
    @column_exists = 0,
    'ALTER TABLE UserWorkoutExerciseProgress ADD COLUMN CustomSets VARCHAR(40) NULL',
    'SELECT ''UserWorkoutExerciseProgress.CustomSets already exists'' AS Message'
);
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'UserWorkoutExerciseProgress'
        AND COLUMN_NAME = 'CustomNotes'
);
SET @statement = IF(
    @column_exists = 0,
    'ALTER TABLE UserWorkoutExerciseProgress ADD COLUMN CustomNotes TEXT NULL',
    'SELECT ''UserWorkoutExerciseProgress.CustomNotes already exists'' AS Message'
);
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
