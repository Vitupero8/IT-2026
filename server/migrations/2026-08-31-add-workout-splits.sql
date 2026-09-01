CREATE TABLE IF NOT EXISTS WorkoutSplits (
    Id INT NOT NULL AUTO_INCREMENT,
    CreatedBy INT NOT NULL,
    Name VARCHAR(140) NOT NULL,
    Description TEXT NULL,
    Goal ENUM('strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'athletic') NOT NULL DEFAULT 'general_fitness',
    Difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    DaysPerWeek TINYINT NOT NULL,
    Equipment VARCHAR(120) NULL,
    Status ENUM('Private', 'Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Private',
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    INDEX idx_workoutsplits_createdby (CreatedBy),
    INDEX idx_workoutsplits_status_goal (Status, Goal),
    INDEX idx_workoutsplits_difficulty_days (Difficulty, DaysPerWeek),
    CONSTRAINT fk_workoutsplits_createdby
        FOREIGN KEY (CreatedBy)
        REFERENCES Users (Id)
        ON DELETE CASCADE,
    CONSTRAINT chk_workoutsplits_days
        CHECK (DaysPerWeek BETWEEN 1 AND 7)
);

CREATE TABLE IF NOT EXISTS WorkoutSplitDays (
    Id INT NOT NULL AUTO_INCREMENT,
    SplitId INT NOT NULL,
    DayNumber TINYINT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Focus VARCHAR(120) NULL,
    Notes TEXT NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY uq_workoutsplitdays_split_day (SplitId, DayNumber),
    INDEX idx_workoutsplitdays_splitid (SplitId),
    CONSTRAINT fk_workoutsplitdays_splitid
        FOREIGN KEY (SplitId)
        REFERENCES WorkoutSplits (Id)
        ON DELETE CASCADE,
    CONSTRAINT chk_workoutsplitdays_day
        CHECK (DayNumber BETWEEN 1 AND 7)
);

CREATE TABLE IF NOT EXISTS WorkoutSplitExercises (
    Id INT NOT NULL AUTO_INCREMENT,
    DayId INT NOT NULL,
    ExerciseName VARCHAR(140) NOT NULL,
    MuscleGroup VARCHAR(80) NULL,
    Sets VARCHAR(40) NOT NULL,
    Reps VARCHAR(40) NOT NULL,
    RestSeconds INT NULL,
    Tempo VARCHAR(40) NULL,
    Notes TEXT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    PRIMARY KEY (Id),
    INDEX idx_workoutsplitexercises_dayid (DayId),
    INDEX idx_workoutsplitexercises_musclegroup (MuscleGroup),
    CONSTRAINT fk_workoutsplitexercises_dayid
        FOREIGN KEY (DayId)
        REFERENCES WorkoutSplitDays (Id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS WorkoutSplitRatings (
    Id INT NOT NULL AUTO_INCREMENT,
    SplitId INT NOT NULL,
    UserId INT NOT NULL,
    Rating TINYINT NOT NULL,
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    UNIQUE KEY uq_workoutsplitratings_split_user (SplitId, UserId),
    INDEX idx_workoutsplitratings_split_rating (SplitId, Rating),
    CONSTRAINT fk_workoutsplitratings_splitid
        FOREIGN KEY (SplitId)
        REFERENCES WorkoutSplits (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_workoutsplitratings_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE,
    CONSTRAINT chk_workoutsplitratings_rating
        CHECK (Rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS WorkoutSplitReports (
    Id INT NOT NULL AUTO_INCREMENT,
    SplitId INT NOT NULL,
    UserId INT NOT NULL,
    Reason VARCHAR(255) NOT NULL,
    Status ENUM('Open', 'Reviewed', 'Dismissed') NOT NULL DEFAULT 'Open',
    AdminResponse VARCHAR(255) NULL,
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ReviewedAt TIMESTAMP NULL,
    ReporterDismissedAt TIMESTAMP NULL,
    PRIMARY KEY (Id),
    INDEX idx_workoutsplitreports_splitid (SplitId),
    INDEX idx_workoutsplitreports_status (Status),
    CONSTRAINT fk_workoutsplitreports_splitid
        FOREIGN KEY (SplitId)
        REFERENCES WorkoutSplits (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_workoutsplitreports_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE
);
