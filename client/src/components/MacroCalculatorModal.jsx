/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { Activity, Calculator, Check, Scale, Target, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/MacroCalculatorModal.css";

const activityOptions = [
    {
        value: "sedentary",
        label: "Sedentary",
        factor: 1.2
    },
    {
        value: "light",
        label: "Light",
        factor: 1.375
    },
    {
        value: "moderate",
        label: "Moderate",
        factor: 1.55
    },
    {
        value: "active",
        label: "Active",
        factor: 1.725
    },
    {
        value: "very_active",
        label: "Very active",
        factor: 1.9
    }
];

const goalOptions = [
    {
        value: "deficit",
        label: "Deficit",
        adjustment: -500,
        proteinMultiplier: 2.2,
        fatMultiplier: 0.7
    },
    {
        value: "maintain",
        label: "Maintain",
        adjustment: 0,
        proteinMultiplier: 2,
        fatMultiplier: 0.8
    },
    {
        value: "surplus",
        label: "Surplus",
        adjustment: 300,
        proteinMultiplier: 1.8,
        fatMultiplier: 0.9
    }
];

function MacroCalculatorModal({
    isOpen,
    onClose,
    user,
    onTargetsUpdated
}) {
    const [form, setForm] = useState({
        gender: "male",
        age: "",
        height: "",
        currentWeight: "",
        activityLevel: "moderate",
        fitnessGoal: "maintain"
    });
    const [useManualTargets, setUseManualTargets] = useState(false);
    const [manualTargets, setManualTargets] = useState({
        targetCalories: "",
        targetProtein: "",
        targetCarbs: "",
        targetFat: ""
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;

        setForm({
            gender: user.Gender || "male",
            age: user.Age || "",
            height: user.Height || "",
            currentWeight: user.CurrentWeight || "",
            activityLevel: user.ActivityLevel || "moderate",
            fitnessGoal: user.FitnessGoal || "maintain"
        });

        setManualTargets({
            targetCalories: user.TargetCalories || "",
            targetProtein: user.TargetProtein || "",
            targetCarbs: user.TargetCarbs || "",
            targetFat: user.TargetFat || ""
        });
        setUseManualTargets(false);
    }, [isOpen, user]);

    const calculations = useMemo(() => {
        const age = Number(form.age);
        const height = Number(form.height);
        const weight = Number(form.currentWeight);
        const activity = activityOptions.find(option => option.value === form.activityLevel) || activityOptions[2];
        const goal = goalOptions.find(option => option.value === form.fitnessGoal) || goalOptions[1];

        if (!age || !height || !weight) {
            return null;
        }

        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);
        const bmr = form.gender === "male"
            ? (10 * weight) + (6.25 * height) - (5 * age) + 5
            : (10 * weight) + (6.25 * height) - (5 * age) - 161;
        const tdee = bmr * activity.factor;
        const targetCalories = Math.max(Math.round(tdee + goal.adjustment), 1200);
        const targetProtein = Math.round(weight * goal.proteinMultiplier);
        const targetFat = Math.round(weight * goal.fatMultiplier);
        const carbCalories = targetCalories - (targetProtein * 4) - (targetFat * 9);
        const targetCarbs = Math.max(Math.round(carbCalories / 4), 0);

        return {
            bmi: Number(bmi.toFixed(1)),
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat
        };
    }, [form]);

    const bmiCategory = useMemo(() => {
        if (!calculations) return "Waiting for inputs";

        if (calculations.bmi < 18.5) return "Underweight";
        if (calculations.bmi < 25) return "Healthy range";
        if (calculations.bmi < 30) return "Overweight";
        return "Obesity range";
    }, [calculations]);

    const selectedTargets = useMemo(() => {
        if (!calculations) return null;

        if (!useManualTargets) return calculations;

        const targetCalories = Number(manualTargets.targetCalories);
        const targetProtein = Number(manualTargets.targetProtein);
        const targetCarbs = Number(manualTargets.targetCarbs);
        const targetFat = Number(manualTargets.targetFat);
        const hasMissingTarget = Object.values(manualTargets).some(value => value === "");

        if (
            hasMissingTarget
            || !targetCalories
            || targetCalories < 800
            || targetProtein < 0
            || targetCarbs < 0
            || targetFat < 0
            || Number.isNaN(targetProtein)
            || Number.isNaN(targetCarbs)
            || Number.isNaN(targetFat)
        ) {
            return null;
        }

        return {
            ...calculations,
            targetCalories: Math.round(targetCalories),
            targetProtein: Math.round(targetProtein),
            targetCarbs: Math.round(targetCarbs),
            targetFat: Math.round(targetFat)
        };
    }, [calculations, manualTargets, useManualTargets]);
    const displayedTargets = selectedTargets || (!useManualTargets ? calculations : null);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleManualTargetChange = (e) => {
        const { name, value } = e.target;

        setManualTargets(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const saveTargets = async () => {
        if (!calculations) {
            toast.error("Fill in the calculator fields first.");
            return;
        }

        if (!selectedTargets) {
            toast.error("Enter valid custom macro targets first.");
            return;
        }

        try {
            setSaving(true);

            const response = await api.put("/auth/macro-targets", {
                gender: form.gender,
                age: Number(form.age),
                height: Number(form.height),
                currentWeight: Number(form.currentWeight),
                activityLevel: form.activityLevel,
                fitnessGoal: form.fitnessGoal,
                targetCalories: selectedTargets.targetCalories,
                targetProtein: selectedTargets.targetProtein,
                targetCarbs: selectedTargets.targetCarbs,
                targetFat: selectedTargets.targetFat,
                bmi: calculations.bmi,
                bmr: calculations.bmr,
                tdee: calculations.tdee
            });

            onTargetsUpdated?.({
                user: {
                    Gender: form.gender,
                    Age: Number(form.age),
                    Height: Number(form.height),
                    CurrentWeight: Number(form.currentWeight),
                    ActivityLevel: form.activityLevel,
                    FitnessGoal: form.fitnessGoal,
                    Bmi: calculations.bmi,
                    Bmr: calculations.bmr,
                    Tdee: calculations.tdee,
                    TargetCalories: selectedTargets.targetCalories,
                    TargetProtein: selectedTargets.targetProtein,
                    TargetCarbs: selectedTargets.targetCarbs,
                    TargetFat: selectedTargets.targetFat
                },
                targets: response.data.targets
            });

            toast.success("Macro targets updated.");
            onClose();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to update macro targets.");
        }
        finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="macro-calculator-modal">
                <div className="macro-calculator-header">
                    <div>
                        <span className="section-kicker">Calculator</span>
                        <h2>Macro Targets</h2>
                    </div>

                    <button
                        className="icon-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close macro calculator"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="macro-calculator-body">
                    <form className="calculator-form">
                        <div className="segmented-field">
                            <span>Sex</span>
                            <div className="segmented-control">
                                <button
                                    className={form.gender === "male" ? "active" : ""}
                                    type="button"
                                    onClick={() => setForm(prev => ({
                                        ...prev,
                                        gender: "male"
                                    }))}
                                >
                                    Male
                                </button>

                                <button
                                    className={form.gender === "female" ? "active" : ""}
                                    type="button"
                                    onClick={() => setForm(prev => ({
                                        ...prev,
                                        gender: "female"
                                    }))}
                                >
                                    Female
                                </button>
                            </div>
                        </div>

                        <div className="calculator-input-grid">
                            <label>
                                Age
                                <input
                                    name="age"
                                    type="number"
                                    min="13"
                                    value={form.age}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Height
                                <input
                                    name="height"
                                    type="number"
                                    min="100"
                                    value={form.height}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Weight
                                <input
                                    name="currentWeight"
                                    type="number"
                                    min="30"
                                    step="0.1"
                                    value={form.currentWeight}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>

                        <label>
                            Activity
                            <select
                                name="activityLevel"
                                value={form.activityLevel}
                                onChange={handleChange}
                            >
                                {
                                    activityOptions.map(option => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))
                                }
                            </select>
                        </label>

                        <div className="segmented-field">
                            <span>Goal</span>
                            <div className="goal-selector">
                                {
                                    goalOptions.map(option => (
                                        <button
                                            key={option.value}
                                            className={form.fitnessGoal === option.value ? "active" : ""}
                                            type="button"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                fitnessGoal: option.value
                                            }))}
                                        >
                                            {option.label}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>

                        <div className="manual-target-panel">
                            <label className="manual-target-toggle">
                                <input
                                    type="checkbox"
                                    checked={useManualTargets}
                                    onChange={(e) => setUseManualTargets(e.target.checked)}
                                />
                                <span>Enter my own targets</span>
                            </label>

                            {
                                useManualTargets && (
                                    <div className="calculator-input-grid manual-target-grid">
                                        <label>
                                            Calories
                                            <input
                                                name="targetCalories"
                                                type="number"
                                                min="800"
                                                value={manualTargets.targetCalories}
                                                onChange={handleManualTargetChange}
                                            />
                                        </label>

                                        <label>
                                            Protein
                                            <input
                                                name="targetProtein"
                                                type="number"
                                                min="0"
                                                value={manualTargets.targetProtein}
                                                onChange={handleManualTargetChange}
                                            />
                                        </label>

                                        <label>
                                            Carbs
                                            <input
                                                name="targetCarbs"
                                                type="number"
                                                min="0"
                                                value={manualTargets.targetCarbs}
                                                onChange={handleManualTargetChange}
                                            />
                                        </label>

                                        <label>
                                            Fat
                                            <input
                                                name="targetFat"
                                                type="number"
                                                min="0"
                                                value={manualTargets.targetFat}
                                                onChange={handleManualTargetChange}
                                            />
                                        </label>
                                    </div>
                                )
                            }
                        </div>
                    </form>

                    <section className="calculator-results">
                        <div className="result-card highlight">
                            <Calculator size={22} />
                            <span>Target calories</span>
                            <strong>{displayedTargets?.targetCalories || "--"} kcal</strong>
                        </div>

                        <div className="result-grid">
                            <div className="result-card">
                                <Scale size={20} />
                                <span>BMI</span>
                                <strong>{calculations?.bmi || "--"}</strong>
                                <small>{bmiCategory}</small>
                            </div>

                            <div className="result-card">
                                <Activity size={20} />
                                <span>Maintenance</span>
                                <strong>{calculations?.tdee || "--"}</strong>
                                <small>kcal/day</small>
                            </div>

                            <div className="result-card">
                                <Target size={20} />
                                <span>BMR</span>
                                <strong>{calculations?.bmr || "--"}</strong>
                                <small>base burn</small>
                            </div>
                        </div>

                        <div className="macro-result-strip">
                            <span>Protein <strong>{displayedTargets?.targetProtein ?? "--"}g</strong></span>
                            <span>Carbs <strong>{displayedTargets?.targetCarbs ?? "--"}g</strong></span>
                            <span>Fat <strong>{displayedTargets?.targetFat ?? "--"}g</strong></span>
                        </div>

                        <button
                            className="save-targets-button"
                            type="button"
                            disabled={saving}
                            onClick={saveTargets}
                        >
                            <Check size={18} />
                            {saving ? "Saving..." : "Use These Targets"}
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default MacroCalculatorModal;
