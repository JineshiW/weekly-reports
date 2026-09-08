import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import TextField from "../components/TextField";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // disables the submit button while signing in

  // Already logged in — skip the form and go straight to the reports page.
  if (user) return <Navigate to="/reports" replace />;

  // Generic field updater used by both text inputs below.
  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const signedIn = await signIn(form);
      // Route managers to their dashboard, everyone else to the reports list.
      navigate(signedIn.role === "manager" ? "/dashboard" : "/reports");
    } catch (problem) {
      // Show whatever error message the API/auth layer surfaced.
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Weekly Reports</h1>
        <p className="note">Sign in to write or review this week's report.</p>

        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => change("email", e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => change("password", e.target.value)}
          required
        />

        {/* Server/validation error shown above the submit button */}
        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}