ALTER TABLE MealEntries
    ADD COLUMN RecipeId INT NULL,
    ADD COLUMN RecipeLogId VARCHAR(36) NULL,
    ADD COLUMN RecipeName VARCHAR(140) NULL,
    ADD INDEX idx_mealentries_recipelog (RecipeLogId),
    ADD INDEX idx_mealentries_recipeid (RecipeId);

ALTER TABLE Users
    ADD COLUMN RecipePostingBlocked TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN ModerationNote VARCHAR(255) NULL;
