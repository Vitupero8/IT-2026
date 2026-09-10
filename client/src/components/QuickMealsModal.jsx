import { useEffect, useMemo, useState } from "react";
import {
    Beef,
    Droplets,
    Flame,
    Pencil,
    Plus,
    Trash2,
    Utensils,
    Wheat,
    X
} from "lucide-react";
import api from "../services/api";
import Toast from "./Toast";
import "../styles/QuickMealsModal.css";

/* eslint-disable react-hooks/set-state-in-effect */

function QuickMealsModal({
    isOpen,
    onClose,
    onMealAdded
}) {
    const emptyForm = {
        name: "",
        items: []
    };

    const emptyDraft = {
        mode: "food",
        foodId: "",
        grams: "",
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: ""
    };

    const [quickMeals, setQuickMeals] = useState([]);
    const [foods, setFoods] = useState([]);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [mode, setMode] = useState("browse");
    const [form, setForm] = useState(emptyForm);
    const [draftItem, setDraftItem] = useState(emptyDraft);
    const [loading, setLoading] = useState(false);
    const [foodLoading, setFoodLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success"
    });
    const [deletePrompt, setDeletePrompt] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({
            show: true,
            message,
            type
        });
    };

    const hideToast = () => {
        setToast(prev => ({
            ...prev,
            show: false
        }));
    };

    const formatNumber = (value) => {
        const number = Number(value || 0);
        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const resetForm = () => {
        setForm(emptyForm);
        setDraftItem(emptyDraft);
        setSelectedMeal(null);
        setMode("browse");
    };

    const loadQuickMeals = async () => {
        try {
            setLoading(true);

            const response = await api.get("/quick-meals");

            setQuickMeals(response.data);
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to load quick meals.",
                "error"
            );
        }
        finally {
            setLoading(false);
        }
    };

    const loadFoods = async () => {
        try {
            setFoodLoading(true);
            const response = await api.get("/foods", {
                params: {
                    scope: "all"
                }
            });
            setFoods(response.data);
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to load foods.",
                "error"
            );
        }
        finally {
            setFoodLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        resetForm();
        loadQuickMeals();
        loadFoods();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const formTotals = useMemo(() => {
        return form.items.reduce((totals, item) => {
            const multiplier = Number(item.grams) / 100;

            return {
                calories: totals.calories + Number(item.Calories || 0) * multiplier,
                protein: totals.protein + Number(item.Protein || 0) * multiplier,
                carbs: totals.carbs + Number(item.Carbs || 0) * multiplier,
                fat: totals.fat + Number(item.Fat || 0) * multiplier
            };
        }, {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        });
    }, [form.items]);

    const selectedTotals = useMemo(() => {
        if (!selectedMeal?.items) return null;

        return selectedMeal.items.reduce((totals, item) => {
            const multiplier = Number(item.Grams || 0) / 100;

            return {
                calories: totals.calories + Number(item.Calories || 0) * multiplier,
                protein: totals.protein + Number(item.Protein || 0) * multiplier,
                carbs: totals.carbs + Number(item.Carbs || 0) * multiplier,
                fat: totals.fat + Number(item.Fat || 0) * multiplier
            };
        }, {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        });
    }, [selectedMeal]);

    const renderMacroGrid = (totals) => {
        const macros = [
            {
                label: "Calories",
                value: `${formatNumber(totals.calories)} kcal`,
                sublabel: "meal total",
                icon: <Flame size={20} />
            },
            {
                label: "Protein",
                value: `${formatNumber(totals.protein)}g`,
                sublabel: "protein",
                icon: <Beef size={20} />
            },
            {
                label: "Carbs",
                value: `${formatNumber(totals.carbs)}g`,
                sublabel: "carbs",
                icon: <Wheat size={20} />
            },
            {
                label: "Fat",
                value: `${formatNumber(totals.fat)}g`,
                sublabel: "fat",
                icon: <Droplets size={20} />
            }
        ];

        return (
            <div className="quick-nutrition-grid">
                {
                    macros.map(macro => (
                        <article key={macro.label}>
                            {macro.icon}
                            <span>{macro.label}</span>
                            <strong>{macro.value}</strong>
                            <small>{macro.sublabel}</small>
                        </article>
                    ))
                }
            </div>
        );
    };

    const startAdding = () => {
        resetForm();
        setMode("add");
    };

    const selectMeal = async (meal) => {
        try {
            const response = await api.get(`/quick-meals/${meal.Id}`);

            setSelectedMeal({
                ...response.data.meal,
                items: response.data.items
            });
            setMode("browse");
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to load quick meal.",
                "error"
            );
        }
    };

    const startEditing = async (meal) => {
        try {
            const response = await api.get(`/quick-meals/${meal.Id}`);

            setSelectedMeal(response.data.meal);
            setForm({
                name: response.data.meal.Name,
                items: response.data.items
            });
            setDraftItem(emptyDraft);
            setMode("edit");
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to load quick meal.",
                "error"
            );
        }
    };

    const addItemToForm = () => {
        const grams = Number(draftItem.grams);

        if (grams <= 0) {
            showToast("Enter valid grams.", "error");
            return;
        }

        if (draftItem.mode === "manual") {
            const macros = {
                Calories: Number(draftItem.calories),
                Protein: Number(draftItem.protein),
                Carbs: Number(draftItem.carbs),
                Fat: Number(draftItem.fat)
            };

            if (!draftItem.name.trim()) {
                showToast("Name the custom food.", "error");
                return;
            }

            if (Object.values(macros).some(value => Number.isNaN(value) || value < 0)) {
                showToast("Custom food macros must be zero or higher.", "error");
                return;
            }

            setForm(prev => ({
                ...prev,
                items: [
                    ...prev.items,
                    {
                        Name: draftItem.name.trim(),
                        Grams: grams,
                        grams,
                        Custom: true,
                        ...macros
                    }
                ]
            }));
            setDraftItem({
                ...emptyDraft,
                mode: "manual"
            });
            return;
        }

        const selectedFood = foods.find(food => food.Id === Number(draftItem.foodId));

        if (!selectedFood) {
            showToast("Choose a food from the database.", "error");
            return;
        }

        setForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    ...selectedFood,
                    FoodId: selectedFood.Id,
                    Grams: grams,
                    grams
                }
            ]
        }));
        setDraftItem(emptyDraft);
    };

    const removeItem = (index) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, itemIndex) => itemIndex !== index)
        }));
    };

    const saveQuickMeal = async (e) => {
        e.preventDefault();

        if (!form.name.trim() || form.items.length === 0) {
            showToast("Name the meal and add at least one food.", "error");
            return;
        }

        const payload = {
            name: form.name.trim(),
            items: form.items.map(item => ({
                foodId: item.Custom ? null : Number(item.FoodId || item.Id),
                name: item.Name,
                grams: Number(item.Grams || item.grams),
                calories: Number(item.Calories || 0),
                protein: Number(item.Protein || 0),
                carbs: Number(item.Carbs || 0),
                fat: Number(item.Fat || 0)
            }))
        };

        try {
            setSaving(true);

            if (mode === "add") {
                await api.post("/quick-meals", payload);
                showToast("Quick meal saved.");
            }
            else {
                await api.put(`/quick-meals/${selectedMeal.Id}`, payload);
                showToast("Quick meal updated.");
            }

            await loadQuickMeals();
            resetForm();
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to save quick meal.",
                "error"
            );
        }
        finally {
            setSaving(false);
        }
    };

    const performDeleteQuickMeal = async (meal) => {
        try {
            setDeletePrompt(null);
            await api.delete(`/quick-meals/${meal.Id}`);
            showToast("Quick meal deleted.");

            if (selectedMeal?.Id === meal.Id) {
                resetForm();
            }

            await loadQuickMeals();
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to delete quick meal.",
                "error"
            );
        }
    };

    const deleteQuickMeal = (meal) => {
        setDeletePrompt({
            meal,
            title: `Delete ${meal.Name}?`,
            message: "This will remove the saved quick meal from your account."
        });
    };

    const addQuickMealToDiary = async (meal) => {
        try {
            await api.post(`/quick-meals/${meal.Id}/add-to-diary`);
            showToast("Quick meal added to today's diary.");
            onMealAdded?.();
        }
        catch (err) {
            console.error(err);
            showToast(
                err.response?.data?.message || "Failed to add quick meal.",
                "error"
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="quick-meals-modal">
                <div className="quick-meals-header">
                    <div className="quick-title-lockup">
                        <div className="quick-title-icon">
                            <Utensils size={21} />
                        </div>

                        <div>
                            <span className="section-kicker">Saved Meals</span>
                            <h2>Quick Meals</h2>
                        </div>
                    </div>

                    <button
                        className="close-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close quick meals"
                    >
                        <X size={21} />
                    </button>
                </div>

                <div className="quick-meals-body">
                    <div className="quick-meals-sidebar">
                        <button
                            className="quick-primary-button"
                            type="button"
                            onClick={startAdding}
                        >
                            <Plus size={18} />
                            New Quick Meal
                        </button>

                        <div className="quick-meals-list">
                            {
                                loading
                                    ? <p className="quick-empty">Loading quick meals...</p>
                                    : quickMeals.length === 0
                                        ? <p className="quick-empty">No quick meals saved yet.</p>
                                        : quickMeals.map(meal => (
                                            <div
                                                className="quick-meal-card"
                                                key={meal.Id}
                                                onClick={() => selectMeal(meal)}
                                            >
                                                <div>
                                                    <h3>{meal.Name}</h3>
                                                    <p>{formatNumber(meal.Calories)} kcal</p>
                                                    <div className="quick-card-macros">
                                                        <span>P {formatNumber(meal.Protein)}g</span>
                                                        <span>C {formatNumber(meal.Carbs)}g</span>
                                                        <span>F {formatNumber(meal.Fat)}g</span>
                                                    </div>
                                                </div>

                                                <div className="quick-card-actions">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addQuickMealToDiary(meal);
                                                        }}
                                                    >
                                                        <Plus size={15} />
                                                        Add
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(meal);
                                                        }}
                                                    >
                                                        <Pencil size={15} />
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="quick-danger-button"
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteQuickMeal(meal);
                                                        }}
                                                    >
                                                        <Trash2 size={15} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                            }
                        </div>
                    </div>

                    <div className="quick-meals-content">
                        {
                            mode === "browse" && !selectedMeal && (
                                <div className="quick-placeholder">
                                    <h2>Build meals you eat often.</h2>
                                    <p>
                                        Save a set of foods once, then add the whole meal to today's diary.
                                    </p>
                                </div>
                            )
                        }

                        {
                            mode === "browse" && selectedMeal && selectedTotals && (
                                <div className="quick-details">
                                    <div className="quick-details-hero">
                                        <div className="quick-title-icon">
                                            <Utensils size={26} />
                                        </div>

                                        <div>
                                            <span className="section-kicker">Quick Meal</span>
                                            <h2>{selectedMeal.Name}</h2>
                                            <p>{selectedMeal.items.length} foods saved in this meal</p>
                                        </div>
                                    </div>

                                    {renderMacroGrid(selectedTotals)}

                                    <div className="quick-items">
                                        {
                                            selectedMeal.items.map(item => (
                                                <div
                                                    className="quick-item-row"
                                                    key={item.Id}
                                                >
                                                    <strong>{item.Name}</strong>
                                                    <span>{formatNumber(item.Grams)} g</span>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <div className="quick-actions">
                                        <button
                                            className="quick-primary-button"
                                            type="button"
                                            onClick={() => addQuickMealToDiary(selectedMeal)}
                                        >
                                            <Plus size={18} />
                                            Add To Diary
                                        </button>

                                        <button
                                            className="quick-secondary-button"
                                            type="button"
                                            onClick={() => startEditing(selectedMeal)}
                                        >
                                            <Pencil size={18} />
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        {
                            (mode === "add" || mode === "edit") && (
                                <form
                                    className="quick-form"
                                    onSubmit={saveQuickMeal}
                                >
                                    <div className="quick-details-hero">
                                        <div className="quick-title-icon">
                                            <Utensils size={26} />
                                        </div>

                                        <div>
                                            <span className="section-kicker">
                                                {mode === "add" ? "Builder" : "Meal Details"}
                                            </span>
                                            <h2>
                                                {mode === "add" ? "New Quick Meal" : "Edit Quick Meal"}
                                            </h2>
                                            <p>Add foods and the totals update live.</p>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Meal name"
                                        value={form.name}
                                        onChange={(e) => setForm(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                    />

                                    <div className="quick-mode-tabs">
                                        <button
                                            type="button"
                                            className={draftItem.mode === "food" ? "active" : ""}
                                            onClick={() => setDraftItem({
                                                ...emptyDraft,
                                                mode: "food"
                                            })}
                                        >
                                            Food Database
                                        </button>

                                        <button
                                            type="button"
                                            className={draftItem.mode === "manual" ? "active" : ""}
                                            onClick={() => setDraftItem({
                                                ...emptyDraft,
                                                mode: "manual"
                                            })}
                                        >
                                            Manual
                                        </button>
                                    </div>

                                    {
                                        draftItem.mode === "manual"
                                            ? (
                                                <div className="quick-add-item manual">
                                                    <input
                                                        value={draftItem.name}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))}
                                                        placeholder="Food name"
                                                    />

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        placeholder="Grams"
                                                        value={draftItem.grams}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            grams: e.target.value
                                                        }))}
                                                    />

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="Kcal per 100g"
                                                        value={draftItem.calories}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            calories: e.target.value
                                                        }))}
                                                    />

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="Protein per 100g"
                                                        value={draftItem.protein}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            protein: e.target.value
                                                        }))}
                                                    />

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="Carbs per 100g"
                                                        value={draftItem.carbs}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            carbs: e.target.value
                                                        }))}
                                                    />

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="Fat per 100g"
                                                        value={draftItem.fat}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            fat: e.target.value
                                                        }))}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={addItemToForm}
                                                    >
                                                        <Plus size={16} />
                                                        Add
                                                    </button>
                                                </div>
                                            )
                                            : (
                                                <div className="quick-add-item">
                                                    <select
                                                        value={draftItem.foodId}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            foodId: e.target.value
                                                        }))}
                                                    >
                                                        <option value="">
                                                            {
                                                                foodLoading
                                                                    ? "Loading foods..."
                                                                    : foods.length === 0
                                                                        ? "No foods available"
                                                                        : "Choose food"
                                                            }
                                                        </option>
                                                        {
                                                            foods.map(food => (
                                                                <option
                                                                    value={food.Id}
                                                                    key={food.Id}
                                                                >
                                                                    {food.Name}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        placeholder="Grams"
                                                        value={draftItem.grams}
                                                        onChange={(e) => setDraftItem(prev => ({
                                                            ...prev,
                                                            grams: e.target.value
                                                        }))}
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={addItemToForm}
                                                        disabled={foodLoading || foods.length === 0}
                                                    >
                                                        <Plus size={16} />
                                                        Add
                                                    </button>
                                                </div>
                                            )
                                    }

                                    <div className="quick-form-items">
                                        {
                                            form.items.length === 0
                                                ? <p className="quick-empty">Add foods to build this meal.</p>
                                                : form.items.map((item, index) => (
                                                    <div
                                                        className="quick-item-row"
                                                        key={`${item.FoodId || item.Id}-${index}`}
                                                    >
                                                        <strong>{item.Name}</strong>
                                                        <span>{formatNumber(item.Grams || item.grams)} g</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            aria-label={`Remove ${item.Name}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                        }
                                    </div>

                                    {renderMacroGrid(formTotals)}

                                    <div className="quick-actions">
                                        <button
                                            className="quick-primary-button"
                                            type="submit"
                                            disabled={saving}
                                        >
                                            {saving ? "Saving..." : "Save Quick Meal"}
                                        </button>

                                        <button
                                            className="quick-secondary-button"
                                            type="button"
                                            onClick={resetForm}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )
                        }
                    </div>
                </div>
            </div>

            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={hideToast}
            />

            {
                deletePrompt && (
                    <div className="toast-confirm danger">
                        <div>
                            <strong>{deletePrompt.title}</strong>
                            <span>{deletePrompt.message}</span>
                        </div>

                        <div className="toast-confirm-actions">
                            <button
                                type="button"
                                onClick={() => setDeletePrompt(null)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => performDeleteQuickMeal(deletePrompt.meal)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default QuickMealsModal;
