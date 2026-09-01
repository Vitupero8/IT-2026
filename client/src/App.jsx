import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import History from "./pages/History";
import Recipes from "./pages/Recipes";
import WorkoutSplits from "./pages/WorkoutSplits";
import { isAuthenticated } from "./services/authService";

function ProtectedRoute({ children }) {
    return isAuthenticated()
        ? children
        : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
    return isAuthenticated()
        ? <Navigate to="/dashboard" replace />
        : children;
}

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0
        });
    }, [pathname]);

    return null;
}

function App() {
    return (
        <>
            <ScrollToTop />

            <Routes>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/recipes"
                    element={
                        <ProtectedRoute>
                            <Recipes />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/workout-splits"
                    element={
                        <ProtectedRoute>
                            <WorkoutSplits />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <Admin />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/history"
                    element={
                        <ProtectedRoute>
                            <History />
                        </ProtectedRoute>
                    }
                />

            </Routes>

            <ToastContainer
                position="top-center"
                autoClose={2000}
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="dark"
            />
        </>
    );
}

export default App;
