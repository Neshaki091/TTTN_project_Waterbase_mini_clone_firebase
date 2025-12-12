import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AppProvider, useApp } from './context/AppContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppDetail from './pages/AppDetail';
import AdminDashboard from './pages/AdminDashboard';
import AllAppsView from './pages/AllAppsView';
import OwnerManagement from './pages/OwnerManagement';
import Guide from './pages/Guide';
import SDKDownload from './pages/SDKDownload';
import ForgotPassword from './pages/ForgotPassword';
import UserProfile from './pages/UserProfile';
import ChangePassword from './pages/ChangePassword';

// Protected Route Component
const ProtectedRoute = ({ adminOnly = false }) => {
    const { isAuthenticated, isAdmin, loading } = useApp();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

function App() {
    return (
        <AppProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* User Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/guide" element={<Guide />} />
                        <Route path="/sdk-download" element={<SDKDownload />} />
                        <Route path="/app/:appId" element={<AppDetail />} />
                        <Route path="/profile" element={<UserProfile />} />
                        <Route path="/change-password" element={<ChangePassword />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute adminOnly={true} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/apps" element={<AllAppsView />} />
                        <Route path="/admin/owners" element={<OwnerManagement />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <ToastContainer position="top-right" theme="dark" autoClose={3000} />
            </Router>
        </AppProvider>
    );
}

export default App;
