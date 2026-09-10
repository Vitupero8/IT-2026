/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
    Beef,
    Droplets,
    Flame,
    Pencil,
    Plus,
    Search,
    Scale,
    Trash2,
    Utensils,
    Wheat,
    X
} from "lucide-react";
import api from "../services/api";

import FoodCard from "./FoodCard";
import AddToDiaryModal from "./AddToDiaryModal";
import Toast from "./Toast";

import "../styles/FoodDatabaseModal.css";

function FoodDatabaseModal({
    isOpen,
    onClose,
    onMealAdded
}) {
    const emptyFood = {
        name: "",
        servingSize: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        isPublic: true
    };

    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [foodScope, setFoodScope] = useState("all");
    const [selectedFood, setSelectedFood] = useState(null);
    const [previewGrams, setPreviewGrams] = useState(100);
    const [mode, setMode] = useState("browse");
    const [foodForm, setFoodForm] = useState(emptyFood);
    const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
    const [selectedFoodForDiary, setSelectedFoodForDiary] = useState(null);
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

    const loadFoods = async (scopeOverride = foodScope) => {
        try {
            setLoading(true);

            const response = await api.get("/foods", {
                params: {
                    scope: scopeOverride
                }
            });

            setFoods(response.data);
        }
        catch (err) {
            console.error(err);

            showToast(
                err.response?.data?.message ||
                "Failed to load foods.",
                "error"
            );
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        loadFoods();
        setMode("browse");
        setSelectedFood(null);
        setFoodForm(emptyFood);
        setPreviewGrams(100);
    }, [isOpen, foodScope]);

    const selectedPreview = useMemo(() => {
        if (!selectedFood) return null;

        const grams = Number(previewGrams) || 0;
        const scaleValue = (value) => Number(((Number(value) || 0) * grams / 100).toFixed(1));

        return {
            calories: scaleValue(selectedFood.Calories),
            protein: scaleValue(selectedFood.Protein),
            carbs: scaleValue(selectedFood.Carbs),
            fat: scaleValue(selectedFood.Fat)
        };
    }, [previewGrams, selectedFood]);

    const filteredFoods = useMemo(() => {
        return foods.filter(food =>
            food.Name
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [foods, search]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;

        setFoodForm(prev => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };

    const resetForm = () => {
        setFoodForm(emptyFood);
        setSelectedFood(null);
        setMode("browse");
        setPreviewGrams(100);
    };

    const selectFood = (food) => {
        setSelectedFood(food);
        setMode("browse");
        setPreviewGrams(Number(food.ServingSize) || 100);
    };

    const startAdding = () => {
        resetForm();
        setMode("add");
    };

    const startEditing = () => {
        if (!selectedFood) return;

        setFoodForm({
            name: selectedFood.Name,
            servingSize: selectedFood.ServingSize,
            calories: selectedFood.Calories,
            protein: selectedFood.Protein,
            carbs: selectedFood.Carbs,
            fat: selectedFood.Fat,
            isPublic: selectedFood.Status !== "Private"
        });

        setMode("edit");
    };

    const openDiaryModal = () => {
        if (!selectedFood) return;

        setSelectedFoodForDiary(selectedFood);
        setIsDiaryModalOpen(true);
    };

    const saveFood = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                ...foodForm,
                servingSize: Number(foodForm.servingSize),
                calories: Number(foodForm.calories),
                protein: Number(foodForm.protein),
                carbs: Number(foodForm.carbs),
                fat: Number(foodForm.fat)
            };

            if (mode === "add") {
                await api.post("/foods", payload);
                setFoodScope("mine");
                showToast("Food added successfully.");
            }
            else {
                await api.put(`/foods/${selectedFood.Id}`, payload);
                setFoodScope("mine");
                showToast("Food updated successfully.");
            }

            await loadFoods("mine");
            resetForm();
        }
        catch (err) {
            console.error(err);

            showToast(
                err.response?.data?.message ||
                "Failed to save food.",
                "error"
            );
        }
    };

    const performDeleteFood = async (id, confirmDiaryDelete = false) => {
        try {
            setDeletePrompt(null);
            await api.delete(`/foods/${id}`, {
                params: confirmDiaryDelete
                    ? {
                        confirmDiaryDelete: true
                    }
                    : {}
            });

            showToast(
                confirmDiaryDelete
                    ? "Food deleted and removed from today's diary."
                    : "Food deleted successfully."
            );

            if (selectedFood?.Id === id) {
                resetForm();
            }

            await loadFoods();
            if (confirmDiaryDelete) onMealAdded?.();
        }
        catch (err) {
            console.error(err);

            if (err.response?.status === 409 && err.response.data?.requiresConfirmation) {
                const food = foods.find(item => item.Id === id) || selectedFood;

                setDeletePrompt({
                    id,
                    title: `Delete ${food?.Name || "food"}?`,
                    message: err.response.data.message,
                    confirmDiaryDelete: true
                });
            }
            else {
                showToast(
                    err.response?.data?.message ||
                    "Failed to delete food.",
                    "error"
                );
            }
        }
    };

    const deleteFood = (id) => {
        const food = foods.find(item => item.Id === id) || selectedFood;

        setDeletePrompt({
            id,
            title: `Delete ${food?.Name || "food"}?`,
            message: "This will remove the food from your saved database.",
            confirmDiaryDelete: false
        });
    };

    const copyFood = async (id) => {
        try {
            await api.post(`/foods/${id}/copy`);

            showToast("Food copied to your database.");
            setFoodScope("mine");
            await loadFoods("mine");
            resetForm();
        }
        catch (err) {
            console.error(err);

            showToast(
                err.response?.data?.message ||
                "Failed to copy food.",
                "error"
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="food-database">
                <div className="food-database-header">
                    <div className="food-title-lockup">
                        <div className="food-title-icon">
                            <Utensils size={21} />
                        </div>

                        <div>
                            <span className="section-kicker">Library</span>
                            <h2>Food Database</h2>
                        </div>
                    </div>

                    <button
                        className="close-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close food database"
                        title="Close"
                    >
                        <X size={21} />
                    </button>
                </div>

                <div className="food-database-body">
                    <aside className="food-sidebar">
                        <div className="food-search-wrap">
                            <Search size={18} />
                            <input
                                className="food-search"
                                type="text"
                                placeholder="Search foods"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="food-scope-toggle">
                            {
                                [
                                    ["all", "All"],
                                    ["mine", "Mine"],
                                    ["public", "Public"]
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={foodScope === value ? "active" : ""}
                                        onClick={() => {
                                            setFoodScope(value);
                                            setSelectedFood(null);
                                            setMode("browse");
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))
                            }
                        </div>

                        <div className="food-list">
                            {
                                loading
                                    ? <p className="food-list-state">Loading foods...</p>
                                    : filteredFoods.length === 0
                                        ? <p className="food-list-state">No foods found.</p>
                                        : filteredFoods.map(food => (
                                            <FoodCard
                                                key={food.Id}
                                                food={food}
                                                selected={selectedFood?.Id === food.Id}
                                                onDelete={deleteFood}
                                                onCopy={copyFood}
                                                onSelect={selectFood}
                                            />
                                        ))
                            }
                        </div>

                        <button
                            className="add-food-button"
                            type="button"
                            onClick={startAdding}
                        >
                            <Plus size={18} />
                            Add Food
                        </button>
                    </aside>

                    <section className="food-content">
                        {
                            !selectedFood && mode === "browse" && (
                                <div className="food-placeholder">
                                    <div className="placeholder-icon">
                                        <Utensils size={28} />
                                    </div>

                                    <h2>Choose a food</h2>
                                    <p>Select a saved food to preview macros, test portions, or add it to today's diary.</p>

                                    <div className="placeholder-grid">
                                        <span>
                                            <Search size={18} />
                                            Find foods quickly
                                        </span>
                                        <span>
                                            <Scale size={18} />
                                            Preview any portion
                                        </span>
                                        <span>
                                            <Plus size={18} />
                                            Log to diary
                                        </span>
                                    </div>
                                </div>
                            )
                        }

                        {
                            selectedFood && selectedPreview && mode === "browse" && (
                                <div className="food-details">
                                    <div className="food-details-hero">
                                        <div className="food-detail-icon">
                                            <Utensils size={28} />
                                        </div>

                                        <div>
                                            <span className="food-detail-status">{selectedFood.Status}</span>
                                            <h2>{selectedFood.Name}</h2>
                                            <p>{selectedFood.ServingSize}g default serving</p>
                                        </div>
                                    </div>

                                    <div className="nutrition-grid">
                                        <article>
                                            <Flame size={20} />
                                            <span>Calories</span>
                                            <strong>{selectedFood.Calories}</strong>
                                            <small>kcal per 100g</small>
                                        </article>
                                        <article>
                                            <Beef size={20} />
                                            <span>Protein</span>
                                            <strong>{selectedFood.Protein}g</strong>
                                            <small>per 100g</small>
                                        </article>
                                        <article>
                                            <Wheat size={20} />
                                            <span>Carbs</span>
                                            <strong>{selectedFood.Carbs}g</strong>
                                            <small>per 100g</small>
                                        </article>
                                        <article>
                                            <Droplets size={20} />
                                            <span>Fat</span>
                                            <strong>{selectedFood.Fat}g</strong>
                                            <small>per 100g</small>
                                        </article>
                                    </div>

                                    <div className="portion-preview">
                                        <div className="portion-preview-header">
                                            <div>
                                                <span className="section-kicker">Portion Preview</span>
                                                <h3>See what this serving adds</h3>
                                            </div>

                                            <label>
                                                Grams
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={previewGrams}
                                                    onChange={(e) => setPreviewGrams(e.target.value)}
                                                />
                                            </label>
                                        </div>

                                        <div className="preview-macro-strip">
                                            <span>{selectedPreview.calories} kcal</span>
                                            <span>{selectedPreview.protein}g protein</span>
                                            <span>{selectedPreview.carbs}g carbs</span>
                                            <span>{selectedPreview.fat}g fat</span>
                                        </div>
                                    </div>

                                    <div className="details-buttons">
                                        <button
                                            className="add-food-button"
                                            type="button"
                                            onClick={openDiaryModal}
                                        >
                                            <Plus size={18} />
                                            Add To Diary
                                        </button>

                                        <button
                                            className="edit-food-button"
                                            type="button"
                                            disabled={selectedFood.Scope === "public"}
                                            onClick={startEditing}
                                        >
                                            <Pencil size={18} />
                                            Edit
                                        </button>

                                        {
                                            selectedFood.Scope === "public"
                                                ? (
                                                    <button
                                                        className="save-food-button"
                                                        type="button"
                                                        onClick={() => copyFood(selectedFood.Id)}
                                                    >
                                                        <Plus size={18} />
                                                        Copy To Mine
                                                    </button>
                                                )
                                                : (
                                                    <button
                                                        className="delete-details-button"
                                                        type="button"
                                                        onClick={() => deleteFood(selectedFood.Id)}
                                                    >
                                                        <Trash2 size={18} />
                                                        Delete
                                                    </button>
                                                )
                                        }
                                    </div>
                                </div>
                            )
                        }

                        {
                            (mode === "add" || mode === "edit") && (
                                <form
                                    className="food-form"
                                    onSubmit={saveFood}
                                >
                                    <div className="form-heading">
                                        <div className="food-detail-icon">
                                            <Utensils size={26} />
                                        </div>

                                        <div>
                                            <span className="section-kicker">
                                                {mode === "add" ? "New Food" : "Food Details"}
                                            </span>
                                            <h2>
                                                {mode === "add" ? "Add Food" : "Edit Food"}
                                            </h2>
                                        </div>
                                    </div>

                                    <label>
                                        Food name
                                        <input
                                            name="name"
                                            placeholder="Chicken breast"
                                            value={foodForm.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </label>

                                    <div className="food-form-grid">
                                        <label>
                                            Serving size
                                            <input
                                                name="servingSize"
                                                type="number"
                                                min="1"
                                                placeholder="100"
                                                value={foodForm.servingSize}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>

                                        <label>
                                            Calories
                                            <input
                                                name="calories"
                                                type="number"
                                                min="0"
                                                placeholder="165"
                                                value={foodForm.calories}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>
                                    </div>

                                    <div className="food-form-grid">
                                        <label>
                                            Protein
                                            <input
                                                name="protein"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="31"
                                                value={foodForm.protein}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>

                                        <label>
                                            Carbs
                                            <input
                                                name="carbs"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="0"
                                                value={foodForm.carbs}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>

                                        <label>
                                            Fat
                                            <input
                                                name="fat"
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="3.6"
                                                value={foodForm.fat}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>
                                    </div>

                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            name="isPublic"
                                            checked={foodForm.isPublic}
                                            onChange={handleChange}
                                        />
                                        Make this food public
                                    </label>

                                    <div className="details-buttons">
                                        <button
                                            className="save-food-button"
                                            type="submit"
                                        >
                                            <Plus size={18} />
                                            {mode === "add" ? "Save Food" : "Save Changes"}
                                        </button>

                                        <button
                                            type="button"
                                            className="edit-food-button"
                                            onClick={resetForm}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )
                        }
                    </section>
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
                                onClick={() => performDeleteFood(deletePrompt.id, deletePrompt.confirmDiaryDelete)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )
            }

            <AddToDiaryModal
                isOpen={isDiaryModalOpen}
                onClose={() => setIsDiaryModalOpen(false)}
                food={selectedFoodForDiary}
                onMealAdded={async () => {
                    showToast("Meal added successfully.");
                    await loadFoods();
                    onMealAdded?.();
                }}
            />
        </div>
    );
}

export default FoodDatabaseModal;
