/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, ShieldCheck, Star } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { clearToken } from "../services/authService";
import CreateWorkoutSplitModal from "../components/CreateWorkoutSplitModal";
import WorkoutSplitDetailModal from "../components/WorkoutSplitDetailModal";
import ModerationNotificationModal from "../components/ModerationNotificationModal";
import "../styles/Workouts.css";

function WorkoutSplits() {
    const navigate = useNavigate();
    const [splits, setSplits] = useState([]);
    const [selectedSplit, setSelectedSplit] = useState(null);
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editingSplit, setEditingSplit] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: "",
        goal: "",
        difficulty: "",
        minRating: "",
        owner: "all",
        sort: "newest"
    });

    const query = useMemo(() => {
        const params = {};

        if (filters.search) params.search = filters.search;
        if (filters.goal) params.goal = filters.goal;
        if (filters.difficulty) params.difficulty = filters.difficulty;
        if (filters.minRating) params.minRating = filters.minRating;
        if (filters.owner) params.owner = filters.owner;
        if (filters.sort) params.sort = filters.sort;

        return params;
    }, [filters]);

    const handleAuthError = useCallback((err) => {
        if (err.response?.status === 401 || err.response?.status === 404) {
            clearToken();
            toast.error("Please log in again.");
            navigate("/login");
        }
    }, [navigate]);

    const loadSplits = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get("/workout-splits", {
                params: query
            });

            setSplits(response.data);
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            toast.error(err.response?.data?.message || "Failed to load workout splits.");
        }
        finally {
            setLoading(false);
        }
    }, [handleAuthError, query]);

    const openSplit = useCallback(async (splitId) => {
        try {
            const response = await api.get(`/workout-splits/${splitId}`);

            setSelectedSplit(response.data.split);
            setSelectedDays(response.data.days);
            setSelectedExercises(response.data.exercises);
        }
        catch (err) {
            console.error(err);
            handleAuthError(err);
            toast.error(err.response?.data?.message || "Failed to open workout split.");
        }
    }, [handleAuthError]);

    const resetFilters = () => {
        setFilters({
            search: "",
            goal: "",
            difficulty: "",
            minRating: "",
            owner: "all",
            sort: "newest"
        });
    };

    const setRatingFilter = (rating) => {
        setFilters(prev => ({
            ...prev,
            minRating: prev.minRating === String(rating) ? "" : String(rating)
        }));
    };

    const handleSplitSaved = useCallback((result) => {
        if (result?.status && result.status !== "Approved") {
            setFilters(prev => ({
                ...prev,
                owner: "mine",
                sort: "newest"
            }));
            return;
        }

        loadSplits();
    }, [loadSplits]);

    useEffect(() => {
        loadSplits();
    }, [loadSplits]);

    useEffect(() => {
        const loadBaseData = async () => {
            try {
                const [profileResponse, notificationResponse] = await Promise.all([
                    api.get("/auth/profile"),
                    api.get("/notifications")
                ]);

                setUser(profileResponse.data);
                setNotifications(notificationResponse.data);
            }
            catch (err) {
                console.error(err);
                handleAuthError(err);
            }
        };

        loadBaseData();
    }, [handleAuthError]);

    const openEditSplit = () => {
        setEditingSplit({
            split: selectedSplit,
            days: selectedDays,
            exercises: selectedExercises
        });
        setSelectedSplit(null);
        setSelectedDays([]);
        setSelectedExercises([]);
    };

    const dismissNotification = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/dismiss`);
            setNotifications(prev => prev.filter(notification => notification.Id !== notificationId));
            loadSplits();
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to dismiss admin message.");
        }
    };

    return (
        <div className="workouts-page">
            <header className="workouts-topbar">
                <button
                    className="workout-secondary-button"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft size={18} />
                    Dashboard
                </button>

                <div>
                    <span className="section-kicker">Training</span>
                    <h1>Workout Splits</h1>
                </div>

                <button
                    className="workout-primary-button"
                    type="button"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus size={18} />
                    Create Split
                </button>
            </header>

            <main className="workouts-shell">
                <aside className="workouts-filter-panel">
                    <div className="workout-search-field">
                        <Search size={18} />
                        <input
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                search: e.target.value
                            }))}
                            placeholder="Search splits"
                        />
                    </div>

                    <div className="workout-filter-grid">
                        <label>
                            Sort
                            <select
                                value={filters.sort}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    sort: e.target.value
                                }))}
                            >
                                <option value="newest">Newest</option>
                                <option value="rating">Rating</option>
                                <option value="days">Fewest days</option>
                            </select>
                        </label>

                        <div className="workout-owner-tabs">
                            <span>View</span>
                            <div>
                                <button
                                    type="button"
                                    className={filters.owner === "all" ? "active" : ""}
                                    onClick={() => setFilters(prev => ({
                                        ...prev,
                                        owner: "all"
                                    }))}
                                >
                                    Public
                                </button>

                                <button
                                    type="button"
                                    className={filters.owner === "mine" ? "active" : ""}
                                    onClick={() => setFilters(prev => ({
                                        ...prev,
                                        owner: "mine"
                                    }))}
                                >
                                    Mine
                                </button>
                            </div>
                        </div>

                        <label>
                            Goal
                            <select
                                value={filters.goal}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    goal: e.target.value
                                }))}
                            >
                                <option value="">Any</option>
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
                                value={filters.difficulty}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    difficulty: e.target.value
                                }))}
                            >
                                <option value="">Any</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </label>

                        <label className="workout-rating-filter">
                            Rating
                            <div>
                                {
                                    [1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            type="button"
                                            className={Number(filters.minRating) >= rating ? "active" : ""}
                                            onClick={() => setRatingFilter(rating)}
                                            aria-label={`Filter ${rating} star rating and above`}
                                        >
                                            <Star size={17} />
                                        </button>
                                    ))
                                }
                            </div>
                        </label>
                    </div>

                    <button
                        className="workout-secondary-button"
                        type="button"
                        onClick={resetFilters}
                    >
                        Reset Filters
                    </button>
                </aside>

                <section className="workouts-list-panel">
                    <div className="workouts-list-heading">
                        <div>
                            <span className="section-kicker">Browse</span>
                            <h2>{splits.length} split{splits.length === 1 ? "" : "s"}</h2>
                        </div>
                    </div>

                    {
                        loading
                            ? <p className="workout-empty">Loading workout splits...</p>
                            : splits.length === 0
                                ? <p className="workout-empty">No workout splits match those filters yet.</p>
                                : (
                                    <div className="workout-card-grid">
                                        {
                                            splits.map(split => (
                                                <article
                                                    className="workout-card"
                                                    key={split.Id}
                                                    onClick={() => openSplit(split.Id)}
                                                >
                                                    <div className="workout-card-header">
                                                        <div>
                                                            <span>
                                                                {split.AuthorName}
                                                                {
                                                                    Boolean(split.AuthorTrusted) && (
                                                                        <ShieldCheck
                                                                            size={14}
                                                                            title="Trusted creator"
                                                                        />
                                                                    )
                                                                }
                                                            </span>
                                                            <h3>{split.Name}</h3>
                                                        </div>

                                                        <div className="workout-rating-badge">
                                                            <Star size={15} />
                                                            {Number(split.AverageRating || 0).toFixed(1)}
                                                        </div>
                                                    </div>

                                                    <p>{split.Description || "Community workout split with exercises and set guidance."}</p>

                                                    <div className="workout-card-meta">
                                                        {
                                                            filters.owner === "mine" && (
                                                                <span className={`workout-status-pill ${split.Status.toLowerCase()}`}>
                                                                    {split.Status}
                                                                </span>
                                                            )
                                                        }
                                                        <span>{split.DaysPerWeek} days</span>
                                                        <span>{split.ExerciseCount} exercises</span>
                                                        <span>{split.Difficulty}</span>
                                                        <span>{split.Goal.replace("_", " ")}</span>
                                                    </div>
                                                </article>
                                            ))
                                        }
                                    </div>
                                )
                    }
                </section>
            </main>

            <CreateWorkoutSplitModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={handleSplitSaved}
            />

            <CreateWorkoutSplitModal
                isOpen={Boolean(editingSplit)}
                onClose={() => setEditingSplit(null)}
                editSplit={editingSplit?.split}
                editDays={editingSplit?.days || []}
                editExercises={editingSplit?.exercises || []}
                onCreated={handleSplitSaved}
            />

            <WorkoutSplitDetailModal
                isOpen={Boolean(selectedSplit)}
                split={selectedSplit}
                days={selectedDays}
                exercises={selectedExercises}
                currentUser={user}
                onEdit={openEditSplit}
                onClose={() => {
                    setSelectedSplit(null);
                    setSelectedDays([]);
                    setSelectedExercises([]);
                }}
                onRated={() => {
                    loadSplits();
                    if (selectedSplit) openSplit(selectedSplit.Id);
                }}
                onSelected={() => {
                    loadSplits();
                    if (selectedSplit) openSplit(selectedSplit.Id);
                }}
            />

            <ModerationNotificationModal
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </div>
    );
}

export default WorkoutSplits;
