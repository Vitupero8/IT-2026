import { useState } from "react";
import api from "../services/api";
import "../styles/AddFoodModal.css";

function AddFoodModal({ isOpen, onClose }) {

    const [food, setFood] = useState({
        name: "",
        servingSize: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        isPublic: true
    });

    if (!isOpen) return null;

    const handleChange = (e) => {

        const { name, value, type, checked } = e.target;

        setFood(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            await api.post(
                "/foods",
                {
                    ...food,
                    servingSize: Number(food.servingSize),
                    calories: Number(food.calories),
                    protein: Number(food.protein),
                    carbs: Number(food.carbs),
                    fat: Number(food.fat)
                }
            );

            alert("Food added successfully!");

            setFood({
                name: "",
                servingSize: "",
                calories: "",
                protein: "",
                carbs: "",
                fat: "",
                isPublic: true
            });

            onClose();

        } catch (err) {

            console.error(err);

            alert("Failed to add food.");

        }

    };

    return (

        <div className="modal-overlay">

            <div className="modal">

                <h2>Add Food</h2>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        name="name"
                        placeholder="Food Name"
                        value={food.name}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="servingSize"
                        placeholder="Serving Size (g)"
                        value={food.servingSize}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="calories"
                        placeholder="Calories"
                        value={food.calories}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="protein"
                        placeholder="Protein"
                        value={food.protein}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="carbs"
                        placeholder="Carbs"
                        value={food.carbs}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        step="0.1"
                        name="fat"
                        placeholder="Fat"
                        value={food.fat}
                        onChange={handleChange}
                        required
                    />

                    <label className="checkbox">

                        <input
                            type="checkbox"
                            name="isPublic"
                            checked={food.isPublic}
                            onChange={handleChange}
                        />

                        Make this food public

                    </label>

                    <div className="modal-buttons">

                        <button
                            type="submit"
                            className="save-btn"
                        >
                            Save Food
                        </button>

                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}

export default AddFoodModal;
