/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/Workouts.css";

const emptyExercise = (dayNumber = 1) => ({
    dayNumber,
    exerciseName: "",
    sets: "",
    notes: ""
});

const MAX_EXERCISES = 50;

const buildDays = (count, existingDays = []) => (
    Array.from({ length: count }, (_, index) => {
        const dayNumber = index + 1;
        const existing = existingDays.find(day => Number(day.dayNumber) === dayNumber);

        return existing || {
            dayNumber,
            name: `Day ${dayNumber}`,
            isRestDay: false
        };
    })
);

function CreateWorkoutSplitModal({
    isOpen,
    onClose,
    onCreated,
    editSplit = null,
    editDays = [],
    editExercises = []
}) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        goal: "general_fitness",
        difficulty: "beginner",
        daysPerWeek: 3,
        equipment: ""
    });
    const [exerciseCount, setExerciseCount] = useState(4);
    const [days, setDays] = useState(buildDays(3));
    const [exercises, setExercises] = useState([
        emptyExercise(1),
        emptyExercise(1),
        emptyExercise(2),
        emptyExercise(3)
    ]);
    const [saving, setSaving] = useState(false);
    const isEditing = Boolean(editSplit);

    const trainingDayOptions = useMemo(() => (
        days.filter(day => !day.isRestDay)
    ), [days]);

    const updateForm = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateDay = (dayNumber, field, value) => {
        setDays(prev => prev.map(day => (
            day.dayNumber === dayNumber
                ? {
                    ...day,
                    [field]: value
                }
                : day
        )));

        if (field === "isRestDay" && value) {
            const firstTrainingDay = days.find(day => day.dayNumber !== dayNumber && !day.isRestDay)?.dayNumber || 1;
            setExercises(prev => prev.map(exercise => (
                Number(exercise.dayNumber) === dayNumber
                    ? {
                        ...exercise,
                        dayNumber: firstTrainingDay
                    }
                    : exercise
            )));
        }
    };

    const updateExercise = (index, field, value) => {
        setExercises(prev => prev.map((exercise, itemIndex) => (
            itemIndex === index
                ? {
                    ...exercise,
                    [field]: value
                }
                : exercise
        )));
    };

    const updateExerciseCount = (value) => {
        const nextCount = Math.min(Math.max(Number(value) || 1, 1), MAX_EXERCISES);
        setExerciseCount(nextCount);
        setExercises(prev => {
            if (prev.length === nextCount) return prev;
            if (prev.length > nextCount) return prev.slice(0, nextCount);

            const defaultDay = trainingDayOptions[0]?.dayNumber || 1;

            return [
                ...prev,
                ...Array.from({ length: nextCount - prev.length }, () => emptyExercise(defaultDay))
            ];
        });
    };

    const addExercise = () => {
        if (exercises.length >= MAX_EXERCISES) {
            toast.error(`Workout splits can have up to ${MAX_EXERCISES} exercises.`);
            return;
        }

        setExerciseCount(prev => prev + 1);
        setExercises(prev => [...prev, emptyExercise(trainingDayOptions[0]?.dayNumber || 1)]);
    };

    const removeExercise = (index) => {
        if (exercises.length === 1) {
            toast.error("Add at least one exercise.");
            return;
        }

        setExerciseCount(prev => prev - 1);
        setExercises(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const reset = () => {
        setForm({
            name: "",
            description: "",
            goal: "general_fitness",
            difficulty: "beginner",
            daysPerWeek: 3,
            equipment: ""
        });
        setExerciseCount(4);
        setDays(buildDays(3));
        setExercises([
            emptyExercise(1),
            emptyExercise(1),
            emptyExercise(2),
            emptyExercise(3)
        ]);
    };

    const close = () => {
        reset();
        onClose();
    };

    const saveSplit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error("Name the workout split.");
            return;
        }

        if (exercises.some(exercise => !exercise.exerciseName.trim() || !String(exercise.sets).trim())) {
            toast.error("Every exercise needs a name and sets.");
            return;
        }

        if (trainingDayOptions.length === 0) {
            toast.error("At least one day needs to be a training day.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                ...form,
                daysPerWeek: Number(form.daysPerWeek),
                days,
                exercises
            };
            const response = isEditing
                ? await api.put(`/workout-splits/${editSplit.Id}`, payload)
                : await api.post("/workout-splits", payload);

            toast.success(response.data?.message || (isEditing ? "Workout split updated." : "Workout split posted."));
            onCreated?.();
            close();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to create workout split.");
        }
        finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !editSplit) return;

        const normalizedDays = editDays.map(day => ({
            dayNumber: Number(day.DayNumber),
            name: day.Name || `Day ${day.DayNumber}`,
            isRestDay: Boolean(day.IsRestDay)
        }));

        setForm({
            name: editSplit.Name || "",
            description: editSplit.Description || "",
            goal: editSplit.Goal || "general_fitness",
            difficulty: editSplit.Difficulty || "beginner",
            daysPerWeek: editSplit.DaysPerWeek || 1,
            equipment: editSplit.Equipment || ""
        });
        setDays(normalizedDays.length ? normalizedDays : buildDays(Number(editSplit.DaysPerWeek) || 1));
        setExercises(editExercises.map(exercise => ({
            dayNumber: Number(exercise.DayNumber) || 1,
            exerciseName: exercise.ExerciseName || "",
            sets: exercise.Sets || "",
            notes: exercise.Notes || ""
        })));
        setExerciseCount(Math.max(editExercises.length, 1));
    }, [editDays, editExercises, editSplit, isOpen]);

    useEffect(() => {
        if (editSplit) return;

        const dayCount = Math.min(Math.max(Number(form.daysPerWeek) || 1, 1), 7);
        setDays(prev => buildDays(dayCount, prev));
    }, [editSplit, form.daysPerWeek]);

    useEffect(() => {
        if (trainingDayOptions.length === 0) return;

        setExercises(prev => prev.map(exercise => (
            trainingDayOptions.some(day => day.dayNumber === Number(exercise.dayNumber))
                ? exercise
                : {
                    ...exercise,
                    dayNumber: trainingDayOptions[0].dayNumber
                }
        )));
    }, [trainingDayOptions]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="create-workout-modal">
                <div className="workout-modal-header">
                    <div>
                            <span className="section-kicker">{isEditing ? "Edit" : "Create"}</span>
                            <h2>{isEditing ? "Edit Workout Split" : "Post Workout Split"}</h2>
                    </div>

                    <button
                        className="workout-icon-button"
                        type="button"
                        onClick={close}
                        aria-label="Close workout split creator"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    className="create-workout-body"
                    onSubmit={saveSplit}
                >
                    <section className="workout-form-section">
                        <label>
                            Split name
                            <input
                                value={form.name}
                                onChange={(e) => updateForm("name", e.target.value)}
                                placeholder="Push Pull Legs"
                            />
                        </label>

                        <label>
                            Description
                            <textarea
                                value={form.description}
                                onChange={(e) => updateForm("description", e.target.value)}
                                placeholder="Who this split is for and how to run it"
                            />
                        </label>

                        <div className="workout-form-grid">
                            <label>
                                Goal
                                <select
                                    value={form.goal}
                                    onChange={(e) => updateForm("goal", e.target.value)}
                                >
                                    <option value="general_fitness">General fitness</option>
                                    <option value="hypertrophy">Hypertrophy</option>
                                    <option value="strength">Strength</option>
                                    <option value="fat_loss">Fat loss</option>
                                    <option value="athletic">Athletic</option>
                                </select>
                            </label>

                            <label>
                                Difficulty
                                <select
                                    value={form.difficulty}
                                    onChange={(e) => updateForm("difficulty", e.target.value)}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </label>

                            <label>
                                Days
                                <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={form.daysPerWeek}
                                    onChange={(e) => updateForm("daysPerWeek", e.target.value)}
                                />
                            </label>

                            <label>
                                Exercises
                                <input
                                    type="number"
                                    min="1"
                                    max={MAX_EXERCISES}
                                    value={exerciseCount}
                                    onChange={(e) => updateExerciseCount(e.target.value)}
                                />
                            </label>
                        </div>

                        <label>
                            Equipment
                            <input
                                value={form.equipment}
                                onChange={(e) => updateForm("equipment", e.target.value)}
                                placeholder="Gym, dumbbells, home"
                            />
                        </label>
                    </section>

                    <section className="workout-form-section wide">
                        <div className="workout-section-heading">
                            <div>
                                <span className="section-kicker">Days</span>
                                <h3>Training And Rest Days</h3>
                            </div>
                        </div>

                        <div className="workout-day-builder">
                            {
                                days.map(day => (
                                    <article
                                        key={day.dayNumber}
                                        className={day.isRestDay ? "rest" : ""}
                                    >
                                        <span>Day {day.dayNumber}</span>

                                        <input
                                            value={day.name}
                                            onChange={(e) => updateDay(day.dayNumber, "name", e.target.value)}
                                            placeholder={`Day ${day.dayNumber}`}
                                        />

                                        <label className="workout-rest-toggle">
                                            <input
                                                type="checkbox"
                                                checked={day.isRestDay}
                                                onChange={(e) => updateDay(day.dayNumber, "isRestDay", e.target.checked)}
                                            />
                                            Rest day
                                        </label>
                                    </article>
                                ))
                            }
                        </div>
                    </section>

                    <section className="workout-form-section wide">
                        <div className="workout-section-heading">
                            <div>
                                <span className="section-kicker">Exercises</span>
                                <h3>Build The Split</h3>
                            </div>

                            <button
                                type="button"
                                onClick={addExercise}
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        </div>

                        <div className="workout-exercise-builder">
                            {
                                exercises.map((exercise, index) => (
                                    <article key={index}>
                                        <select
                                            value={exercise.dayNumber}
                                            onChange={(e) => updateExercise(index, "dayNumber", e.target.value)}
                                        >
                                            {
                                                trainingDayOptions.map(day => (
                                                    <option
                                                        key={day.dayNumber}
                                                        value={day.dayNumber}
                                                    >
                                                        Day {day.dayNumber} · {day.name}
                                                    </option>
                                                ))
                                            }
                                        </select>

                                        <input
                                            value={exercise.exerciseName}
                                            onChange={(e) => updateExercise(index, "exerciseName", e.target.value)}
                                            placeholder="Exercise name"
                                        />

                                        <input
                                            value={exercise.sets}
                                            onChange={(e) => updateExercise(index, "sets", e.target.value)}
                                            placeholder="Sets"
                                        />

                                        <input
                                            value={exercise.notes}
                                            onChange={(e) => updateExercise(index, "notes", e.target.value)}
                                            placeholder="Kg/reps/form notes"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => removeExercise(index)}
                                            aria-label="Remove exercise"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </article>
                                ))
                            }
                        </div>
                    </section>

                    <section className="workout-form-footer">
                        <span>{exercises.length} / {MAX_EXERCISES} exercises</span>

                        <button
                            className="workout-primary-button"
                            type="submit"
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? "Saving..." : isEditing ? "Save Split" : "Post Split"}
                        </button>
                    </section>
                </form>
            </div>
        </div>
    );
}

export default CreateWorkoutSplitModal;
