/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import { clearToken } from "../services/authService";
import "../styles/History.css";

const getDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
};

const formatDateLabel = (dateKey, options) => (
    new Date(`${dateKey}T00:00:00`).toLocaleDateString("en", options)
);

function History() {
    const navigate = useNavigate();
    const [totals, setTotals] = useState([]);
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: ""
    });

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const macroValue = (meal, key) => Number(meal[key] || 0) * Number(meal.Grams || 0) / 100;

    const buildHistoryParams = (sourceFilters = filters) => {
        const params = {};

        if (sourceFilters.startDate) params.startDate = sourceFilters.startDate;
        if (sourceFilters.endDate) params.endDate = sourceFilters.endDate;
        if (!sourceFilters.startDate && !sourceFilters.endDate) params.all = true;

        return params;
    };

    const historyDays = useMemo(() => {
        const dateMap = new Map();
        const groupMap = new Map();

        meals.forEach(meal => {
            const dateKey = getDateKey(meal.Date || meal.LoggedAt);

            if (!dateKey) return;

            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, {
                    date: dateKey,
                    entries: []
                });
            }

            const day = dateMap.get(dateKey);
            const groupId = meal.RecipeLogId || meal.QuickMealLogId;

            if (groupId) {
                if (!groupMap.has(groupId)) {
                    const entry = {
                        id: groupId,
                        type: meal.RecipeLogId ? "Recipe" : "Quick meal",
                        name: meal.RecipeName || meal.QuickMealName || "Meal",
                        loggedAt: meal.LoggedAt,
                        calories: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                        ingredients: []
                    };

                    groupMap.set(groupId, entry);
                    day.entries.push(entry);
                }

                const entry = groupMap.get(groupId);

                entry.calories += macroValue(meal, "Calories");
                entry.protein += macroValue(meal, "Protein");
                entry.carbs += macroValue(meal, "Carbs");
                entry.fat += macroValue(meal, "Fat");
                entry.ingredients.push({
                    id: meal.Id,
                    name: meal.Name,
                    grams: meal.Grams
                });

                return;
            }

            day.entries.push({
                id: meal.Id,
                type: "Food",
                name: meal.Name,
                loggedAt: meal.LoggedAt,
                calories: macroValue(meal, "Calories"),
                protein: macroValue(meal, "Protein"),
                carbs: macroValue(meal, "Carbs"),
                fat: macroValue(meal, "Fat"),
                ingredients: [{
                    id: meal.Id,
                    name: meal.Name,
                    grams: meal.Grams
                }]
            });
        });

        return Array.from(dateMap.values());
    }, [meals]);

    const totalsByDate = useMemo(() => {
        return totals.reduce((map, day) => {
            map.set(getDateKey(day.Date), day);
            return map;
        }, new Map());
    }, [totals]);

    const loadHistory = async (customParams = null) => {
        try {
            setLoading(true);
            setLoadError("");
            const params = customParams || buildHistoryParams();

            const [totalsResult, mealsResult] = await Promise.allSettled([
                api.get("/meals/history", {
                    params
                }),
                api.get("/meals/history/detail", {
                    params
                })
            ]);

            if (totalsResult.status === "fulfilled") {
                setTotals(totalsResult.value.data);
            }
            else {
                console.error(totalsResult.reason);
            }

            if (mealsResult.status === "fulfilled") {
                setMeals(mealsResult.value.data);
            }
            else {
                console.error(mealsResult.reason);
            }

            if (totalsResult.status === "rejected" || mealsResult.status === "rejected") {
                const err = totalsResult.reason || mealsResult.reason;

                if (err.response?.status === 401 || err.response?.status === 404) {
                    clearToken();
                    toast.error("Please log in again.");
                    navigate("/login");
                    return;
                }

                if (mealsResult.status === "rejected") {
                    setLoadError(err.response?.data?.message || "Meal history took too long to load.");
                }

                toast.error(err.response?.data?.message || "Some history data failed to load.");
            }
        }
        catch (err) {
            console.error(err);

            if (err.response?.status === 401 || err.response?.status === 404) {
                clearToken();
                toast.error("Please log in again.");
                navigate("/login");
                return;
            }

            setLoadError(err.response?.data?.message || "Meal history took too long to load.");
            toast.error(err.response?.data?.message || "Failed to load history.");
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    return (
        <div className="history-page">
            <header className="history-topbar">
                <button
                    className="history-secondary-button"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft size={18} />
                    Dashboard
                </button>

                <div>
                    <span className="section-kicker">History</span>
                    <h1>Meal History</h1>
                </div>

                <CalendarDays size={34} />
            </header>

            <main className="history-shell">
                <section className="history-filter-panel">
                    <label>
                        From
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                startDate: e.target.value
                            }))}
                        />
                    </label>

                    <label>
                        To
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                endDate: e.target.value
                            }))}
                        />
                    </label>

                    <button
                        className="history-primary-button"
                        type="button"
                        onClick={() => loadHistory()}
                    >
                        <Search size={18} />
                        Search
                    </button>

                    <button
                        className="history-secondary-button"
                        type="button"
                        onClick={() => {
                            setFilters({
                                startDate: "",
                                endDate: ""
                            });
                            loadHistory({
                                all: true
                            });
                        }}
                    >
                        All History
                    </button>
                </section>

                <section className="history-list-panel">
                    {
                        loading
                            ? <p className="history-empty">Loading meal history...</p>
                            : loadError
                                ? (
                                    <div className="history-empty">
                                        <p>{loadError}</p>
                                        <button
                                            type="button"
                                            onClick={() => loadHistory()}
                                        >
                                            Try again
                                        </button>
                                    </div>
                                )
                                : historyDays.length === 0
                                ? <p className="history-empty">No meals recorded for this range.</p>
                                : historyDays.map(day => {
                                    const total = totalsByDate.get(day.date);

                                    return (
                                        <article
                                            className="history-date-card"
                                            key={day.date}
                                        >
                                            <div className="history-date-heading">
                                                <div>
                                                    <span className="section-kicker">
                                                        {formatDateLabel(day.date, {
                                                            weekday: "long"
                                                        })}
                                                    </span>
                                                    <h2>{formatDateLabel(day.date, {
                                                        month: "long",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })}</h2>
                                                </div>

                                                <strong>{formatNumber(total?.Calories)} kcal</strong>
                                            </div>

                                            <div className="history-total-grid">
                                                <span>Protein <strong>{formatNumber(total?.Protein)}g</strong></span>
                                                <span>Carbs <strong>{formatNumber(total?.Carbs)}g</strong></span>
                                                <span>Fat <strong>{formatNumber(total?.Fat)}g</strong></span>
                                            </div>

                                            <div className="history-entry-list">
                                                {
                                                    day.entries.map(entry => (
                                                        <div
                                                            className="history-entry"
                                                            key={entry.id}
                                                        >
                                                            <div className="history-entry-main">
                                                                <span>{entry.type}</span>
                                                                <h3>{entry.name}</h3>
                                                                <small>
                                                                    {new Date(entry.loggedAt).toLocaleTimeString("en", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit"
                                                                    })}
                                                                </small>
                                                            </div>

                                                            <div className="history-entry-macros">
                                                                <span>{formatNumber(entry.calories)} kcal</span>
                                                                <span>{formatNumber(entry.protein)}g protein</span>
                                                                <span>{formatNumber(entry.carbs)}g carbs</span>
                                                                <span>{formatNumber(entry.fat)}g fat</span>
                                                            </div>

                                                            <div className="history-entry-ingredients">
                                                                {
                                                                    entry.ingredients.map(ingredient => (
                                                                        <span key={ingredient.id}>
                                                                            {ingredient.name} · {formatNumber(ingredient.grams)}g
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </article>
                                    );
                                })
                    }
                </section>
            </main>
        </div>
    );
}

export default History;
