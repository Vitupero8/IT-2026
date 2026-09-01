/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, Utensils, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/Recipes.css";

const emptyIngredient = {
    mode: "food",
    foodId: "",
    name: "",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
    grams: ""
};

function CreateRecipeModal({
    isOpen,
    onClose,
    tags,
    foods,
    onCreated,
    editRecipe = null,
    editIngredients = []
}) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        instructions: "",
        servings: 1,
        selectedTags: []
    });
    const [draftIngredient, setDraftIngredient] = useState(emptyIngredient);
    const [ingredients, setIngredients] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const isEditing = Boolean(editRecipe);

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const totals = useMemo(() => {
        const fullRecipe = ingredients.reduce((sum, ingredient) => {
            const grams = Number(ingredient.grams);

            return {
                calories: sum.calories + Number(ingredient.caloriesPer100g) * grams / 100,
                protein: sum.protein + Number(ingredient.proteinPer100g) * grams / 100,
                carbs: sum.carbs + Number(ingredient.carbsPer100g) * grams / 100,
                fat: sum.fat + Number(ingredient.fatPer100g) * grams / 100
            };
        }, {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        });

        const servings = Math.max(Number(form.servings) || 1, 1);

        return {
            calories: fullRecipe.calories / servings,
            protein: fullRecipe.protein / servings,
            carbs: fullRecipe.carbs / servings,
            fat: fullRecipe.fat / servings
        };
    }, [form.servings, ingredients]);

    const reset = () => {
        setForm({
            name: "",
            description: "",
            instructions: "",
            servings: 1,
            selectedTags: []
        });
        setDraftIngredient(emptyIngredient);
        setIngredients([]);
        setImageFile(null);
    };

    const close = () => {
        reset();
        onClose();
    };

    const updateForm = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateDraft = (field, value) => {
        setDraftIngredient(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addIngredient = () => {
        const grams = Number(draftIngredient.grams);

        if (!grams || grams <= 0) {
            toast.error("Enter valid grams for the ingredient.");
            return;
        }

        if (draftIngredient.mode === "manual") {
            const manualMacros = {
                caloriesPer100g: Number(draftIngredient.caloriesPer100g),
                proteinPer100g: Number(draftIngredient.proteinPer100g),
                carbsPer100g: Number(draftIngredient.carbsPer100g),
                fatPer100g: Number(draftIngredient.fatPer100g)
            };

            if (!draftIngredient.name.trim()) {
                toast.error("Name the manual ingredient.");
                return;
            }

            if (Object.values(manualMacros).some(value => Number.isNaN(value) || value < 0)) {
                toast.error("Manual ingredient macros must be zero or higher.");
                return;
            }

            setIngredients(prev => [
                ...prev,
                {
                    foodId: null,
                    name: draftIngredient.name.trim(),
                    grams,
                    ...manualMacros,
                    source: "Manual"
                }
            ]);

            setDraftIngredient({
                ...emptyIngredient,
                mode: "manual"
            });
            return;
        }

        const selectedFood = foods.find(food => food.Id === Number(draftIngredient.foodId));

        if (!selectedFood) {
            toast.error("Choose a food from the database.");
            return;
        }

        setIngredients(prev => [
            ...prev,
            {
                foodId: selectedFood.Id,
                name: selectedFood.Name,
                grams,
                caloriesPer100g: Number(selectedFood.Calories),
                proteinPer100g: Number(selectedFood.Protein),
                carbsPer100g: Number(selectedFood.Carbs),
                fatPer100g: Number(selectedFood.Fat),
                source: "FoodDatabase"
            }
        ]);

        setDraftIngredient(emptyIngredient);
    };

    const toggleTag = (tagName) => {
        setForm(prev => ({
            ...prev,
            selectedTags: prev.selectedTags.includes(tagName)
                ? prev.selectedTags.filter(tag => tag !== tagName)
                : [...prev.selectedTags, tagName]
        }));
    };

    const saveRecipe = async (e) => {
        e.preventDefault();

        if (!form.name.trim() || ingredients.length === 0) {
            toast.error("Name the recipe and add at least one ingredient.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: form.name,
                description: form.description,
                instructions: form.instructions,
                servings: Number(form.servings),
                tags: form.selectedTags,
                ingredients
            };
            const response = isEditing
                ? await api.put(`/recipes/${editRecipe.Id}`, payload)
                : await api.post("/recipes", payload);
            const recipeId = editRecipe?.Id || response.data?.recipeId;

            if (imageFile && recipeId) {
                const imagePayload = new FormData();
                imagePayload.append("image", imageFile);

                await api.post(`/recipes/${recipeId}/image`, imagePayload, {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                });
            }

            toast.success(response.data?.message || (isEditing ? "Recipe updated." : "Recipe posted."));
            onCreated?.();
            close();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to create recipe.");
        }
        finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !editRecipe) return;

        setForm({
            name: editRecipe.Name || "",
            description: editRecipe.Description || "",
            instructions: editRecipe.Instructions || "",
            servings: editRecipe.Servings || 1,
            selectedTags: editRecipe.Tags || []
        });
        setIngredients(editIngredients.map(ingredient => ({
            foodId: ingredient.FoodId || null,
            name: ingredient.Name,
            grams: Number(ingredient.Grams),
            caloriesPer100g: Number(ingredient.CaloriesPer100g),
            proteinPer100g: Number(ingredient.ProteinPer100g),
            carbsPer100g: Number(ingredient.CarbsPer100g),
            fatPer100g: Number(ingredient.FatPer100g),
            source: ingredient.Source
        })));
        setDraftIngredient(emptyIngredient);
    }, [editIngredients, editRecipe, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="create-recipe-modal">
                <div className="recipe-modal-header">
                    <div className="recipe-title-lockup">
                        <div className="recipe-title-icon">
                            <Utensils size={22} />
                        </div>

                        <div>
                            <span className="section-kicker">{isEditing ? "Edit" : "Create"}</span>
                            <h2>{isEditing ? "Edit Recipe" : "Post Recipe"}</h2>
                        </div>
                    </div>

                    <button
                        className="recipe-icon-button"
                        type="button"
                        onClick={close}
                        aria-label="Close create recipe"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    className="create-recipe-body"
                    onSubmit={saveRecipe}
                >
                    <section className="recipe-form-section">
                        <label>
                            Recipe name
                            <input
                                value={form.name}
                                onChange={(e) => updateForm("name", e.target.value)}
                                placeholder="High protein chicken pasta"
                            />
                        </label>

                        <label>
                            Description
                            <textarea
                                value={form.description}
                                onChange={(e) => updateForm("description", e.target.value)}
                                placeholder="Short description"
                            />
                        </label>

                        <div className="recipe-form-grid">
                            <label>
                                Servings
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.servings}
                                    onChange={(e) => updateForm("servings", e.target.value)}
                                />
                            </label>
                        </div>

                        <label>
                            Instructions
                            <textarea
                                value={form.instructions}
                                onChange={(e) => updateForm("instructions", e.target.value)}
                                placeholder="How to make it"
                            />
                        </label>

                        <label>
                            Recipe picture
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            />
                        </label>
                    </section>

                    <section className="recipe-form-section">
                        <div className="recipe-section-heading">
                            <span className="section-kicker">Ingredients</span>
                            <h3>Build From Macros</h3>
                        </div>

                        <div className="recipe-mode-tabs">
                            <button
                                type="button"
                                className={draftIngredient.mode === "food" ? "active" : ""}
                                onClick={() => setDraftIngredient({
                                    ...emptyIngredient,
                                    mode: "food"
                                })}
                            >
                                Food Database
                            </button>

                            <button
                                type="button"
                                className={draftIngredient.mode === "manual" ? "active" : ""}
                                onClick={() => setDraftIngredient({
                                    ...emptyIngredient,
                                    mode: "manual"
                                })}
                            >
                                Manual
                            </button>
                        </div>

                        {
                            draftIngredient.mode === "manual"
                                ? (
                                    <div className="recipe-ingredient-builder manual-source">
                                        <input
                                            value={draftIngredient.name}
                                            onChange={(e) => updateDraft("name", e.target.value)}
                                            placeholder="Ingredient name"
                                        />

                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Grams"
                                            value={draftIngredient.grams}
                                            onChange={(e) => updateDraft("grams", e.target.value)}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Kcal per 100g"
                                            value={draftIngredient.caloriesPer100g}
                                            onChange={(e) => updateDraft("caloriesPer100g", e.target.value)}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Protein per 100g"
                                            value={draftIngredient.proteinPer100g}
                                            onChange={(e) => updateDraft("proteinPer100g", e.target.value)}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Carbs per 100g"
                                            value={draftIngredient.carbsPer100g}
                                            onChange={(e) => updateDraft("carbsPer100g", e.target.value)}
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Fat per 100g"
                                            value={draftIngredient.fatPer100g}
                                            onChange={(e) => updateDraft("fatPer100g", e.target.value)}
                                        />

                                        <button
                                            type="button"
                                            onClick={addIngredient}
                                        >
                                            <Plus size={16} />
                                            Add
                                        </button>
                                    </div>
                                )
                                : (
                                    <div className="recipe-ingredient-builder food-source">
                                        <select
                                            value={draftIngredient.foodId}
                                            onChange={(e) => updateDraft("foodId", e.target.value)}
                                        >
                                            <option value="">Food Database</option>
                                            {
                                                foods.map(food => (
                                                    <option
                                                        key={food.Id}
                                                        value={food.Id}
                                                    >
                                                        {food.Name} · {formatNumber(food.Calories)} kcal
                                                    </option>
                                                ))
                                            }
                                        </select>

                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Grams"
                                            value={draftIngredient.grams}
                                            onChange={(e) => updateDraft("grams", e.target.value)}
                                        />

                                        <button
                                            type="button"
                                            onClick={addIngredient}
                                        >
                                            <Plus size={16} />
                                            Add
                                        </button>
                                    </div>
                                )
                        }

                        <div className="recipe-ingredient-list compact">
                            {
                                ingredients.length === 0
                                    ? <p className="recipe-empty">No ingredients added yet.</p>
                                    : ingredients.map((ingredient, index) => (
                                        <div
                                            className="recipe-ingredient-row"
                                            key={`${ingredient.name}-${index}`}
                                        >
                                            <div>
                                                <strong>{ingredient.name}</strong>
                                                <span>{formatNumber(ingredient.grams)}g · {ingredient.source}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setIngredients(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                                                aria-label={`Remove ${ingredient.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                            }
                        </div>
                    </section>

                    <section className="recipe-form-section">
                        <div className="recipe-section-heading">
                            <span className="section-kicker">Tags</span>
                            <h3>Make It Searchable</h3>
                        </div>

                        <div className="recipe-tag-picker">
                            {
                                tags.map(tag => (
                                    <button
                                        key={tag.Id}
                                        type="button"
                                        className={form.selectedTags.includes(tag.Name) ? "active" : ""}
                                        onClick={() => toggleTag(tag.Name)}
                                    >
                                        {tag.Name}
                                    </button>
                                ))
                            }
                        </div>
                    </section>

                    <section className="recipe-form-footer">
                        <div className="recipe-live-totals">
                            <span>{formatNumber(totals.calories)} kcal</span>
                            <span>{formatNumber(totals.protein)}g protein</span>
                            <span>{formatNumber(totals.carbs)}g carbs</span>
                            <span>{formatNumber(totals.fat)}g fat</span>
                        </div>

                        <button
                            className="recipe-primary-button"
                            type="submit"
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? "Saving..." : isEditing ? "Save Recipe" : "Post Recipe"}
                        </button>
                    </section>
                </form>
            </div>
        </div>
    );
}

export default CreateRecipeModal;
