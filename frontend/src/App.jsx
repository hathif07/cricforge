import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import Players from './pages/Players';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Auction from './pages/Auction';
import CreateMatch from './pages/CreateMatch';
import TossPage from './pages/TossPage';
import PlayingXI from './pages/PlayingXI';
import LiveScoring from './pages/LiveScoring';
import LiveMatch from './pages/LiveMatch';
import Scorecard from './pages/Scorecard';
import MatchHistory from './pages/MatchHistory';
import Simulation from './pages/Simulation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/admin/users"
              element={
                <RoleGuard roles={['admin']}>
                  <AdminUsers />
                </RoleGuard>
              }
            />

            <Route path="/players" element={<Players />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />

            <Route
              path="/auction"
              element={
                <RoleGuard roles={['admin', 'team_owner', 'tournament_organizer']}>
                  <Auction />
                </RoleGuard>
              }
            />

            <Route path="/matches" element={<MatchHistory />} />
            <Route
              path="/matches/new"
              element={
                <RoleGuard roles={['admin', 'scorer', 'tournament_organizer']}>
                  <CreateMatch />
                </RoleGuard>
              }
            />
            <Route path="/matches/:id/toss" element={<TossPage />} />
            <Route path="/matches/:id/playing-xi" element={<PlayingXI />} />
            <Route path="/matches/:id/live-scoring" element={<LiveScoring />} />
            <Route path="/matches/:id/live" element={<LiveMatch />} />
            <Route path="/matches/:id/scorecard" element={<Scorecard />} />

            <Route path="/simulation" element={<Simulation />} />

            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
