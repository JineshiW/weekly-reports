import { useEffect, useState } from "react";
import Panel from "../components/Panel";
import TextField from "../components/TextField";
import { changeRole, deactivateUser, fetchUsers, inviteUser } from "../api/users";

const emptyForm = { name: "", email: "", password: "", role: "member" };

// Manager only screen for adding people and switching roles.
export default function TeamMembersPage() {
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  // Fetches the full user list.
  function load() {
    fetchUsers()
      .then((res) => setPeople(res.users))
      .catch((problem) => setError(problem.message));
  }

  // Load once on mount.
  useEffect(load, []);

  // Generic form field updater.
  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Invites a new member/manager with the given temp password, then resets
  // the form and reloads the list on success.
  async function add(event) {
    event.preventDefault();
    try {
      await inviteUser(form);
      setForm(emptyForm);
      setError("");
      load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Toggles a person's role between member and manager.
  async function switchRole(person) {
    try {
      await changeRole(person._id, person.role === "manager" ? "member" : "manager");
      load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Deactivates an account after confirmation (no hard delete — keeps history intact).
  async function deactivate(id) {
    if (!window.confirm("Deactivate this account?")) return;
    try {
      await deactivateUser(id);
      load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Team members</h1>
          <p>Accounts and roles for everyone submitting reports.</p>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <Panel title="Add a member">
        <form onSubmit={add}>
          <div className="row">
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => change("email", event.target.value)}
            />
          </div>
          <div className="row">
            <TextField
              label="Temporary password"
              type="password"
              value={form.password}
              onChange={(event) => change("password", event.target.value)}
            />
            <TextField
              label="Role"
              as="select"
              value={form.role}
              onChange={(event) => change("role", event.target.value)}
            >
              <option value="member">Team member</option>
              <option value="manager">Manager</option>
            </TextField>
          </div>
          <div className="buttons">
            <button type="submit">Add member</button>
          </div>
        </form>
      </Panel>

      <Panel title="Everyone">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person._id}>
                  <td>{person.name}</td>
                  <td>{person.email}</td>
                  <td>{person.role}</td>
                  <td>{person.active ? "Yes" : "No"}</td>
                  <td>
                    <div className="buttons">
                      <button type="button" className="link" onClick={() => switchRole(person)}>
                        Make {person.role === "manager" ? "member" : "manager"}
                      </button>
                      {/* Only offer deactivation for accounts that are still active */}
                      {person.active ? (
                        <button type="button" className="link" onClick={() => deactivate(person._id)}>
                          Deactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}