USE macrotracker;

CREATE TABLE IF NOT EXISTS ModerationNotifications (
    Id INT NOT NULL AUTO_INCREMENT,
    UserId INT NOT NULL,
    EntityType ENUM('Food', 'Recipe', 'WorkoutSplit') NOT NULL,
    EntityId INT NOT NULL,
    EntityName VARCHAR(160) NOT NULL,
    Status ENUM('Approved', 'Rejected') NOT NULL,
    AdminMessage VARCHAR(255) NULL,
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    DismissedAt TIMESTAMP NULL,
    PRIMARY KEY (Id),
    INDEX idx_moderationnotifications_user (UserId, DismissedAt),
    INDEX idx_moderationnotifications_entity (EntityType, EntityId),
    CONSTRAINT fk_moderationnotifications_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE
);
