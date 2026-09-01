import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, Search, Star } from "lucide-react";
import { toast } from "react-toastify";
import api, { getAssetUrl } from "../services/api";
import { clearToken } from "../services/authService";

import "../styles/Dashboard.css";

import quotes from "../data/quotes";

import FoodDatabaseModal from "../components/FoodDatabaseModal";
import MacroCalculatorModal from "../components/MacroCalculatorModal";
import QuickMealsModal from "../components/QuickMealsModal";
import RecipeDetailModal from "../components/RecipeDetailModal";
import TodaysDiary from "../components/TodaysDiary";
import ActiveWorkoutSplit from "../components/ActiveWorkoutSplit";
import ModerationNotificationModal from "../components/ModerationNotificationModal";

const DEFAULT_TARGETS = {
    calories: 2500,
    protein: 180,
    carbs: 300,
    fat: 80
};

const getProfileTargets = (profile) => {
    if (
        profile?.TargetCalories == null ||
        profile?.TargetProtein == null ||
        profile?.TargetCarbs == null ||
        profile?.TargetFat == null
    ) {
        return DEFAULT_TARGETS;
    }

    return {
        calories: Number(profile.TargetCalories),
        protein: Number(profile.TargetProtein),
        carbs: Number(profile.TargetCarbs),
        fat: Number(profile.TargetFat)
    };
};

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [quote, setQuote] = useState(null);
    const [targets, setTargets] = useState(DEFAULT_TARGETS);
    const [showFoodDatabase, setShowFoodDatabase] = useState(false);
    const [showQuickMeals, setShowQuickMeals] = useState(false);
    const [showMacroCalculator, setShowMacroCalculator] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: ""
    });
    const [recipeSearch, setRecipeSearch] = useState("");
    const [recipeSuggestions, setRecipeSuggestions] = useState([]);
    const [recipeLoading, setRecipeLoading] = useState(false);
    const [fitRestCollapsed, setFitRestCollapsed] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(max-width: 720px)").matches
    ));
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [selectedRecipeIngredients, setSelectedRecipeIngredients] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [dashboardError, setDashboardError] = useState("");
    const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
    const [totals, setTotals] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    });
    const [refreshDiary, setRefreshDiary] = useState(0);

    const today = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "short",
        day: "numeric"
    }).format(new Date());

    const caloriePercent = Math.min((totals.calories / targets.calories) * 100, 100);
    const caloriesLeft = Math.max(targets.calories - totals.calories, 0);
    const remainingMacros = useMemo(() => ({
        calories: Math.max(targets.calories - totals.calories, 0),
        protein: Math.max(targets.protein - totals.protein, 0),
        carbs: Math.max(targets.carbs - totals.carbs, 0),
        fat: Math.max(targets.fat - totals.fat, 0)
    }), [
        targets.calories,
        targets.carbs,
        targets.fat,
        targets.protein,
        totals.calories,
        totals.carbs,
        totals.fat,
        totals.protein
    ]);

    const macroStats = useMemo(() => [
        {
            label: "Protein",
            value: totals.protein,
            target: targets.protein,
            color: "#ef4444"
        },
        {
            label: "Carbs",
            value: totals.carbs,
            target: targets.carbs,
            color: "#facc15"
        },
        {
            label: "Fat",
            value: totals.fat,
            target: targets.fat,
            color: "#3b82f6"
        }
    ], [
        targets.carbs,
        targets.fat,
        targets.protein,
        totals.carbs,
        totals.fat,
        totals.protein
    ]);

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const macroWarnings = useMemo(() => {
        const entries = [
            ["Calories", totals.calories, targets.calories, "kcal"],
            ["Protein", totals.protein, targets.protein, "g"],
            ["Carbs", totals.carbs, targets.carbs, "g"],
            ["Fat", totals.fat, targets.fat, "g"]
        ];

        return entries
            .filter(([, value, target]) => Number(value) > Number(target))
            .map(([label, value, target, unit]) => ({
                label,
                amount: Number(value) - Number(target),
                unit
            }));
    }, [
        targets.calories,
        targets.carbs,
        targets.fat,
        targets.protein,
        totals.calories,
        totals.carbs,
        totals.fat,
        totals.protein
    ]);

    const handleLogout = () => {
        clearToken();
        navigate("/login");
    };

    const changePassword = async (e) => {
        e.preventDefault();

        try {
            await api.put("/auth/password", passwordForm);
            toast.success("Password changed.");
            setPasswordForm({
                currentPassword: "",
                newPassword: ""
            });
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to change password.");
        }
    };

    const uploadProfilePicture = async () => {
        if (!profileImageFile) {
            toast.error("Choose a profile picture first.");
            return;
        }

        try {
            const payload = new FormData();
            payload.append("image", profileImageFile);

            const response = await api.post("/auth/profile-picture", payload, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            setUser(prev => ({
                ...prev,
                ProfileImageUrl: response.data.imageUrl
            }));
            setProfileImageFile(null);
            toast.success("Profile picture updated.");
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to upload profile picture.");
        }
    };

    const refreshMeals = () => {
        setRefreshDiary(prev => prev + 1);
    };

    const handleTargetsUpdated = ({ user: updatedUser, targets: updatedTargets }) => {
        setUser(prev => ({
            ...prev,
            ...updatedUser
        }));
        setTargets(updatedTargets);
    };

    const loadRecipeSuggestions = async () => {
        try {
            setRecipeLoading(true);

            const params = {
                sort: "protein",
                maxCalories: Math.max(Math.round(remainingMacros.calories), 0),
                maxProtein: Math.max(Math.ceil(remainingMacros.protein), 0),
                maxCarbs: Math.max(Math.ceil(remainingMacros.carbs), 0),
                maxFat: Math.max(Math.ceil(remainingMacros.fat), 0)
            };

            if (recipeSearch.trim()) {
                params.search = recipeSearch.trim();
            }

            const response = await api.get("/recipes", {
                params
            });

            const fittingRecipes = response.data.filter(recipe => (
                Number(recipe.Calories || 0) <= remainingMacros.calories
                && Number(recipe.Protein || 0) <= remainingMacros.protein
                && Number(recipe.Carbs || 0) <= remainingMacros.carbs
                && Number(recipe.Fat || 0) <= remainingMacros.fat
            ));

            setRecipeSuggestions(fittingRecipes.slice(0, 4));
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setRecipeLoading(false);
        }
    };

    const openRecipe = async (recipeId) => {
        try {
            const response = await api.get(`/recipes/${recipeId}`);

            setSelectedRecipe(response.data.recipe);
            setSelectedRecipeIngredients(response.data.ingredients);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to open recipe.");
        }
    };

    const addRecipeToDiary = async (recipeId) => {
        try {
            await api.post(`/recipes/${recipeId}/add-to-diary`);
            toast.success("Recipe added to today's diary.");
            refreshMeals();
            await loadRecipeSuggestions();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to add recipe.");
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setDashboardError("");
                const profileResponse = await api.get("/auth/profile");

                setUser(profileResponse.data);
                setTargets(getProfileTargets(profileResponse.data));
                setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
            }
            catch (err) {
                console.error(err);

                if (err.response?.status === 401 || err.response?.status === 404) {
                    clearToken();
                    toast.error("Please log in again.");
                    navigate("/login");
                }
                else if (err.response?.status === 403) {
                    if (err.response.data?.banned) {
                        sessionStorage.setItem("macrotrackerBanNotice", JSON.stringify({
                            message: err.response.data.message,
                            banExpiresAt: err.response.data.banExpiresAt
                        }));
                    }
                    clearToken();
                    toast.error(err.response?.data?.message || "Account access disabled.");
                    navigate("/login");
                }
                else {
                    setDashboardError(err.response?.data?.message || "Dashboard took too long to load.");
                }
            }
        };

        const fetchNotifications = async () => {
            try {
                const notificationResponse = await api.get("/notifications");
                setNotifications(notificationResponse.data);
            }
            catch (err) {
                console.error(err);
            }
        };

        fetchProfile();
        fetchNotifications();
    }, [navigate, dashboardReloadKey]);

    const dismissNotification = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/dismiss`);
            setNotifications(prev => prev.filter(notification => notification.Id !== notificationId));
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to dismiss admin message.");
        }
    };

    if (!user || !quote) {
        return (
            <div className="dashboard-loading">
                <p>{dashboardError || "Loading your dashboard..."}</p>
                {
                    dashboardError && (
                        <button
                            type="button"
                            onClick={() => setDashboardReloadKey(prev => prev + 1)}
                        >
                            Try again
                        </button>
                    )
                }
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-topbar">
                <div className="brand-lockup">
                    <div className="brand-mark">MT</div>
                    <div>
                        <strong>MacroTracker</strong>
                        <span>{today}</span>
                    </div>
                </div>

                <div className="dashboard-topbar-actions">
                    <button
                        className="logout-button"
                        type="button"
                        onClick={() => setShowAccountModal(true)}
                    >
                        Account
                    </button>

                    <button
                        className="logout-button"
                        type="button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-shell">
                <section className="dashboard-hero">
                    <div className="welcome-panel">
                        <span className="section-kicker">Today</span>

                        <h1>Welcome back, {user.FirstName}</h1>

                        <p>
                            Keep today simple: log the food, watch the numbers, adjust the next meal.
                        </p>
                    </div>

                    <div className="calorie-panel">
                        <div
                            className="calorie-orb"
                            style={{
                                "--calorie-progress": `${caloriePercent}%`
                            }}
                        >
                            <span>{Math.round(caloriePercent)}%</span>
                        </div>

                        <div>
                            <span className="section-kicker">Calories</span>
                            <strong>{formatNumber(totals.calories)} / {formatNumber(targets.calories)}</strong>
                            <p>{formatNumber(caloriesLeft)} kcal left</p>
                        </div>
                    </div>
                </section>

                <section className="quick-actions-panel">
                    <button
                        className="primary-action"
                        type="button"
                        onClick={() => setShowFoodDatabase(true)}
                    >
                        <span>Add Food</span>
                        <small>Search your foods and log grams</small>
                    </button>

                    <button
                        className="primary-action"
                        type="button"
                        onClick={() => setShowQuickMeals(true)}
                    >
                        <span>Add Quick Meal</span>
                        <small>Log a saved meal in one step</small>
                    </button>
                </section>

                <section className="dashboard-content">
                    <div className="dashboard-main-column">
                        <section className="macro-panel">
                            <div className="panel-heading">
                                <div>
                                    <span className="section-kicker">Macros</span>
                                    <h2>Daily Targets</h2>
                                </div>
                            </div>

                            <div className="macro-grid">
                                {
                                    macroStats.map(macro => {
                                        const percent = Math.min((macro.value / macro.target) * 100, 100);

                                        return (
                                            <article
                                                className="macro-card"
                                                key={macro.label}
                                            >
                                                <div className="macro-card-header">
                                                    <span>{macro.label}</span>
                                                    <strong>{Math.round(percent)}%</strong>
                                                </div>

                                                <div className="macro-meter">
                                                    <div
                                                        style={{
                                                            width: `${percent}%`,
                                                            background: macro.color
                                                        }}
                                                    />
                                                </div>

                                                <p>
                                                    {formatNumber(macro.value)}g of {macro.target}g
                                                </p>
                                            </article>
                                        );
                                    })
                                }
                            </div>

                            {
                                macroWarnings.length > 0 && (
                                    <div className="macro-warning-list">
                                        {
                                            macroWarnings.map(warning => (
                                                <div
                                                    className="macro-warning"
                                                    key={warning.label}
                                                >
                                                    <AlertTriangle size={17} />
                                                    <span>
                                                        {warning.label} is over by {formatNumber(warning.amount)}{warning.unit}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )
                            }
                        </section>

                        <TodaysDiary
                            refreshTrigger={refreshDiary}
                            onTotalsChanged={setTotals}
                        />

                        <ActiveWorkoutSplit />
                    </div>

                    <aside className="dashboard-side-column">
                        <section className="quote-panel">
                            <span className="section-kicker">Mindset</span>
                            <p>"{quote.text}"</p>
                            <strong>{quote.author}</strong>
                        </section>

                        <section className="recipe-finder-panel">
                            <div className="panel-heading">
                                <div>
                                    <span className="section-kicker">Recipes</span>
                                    <h2>Fit The Rest</h2>
                                </div>

                                <div className="panel-heading-actions">
                                    <BookOpen size={22} />
                                    <button
                                        className="dashboard-collapse-button"
                                        type="button"
                                        onClick={() => {
                                            const nextCollapsed = !fitRestCollapsed;
                                            setFitRestCollapsed(nextCollapsed);

                                            if (!nextCollapsed && recipeSuggestions.length === 0) {
                                                loadRecipeSuggestions();
                                            }
                                        }}
                                        aria-label={fitRestCollapsed ? "Show Fit The Rest" : "Hide Fit The Rest"}
                                        title={fitRestCollapsed ? "Show" : "Minimize"}
                                    >
                                        {fitRestCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                    </button>
                                </div>
                            </div>

                            {
                                fitRestCollapsed
                                    ? (
                                        <p className="dashboard-collapsed-summary">
                                            {formatNumber(remainingMacros.calories)} kcal left. Open to find a recipe.
                                        </p>
                                    )
                                    : (
                                        <>
                                            <div className="remaining-macro-strip">
                                                <span>{formatNumber(remainingMacros.calories)} kcal</span>
                                                <span>P {formatNumber(remainingMacros.protein)}g</span>
                                                <span>C {formatNumber(remainingMacros.carbs)}g</span>
                                                <span>F {formatNumber(remainingMacros.fat)}g</span>
                                            </div>

                                            <div className="dashboard-recipe-search">
                                                <Search size={17} />
                                                <input
                                                    value={recipeSearch}
                                                    onChange={(e) => setRecipeSearch(e.target.value)}
                                                    placeholder="Search recipes"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={loadRecipeSuggestions}
                                                >
                                                    Go
                                                </button>
                                            </div>

                                            <div className="dashboard-recipe-list">
                                                {
                                                    recipeLoading
                                                        ? <p>Finding recipes...</p>
                                                        : recipeSuggestions.length === 0
                                                            ? <p>No recipes fit the remaining macros yet.</p>
                                                            : recipeSuggestions.map(recipe => (
                                                                <article
                                                                    className="dashboard-recipe-card"
                                                                    key={recipe.Id}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openRecipe(recipe.Id)}
                                                                    >
                                                                        <span>{recipe.Name}</span>
                                                                        <small>
                                                                            {formatNumber(recipe.Calories)} kcal · {formatNumber(recipe.Protein)}g protein
                                                                        </small>
                                                                        <strong>
                                                                            <Star size={13} />
                                                                            {formatNumber(recipe.AverageRating)}
                                                                        </strong>
                                                                    </button>

                                                                    <button
                                                                        className="dashboard-add-recipe"
                                                                        type="button"
                                                                        onClick={() => addRecipeToDiary(recipe.Id)}
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </article>
                                                            ))
                                                }
                                            </div>
                                        </>
                                    )
                            }
                        </section>

                        <section className="tools-panel">
                            <div className="panel-heading">
                                <div>
                                    <span className="section-kicker">Next</span>
                                    <h2>Tools</h2>
                                </div>
                            </div>

                            <button
                                className="tool-row"
                                type="button"
                                onClick={() => navigate("/recipes")}
                            >
                                <span>Recipes</span>
                                <small>Build foods from multiple ingredients</small>
                            </button>

                            <button
                                className="tool-row"
                                type="button"
                                onClick={() => setShowMacroCalculator(true)}
                            >
                                <span>Macro Calculator</span>
                                <small>Estimate targets from your goal</small>
                            </button>

                            <button
                                className="tool-row"
                                type="button"
                                onClick={() => navigate("/history")}
                            >
                                <span>Meal History</span>
                                <small>Search every logged meal by date</small>
                            </button>

                            <button
                                className="tool-row"
                                type="button"
                                onClick={() => navigate("/workout-splits")}
                            >
                                <span>Workout Splits</span>
                                <small>Browse training plans and track your working kg</small>
                            </button>

                            {
                                user.Role === "admin" && (
                                    <button
                                        className="tool-row"
                                        type="button"
                                        onClick={() => navigate("/admin")}
                                    >
                                        <span>Admin</span>
                                        <small>Moderate foods, recipes, and posting access</small>
                                    </button>
                                )
                            }
                        </section>
                    </aside>
                </section>
            </main>

            <FoodDatabaseModal
                isOpen={showFoodDatabase}
                onClose={() => setShowFoodDatabase(false)}
                onMealAdded={refreshMeals}
            />

            <QuickMealsModal
                isOpen={showQuickMeals}
                onClose={() => setShowQuickMeals(false)}
                onMealAdded={refreshMeals}
            />

            <MacroCalculatorModal
                isOpen={showMacroCalculator}
                onClose={() => setShowMacroCalculator(false)}
                user={user}
                onTargetsUpdated={handleTargetsUpdated}
            />

            <RecipeDetailModal
                isOpen={Boolean(selectedRecipe)}
                recipe={selectedRecipe}
                ingredients={selectedRecipeIngredients}
                onClose={() => {
                    setSelectedRecipe(null);
                    setSelectedRecipeIngredients([]);
                }}
                onRated={() => {
                    loadRecipeSuggestions();
                    if (selectedRecipe) openRecipe(selectedRecipe.Id);
                }}
                onAddedToDiary={() => {
                    refreshMeals();
                    loadRecipeSuggestions();
                }}
            />

            <ModerationNotificationModal
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            {
                showAccountModal && (
                    <div className="modal-overlay">
                        <div className="account-modal">
                            <div className="account-modal-header">
                                <div>
                                    <span className="section-kicker">Account</span>
                                    <h2>{user.FirstName}</h2>
                                </div>

                                <button
                                    className="close-button"
                                    type="button"
                                    onClick={() => setShowAccountModal(false)}
                                >
                                    x
                                </button>
                            </div>

                            <div className="account-avatar-row">
                                <div className="account-avatar">
                                    {
                                        user.ProfileImageUrl
                                            ? (
                                                <img
                                                    src={getAssetUrl(user.ProfileImageUrl)}
                                                    alt={user.FirstName}
                                                />
                                            )
                                            : user.FirstName?.slice(0, 1)
                                    }
                                </div>

                                <label>
                                    Profile picture
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                                    />
                                </label>

                                <button
                                    className="logout-button"
                                    type="button"
                                    onClick={uploadProfilePicture}
                                >
                                    Upload
                                </button>
                            </div>

                            <form
                                className="account-password-form"
                                onSubmit={changePassword}
                            >
                                <label>
                                    Current password
                                    <input
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm(prev => ({
                                            ...prev,
                                            currentPassword: e.target.value
                                        }))}
                                    />
                                </label>

                                <label>
                                    New password
                                    <input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm(prev => ({
                                            ...prev,
                                            newPassword: e.target.value
                                        }))}
                                    />
                                </label>

                                <button
                                    className="logout-button"
                                    type="submit"
                                >
                                    Change Password
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default Dashboard;
