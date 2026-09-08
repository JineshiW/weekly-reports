import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Blocks pages until the session is known. Manager only pages pass managerOnly.
export default function RequireAuth({ managerOnly = false, children }) {
  const { user, checking, isManager } = useAuth();
  const location = useLocation();

  if (checking) return <p className="page note">Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (managerOnly && !isManager) return <Navigate to="/reports" replace />;

  return children;
}
