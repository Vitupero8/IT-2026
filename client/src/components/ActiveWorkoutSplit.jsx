/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Dumbbell, Save } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

function ActiveWorkoutSplit() {
    const [splitData, setSplitData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(max-width: 720px)").matches
    ));

    const loadSelectedSplit = async () => {
        try {
            setLoading(true);

            const response = await api.get("/workout-splits/mine/selected");
            setSplitData(response.data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };

    const updateExerciseLocal = (exerciseId, field, value) => {
        setSplitData(prev => ({
            ...prev,
            exercises: prev.exercises.map(exercise => (
                exercise.Id === exerciseId
                    ? {
                        ...exercise,
                        [field]: value
                    }
                    : exercise
            ))
        }));
    };

    const saveExercise = async (exerciseId) => {
        const exercise = splitData?.exercises.find(item => item.Id === exerciseId);

        if (!exercise) return;

        const numericWeight = Math.max(Number(exercise.WeightKg) || 0, 0);
        const exerciseName = String(exercise.DisplayExerciseName || exercise.ExerciseName || "").trim();
        const sets = String(exercise.DisplaySets || exercise.Sets || "").trim();

        if (!exerciseName || !sets) {
            toast.error("Exercise name and sets cannot be empty.");
            loadSelectedSplit();
            return;
        }

        try {
            await api.patch(`/workout-splits/mine/exercises/${exercise.Id}`, {
                weightKg: numericWeight,
                exerciseName,
                sets,
                notes: String(exercise.DisplayNotes ?? exercise.Notes ?? "").trim()
            });
            updateExerciseLocal(exercise.Id, "WeightKg", numericWeight);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to update exercise.");
            loadSelectedSplit();
        }
    };

    const exercisesByDay = useMemo(() => {
        if (!splitData) return new Map();

        return splitData.exercises.reduce((map, exercise) => {
            if (!map.has(exercise.DayId)) map.set(exercise.DayId, []);
            map.get(exercise.DayId).push(exercise);
            return map;
        }, new Map());
    }, [splitData]);

    useEffect(() => {
        loadSelectedSplit();
    }, []);

    if (loading) {
        return (
            <section className="active-workout-panel">
                <p>Loading workout split...</p>
            </section>
        );
    }

    if (!splitData) {
        return null;
    }

    return (
        <section className="active-workout-panel">
            <div className="panel-heading">
                <div>
                    <span className="section-kicker">Training</span>
                    <h2>{splitData.split.Name}</h2>
                </div>

                <div className="panel-heading-actions">
                    <Dumbbell size={22} />
                    <button
                        className="dashboard-collapse-button"
                        type="button"
                        onClick={() => setCollapsed(prev => !prev)}
                        aria-label={collapsed ? "Show workout split" : "Hide workout split"}
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
                            {splitData.days.length} training {splitData.days.length === 1 ? "day" : "days"} hidden.
                        </p>
                    )
                    : (
                        <div className="active-workout-days">
                {
                    splitData.days.map(day => (
                        <article key={day.Id}>
                            <div className="active-workout-day-heading">
                                <span>Day {day.DayNumber}</span>
                                <strong>{day.Name}</strong>
                            </div>

                            <div className="active-workout-exercises">
                                {
                                    Number(day.IsRestDay)
                                        ? <p className="active-workout-rest">Rest day. Keep it easy and recover.</p>
                                        : (exercisesByDay.get(day.Id) || []).map(exercise => (
                                            <div key={exercise.Id}>
                                                <div className="active-workout-exercise-fields">
                                                    <label>
                                                        Exercise
                                                        <input
                                                            value={exercise.DisplayExerciseName || exercise.ExerciseName}
                                                            onChange={(e) => updateExerciseLocal(exercise.Id, "DisplayExerciseName", e.target.value)}
                                                            onBlur={() => saveExercise(exercise.Id)}
                                                        />
                                                    </label>

                                                    <label>
                                                        Sets
                                                        <input
                                                            value={exercise.DisplaySets || exercise.Sets}
                                                            onChange={(e) => updateExerciseLocal(exercise.Id, "DisplaySets", e.target.value)}
                                                            onBlur={() => saveExercise(exercise.Id)}
                                                        />
                                                    </label>

                                                    <label className="wide">
                                                        Notes
                                                        <input
                                                            value={exercise.DisplayNotes ?? exercise.Notes ?? ""}
                                                            onChange={(e) => updateExerciseLocal(exercise.Id, "DisplayNotes", e.target.value)}
                                                            onBlur={() => saveExercise(exercise.Id)}
                                                            placeholder="Reps, form notes, tempo, or target effort"
                                                        />
                                                    </label>
                                                </div>

                                                <label>
                                                    Kg
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        value={exercise.WeightKg}
                                                        onChange={(e) => updateExerciseLocal(exercise.Id, "WeightKg", e.target.value)}
                                                        onBlur={() => saveExercise(exercise.Id)}
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={() => saveExercise(exercise.Id)}
                                                    aria-label="Save exercise changes"
                                                >
                                                    <Save size={15} />
                                                </button>
                                            </div>
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
    );
}

export default ActiveWorkoutSplit;
