CREATE TABLE IF NOT EXISTS AdminAuditLogs (
    Id INT NOT NULL AUTO_INCREMENT,
    AdminId INT NULL,
    Action VARCHAR(80) NOT NULL,
    EntityType VARCHAR(40) NOT NULL,
    EntityId INT NULL,
    Details VARCHAR(255) NULL,
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    INDEX idx_adminauditlogs_createdat (CreatedAt),
    INDEX idx_adminauditlogs_adminid (AdminId),
    CONSTRAINT fk_adminauditlogs_adminid
        FOREIGN KEY (AdminId)
        REFERENCES Users (Id)
        ON DELETE SET NULL
);
