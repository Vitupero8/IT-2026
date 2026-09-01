import { Dumbbell, Flag, ShieldCheck, Star, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/Workouts.css";

function WorkoutSplitDetailModal({
    split,
    days = [],
    exercises = [],
    isOpen,
    onClose,
    onRated,
    onSelected,
    currentUser,
    onEdit
}) {
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);

    if (!isOpen || !split) return null;

    const dayExercises = (dayId) => exercises.filter(exercise => exercise.DayId === dayId);

    const rateSplit = async (rating) => {
        try {
            await api.post(`/workout-splits/${split.Id}/rating`, {
                rating
            });
            toast.success("Rating saved.");
            onRated?.();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to rate split.");
        }
    };

    const selectSplit = async () => {
        try {
            await api.post(`/workout-splits/${split.Id}/select`);
            toast.success("Workout split selected.");
            onSelected?.();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to select split.");
        }
    };

    const reportSplit = async () => {
        if (!reportReason.trim()) {
            toast.error("Add a short reason for the report.");
            return;
        }

        try {
            setReporting(true);
            await api.post(`/workout-splits/${split.Id}/report`, {
                reason: reportReason.trim()
            });
            toast.success("Report sent to admins.");
            setReportReason("");
            setShowReportForm(false);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to report split.");
        }
        finally {
            setReporting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="workout-detail-modal">
                <div className="workout-modal-header">
                    <div>
                        <span className="section-kicker">Workout Split</span>
                        <h2>{split.Name}</h2>
                    </div>

                    <button
                        className="workout-icon-button"
                        type="button"
                        onClick={onClose}
                        aria-label="Close workout split"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="workout-detail-body">
                    <section className="workout-detail-hero">
                        <div>
                            <span>{split.DaysPerWeek} days/week</span>
                            <span>{split.Difficulty}</span>
                            <span>{split.Goal.replace("_", " ")}</span>
                            {
                                Boolean(split.AuthorTrusted) && (
                                    <span className="trusted">
                                        <ShieldCheck size={14} />
                                        Trusted creator
                                    </span>
                                )
                            }
                        </div>

                        <p>{split.Description || "No description yet."}</p>

                        {
                            split.Equipment && <small>{split.Equipment}</small>
                        }
                    </section>

                    <section className="workout-days-list">
                        {
                            days.map(day => (
                                <article key={day.Id}>
                                    <div className="workout-day-heading">
                                        <span className="section-kicker">
                                            Day {day.DayNumber}
                                            {Number(day.IsRestDay) ? " · Rest" : ""}
                                        </span>
                                        <h3>{day.Name}</h3>
                                    </div>

                                    {
                                        Number(day.IsRestDay)
                                            ? <p className="workout-rest-card">Rest day. No exercises planned.</p>
                                            : (
                                                <div className="workout-exercise-list">
                                                    {
                                                        dayExercises(day.Id).map(exercise => (
                                                            <div key={exercise.Id}>
                                                                <Dumbbell size={17} />
                                                                <strong>{exercise.DisplayExerciseName || exercise.ExerciseName}</strong>
                                                                <span>{exercise.DisplaySets || exercise.Sets} sets</span>
                                                                <small>{exercise.DisplayNotes || exercise.Notes || "Use a weight you can control with clean form."}</small>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            )
                                    }
                                </article>
                            ))
                        }
                    </section>

                    <div className="workout-rating-row">
                        <span>Rate this split</span>
                        <div>
                            {
                                [1, 2, 3, 4, 5].map(rating => (
                                    <button
                                        key={rating}
                                        type="button"
                                        className={Number(split.UserRating) >= rating ? "active" : ""}
                                        onClick={() => rateSplit(rating)}
                                        aria-label={`Rate ${rating} stars`}
                                    >
                                        <Star size={18} />
                                    </button>
                                ))
                            }
                        </div>
                    </div>

                    <div className="workout-detail-actions">
                        <button
                            className="workout-primary-button"
                            type="button"
                            onClick={selectSplit}
                        >
                            <Dumbbell size={18} />
                            {Number(split.IsSelected) ? "Selected" : "Use This Split"}
                        </button>

                        {
                            currentUser?.Id === split.CreatedBy && (
                                <button
                                    className="workout-secondary-button"
                                    type="button"
                                    onClick={onEdit}
                                >
                                    <Dumbbell size={18} />
                                    Edit Public Split
                                </button>
                            )
                        }

                        <button
                            className="workout-secondary-button"
                            type="button"
                            onClick={() => setShowReportForm(prev => !prev)}
                        >
                            <Flag size={16} />
                            Report
                        </button>
                    </div>

                    {
                        showReportForm && (
                            <div className="workout-report-form">
                                <textarea
                                    maxLength="255"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Why should an admin review this split?"
                                />

                                <button
                                    className="workout-secondary-button"
                                    type="button"
                                    onClick={reportSplit}
                                    disabled={reporting}
                                >
                                    <Flag size={16} />
                                    {reporting ? "Sending..." : "Send Report"}
                                </button>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}

export default WorkoutSplitDetailModal;
