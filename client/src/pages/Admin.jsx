/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, ChevronDown, ChevronUp, ClipboardList, Flag, KeyRound, Search, Shield, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/Admin.css";

const activeAdminFeatures = [
    {
        title: "Recipe Reports Queue",
        description: "Review recipes reported as fake, offensive, or nutritionally misleading.",
        icon: Flag
    },
    {
        title: "Warning System",
        description: "Send a warning before blocking recipe posting, with notes visible to admins.",
        icon: TriangleAlert
    },
    {
        title: "Admin Audit Log",
        description: "Track which admin approved, rejected, blocked, or unblocked each item.",
        icon: ClipboardList
    },
    {
        title: "Trusted Users",
        description: "Let reliable users skip recipe approval after enough clean posts.",
        icon: ShieldCheck
    },
    {
        title: "Macro Mismatch Flags",
        description: "Automatically flag recipes where ingredient totals look suspicious.",
        icon: Shield
    }
];

const auditActionGroups = [
    {
        label: "All",
        value: ""
    },
    {
        label: "Approvals",
        value: "approved"
    },
    {
        label: "Rejections",
        value: "rejected"
    },
    {
        label: "Deletes",
        value: "deleted"
    },
    {
        label: "Reports",
        value: "report"
    },
    {
        label: "Blocks",
        value: "blocked"
    },
    {
        label: "Warnings",
        value: "warned"
    },
    {
        label: "Trust",
        value: "trust"
    },
    {
        label: "Foods",
        value: "food"
    },
    {
        label: "Recipes",
        value: "recipe"
    },
    {
        label: "Splits",
        value: "workout"
    },
    {
        label: "Password",
        value: "password"
    }
];

function Admin() {
    const navigate = useNavigate();
    const [foods, setFoods] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [workoutSplits, setWorkoutSplits] = useState([]);
    const [reports, setReports] = useState([]);
    const [workoutReports, setWorkoutReports] = useState([]);
    const [passwordResetRequests, setPasswordResetRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [reviewDraft, setReviewDraft] = useState(null);
    const [dismissDraft, setDismissDraft] = useState(null);
    const [contentReviewDraft, setContentReviewDraft] = useState(null);
    const [passwordResetDraft, setPasswordResetDraft] = useState(null);
    const [banDraft, setBanDraft] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [auditSearch, setAuditSearch] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [auditCollapsed, setAuditCollapsed] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(max-width: 720px)").matches
    ));
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    const formatNumber = (value) => {
        const number = Number(value || 0);

        return Number.isInteger(number)
            ? number.toString()
            : number.toFixed(1);
    };

    const loadAdminData = async () => {
        try {
            setLoading(true);
            setLoadError("");

            const requests = [
                ["foods", api.get("/admin/foods/pending")],
                ["recipes", api.get("/admin/recipes/pending")],
                ["workoutSplits", api.get("/admin/workout-splits/pending")],
                ["reports", api.get("/admin/recipe-reports")],
                ["workoutReports", api.get("/admin/workout-split-reports")],
                ["passwordResetRequests", api.get("/admin/password-reset-requests")],
                ["users", api.get("/admin/users")],
                ["auditLogs", api.get("/admin/audit-logs")]
            ];

            const results = await Promise.allSettled(requests.map(([, request]) => request));
            const failedSections = [];

            results.forEach((result, index) => {
                const key = requests[index][0];

                if (result.status !== "fulfilled") {
                    const err = result.reason;

                    if (err.response?.status === 403) {
                        toast.error("Admin access required.");
                        navigate("/dashboard");
                    }

                    console.error(err);
                    failedSections.push(key);
                    return;
                }

                const data = result.value.data;

                if (key === "foods") setFoods(data);
                if (key === "recipes") setRecipes(data);
                if (key === "workoutSplits") setWorkoutSplits(data);
                if (key === "reports") setReports(data);
                if (key === "workoutReports") setWorkoutReports(data);
                if (key === "passwordResetRequests") setPasswordResetRequests(data);
                if (key === "users") setUsers(data);
                if (key === "auditLogs") setAuditLogs(data);
            });

            if (failedSections.length > 0) {
                setLoadError(`Some admin sections did not load: ${failedSections.join(", ")}.`);
            }
        }
        catch (err) {
            console.error(err);

            if (err.response?.status === 403) {
                toast.error("Admin access required.");
                navigate("/dashboard");
                return;
            }

            setLoadError(err.response?.data?.message || "Admin data took too long to load.");
            toast.error(err.response?.data?.message || "Failed to load admin data.");
        }
        finally {
            setLoading(false);
        }
    };

    const updateFoodStatus = async (id, status, adminMessage = "") => {
        await api.patch(`/admin/foods/${id}/status`, {
            status,
            adminMessage
        });
        setFoods(prev => prev.filter(food => food.Id !== id));
        toast.success("Food updated.");
        await loadAdminData();
    };

    const updateRecipeStatus = async (id, status, adminMessage = "") => {
        await api.patch(`/admin/recipes/${id}/status`, {
            status,
            adminMessage
        });
        setRecipes(prev => prev.filter(recipe => recipe.Id !== id));
        toast.success("Recipe updated.");
        await loadAdminData();
    };

    const updateWorkoutSplitStatus = async (id, status, adminMessage = "") => {
        await api.patch(`/admin/workout-splits/${id}/status`, {
            status,
            adminMessage
        });
        setWorkoutSplits(prev => prev.filter(split => split.Id !== id));
        toast.success("Workout split updated.");
        await loadAdminData();
    };

    const updateReportStatus = async (id, status, adminResponse = "") => {
        await api.patch(`/admin/recipe-reports/${id}/status`, {
            status,
            adminResponse
        });
        setReports(prev => prev.filter(report => report.Id !== id));
        toast.success("Report updated.");
        await loadAdminData();
    };

    const updateWorkoutReportStatus = async (id, status, adminResponse = "") => {
        await api.patch(`/admin/workout-split-reports/${id}/status`, {
            status,
            adminResponse
        });
        setWorkoutReports(prev => prev.filter(report => report.Id !== id));
        toast.success("Workout report updated.");
        await loadAdminData();
    };

    const updatePasswordResetStatus = async (id, status, adminResponse = "") => {
        await api.patch(`/admin/password-reset-requests/${id}/status`, {
            status,
            adminResponse
        });
        setPasswordResetRequests(prev => prev.filter(request => request.Id !== id));
        toast.success(status === "Reviewed" ? "Password reset request reviewed." : "Password reset request dismissed.");
        await loadAdminData();
    };

    const submitPasswordReset = async () => {
        if (!passwordResetDraft) return;

        await updatePasswordResetStatus(
            passwordResetDraft.request.Id,
            "Reviewed",
            passwordResetDraft.message.trim()
        );
        setPasswordResetDraft(null);
    };

    const rejectReportedRecipe = async (report) => {
        await api.patch(`/admin/recipes/${report.RecipeId}/status`, {
            status: "Rejected"
        });
        await api.patch(`/admin/recipe-reports/${report.Id}/status`, {
            status: "Reviewed"
        });
        toast.success("Recipe rejected and report reviewed.");
        loadAdminData();
    };

    const rejectReportedWorkoutSplit = async (report) => {
        await api.patch(`/admin/workout-splits/${report.SplitId}/status`, {
            status: "Rejected"
        });
        await api.patch(`/admin/workout-split-reports/${report.Id}/status`, {
            status: "Reviewed"
        });
        toast.success("Workout split rejected and report reviewed.");
        loadAdminData();
    };

    const submitReportReview = async () => {
        if (!reviewDraft?.response.trim()) {
            toast.error("Write a short response for the reporter.");
            return;
        }

        if (reviewDraft.type === "workout") {
            await updateWorkoutReportStatus(reviewDraft.report.Id, "Reviewed", reviewDraft.response.trim());
        }
        else {
            await updateReportStatus(reviewDraft.report.Id, "Reviewed", reviewDraft.response.trim());
        }
        setReviewDraft(null);
    };

    const openContentReview = (type, item, status) => {
        setContentReviewDraft({
            type,
            item,
            status,
            step: "preview",
            message: ""
        });
    };

    const submitContentReview = async () => {
        const message = contentReviewDraft.message.trim();

        if (!message) {
            toast.error("Write a short message for the user.");
            return;
        }

        if (contentReviewDraft.type === "food") {
            await updateFoodStatus(contentReviewDraft.item.Id, contentReviewDraft.status, message);
        }
        else if (contentReviewDraft.type === "recipe") {
            await updateRecipeStatus(contentReviewDraft.item.Id, contentReviewDraft.status, message);
        }
        else {
            await updateWorkoutSplitStatus(contentReviewDraft.item.Id, contentReviewDraft.status, message);
        }

        setContentReviewDraft(null);
    };

    const confirmDismissReport = async () => {
        if (dismissDraft.type === "workout") {
            await updateWorkoutReportStatus(dismissDraft.report.Id, "Dismissed");
        }
        else {
            await updateReportStatus(dismissDraft.report.Id, "Dismissed");
        }
        setDismissDraft(null);
    };

    const warnUser = async (user) => {
        await api.patch(`/admin/users/${user.Id}/moderation`, {
            recipePostingBlocked: Boolean(user.RecipePostingBlocked),
            moderationNote: "Warned by admin for posting questionable recipes.",
            moderationAction: "warn"
        });
        toast.success("User warning saved.");
        loadAdminData();
    };

    const toggleTrustedUser = async (userId, trustedRecipeCreator) => {
        await api.patch(`/admin/users/${userId}/trust`, {
            trustedRecipeCreator
        });
        toast.success(trustedRecipeCreator ? "User marked as trusted." : "Trusted status removed.");
        loadAdminData();
    };

    const blockReportedAuthor = async (report) => {
        await api.patch(`/admin/users/${report.RecipeAuthorId}/moderation`, {
            recipePostingBlocked: true,
            moderationNote: `Blocked after report: ${report.Reason}`
        });
        await api.patch(`/admin/recipe-reports/${report.Id}/status`, {
            status: "Reviewed"
        });
        toast.success("Recipe author blocked and report reviewed.");
        loadAdminData();
    };

    const toggleRecipePosting = async (user) => {
        const nextBlocked = !user.RecipePostingBlocked;

        await api.patch(`/admin/users/${user.Id}/moderation`, {
            recipePostingBlocked: nextBlocked,
            moderationNote: nextBlocked
                ? "Blocked from posting recipes by admin."
                : ""
        });
        toast.success(nextBlocked ? "User blocked from posting recipes." : "User can post recipes again.");
        loadAdminData();
    };

    const unbanUser = async (user) => {
        await api.patch(`/admin/users/${user.Id}/moderation`, {
            recipePostingBlocked: Boolean(user.RecipePostingBlocked),
            isBanned: false,
            moderationNote: "",
            moderationAction: "ban"
        });
        toast.success("User unbanned.");
        loadAdminData();
    };

    const openBanDialog = (user) => {
        setBanDraft({
            user,
            banType: "temporary",
            days: "7",
            message: "Your account has been temporarily banned by an admin.",
            confirmPermanent: false
        });
    };

    const submitBan = async () => {
        if (!banDraft) return;

        if (banDraft.banType === "permanent") {
            if (!banDraft.confirmPermanent) {
                toast.error("Confirm permanent account deletion first.");
                return;
            }

            await api.delete(`/admin/users/${banDraft.user.Id}/permanent-ban`);
            toast.success("User permanently banned and deleted.");
            setBanDraft(null);
            loadAdminData();
            return;
        }

        const banDays = Number(banDraft.days);

        if (!Number.isFinite(banDays) || banDays <= 0) {
            toast.error("Enter a valid ban length.");
            return;
        }

        const banExpiresAt = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        await api.patch(`/admin/users/${banDraft.user.Id}/moderation`, {
            recipePostingBlocked: Boolean(banDraft.user.RecipePostingBlocked),
            isBanned: true,
            banExpiresAt,
            moderationNote: banDraft.message.trim() || `Banned by admin for ${banDays} day${banDays === 1 ? "" : "s"}.`,
            moderationAction: "ban"
        });
        toast.success("User banned.");
        setBanDraft(null);
        loadAdminData();
    };

    const hasMacroMismatch = (recipe) => {
        const checks = [
            Math.abs(Number(recipe.Calories || 0) - Number(recipe.IngredientCalories || 0)) > 5,
            Math.abs(Number(recipe.Protein || 0) - Number(recipe.IngredientProtein || 0)) > 1,
            Math.abs(Number(recipe.Carbs || 0) - Number(recipe.IngredientCarbs || 0)) > 1,
            Math.abs(Number(recipe.Fat || 0) - Number(recipe.IngredientFat || 0)) > 1
        ];

        return checks.some(Boolean);
    };

    const formatDateTime = (value) => {
        if (!value) return "";

        return new Date(value).toLocaleString("en", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredUsers = useMemo(() => {
        const search = userSearch.trim().toLowerCase();

        if (!search) return users;

        return users.filter(user => user.Email.toLowerCase().includes(search));
    }, [userSearch, users]);

    const filteredAuditLogs = useMemo(() => {
        const search = auditSearch.trim().toLowerCase();

        return auditLogs.filter(log => {
            const action = String(log.Action || "").toLowerCase();
            const target = [
                log.Email,
                log.TargetEmail,
                log.FirstName,
                log.LastName,
                log.TargetFirstName,
                log.TargetLastName,
                log.EntityType,
                log.EntityId,
                log.Details
            ].filter(Boolean).join(" ").toLowerCase();

            const matchesSearch = !search || action.includes(search) || target.includes(search);
            const matchesAction = !auditActionFilter || action.includes(auditActionFilter);

            return matchesSearch && matchesAction;
        });
    }, [auditActionFilter, auditLogs, auditSearch]);

    useEffect(() => {
        loadAdminData();
    }, []);

    return (
        <div className="admin-page">
            <header className="admin-topbar">
                <button
                    className="admin-secondary-button"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft size={18} />
                    Dashboard
                </button>

                <div>
                    <span className="section-kicker">Moderation</span>
                    <h1>Admin</h1>
                </div>

                <Shield size={34} />
            </header>

            <main className="admin-shell">
                {
                    loading && <p className="admin-empty">Loading admin data...</p>
                }

                {
                    loadError && !loading && (
                        <div className="admin-empty">
                            <p>{loadError}</p>
                            <button
                                type="button"
                                onClick={loadAdminData}
                            >
                                Try again
                            </button>
                        </div>
                    )
                }

                <section className="admin-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Foods</span>
                            <h2>Pending Public Foods</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            foods.length === 0
                                ? <p className="admin-empty">No foods waiting for approval.</p>
                                : foods.map(food => (
                                    <article key={food.Id}>
                                        <div>
                                            <h3>{food.Name}</h3>
                                            <p>
                                                {formatNumber(food.Calories)} kcal · P {formatNumber(food.Protein)}g · C {formatNumber(food.Carbs)}g · F {formatNumber(food.Fat)}g
                                            </p>
                                            <small>{food.FirstName} {food.LastName} · {food.Email}</small>
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => openContentReview("food", food, "Approved")}
                                            >
                                                <Check size={16} />
                                                Approve
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => openContentReview("food", food, "Private")}
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Recipes</span>
                            <h2>Pending Recipes</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            recipes.length === 0
                                ? <p className="admin-empty">No recipes waiting for approval.</p>
                                : recipes.map(recipe => (
                                    <article key={recipe.Id}>
                                        <div>
                                            <h3>{recipe.Name}</h3>
                                            <p>
                                                {formatNumber(recipe.Calories)} kcal · P {formatNumber(recipe.Protein)}g · C {formatNumber(recipe.Carbs)}g · F {formatNumber(recipe.Fat)}g
                                            </p>
                                            <small>
                                                {recipe.IngredientCount} ingredients · {recipe.FirstName} {recipe.LastName} · {recipe.Email}
                                            </small>
                                            {
                                                recipe.TrustedRecipeCreator
                                                && <span className="admin-note-pill">Trusted recipe creator</span>
                                            }
                                            {
                                                hasMacroMismatch(recipe) && (
                                                    <span className="admin-warning-pill">
                                                        <TriangleAlert size={14} />
                                                        Macro mismatch
                                                    </span>
                                                )
                                            }
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => openContentReview("recipe", recipe, "Approved")}
                                            >
                                                <Check size={16} />
                                                Approve
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => openContentReview("recipe", recipe, "Rejected")}
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleTrustedUser(recipe.CreatedBy, !recipe.TrustedRecipeCreator)}
                                            >
                                                <ShieldCheck size={16} />
                                                {recipe.TrustedRecipeCreator ? "Untrust" : "Trust Author"}
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Account</span>
                            <h2>Password Reset Requests</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            passwordResetRequests.length === 0
                                ? <p className="admin-empty">No password reset requests.</p>
                                : passwordResetRequests.map(request => (
                                    <article key={request.Id}>
                                        <div>
                                            <h3>{request.Email}</h3>
                                            <p>
                                                {request.FirstName ? `${request.FirstName} ${request.LastName}` : "No matching user account"}
                                            </p>
                                            <small>{request.Role || "unknown"} · {formatDateTime(request.CreatedAt)}</small>
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                disabled={!request.UserId}
                                                title={!request.UserId ? "No matching user account." : ""}
                                                onClick={() => setPasswordResetDraft({
                                                    request,
                                                    message: "Password reset approved. You can now log in with your new password."
                                                })}
                                            >
                                                <KeyRound size={16} />
                                                Reset Password
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => updatePasswordResetStatus(request.Id, "Dismissed")}
                                            >
                                                <X size={16} />
                                                Dismiss
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Training</span>
                            <h2>Pending Workout Splits</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            workoutSplits.length === 0
                                ? <p className="admin-empty">No workout splits waiting for approval.</p>
                                : workoutSplits.map(split => (
                                    <article key={split.Id}>
                                        <div>
                                            <h3>{split.Name}</h3>
                                            <p>
                                                {split.DaysPerWeek} days · {split.ExerciseCount} exercises · {split.Difficulty} · {split.Goal.replace("_", " ")}
                                            </p>
                                            <small>{split.FirstName} {split.LastName} · {split.Email}</small>
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => openContentReview("workout", split, "Approved")}
                                            >
                                                <Check size={16} />
                                                Approve
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => openContentReview("workout", split, "Rejected")}
                                            >
                                                <X size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Reports</span>
                            <h2>Recipe Reports Queue</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            reports.length === 0
                                ? <p className="admin-empty">No recipe reports yet.</p>
                                : reports.map(report => (
                                    <article key={report.Id}>
                                        <div>
                                            <h3>{report.RecipeName}</h3>
                                            <p>{report.Reason}</p>
                                            <small>
                                                {report.Status} · reported by {report.ReporterFirstName} {report.ReporterLastName} · posted by {report.AuthorFirstName} {report.AuthorLastName}
                                            </small>
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => setReviewDraft({
                                                    report,
                                                    type: "recipe",
                                                    response: ""
                                                })}
                                            >
                                                <Check size={16} />
                                                Review
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDismissDraft({
                                                    report,
                                                    type: "recipe"
                                                })}
                                            >
                                                <X size={16} />
                                                Dismiss
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => rejectReportedRecipe(report)}
                                            >
                                                <X size={16} />
                                                Reject Recipe
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => blockReportedAuthor(report)}
                                            >
                                                <Ban size={16} />
                                                Block Author
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleTrustedUser(report.RecipeAuthorId, !report.AuthorTrusted)}
                                            >
                                                <ShieldCheck size={16} />
                                                {report.AuthorTrusted ? "Untrust" : "Trust Author"}
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Reports</span>
                            <h2>Workout Split Reports</h2>
                        </div>
                    </div>

                    <div className="admin-list">
                        {
                            workoutReports.length === 0
                                ? <p className="admin-empty">No workout split reports yet.</p>
                                : workoutReports.map(report => (
                                    <article key={report.Id}>
                                        <div>
                                            <h3>{report.SplitName}</h3>
                                            <p>{report.Reason}</p>
                                            <small>
                                                {report.Status} · reported by {report.ReporterFirstName} {report.ReporterLastName} · posted by {report.AuthorFirstName} {report.AuthorLastName}
                                            </small>
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => setReviewDraft({
                                                    report,
                                                    type: "workout",
                                                    response: ""
                                                })}
                                            >
                                                <Check size={16} />
                                                Review
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDismissDraft({
                                                    report,
                                                    type: "workout"
                                                })}
                                            >
                                                <X size={16} />
                                                Dismiss
                                            </button>

                                            <button
                                                className="danger"
                                                type="button"
                                                onClick={() => rejectReportedWorkoutSplit(report)}
                                            >
                                                <X size={16} />
                                                Reject Split
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Users</span>
                            <h2>Recipe Posting Access</h2>
                        </div>

                        <label className="admin-search-field">
                            <Search size={17} />
                            <input
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Search by email"
                            />
                        </label>
                    </div>

                    <div className="admin-user-grid">
                        {
                            filteredUsers.length === 0
                                ? <p className="admin-empty">No users match that email.</p>
                                : filteredUsers.map(user => (
                                    <article key={user.Id}>
                                        <div>
                                            <h3>{user.FirstName} {user.LastName}</h3>
                                            <p>{user.Email}</p>
                                            <small>{user.Role}</small>
                                            {
                                                Boolean(user.IsBanned)
                                                && (
                                                    <span className="admin-note-pill danger">
                                                        Banned{user.BanExpiresAt ? ` until ${formatDateTime(user.BanExpiresAt)}` : ""}
                                                    </span>
                                                )
                                            }
                                            {
                                                user.TrustedRecipeCreator
                                                && <span className="admin-note-pill">Trusted recipe creator</span>
                                            }
                                            {
                                                user.ModerationNote && (
                                                    <span className="admin-note-pill">{user.ModerationNote}</span>
                                                )
                                            }
                                        </div>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={() => warnUser(user)}
                                            >
                                                <TriangleAlert size={16} />
                                                Warn
                                            </button>

                                            <button
                                                className={user.RecipePostingBlocked ? "" : "danger"}
                                                type="button"
                                                onClick={() => toggleRecipePosting(user)}
                                            >
                                                <Ban size={16} />
                                                {user.RecipePostingBlocked ? "Unblock" : "Block Recipes"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleTrustedUser(user.Id, !user.TrustedRecipeCreator)}
                                            >
                                                <ShieldCheck size={16} />
                                                {user.TrustedRecipeCreator ? "Untrust" : "Trust"}
                                            </button>

                                            <button
                                                className={user.IsBanned ? "" : "danger"}
                                                type="button"
                                                onClick={() => (user.IsBanned ? unbanUser(user) : openBanDialog(user))}
                                            >
                                                <Ban size={16} />
                                                {user.IsBanned ? "Unban" : "Ban User"}
                                            </button>
                                        </div>
                                    </article>
                                ))
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Tools</span>
                            <h2>Admin Features</h2>
                        </div>
                    </div>

                    <div className="admin-roadmap-grid">
                        {
                            activeAdminFeatures.map(feature => {
                                const Icon = feature.icon;

                                return (
                                    <article key={feature.title}>
                                        <div className="admin-roadmap-icon">
                                            <Icon size={18} />
                                        </div>

                                        <div>
                                            <h3>{feature.title}</h3>
                                            <p>{feature.description}</p>
                                        </div>
                                    </article>
                                );
                            })
                        }
                    </div>
                </section>

                <section className="admin-panel wide">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="section-kicker">Audit</span>
                            <h2>Recent Admin Actions</h2>
                        </div>

                        <div className="admin-heading-actions">
                            <label className="admin-search-field">
                                <Search size={17} />
                                <input
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    placeholder="Search by email or action"
                                />
                            </label>

                            <button
                                className="admin-collapse-button"
                                type="button"
                                onClick={() => setAuditCollapsed(prev => !prev)}
                                aria-label={auditCollapsed ? "Show admin actions" : "Hide admin actions"}
                                title={auditCollapsed ? "Show" : "Minimize"}
                            >
                                {auditCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                        </div>
                    </div>

                    {
                        auditCollapsed
                            ? (
                                <p className="admin-empty">
                                    {filteredAuditLogs.length} {filteredAuditLogs.length === 1 ? "action" : "actions"} hidden.
                                </p>
                            )
                            : (
                                <>
                                    <div className="admin-filter-tags">
                                        {
                                            auditActionGroups.map(group => (
                                                <button
                                                    key={group.label}
                                                    type="button"
                                                    className={auditActionFilter === group.value ? "active" : ""}
                                                    onClick={() => setAuditActionFilter(group.value)}
                                                >
                                                    {group.label}
                                                </button>
                                            ))
                                        }
                                    </div>

                                    <div className="admin-audit-list">
                                        {
                                            filteredAuditLogs.length === 0
                                                ? <p className="admin-empty">No admin actions recorded yet.</p>
                                                : filteredAuditLogs.map(log => (
                                                    <article key={log.Id}>
                                                        <div>
                                                            <strong>{log.Action.replaceAll("_", " ")}</strong>
                                                            <span>
                                                                {
                                                                    log.TargetFirstName
                                                                        ? `${log.TargetFirstName} ${log.TargetLastName} · ${log.TargetEmail}`
                                                                        : `${log.EntityType} #${log.EntityId || "n/a"}`
                                                                }
                                                            </span>
                                                        </div>

                                                        <small>
                                                            {log.FirstName || "Admin"} {log.LastName || ""} · {formatDateTime(log.CreatedAt)}
                                                        </small>
                                                    </article>
                                                ))
                                        }
                                    </div>
                                </>
                            )
                    }
                </section>
            </main>

            {
                contentReviewDraft && (
                    <div className="modal-overlay">
                        <div className="admin-dialog">
                            <div className="admin-panel-heading">
                                <div>
                                    <span className="section-kicker">
                                        {contentReviewDraft.status === "Approved" ? "Approve" : "Reject"}
                                    </span>
                                    <h2>
                                        {
                                            contentReviewDraft.step === "preview"
                                                ? "Review Submission"
                                                : "Message Creator"
                                        }
                                    </h2>
                                </div>
                            </div>

                            {
                                contentReviewDraft.step === "preview"
                                    ? (
                                        <div className="admin-review-preview">
                                            <h3>{contentReviewDraft.item.Name}</h3>
                                            {
                                                contentReviewDraft.type === "food" && (
                                                    <p>
                                                        {formatNumber(contentReviewDraft.item.Calories)} kcal · P {formatNumber(contentReviewDraft.item.Protein)}g · C {formatNumber(contentReviewDraft.item.Carbs)}g · F {formatNumber(contentReviewDraft.item.Fat)}g
                                                    </p>
                                                )
                                            }
                                            {
                                                contentReviewDraft.type === "recipe" && (
                                                    <>
                                                        <p>
                                                            {formatNumber(contentReviewDraft.item.Calories)} kcal · P {formatNumber(contentReviewDraft.item.Protein)}g · C {formatNumber(contentReviewDraft.item.Carbs)}g · F {formatNumber(contentReviewDraft.item.Fat)}g
                                                        </p>
                                                        <small>{contentReviewDraft.item.IngredientCount} ingredients</small>
                                                    </>
                                                )
                                            }
                                            {
                                                contentReviewDraft.type === "workout" && (
                                                    <p>
                                                        {contentReviewDraft.item.DaysPerWeek} days · {contentReviewDraft.item.ExerciseCount} exercises · {contentReviewDraft.item.Difficulty} · {contentReviewDraft.item.Goal.replace("_", " ")}
                                                    </p>
                                                )
                                            }
                                            <small>
                                                {contentReviewDraft.item.FirstName} {contentReviewDraft.item.LastName} · {contentReviewDraft.item.Email}
                                            </small>
                                        </div>
                                    )
                                    : (
                                        <>
                                            <p>
                                                This message will appear for the user after their submission is {contentReviewDraft.status === "Approved" ? "approved" : "rejected"}.
                                            </p>

                                            <textarea
                                                maxLength="255"
                                                value={contentReviewDraft.message}
                                                onChange={(e) => setContentReviewDraft(prev => ({
                                                    ...prev,
                                                    message: e.target.value
                                                }))}
                                                placeholder={
                                                    contentReviewDraft.status === "Approved"
                                                        ? "Example: Approved. The macros look consistent."
                                                        : "Example: Rejected because the macros or description need correction."
                                                }
                                            />
                                        </>
                                    )
                            }

                            <div className="admin-actions">
                                {
                                    contentReviewDraft.step === "preview"
                                        ? (
                                            <button
                                                type="button"
                                                onClick={() => setContentReviewDraft(prev => ({
                                                    ...prev,
                                                    step: "message"
                                                }))}
                                            >
                                                <Check size={16} />
                                                Next
                                            </button>
                                        )
                                        : (
                                            <button
                                                type="button"
                                                onClick={submitContentReview}
                                            >
                                                <Check size={16} />
                                                Send Decision
                                            </button>
                                        )
                                }

                                <button
                                    className="danger"
                                    type="button"
                                    onClick={() => setContentReviewDraft(null)}
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                reviewDraft && (
                    <div className="modal-overlay">
                        <div className="admin-dialog">
                            <div className="admin-panel-heading">
                                <div>
                                    <span className="section-kicker">Review</span>
                                    <h2>Respond To Report</h2>
                                </div>
                            </div>

                            <p>
                                This response is saved on the report for the user who submitted it.
                            </p>

                            <textarea
                                maxLength="255"
                                value={reviewDraft.response}
                                onChange={(e) => setReviewDraft(prev => ({
                                    ...prev,
                                    response: e.target.value
                                }))}
                                placeholder="Example: Thanks, we reviewed this and corrected the issue."
                            />

                            <div className="admin-actions">
                                <button
                                    type="button"
                                    onClick={submitReportReview}
                                >
                                    <Check size={16} />
                                    Send Review
                                </button>

                                <button
                                    className="danger"
                                    type="button"
                                    onClick={() => setReviewDraft(null)}
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                dismissDraft && (
                    <div className="modal-overlay">
                        <div className="admin-dialog">
                            <div className="admin-panel-heading">
                                <div>
                                    <span className="section-kicker">Confirm</span>
                                    <h2>Dismiss Report?</h2>
                                </div>
                            </div>

                            <p>
                                Dismissing removes this report from the active reports queue.
                            </p>

                            <div className="admin-actions">
                                <button
                                    className="danger"
                                    type="button"
                                    onClick={confirmDismissReport}
                                >
                                    <X size={16} />
                                    Dismiss Report
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDismissDraft(null)}
                                >
                                    Keep Report
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                passwordResetDraft && (
                    <div className="modal-overlay">
                        <div className="admin-dialog">
                            <div className="admin-panel-heading">
                                <div>
                                    <span className="section-kicker">Password</span>
                                    <h2>Reset User Password</h2>
                                </div>
                            </div>

                            <div className="admin-review-preview">
                                <h3>{passwordResetDraft.request.Email}</h3>
                                <p>
                                    {
                                        passwordResetDraft.request.FirstName
                                            ? `${passwordResetDraft.request.FirstName} ${passwordResetDraft.request.LastName}`
                                            : "No matching user account"
                                    }
                                </p>
                                <small>{formatDateTime(passwordResetDraft.request.CreatedAt)}</small>
                            </div>

                            <p>
                                This will apply the new password the user entered in the reset request.
                            </p>

                            <textarea
                                maxLength="255"
                                value={passwordResetDraft.message}
                                onChange={(e) => setPasswordResetDraft(prev => ({
                                    ...prev,
                                    message: e.target.value
                                }))}
                                placeholder="Optional message for the audit log"
                            />

                            <div className="admin-actions">
                                <button
                                    type="button"
                                    onClick={submitPasswordReset}
                                >
                                    <KeyRound size={16} />
                                    Reset Password
                                </button>

                                <button
                                    className="danger"
                                    type="button"
                                    onClick={() => setPasswordResetDraft(null)}
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                banDraft && (
                    <div className="modal-overlay">
                        <div className="admin-dialog">
                            <div className="admin-panel-heading">
                                <div>
                                    <span className="section-kicker">Moderation</span>
                                    <h2>Ban User</h2>
                                </div>
                            </div>

                            <div className="admin-review-preview">
                                <h3>{banDraft.user.FirstName} {banDraft.user.LastName}</h3>
                                <p>{banDraft.user.Email}</p>
                                <small>{banDraft.user.Role}</small>
                            </div>

                            <label className="admin-dialog-field">
                                Ban type
                                <select
                                    value={banDraft.banType}
                                    onChange={(e) => setBanDraft(prev => ({
                                        ...prev,
                                        banType: e.target.value,
                                        confirmPermanent: false
                                    }))}
                                >
                                    <option value="temporary">Temporary</option>
                                    <option value="permanent">Permanent</option>
                                </select>
                            </label>

                            {
                                banDraft.banType === "temporary"
                                    ? (
                                        <>
                                            <label className="admin-dialog-field">
                                                Days
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={banDraft.days}
                                                    onChange={(e) => setBanDraft(prev => ({
                                                        ...prev,
                                                        days: e.target.value
                                                    }))}
                                                />
                                            </label>

                                            <label className="admin-dialog-field">
                                                Message for user
                                                <textarea
                                                    maxLength="255"
                                                    value={banDraft.message}
                                                    onChange={(e) => setBanDraft(prev => ({
                                                        ...prev,
                                                        message: e.target.value
                                                    }))}
                                                    placeholder="Tell the user why the account was banned."
                                                />
                                            </label>
                                        </>
                                    )
                                    : (
                                        <>
                                            <p>
                                                Permanent ban deletes this user's account, public recipes, workout splits, public foods, diary, quick meals, ratings, and reports.
                                            </p>

                                            <label className="admin-dialog-check">
                                                <input
                                                    type="checkbox"
                                                    checked={banDraft.confirmPermanent}
                                                    onChange={(e) => setBanDraft(prev => ({
                                                        ...prev,
                                                        confirmPermanent: e.target.checked
                                                    }))}
                                                />
                                                I understand this permanently deletes the account.
                                            </label>
                                        </>
                                    )
                            }

                            <div className="admin-actions">
                                <button
                                    className={banDraft.banType === "permanent" ? "danger" : ""}
                                    type="button"
                                    onClick={submitBan}
                                >
                                    <Ban size={16} />
                                    {banDraft.banType === "permanent" ? "Delete Account" : "Ban User"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setBanDraft(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default Admin;
