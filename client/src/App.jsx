import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import RequireAuth from "./components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyReportsPage from "./pages/MyReportsPage";
import ReportEditorPage from "./pages/ReportEditorPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import TeamDashboardPage from "./pages/TeamDashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import TeamMembersPage from "./pages/TeamMembersPage";

// Eight views in total: two for signing in, four for the member side of the
// workflow, and three manager only screens (dashboard, projects, team).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/reports" element={<MyReportsPage />} />
        <Route path="/reports/new" element={<ReportEditorPage />} />
        <Route path="/reports/:id/edit" element={<ReportEditorPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth managerOnly>
              <TeamDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects"
          element={
            <RequireAuth managerOnly>
              <ProjectsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/team"
          element={
            <RequireAuth managerOnly>
              <TeamMembersPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
