import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import TeamManagerDashboard from './pages/TeamManagerDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import CoachDashboard from './pages/CoachDashboard';
import RefereeDashboard from './pages/RefereeDashboard';
import Unauthorized from './pages/Unauthorized';
import ResetPassword from './pages/ResetPassword';
import TournamentDetails from './pages/TournamentDetails';
import StatisticsDashboard from './pages/StatisticsDashboard'; // استيراد جديد

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
          <h1 className="text-xl font-bold">⚽ نظام البطولات</h1>
          <div>
            <a href="/" className="ml-4 hover:text-gray-300">الرئيسية</a>
            <a href="/login" className="ml-4 hover:text-gray-300">دخول</a>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/tournament/:id" element={<TournamentDetails />} />
          <Route path="/tournament/:id/statistics" element={<StatisticsDashboard />} /> {/* مسار جديد */}

          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['team_manager']} />}>
            <Route path="/manager/dashboard" element={<TeamManagerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['player']} />}>
            <Route path="/player/dashboard" element={<PlayerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['coach']} />}>
            <Route path="/coach/dashboard" element={<CoachDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['referee']} />}>
            <Route path="/referee/dashboard" element={<RefereeDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;