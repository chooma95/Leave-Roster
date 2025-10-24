import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import RosterView from './pages/RosterView';
import LeaveRequest from './pages/LeaveRequest';
import ShiftSwaps from './pages/ShiftSwaps';
import AdminRoster from './pages/AdminRoster';
import AdminStaff from './pages/AdminStaff';
import AdminLeave from './pages/AdminLeave';
import SkillsMatrix from './pages/SkillsMatrix';

function App() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/roster" element={<RosterView />} />
        <Route path="/leave/request" element={<LeaveRequest />} />
        <Route path="/swaps" element={<ShiftSwaps />} />
        
        {/* Admin routes */}
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <>
            <Route path="/admin/roster" element={<AdminRoster />} />
            <Route path="/admin/staff" element={<AdminStaff />} />
            <Route path="/admin/leave" element={<AdminLeave />} />
            <Route path="/admin/skills" element={<SkillsMatrix />} />
          </>
        )}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
