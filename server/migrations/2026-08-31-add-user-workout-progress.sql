CREATE TABLE IF NOT EXISTS UserWorkoutSplits (
    UserId INT NOT NULL,
    SplitId INT NOT NULL,
    SelectedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId),
    INDEX idx_userworkoutsplits_splitid (SplitId),
    CONSTRAINT fk_userworkoutsplits_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_userworkoutsplits_splitid
        FOREIGN KEY (SplitId)
        REFERENCES WorkoutSplits (Id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS UserWorkoutExerciseProgress (
    UserId INT NOT NULL,
    ExerciseId INT NOT NULL,
    WeightKg DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId, ExerciseId),
    CONSTRAINT fk_userworkoutexerciseprogress_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_userworkoutexerciseprogress_exerciseid
        FOREIGN KEY (ExerciseId)
        REFERENCES WorkoutSplitExercises (Id)
        ON DELETE CASCADE,
    CONSTRAINT chk_userworkoutexerciseprogress_weight
        CHECK (WeightKg >= 0)
);
