/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Beef, Droplets, Flame, Plus, Search, ShieldCheck, Star, TriangleAlert, Wheat } from "lucide-react";
import { toast } from "react-toastify";
import api, { getAssetUrl } from "../services/api";
import { clearToken } from "../services/authService";
import CreateRecipeModal from "../components/CreateRecipeModal";
import RecipeDetailModal from "../components/RecipeDetailModal";
import ModerationNotificationModal from "../components/ModerationNotificationModal";
import "../styles/Recipes.css";

function Recipes() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [recipes, setRecipes] = useState([]);
    const [tags, setTags] = useState([]);
    const [foods, setFoods] = useState([]);
    const [user, setUser] = useState(null);
    const [reportReplies, setReportReplies] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [foodsLoading, setFoodsLoading] = useState(false);
    const suppressRecipeOpen = useRef(false);
    const [filters, setFilters] = useState({
        search: "",
        selectedTags: [],
        minRating: "",
        maxCalories: "",
        minProtein: "",
        minCarbs: "",
        minFat: "",
        owner: "all",
        sort: "newest"
    });

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const query = useMemo(() => {
        const params = {};

        if (filters.search) params.search = filters.search;
        if (filters.selectedTags.length > 0) params.tags = filters.selectedTags.join(",");
        if (filters.minRating) params.minRating = filters.minRating;
        if (filters.maxCalories) params.maxCalories = filters.maxCalories;
        if (filters.minProtein) params.minProtein = filters.minProtein;
        if (filters.minCarbs) params.minCarbs = filters.minCarbs;
        if (filters.minFat) params.minFat = filters.minFat;
        if (filters.owner) params.owner = filters.owner;
        if (filters.sort) params.sort = filters.sort;

        return params;
    }, [filters]);

    const handleAuthError = useCallback((err) => {
        if (err.response?.status === 401 || err.response?.status === 404) {
            clearToken();
            toast.error("Please log in again.");
            navigate("/login");
        }
    }, [navigate]);

    const loadBaseData = useCallback(async () => {
        try {
            const requests = [
                ["profile", api.get("/auth/profile")],
                ["tags", api.get("/recipes/tags")]
            ];

            const results = await Promise.allSettled(requests.map(([, request]) => request));

            results.forEach((result, index) => {
                const key = requests[index][0];

                if (result.status !== "fulfilled") {
                    const err = result.reason;
                    console.error(err);
                    handleAuthError(err);
                    return;
                }

                const data = result.value.data;

                if (key === "profile") setUser(data);
                if (key === "tags") setTags(data);
            });
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            toast.error(err.response?.data?.message || "Failed to load some recipe data.");
        }
    }, [handleAuthError]);

    const loadRecipeExtras = useCallback(async () => {
        const requests = [
            ["reports", api.get("/recipes/my-reports")],
            ["notifications", api.get("/notifications")]
        ];

        const results = await Promise.allSettled(requests.map(([, request]) => request));

        results.forEach((result, index) => {
            const key = requests[index][0];

            if (result.status !== "fulfilled") {
                const err = result.reason;
                console.error(err);
                handleAuthError(err);
                return;
            }

            if (key === "reports") setReportReplies(result.value.data);
            if (key === "notifications") setNotifications(result.value.data);
        });
    }, [handleAuthError]);

    const loadFoods = useCallback(async () => {
        try {
            setFoodsLoading(true);
            const response = await api.get("/foods");
            setFoods(response.data);

            return response.data;
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            toast.error(err.response?.data?.message || "Failed to load food database.");

            return [];
        }
        finally {
            setFoodsLoading(false);
        }
    }, [handleAuthError]);

    const loadRecipes = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError("");

            const response = await api.get("/recipes", {
                params: query
            });

            setRecipes(response.data);
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            setLoadError(err.response?.data?.message || "Recipes took too long to load.");
            toast.error(err.response?.data?.message || "Failed to load recipes.");
        }
        finally {
            setLoading(false);
        }
    }, [handleAuthError, query]);

    const openRecipe = useCallback(async (recipeId) => {
        try {
            const response = await api.get(`/recipes/${recipeId}`);

            setSelectedRecipe(response.data.recipe);
            setSelectedIngredients(response.data.ingredients);
        if (searchParams.get("recipe") !== String(recipeId)) {
            setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                params.set("recipe", recipeId);
                return params;
            });
        }
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            toast.error(err.response?.data?.message || "Failed to open recipe.");
        }
    }, [handleAuthError, searchParams, setSearchParams]);

    const closeRecipe = () => {
        suppressRecipeOpen.current = true;
        setSelectedRecipe(null);
        setSelectedIngredients([]);
        setSearchParams(prev => {
            const params = new URLSearchParams(prev);
            params.delete("recipe");
            return params;
        }, {
            replace: true
        });
    };

    useEffect(() => {
        loadBaseData();
    }, [loadBaseData]);

    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadRecipeExtras();
        }, 500);

        return () => window.clearTimeout(timer);
    }, [loadRecipeExtras]);

    useEffect(() => {
        const recipeId = searchParams.get("recipe");

        if (suppressRecipeOpen.current) {
            suppressRecipeOpen.current = false;
            return;
        }

        if (recipeId && selectedRecipe?.Id !== Number(recipeId)) {
            openRecipe(recipeId);
        }
    }, [openRecipe, searchParams, selectedRecipe?.Id]);

    const toggleTag = (tagName) => {
        setFilters(prev => ({
            ...prev,
            selectedTags: prev.selectedTags.includes(tagName)
                ? prev.selectedTags.filter(tag => tag !== tagName)
                : [...prev.selectedTags, tagName]
        }));
    };

    const resetFilters = () => {
        setFilters({
            search: "",
            selectedTags: [],
            minRating: "",
            maxCalories: "",
            minProtein: "",
            minCarbs: "",
            minFat: "",
            owner: "all",
            sort: "newest"
        });
    };

    const setRatingFilter = (rating) => {
        setFilters(prev => ({
            ...prev,
            minRating: prev.minRating === String(rating) ? "" : String(rating)
        }));
    };

    const dismissReportReply = async (reportId) => {
        try {
            await api.patch(`/recipes/my-reports/${reportId}/dismiss`);
            setReportReplies(prev => prev.filter(report => report.Id !== reportId));
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to dismiss message.");
        }
    };

    const openCreateRecipe = async () => {
        if (user?.RecipePostingBlocked) {
            toast.error("Recipe posting is disabled for this account.");
            return;
        }

        if (foods.length === 0 && !foodsLoading) {
            loadFoods();
        }

        setShowCreate(true);
    };

    const openEditRecipe = async () => {
        if (foods.length === 0 && !foodsLoading) {
            await loadFoods();
        }

        setEditingRecipe({
            recipe: selectedRecipe,
            ingredients: selectedIngredients
        });
        closeRecipe();
    };

    const dismissNotification = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/dismiss`);
            setNotifications(prev => prev.filter(notification => notification.Id !== notificationId));
            loadRecipes();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to dismiss admin message.");
        }
    };

    const toggleTrustedAuthor = async (authorId, trustedRecipeCreator) => {
        try {
            await api.patch(`/admin/users/${authorId}/trust`, {
                trustedRecipeCreator
            });
            toast.success(trustedRecipeCreator ? "Author marked as trusted." : "Trusted status removed.");
            loadRecipes();
            if (selectedRecipe) openRecipe(selectedRecipe.Id);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to update trusted author.");
        }
    };

    return (
        <div className="recipes-page">
            <header className="recipes-topbar">
                <button
                    className="recipe-secondary-button"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft size={18} />
                    Dashboard
                </button>

                <div>
                    <span className="section-kicker">Community</span>
                    <h1>Recipes</h1>
                </div>

                <div className="recipe-create-cluster">
                    {
                        user?.ModerationNote && !user?.RecipePostingBlocked && (
                            <button
                                type="button"
                                className="recipe-warning-bubble"
                                title="User has been warned by admin for posting questionable recipes."
                                onClick={() => toast.warning(user.ModerationNote)}
                                aria-label="Show recipe posting warning"
                            >
                                <TriangleAlert size={18} />
                            </button>
                        )
                    }

                    <button
                        className="recipe-primary-button"
                        type="button"
                        onClick={openCreateRecipe}
                        disabled={Boolean(user?.RecipePostingBlocked)}
                        title={user?.RecipePostingBlocked ? "Recipe posting is disabled for this account." : ""}
                    >
                        <Plus size={18} />
                        Create Recipe
                    </button>
                </div>
            </header>

            <main className="recipes-shell">
                <aside className="recipes-filter-panel">
                    <div className="recipe-search-field">
                        <Search size={18} />
                        <input
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                search: e.target.value
                            }))}
                            placeholder="Search recipes"
                        />
                    </div>

                    <div className="recipe-filter-grid">
                        <label>
                            Sort
                            <select
                                value={filters.sort}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    sort: e.target.value
                                }))}
                            >
                                <option value="newest">Newest</option>
                                <option value="rating">Rating</option>
                                <option value="calories">Lowest calories</option>
                                <option value="protein">Highest protein</option>
                            </select>
                        </label>

                        <label className="recipe-rating-filter">
                            Rating
                            <div>
                                {
                                    [1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            type="button"
                                            className={Number(filters.minRating) >= rating ? "active" : ""}
                                            onClick={() => setRatingFilter(rating)}
                                            aria-label={`Filter ${rating} star rating and above`}
                                        >
                                            <Star size={17} />
                                        </button>
                                    ))
                                }
                            </div>
                        </label>

                        <label>
                            View
                            <select
                                value={filters.owner}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    owner: e.target.value
                                }))}
                            >
                                <option value="all">Public</option>
                                <option value="mine">Mine</option>
                            </select>
                        </label>

                        <label>
                            Max kcal
                            <input
                                type="number"
                                min="0"
                                value={filters.maxCalories}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    maxCalories: e.target.value
                                }))}
                            />
                        </label>

                        <label>
                            Min protein
                            <input
                                type="number"
                                min="0"
                                value={filters.minProtein}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    minProtein: e.target.value
                                }))}
                            />
                        </label>

                        <label>
                            Min carbs
                            <input
                                type="number"
                                min="0"
                                value={filters.minCarbs}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    minCarbs: e.target.value
                                }))}
                            />
                        </label>

                        <label>
                            Min fat
                            <input
                                type="number"
                                min="0"
                                value={filters.minFat}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    minFat: e.target.value
                                }))}
                            />
                        </label>
                    </div>

                    <div className="recipe-filter-heading">
                        <span className="section-kicker">Tags</span>
                        <button
                            type="button"
                            onClick={resetFilters}
                        >
                            Reset
                        </button>
                    </div>

                    <div className="recipe-tag-picker">
                        {
                            tags.map(tag => (
                                <button
                                    key={tag.Id}
                                    type="button"
                                    className={filters.selectedTags.includes(tag.Name) ? "active" : ""}
                                    onClick={() => toggleTag(tag.Name)}
                                >
                                    {tag.Name}
                                </button>
                            ))
                        }
                    </div>

                </aside>

                <section className="recipes-list-panel">
                    <div className="recipes-list-heading">
                        <div>
                            <span className="section-kicker">Browse</span>
                            <h2>{recipes.length} recipe{recipes.length === 1 ? "" : "s"}</h2>
                        </div>
                    </div>

                    {
                        loading
                            ? <p className="recipe-empty">Loading recipes...</p>
                            : loadError
                                ? (
                                    <div className="recipe-empty">
                                        <p>{loadError}</p>
                                        <button
                                            type="button"
                                            onClick={loadRecipes}
                                        >
                                            Try again
                                        </button>
                                    </div>
                                )
                                : recipes.length === 0
                                    ? <p className="recipe-empty">No recipes match those filters yet.</p>
                                : (
                                    <div className="recipe-card-grid">
                                        {
                                            recipes.map(recipe => (
                                                <article
                                                    className="recipe-card"
                                                    key={recipe.Id}
                                                    onClick={() => openRecipe(recipe.Id)}
                                                >
                                                    {
                                                        recipe.ImageUrl && (
                                                            <img
                                                                className="recipe-card-image"
                                                                src={getAssetUrl(recipe.ImageUrl)}
                                                                alt={recipe.Name}
                                                            />
                                                        )
                                                    }

                                                    <div className="recipe-card-header">
                                                        <div>
                                                            <span className="recipe-author-line">
                                                                {recipe.AuthorName}
                                                                {
                                                                    Boolean(recipe.AuthorTrusted) && (
                                                                        <ShieldCheck
                                                                            size={14}
                                                                            title="Trusted recipe creator"
                                                                        />
                                                                    )
                                                                }
                                                            </span>
                                                            <h3>{recipe.Name}</h3>
                                                        </div>

                                                        <div className="recipe-rating-badge">
                                                            <Star size={15} />
                                                            {formatNumber(recipe.AverageRating)}
                                                        </div>
                                                    </div>

                                                    <p>{recipe.Description || "Ingredient-backed recipe with checkable macros."}</p>

                                                    <div className="recipe-card-macros">
                                                        <span><Flame size={14} />{formatNumber(recipe.Calories)} kcal</span>
                                                        <span><Beef size={14} />{formatNumber(recipe.Protein)}g</span>
                                                        <span><Wheat size={14} />{formatNumber(recipe.Carbs)}g</span>
                                                        <span><Droplets size={14} />{formatNumber(recipe.Fat)}g</span>
                                                    </div>

                                                    <div className="recipe-tags">
                                                        {
                                                            filters.owner === "mine" && (
                                                                <span className={`recipe-status-pill ${recipe.Status.toLowerCase()}`}>
                                                                    {recipe.Status}
                                                                </span>
                                                            )
                                                        }
                                                        {
                                                            recipe.Tags.slice(0, 4).map(tag => (
                                                                <span key={tag}>{tag}</span>
                                                            ))
                                                        }
                                                    </div>
                                                </article>
                                            ))
                                        }
                                    </div>
                                )
                    }
                </section>
            </main>

            <CreateRecipeModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                tags={tags}
                foods={foods}
                onCreated={loadRecipes}
            />

            <CreateRecipeModal
                isOpen={Boolean(editingRecipe)}
                onClose={() => setEditingRecipe(null)}
                tags={tags}
                foods={foods}
                editRecipe={editingRecipe?.recipe}
                editIngredients={editingRecipe?.ingredients || []}
                onCreated={loadRecipes}
            />

            <RecipeDetailModal
                isOpen={Boolean(selectedRecipe)}
                recipe={selectedRecipe}
                ingredients={selectedIngredients}
                onClose={closeRecipe}
                onRated={() => {
                    loadRecipes();
                    if (selectedRecipe) openRecipe(selectedRecipe.Id);
                }}
                onEdit={openEditRecipe}
                currentUser={user}
                onTrustedChange={toggleTrustedAuthor}
            />

            <ModerationNotificationModal
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            {
                reportReplies.length > 0 && (
                    <div className="modal-overlay">
                        <div className="recipe-admin-message">
                            <div className="recipe-section-heading">
                                <div>
                                    <span className="section-kicker">Admin Response</span>
                                    <h3>{reportReplies[0].RecipeName}</h3>
                                </div>
                            </div>

                            <p>{reportReplies[0].AdminResponse}</p>

                            <button
                                className="recipe-primary-button"
                                type="button"
                                onClick={() => dismissReportReply(reportReplies[0].Id)}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default Recipes;
