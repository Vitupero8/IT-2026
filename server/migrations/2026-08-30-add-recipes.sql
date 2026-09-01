CREATE TABLE IF NOT EXISTS Recipes (
    Id INT NOT NULL AUTO_INCREMENT,
    CreatedBy INT NOT NULL,
    Name VARCHAR(140) NOT NULL,
    Description TEXT NULL,
    Instructions TEXT NULL,
    Servings DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    Calories DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    Protein DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    Carbs DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    Fat DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    Status ENUM('Draft', 'Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    INDEX idx_recipes_createdby (CreatedBy),
    INDEX idx_recipes_status_name (Status, Name),
    INDEX idx_recipes_macros (Calories, Protein, Carbs, Fat),
    CONSTRAINT fk_recipes_createdby
        FOREIGN KEY (CreatedBy)
        REFERENCES Users (Id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RecipeIngredients (
    Id INT NOT NULL AUTO_INCREMENT,
    RecipeId INT NOT NULL,
    FoodId INT NULL,
    Name VARCHAR(140) NOT NULL,
    Grams DECIMAL(8,2) NOT NULL,
    CaloriesPer100g DECIMAL(8,2) NOT NULL,
    ProteinPer100g DECIMAL(8,2) NOT NULL,
    CarbsPer100g DECIMAL(8,2) NOT NULL,
    FatPer100g DECIMAL(8,2) NOT NULL,
    Source ENUM('FoodDatabase', 'Manual') NOT NULL DEFAULT 'Manual',
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    INDEX idx_recipeingredients_recipeid (RecipeId),
    INDEX idx_recipeingredients_foodid (FoodId),
    CONSTRAINT fk_recipeingredients_recipeid
        FOREIGN KEY (RecipeId)
        REFERENCES Recipes (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recipeingredients_foodid
        FOREIGN KEY (FoodId)
        REFERENCES Foods (Id)
        ON DELETE SET NULL,
    CONSTRAINT chk_recipeingredients_grams
        CHECK (Grams > 0),
    CONSTRAINT chk_recipeingredients_macros
        CHECK (
            CaloriesPer100g >= 0
            AND ProteinPer100g >= 0
            AND CarbsPer100g >= 0
            AND FatPer100g >= 0
        )
);

CREATE TABLE IF NOT EXISTS RecipeTags (
    Id INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(60) NOT NULL,
    Category ENUM('Calories', 'Protein', 'Carbs', 'Fat', 'Goal', 'Other') NOT NULL DEFAULT 'Other',
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    UNIQUE KEY uq_recipetags_name (Name)
);

CREATE TABLE IF NOT EXISTS RecipeTagLinks (
    RecipeId INT NOT NULL,
    TagId INT NOT NULL,
    PRIMARY KEY (RecipeId, TagId),
    INDEX idx_recipetaglinks_tagid (TagId),
    CONSTRAINT fk_recipetaglinks_recipeid
        FOREIGN KEY (RecipeId)
        REFERENCES Recipes (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recipetaglinks_tagid
        FOREIGN KEY (TagId)
        REFERENCES RecipeTags (Id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RecipeRatings (
    Id INT NOT NULL AUTO_INCREMENT,
    RecipeId INT NOT NULL,
    UserId INT NOT NULL,
    Rating TINYINT NOT NULL,
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    UNIQUE KEY uq_reciperatings_recipe_user (RecipeId, UserId),
    INDEX idx_reciperatings_recipe_rating (RecipeId, Rating),
    CONSTRAINT fk_reciperatings_recipeid
        FOREIGN KEY (RecipeId)
        REFERENCES Recipes (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reciperatings_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE,
    CONSTRAINT chk_reciperatings_rating
        CHECK (Rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS RecipeReports (
    Id INT NOT NULL AUTO_INCREMENT,
    RecipeId INT NOT NULL,
    UserId INT NOT NULL,
    Reason VARCHAR(255) NOT NULL,
    Status ENUM('Open', 'Reviewed', 'Dismissed') NOT NULL DEFAULT 'Open',
    CreatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Id),
    INDEX idx_recipereports_recipeid (RecipeId),
    INDEX idx_recipereports_status (Status),
    CONSTRAINT fk_recipereports_recipeid
        FOREIGN KEY (RecipeId)
        REFERENCES Recipes (Id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recipereports_userid
        FOREIGN KEY (UserId)
        REFERENCES Users (Id)
        ON DELETE CASCADE
);

INSERT IGNORE INTO RecipeTags (Name, Category) VALUES
    ('high calorie', 'Calories'),
    ('mid calorie', 'Calories'),
    ('low calorie', 'Calories'),
    ('high protein', 'Protein'),
    ('mid protein', 'Protein'),
    ('low protein', 'Protein'),
    ('high carb', 'Carbs'),
    ('mid carb', 'Carbs'),
    ('low carb', 'Carbs'),
    ('high fat', 'Fat'),
    ('mid fat', 'Fat'),
    ('low fat', 'Fat'),
    ('deficit friendly', 'Goal'),
    ('maintenance friendly', 'Goal'),
    ('surplus friendly', 'Goal');
