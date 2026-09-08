import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import TextField from "../components/TextField";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    jobTitle: "",
    // Defaults to "member" — self-registering as a manager is allowed here,
    // presumably trusted/adjusted later by an actual manager.
    role: "member",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // disables submit while the request is in flight

  // Already logged in — skip registration and go straight to the reports page.
  if (user) return <Navigate to="/reports" replace />;

  // Generic field updater shared by all inputs below.
  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await signUp(form);
      // Route managers to their dashboard, everyone else to the reports list.
      navigate(created.role === "manager" ? "/dashboard" : "/reports");
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create an account</h1>
        <p className="note">Pick the role you work as. A manager can change it later.</p>

        <TextField
          label="Full name"
          value={form.name}
          onChange={(e) => change("name", e.target.value)}
          required
        />
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
          minLength={8}
          value={form.password}
          onChange={(e) => change("password", e.target.value)}
          required
        />
        <TextField
          label="Job title"
          value={form.jobTitle}
          onChange={(e) => change("jobTitle", e.target.value)}
        />
        <TextField
          label="Role"
          as="select"
          value={form.role}
          onChange={(e) => change("role", e.target.value)}
        >
          <option value="member">Team member</option>
          <option value="manager">Manager</option>
        </TextField>

        {/* Server/validation error shown above the submit button */}
        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
        </button>
        <p className="note">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}