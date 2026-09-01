import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import { saveToken } from "../services/authService";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetPassword, setResetPassword] = useState("");
    const [banNotice, setBanNotice] = useState(() => {
        const storedNotice = sessionStorage.getItem("macrotrackerBanNotice");

        if (!storedNotice) return null;

        sessionStorage.removeItem("macrotrackerBanNotice");

        try {
            return JSON.parse(storedNotice);
        }
        catch {
            return {
                message: storedNotice
            };
        }
    });

    const handleLogin = async (e) => {
        e.preventDefault();

        try {

            const response = await api.post(
                "/auth/login",
                {
                    email,
                    password
                }
            );

            saveToken(response.data.token);

            toast.success("Login successful!");

            setTimeout(() => {
                navigate("/dashboard");
            }, 1200);

        } catch (err) {
            if (err.response?.status === 403 && err.response.data?.banned) {
                setBanNotice({
                    message: err.response.data.message,
                    banExpiresAt: err.response.data.banExpiresAt
                });
                return;
            }

            toast.error(
                err.response?.data?.message || "Something went wrong."
            );

        }
    };

    const requestPasswordReset = async (e) => {
        e.preventDefault();

        try {
            await api.post("/auth/password-reset-requests", {
                email: resetEmail,
                newPassword: resetPassword
            });
            toast.success("Password reset request sent to admin.");
            setResetEmail("");
            setResetPassword("");
            setShowReset(false);
        }
        catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to request password reset.");
        }
    };

    return (
        <div className="login-container">

            <div className="login-content">

                <div className="login-left">

                    <h1 className="hero-title">
                        Track.
                    </h1>

                    <h1 className="hero-title">
                        Improve.
                    </h1>

                    <h1 className="hero-title">
                        Repeat.
                    </h1>

                    <p className="hero-subtitle">
                        The easiest way to track calories,
                        meals and progress.
                    </p>

                </div>

                <div className="login-card">

                    <div className="logo-circle">
                        MT
                    </div>

                    <h1 className="logo">
                        MacroTracker
                    </h1>

                    <p className="subtitle">
                        Track your calories. Track your progress.
                    </p>

                    <form
                        className="login-form"
                        onSubmit={handleLogin}
                    >

                        <input
                            className="input"
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            className="input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button
                            type="submit"
                            className="login-button"
                        >
                            Login
                        </button>

                    </form>

                    <p className="register-text">
                        Don't have an account?{" "}
                        <Link to="/register">
                            Register
                        </Link>
                    </p>

                    <button
                        className="reset-password-link"
                        type="button"
                        onClick={() => {
                            setResetEmail(email);
                            setShowReset(true);
                        }}
                    >
                        Reset password
                    </button>

                </div>

            </div>

            {
                showReset && (
                    <div className="modal-overlay">
                        <form
                            className="reset-password-modal"
                            onSubmit={requestPasswordReset}
                        >
                            <h2>Reset Password</h2>
                            <p>Enter your account email and an admin will see your reset request.</p>

                            <input
                                className="input"
                                type="email"
                                placeholder="Email address"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                            />

                            <input
                                className="input"
                                type="password"
                                placeholder="Enter your new password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                required
                            />

                            <div className="reset-password-actions">
                                <button
                                    className="login-button"
                                    type="submit"
                                >
                                    Send Request
                                </button>

                                <button
                                    className="reset-password-cancel"
                                    type="button"
                                    onClick={() => {
                                        setShowReset(false);
                                        setResetPassword("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {
                banNotice && (
                    <div className="modal-overlay">
                        <div className="reset-password-modal">
                            <h2>Account Banned</h2>
                            <p>{banNotice.message || "This account has been banned."}</p>
                            {
                                banNotice.banExpiresAt && (
                                    <p>
                                        Ban expires: {new Date(banNotice.banExpiresAt).toLocaleString("en")}
                                    </p>
                                )
                            }

                            <button
                                className="login-button"
                                type="button"
                                onClick={() => setBanNotice(null)}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )
            }

        </div>
    );
}

export default Login;
