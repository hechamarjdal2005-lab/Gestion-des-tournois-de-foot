import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

// صفحات النظام
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
import StatisticsDashboard from './pages/StatisticsDashboard';
import AdvancedStatistics from './pages/AdvancedStatistics';
import MatchLiveControl from './pages/MatchLiveControl';

function App() {
  const { logout } = useAuthStore();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* شريط التنقل العلوي */}
        <nav className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚽ système de gestion des tournois de football
          </h1>
          <div className="flex gap-4 text-sm">
            <a href="/" className="hover:text-blue-300 transition">page d'accueil</a>
            <a href="/login" className="hover:text-blue-300 transition">Login</a>
          </div>
        </nav>

        <Routes>
          {/* الصفحات العامة */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* صفحة تفاصيل البطولة (المتكاملة الآن) */}
          <Route path="/tournament/:id" element={<TournamentDetails />} />
          
          <Route path="/tournament/:id/statistics" element={<StatisticsDashboard />} />
          <Route path="/tournament/:id/statistics/advanced" element={<AdvancedStatistics />} />
          
          {/* مسار لوحة التحكم الحية */}
          <Route path="/match/:id/live-control" element={<MatchLiveControl />} />

          {/* لوحات التحكم المحمية */}
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

          {/* التوجيه الافتراضي */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;