import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import InterviewRoomPage from '../pages/interview/InterviewRoomPage';
import AIPracticePage from '../pages/ai-practice/AIPracticePage';
import AIInterviewPage from '../pages/ai-interview/AIInterviewPage';
import AIReportPage from '../pages/ai-interview/AIReportPage';

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="container">Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
    return children;
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected */}
                <Route path="/dashboard" element={
                    <ProtectedRoute><DashboardPage /></ProtectedRoute>
                } />
                <Route path="/interview/:id" element={
                    <ProtectedRoute><InterviewRoomPage /></ProtectedRoute>
                } />
                <Route path="/ai-practice" element={
                    <ProtectedRoute roles={['student', 'admin']}><AIPracticePage /></ProtectedRoute>
                } />
                <Route path="/ai-interview/:id/take" element={
                    <ProtectedRoute roles={['student', 'admin']}><AIPracticePage scheduled /></ProtectedRoute>
                } />
                <Route path="/ai-interview/:id" element={
                    <ProtectedRoute><AIInterviewPage /></ProtectedRoute>
                } />
                <Route path="/ai-interview/:id/report" element={
                    <ProtectedRoute roles={['interviewer', 'admin']}><AIReportPage /></ProtectedRoute>
                } />

                {/* Default */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}
