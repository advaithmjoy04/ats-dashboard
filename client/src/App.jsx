import {
  BriefcaseBusiness,
  CircleUserRound,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldUser,
  Users,
} from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import CandidatesPage from './pages/CandidatesPage';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import JobsPage from './pages/JobsPage';
import ActivationPage from './pages/ActivationPage';
import LoginPage from './pages/LoginPage';
import RecruitersPage from './pages/RecruitersPage';
import RecruiterCandidatesPage from './pages/RecruiterCandidatesPage';
import RecruiterJobsPage from './pages/RecruiterJobsPage';
import RecruiterProfilePage from './pages/RecruiterProfilePage';
import RoleDashboardPage from './pages/RoleDashboardPage';
import StudentApplicationsPage from './pages/StudentApplicationsPage';
import StudentJobsPage from './pages/StudentJobsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentsPage from './pages/StudentsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { useAuth } from './state/AuthContext';
import { getHomeRoute } from './utils/routing';

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/admin/candidates', label: 'Candidates', icon: Users },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/recruiters', label: 'Recruiters', icon: ShieldUser },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const recruiterNavItems = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/recruiter/jobs', label: 'Assigned Jobs', icon: BriefcaseBusiness },
  { to: '/recruiter/candidates', label: 'Candidates', icon: FileSearch },
  { to: '/recruiter/profile', label: 'Profile', icon: CircleUserRound },
];

const studentNavItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/jobs', label: 'Open Jobs', icon: BriefcaseBusiness },
  { to: '/student/applications', label: 'Applications', icon: FileSearch },
  { to: '/student/profile', label: 'Profile', icon: CircleUserRound },
];

function HomeRedirect() {
  return (
    <ProtectedRoute>
      <NavigateToRoleHome />
    </ProtectedRoute>
  );
}

function NavigateToRoleHome() {
  const { user } = useAuth();
  const path = getHomeRoute(user?.role);
  return <Navigate to={path} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate" element={<ActivationPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AppShell navItems={adminNavItems} sectionLabel="Menu" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="recruiters" element={<RecruitersPage />} />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Settings"
              description="Settings are reserved for a later iteration so this pass stays focused on core ATS workflows."
              showTestEmail
            />
          }
        />
      </Route>
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['RECRUITER']}>
            <AppShell navItems={recruiterNavItems} sectionLabel="Recruiter" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RoleDashboardPage
              title="Recruiter Dashboard"
              description="Review assigned roles, track applicants, and move candidates through the hiring pipeline."
              highlights={[
                { label: 'Assigned Jobs', value: 'Ready' },
                { label: 'Candidate Review', value: 'Open' },
                { label: 'Status Updates', value: 'Enabled' },
              ]}
            />
          }
        />
        <Route
          path="jobs"
          element={<RecruiterJobsPage />}
        />
        <Route
          path="candidates"
          element={<RecruiterCandidatesPage />}
        />
        <Route
          path="profile"
          element={<RecruiterProfilePage />}
        />
      </Route>
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <AppShell navItems={studentNavItems} sectionLabel="Student" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RoleDashboardPage
              title="Student Dashboard"
              description="Browse open roles, track your applications, and keep your placement profile up to date."
              highlights={[
                { label: 'Open Jobs', value: 'Live' },
                { label: 'Applications', value: 'Tracked' },
                { label: 'Profile', value: 'Available' },
              ]}
            />
          }
        />
        <Route
          path="jobs"
          element={<StudentJobsPage />}
        />
        <Route
          path="applications"
          element={<StudentApplicationsPage />}
        />
        <Route
          path="profile"
          element={<StudentProfilePage />}
        />
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
