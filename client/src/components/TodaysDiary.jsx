import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "../services/api";

import "../styles/TodaysDiary.css";

/* eslint-disable react-hooks/set-state-in-effect */

function TodaysDiary({
    onTotalsChanged,
    refreshTrigger
}) {
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(max-width: 720px)").matches
    ));

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const macroValue = (meal, key) => Number(meal[key] || 0) * Number(meal.Grams || 0) / 100;

    const calculateTotals = (mealList) => {
        const totals = mealList.reduce((sum, meal) => ({
            calories: sum.calories + macroValue(meal, "Calories"),
            protein: sum.protein + macroValue(meal, "Protein"),
            carbs: sum.carbs + macroValue(meal, "Carbs"),
            fat: sum.fat + macroValue(meal, "Fat")
        }), {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        });

        onTotalsChanged?.({
            calories: Number(totals.calories.toFixed(1)),
            protein: Number(totals.protein.toFixed(1)),
            carbs: Number(totals.carbs.toFixed(1)),
            fat: Number(totals.fat.toFixed(1))
        });
    };

    const loadMeals = async () => {
        try {
            setLoading(true);

            const response = await api.get("/meals/today");

            setMeals(response.data);
            calculateTotals(response.data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };

    const deleteMeal = async (meal) => {
        try {
            if (meal.type === "quickMeal" || meal.type === "recipe") {
                await api.delete(`/meals/group/${meal.groupId}`);
            }
            else {
                await api.delete(`/meals/${meal.id}`);
            }

            await loadMeals();
        }
        catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadMeals();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const diaryEntries = useMemo(() => {
        const grouped = [];
        const mealGroupMap = new Map();

        meals.forEach(meal => {
            const groupId = meal.RecipeLogId || meal.QuickMealLogId;

            if (groupId) {
                if (!mealGroupMap.has(groupId)) {
                    const isRecipe = Boolean(meal.RecipeLogId);
                    const entry = {
                        type: isRecipe ? "recipe" : "quickMeal",
                        id: groupId,
                        groupId,
                        name: isRecipe
                            ? meal.RecipeName || "Recipe"
                            : meal.QuickMealName || "Quick Meal",
                        loggedAt: meal.LoggedAt,
                        items: [],
                        totals: {
                            calories: 0,
                            protein: 0,
                            carbs: 0,
                            fat: 0
                        }
                    };

                    mealGroupMap.set(groupId, entry);
                    grouped.push(entry);
                }

                const entry = mealGroupMap.get(groupId);

                entry.items.push(meal);
                entry.totals.calories += macroValue(meal, "Calories");
                entry.totals.protein += macroValue(meal, "Protein");
                entry.totals.carbs += macroValue(meal, "Carbs");
                entry.totals.fat += macroValue(meal, "Fat");

                return;
            }

            grouped.push({
                type: "food",
                id: meal.Id,
                name: meal.Name,
                grams: meal.Grams,
                loggedAt: meal.LoggedAt,
                items: [meal],
                totals: {
                    calories: macroValue(meal, "Calories"),
                    protein: macroValue(meal, "Protein"),
                    carbs: macroValue(meal, "Carbs"),
                    fat: macroValue(meal, "Fat")
                }
            });
        });

        return grouped;
    }, [meals]);

    if (loading) {
        return (
            <section className="todays-diary">
                <div className="diary-section-header">
                    <div>
                        <span className="section-kicker">Diary</span>
                        <h2>Today's Food</h2>
                    </div>

                    <button
                        className="dashboard-collapse-button"
                        type="button"
                        onClick={() => setCollapsed(prev => !prev)}
                        aria-label={collapsed ? "Show today's food" : "Hide today's food"}
                    >
                        {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>

                <p className="empty-diary">Loading today's meals...</p>
            </section>
        );
    }

    return (
        <section className="todays-diary">
            <div className="diary-section-header">
                <div>
                    <span className="section-kicker">Diary</span>
                    <h2>Today's Food</h2>
                </div>

                <div className="diary-header-actions">
                    <span className="diary-count">
                        {diaryEntries.length} {diaryEntries.length === 1 ? "entry" : "entries"}
                    </span>

                    <button
                        className="dashboard-collapse-button"
                        type="button"
                        onClick={() => setCollapsed(prev => !prev)}
                        aria-label={collapsed ? "Show today's food" : "Hide today's food"}
                        title={collapsed ? "Show" : "Minimize"}
                    >
                        {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {
                collapsed
                    ? (
                        <p className="dashboard-collapsed-summary">
                            {diaryEntries.length === 0
                                ? "No meals logged yet."
                                : `${diaryEntries.length} saved ${diaryEntries.length === 1 ? "entry" : "entries"} hidden.`}
                        </p>
                    )
                    : diaryEntries.length === 0
                    ? (
                        <p className="empty-diary">
                            No meals added today.
                        </p>
                    )
                    : diaryEntries.map(entry => (
                        <article
                            key={entry.id}
                            className={`diary-meal ${entry.type === "quickMeal" ? "quick-meal-entry" : ""} ${entry.type === "recipe" ? "recipe-meal-entry" : ""}`}
                        >
                            <div className="meal-info">
                                <div className="meal-title-row">
                                    <div>
                                        <span className="meal-type">
                                            {
                                                entry.type === "quickMeal"
                                                    ? "Quick meal"
                                                    : entry.type === "recipe"
                                                        ? "Recipe"
                                                        : "Food"
                                            }
                                        </span>

                                        <h3>{entry.name}</h3>
                                    </div>

                                    <strong>{formatNumber(entry.totals.calories)} kcal</strong>
                                </div>

                                <div className="meal-macros">
                                    <span>{formatNumber(entry.totals.protein)}g protein</span>
                                    <span>{formatNumber(entry.totals.carbs)}g carbs</span>
                                    <span>{formatNumber(entry.totals.fat)}g fat</span>
                                </div>

                                {
                                    entry.type === "quickMeal"
                                    || entry.type === "recipe"
                                        ? (
                                            <div className="meal-items">
                                                {
                                                    entry.items.map(item => (
                                                        <span key={item.Id}>
                                                            {item.Name} · {formatNumber(item.Grams)}g
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        )
                                        : (
                                            <p className="meal-serving">
                                                {formatNumber(entry.grams)}g logged
                                            </p>
                                        )
                                }
                            </div>

                            <button
                                className="delete-meal-btn"
                                onClick={() => deleteMeal(entry)}
                            >
                                Delete
                            </button>
                        </article>
                    ))
            }
        </section>
    );
}

export default TodaysDiary;
