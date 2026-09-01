import {
    Beef,
    Droplets,
    Flag,
    Flame,
    Plus,
    ShieldCheck,
    Star,
    Utensils,
    Wheat,
    X
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import api, { getAssetUrl } from "../services/api";
import "../styles/Recipes.css";

function RecipeDetailModal({
    recipe,
    ingredients = [],
    isOpen,
    onClose,
    onRated,
    onAddedToDiary,
    onSavedToQuickMeals,
    onEdit,
    currentUser,
    onTrustedChange
}) {
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);

    if (!isOpen || !recipe) return null;

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const macroCards = [
        {
            label: "Calories",
            value: `${formatNumber(recipe.Calories)} kcal`,
            sublabel: "per serving",
            icon: <Flame size={20} />
        },
        {
            label: "Protein",
            value: `${formatNumber(recipe.Protein)}g`,
            sublabel: "per serving",
            icon: <Beef size={20} />
        },
        {
            label: "Carbs",
            value: `${formatNumber(recipe.Carbs)}g`,
            sublabel: "per serving",
            icon: <Wheat size={20} />
        },
        {
            label: "Fat",
            value: `${formatNumber(recipe.Fat)}g`,
            sublabel: "per serving",
            icon: <Droplets size={20} />
        }
    ];

    const rateRecipe = async (rating) => {
        try {
            await api.post(`/recipes/${recipe.Id}/rating`, {
                rating
            });
            toast.success("Rating saved.");
            onRated?.();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to rate recipe.");
        }
    };

    const addToQuickMeals = async () => {
        try {
            await api.post(`/recipes/${recipe.Id}/add-to-quick-meals`);
            toast.success("Recipe saved to quick meals.");
            onSavedToQuickMeals?.();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save recipe.");
        }
    };

    const addToDiary = async () => {
        try {
            await api.post(`/recipes/${recipe.Id}/add-to-diary`);
            toast.success("Recipe added to today's diary.");
            onAddedToDiary?.();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to add recipe.");
        }
    };

    const reportRecipe = async () => {
        if (!reportReason.trim()) {
            toast.error("Add a short reason for the report.");
            return;
        }

        try {
            setReporting(true);
            await api.post(`/recipes/${recipe.Id}/report`, {
                reason: reportReason.trim()
            });
            toast.success("Report sent to admins.");
            setReportReason("");
            setShowReportForm(false);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to report recipe.");
        }
        finally {
            setReporting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="recipe-detail-modal">
                <div className="recipe-modal-header">
                    <div className="recipe-title-lockup">
                        <div className="recipe-title-icon">
                            <Utensils size={22} />
                        </div>

                        <div>
                            <span className="section-kicker">Recipe</span>
                            <h2>{recipe.Name}</h2>
                        </div>
                    </div>

                    <button
                        className="recipe-icon-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close recipe"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="recipe-detail-body">
                    <div className="recipe-detail-hero">
                        {
                            recipe.ImageUrl && (
                                <img
                                    className="recipe-detail-image"
                                    src={getAssetUrl(recipe.ImageUrl)}
                                    alt={recipe.Name}
                                />
                            )
                        }

                        <div>
                            <span className="recipe-meta-pill">
                                {formatNumber(recipe.Servings)} serving{Number(recipe.Servings) === 1 ? "" : "s"}
                            </span>
                            <span className="recipe-meta-pill">
                                {formatNumber(recipe.AverageRating)} stars ({recipe.RatingCount || 0})
                            </span>
                            {
                                Boolean(recipe.AuthorTrusted) && (
                                    <span className="recipe-meta-pill trusted">
                                        <ShieldCheck size={14} />
                                        Trusted author
                                    </span>
                                )
                            }

                            <p>{recipe.Description || "No description yet."}</p>
                        </div>

                        <div className="recipe-tags">
                            {
                                recipe.Tags?.map(tag => (
                                    <span key={tag}>{tag}</span>
                                ))
                            }
                        </div>
                    </div>

                    <div className="recipe-nutrition-grid">
                        {
                            macroCards.map(card => (
                                <article key={card.label}>
                                    {card.icon}
                                    <span>{card.label}</span>
                                    <strong>{card.value}</strong>
                                    <small>{card.sublabel}</small>
                                </article>
                            ))
                        }
                    </div>

                    <section className="recipe-section">
                        <div className="recipe-section-heading">
                            <span className="section-kicker">Fact Check</span>
                            <h3>Ingredients</h3>
                        </div>

                        <div className="recipe-ingredient-list">
                            {
                                ingredients.map(ingredient => (
                                    <div
                                        className="recipe-ingredient-row"
                                        key={ingredient.Id}
                                    >
                                        <div>
                                            <strong>{ingredient.Name}</strong>
                                            <span>{formatNumber(ingredient.Grams)}g · {ingredient.Source}</span>
                                        </div>

                                        <span>
                                            {formatNumber(Number(ingredient.CaloriesPer100g) * Number(ingredient.Grams) / 100)} kcal
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </section>

                    {
                        recipe.Instructions && (
                            <section className="recipe-section">
                                <div className="recipe-section-heading">
                                    <span className="section-kicker">Method</span>
                                    <h3>Instructions</h3>
                                </div>

                                <p className="recipe-instructions">{recipe.Instructions}</p>
                            </section>
                        )
                    }

                    <div className="recipe-rating-row">
                        <span>Rate this recipe</span>
                        <div>
                            {
                                [1, 2, 3, 4, 5].map(rating => (
                                    <button
                                        key={rating}
                                        type="button"
                                        className={Number(recipe.UserRating) >= rating ? "active" : ""}
                                        onClick={() => rateRecipe(rating)}
                                        aria-label={`Rate ${rating} stars`}
                                    >
                                        <Star size={18} />
                                    </button>
                                ))
                            }
                        </div>
                    </div>

                    <div className="recipe-detail-actions">
                        <button
                            className="recipe-primary-button"
                            type="button"
                            onClick={addToDiary}
                        >
                            <Plus size={18} />
                            Add To Diary
                        </button>

                        <button
                            className="recipe-secondary-button"
                            type="button"
                            onClick={addToQuickMeals}
                        >
                            <Plus size={18} />
                            Save To Quick Meals
                        </button>

                        {
                            currentUser?.Id === recipe.CreatedBy && (
                                <button
                                    className="recipe-secondary-button"
                                    type="button"
                                    onClick={onEdit}
                                >
                                    <Utensils size={18} />
                                    Edit Public Recipe
                                </button>
                            )
                        }

                        {
                            currentUser?.Role === "admin" && (
                                <button
                                    className="recipe-secondary-button"
                                    type="button"
                                    onClick={() => onTrustedChange?.(recipe.CreatedBy, !recipe.AuthorTrusted)}
                                >
                                    <ShieldCheck size={18} />
                                    {recipe.AuthorTrusted ? "Untrust Author" : "Trust Author"}
                                </button>
                            )
                        }
                    </div>

                    <div className="recipe-report-panel">
                        <button
                            className="recipe-report-toggle"
                            type="button"
                            onClick={() => setShowReportForm(prev => !prev)}
                        >
                            <Flag size={16} />
                            Report Recipe
                        </button>

                        {
                            showReportForm && (
                                <div className="recipe-report-form">
                                    <textarea
                                        maxLength="255"
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        placeholder="Why should an admin review this recipe?"
                                    />

                                    <button
                                        className="recipe-secondary-button"
                                        type="button"
                                        onClick={reportRecipe}
                                        disabled={reporting}
                                    >
                                        <Flag size={16} />
                                        {reporting ? "Sending..." : "Send Report"}
                                    </button>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RecipeDetailModal;
