import { useState } from "react";
import api from "../services/api";
import "../styles/AddToDiaryModal.css";

function AddToDiaryModal({

    isOpen,

    onClose,

    food,

    onMealAdded

}) {

    const [grams, setGrams] = useState("");

    const [loading, setLoading] = useState(false);

    if (!isOpen || !food) return null;

    const addMeal = async () => {

        if (!grams || Number(grams) <= 0) {

            alert("Please enter a valid amount of grams.");

            return;

        }

        try {

            setLoading(true);

            await api.post(

                "/meals",

                {

                    foodId: food.Id,

                    grams: Number(grams)

                }

            );

            onMealAdded();

            setGrams("");

            onClose();

        }

        catch (err) {

            console.error(err);

            alert("Failed to add meal.");

        }

        finally {

            setLoading(false);

        }

    };

    return (

        <div className="modal-overlay">

            <div className="add-diary-modal">

                <h2>Add To Diary</h2>

                <h3>{food.Name}</h3>

                <p>

                    <strong>Serving Size:</strong> {food.ServingSize} g

                </p>

                <p>

                    <strong>Calories:</strong> {food.Calories}

                </p>

                <input

                    type="number"

                    placeholder="Enter grams"

                    value={grams}

                    onChange={(e) => setGrams(e.target.value)}

                />

                <div className="buttons">

                    <button

                        type="button"

                        onClick={onClose}

                    >

                        Cancel

                    </button>

                    <button

                        type="button"

                        onClick={addMeal}

                        disabled={loading}

                    >

                        {

                            loading

                                ? "Adding..."

                                : "Add"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}

export default AddToDiaryModal;
