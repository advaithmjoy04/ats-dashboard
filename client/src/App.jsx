import {
  BriefcaseBusiness,
  CircleUserRound,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  Settings,
  ShieldUser,
  Users,
} from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import AdminEmailGroupsPage from './pages/AdminEmailGroupsPage';
import CandidatesPage from './pages/CandidatesPage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ForcePasswordChangePage from './pages/ForcePasswordChangePage';
import JobDetailPage from './pages/JobDetailPage';
import JobsPage from './pages/JobsPage';
import ActivationPage from './pages/ActivationPage';
import LoginPage from './pages/LoginPage';
import PlatformDashboardPage from './pages/PlatformDashboardPage';
import PlatformLoginPage from './pages/PlatformLoginPage';
import PlatformTenantsPage from './pages/PlatformTenantsPage';
import RecruitersPage from './pages/RecruitersPage';
import RecruiterCandidatesPage from './pages/RecruiterCandidatesPage';
import RecruiterJobsPage from './pages/RecruiterJobsPage';
import RecruiterProfilePage from './pages/RecruiterProfilePage';
import RoleDashboardPage from './pages/RoleDashboardPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudentApplicationsPage from './pages/StudentApplicationsPage';
import StudentJobsPage from './pages/StudentJobsPage';
import StudentsPage from './pages/StudentsPage';
import InstituteBrandingPage from './pages/InstituteBrandingPage';
import { useAuth } from './state/AuthContext';
import { getHomeRoute } from './utils/routing';

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/admin/candidates', label: 'Candidates', icon: Users },
  { to: '/admin/groups', label: 'Groups', icon: Layers3 },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/recruiters', label: 'Recruiters', icon: ShieldUser },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const recruiterNavItems = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/recruiter/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/recruiter/candidates', label: 'Candidates', icon: FileSearch },
  { to: '/recruiter/profile', label: 'Profile', icon: CircleUserRound },
];

const studentNavItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/jobs', label: 'Open Jobs', icon: BriefcaseBusiness },
  { to: '/student/applications', label: 'Applications', icon: FileSearch },
];

const platformNavItems = [
  { to: '/platform/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/platform/tenants', label: 'Institutes', icon: Layers3 },
];

function HomeRedirect() {
  return (
    <ProtectedRoute loginPath="/platform/login">
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
      <Route path="/t/:tenantSlug/login" element={<LoginPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/t/:tenantSlug/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/force-password-change"
        element={
          <ProtectedRoute>
            <ForcePasswordChangePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/force-password-change"
        element={
          <ProtectedRoute allowedRoles={['PLATFORM_SUPER_ADMIN']} loginPath="/platform/login">
            <ForcePasswordChangePage />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/t/:tenantSlug/reset-password" element={<ResetPasswordPage />} />
      <Route path="/activate" element={<ActivationPage />} />
      <Route path="/t/:tenantSlug/activate" element={<ActivationPage />} />
      <Route
        path="/platform"
        element={
          <ProtectedRoute allowedRoles={['PLATFORM_SUPER_ADMIN']} loginPath="/platform/login">
            <AppShell navItems={platformNavItems} sectionLabel="Platform" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/platform/dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboardPage />} />
        <Route path="tenants" element={<PlatformTenantsPage />} />
      </Route>
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
        <Route path="groups" element={<AdminEmailGroupsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="recruiters" element={<RecruitersPage />} />
        <Route path="settings" element={<InstituteBrandingPage />} />
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
              description="Browse open roles, complete job-specific applications, and track every submission in one place."
              highlights={[
                { label: 'Open Jobs', value: 'Live' },
                { label: 'Applications', value: 'Tracked' },
                { label: 'Job Forms', value: 'Per Role' },
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
        <Route path="profile" element={<Navigate to="/student/jobs" replace />} />
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
