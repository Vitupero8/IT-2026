import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

function Register() {

    const navigate = useNavigate();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [age, setAge] = useState("");
    const [height, setHeight] = useState("");
    const [currentWeight, setCurrentWeight] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        try {

            await api.post(
                "/auth/register",
                {
                    firstName,
                    lastName,
                    email,
                    password,
                    age,
                    height,
                    currentWeight
                }
            );

            toast.success("Registration successful!");

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        } catch (err) {

            toast.error(
                err.response?.data?.message || "Something went wrong."
            );

        }
    };

    return (
        <div className="login-container">

            <div className="login-content">

                <div className="login-left">

                    <h1 className="hero-title">
                        Join.
                    </h1>

                    <h1 className="hero-title">
                        Track.
                    </h1>

                    <h1 className="hero-title">
                        Improve.
                    </h1>

                    <p className="hero-subtitle">
                        Create your MacroTracker account and
                        start tracking your nutrition today.
                    </p>

                </div>

                <div className="login-card">

                    <div className="logo-circle">
                        MT
                    </div>

                    <h1 className="logo">
                        Create Account
                    </h1>

                    <p className="subtitle">
                        Start your fitness journey.
                    </p>

                    <form
                        className="login-form"
                        onSubmit={handleRegister}
                    >

                        <input
                            className="input"
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />

                        <input
                            className="input"
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />

                        <input
                            className="input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            className="input"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <input
                            className="input"
                            type="number"
                            placeholder="Age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                        />

                        <input
                            className="input"
                            type="number"
                            placeholder="Height (cm)"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                        />

                        <input
                            className="input"
                            type="number"
                            placeholder="Current Weight (kg)"
                            value={currentWeight}
                            onChange={(e) => setCurrentWeight(e.target.value)}
                        />

                        <button
                            type="submit"
                            className="login-button"
                        >
                            Register
                        </button>

                    </form>

                    <p className="register-text">
                        Already have an account?{" "}
                        <Link to="/login">
                            Login
                        </Link>
                    </p>

                </div>

            </div>

        </div>
    );
}

export default Register;
