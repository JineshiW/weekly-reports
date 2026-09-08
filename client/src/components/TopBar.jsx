import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { user, isManager, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="top-bar">
      <span className="brand">Weekly Reports</span>
      <nav>
        <NavLink to="/reports">My reports</NavLink>
        <NavLink to="/reports/new">New report</NavLink>
        {isManager && <NavLink to="/dashboard">Team dashboard</NavLink>}
        {isManager && <NavLink to="/projects">Projects</NavLink>}
        {isManager && <NavLink to="/team">Team members</NavLink>}
      </nav>
      <div className="who">
        <span>
          {user?.name} ({user?.role})
        </span>
        <button className="plain" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
