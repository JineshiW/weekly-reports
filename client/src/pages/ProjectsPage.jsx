import { useEffect, useState } from "react";
import Panel from "../components/Panel";
import TextField from "../components/TextField";
import { createProject, deleteProject, fetchProjects, updateProject } from "../api/projects";

const emptyForm = { name: "", description: "" };

// Projects are the category tag on every report, so managers keep the list here.
export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  // Empty string means "creating a new project"; a truthy id means "editing that project".
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  // Fetches the current project list from the API.
  function load() {
    fetchProjects()
      .then((res) => setProjects(res.projects))
      .catch((problem) => setError(problem.message));
  }

  // Load once on mount.
  useEffect(load, []);

  // Generic form field updater.
  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Handles both create and update, branching on whether we're editing.
  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("A project needs a name.");
      return;
    }
    try {
      if (editingId) {
        await updateProject(editingId, form);
      } else {
        await createProject(form);
      }
      // Reset the form back to "add" mode after a successful save.
      setForm(emptyForm);
      setEditingId("");
      setError("");
      load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Populates the form with an existing project's data and switches to edit mode.
  function startEdit(project) {
    setEditingId(project._id);
    setForm({ name: project.name, description: project.description || "" });
  }

  // Deletes a project after confirmation. Reports that reference it keep
  // their history regardless (per the confirm message).
  async function remove(id) {
    if (!window.confirm("Remove this project? Existing reports keep their history.")) return;
    try {
      await deleteProject(id);
      load();
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p>Categories members pick when writing a report.</p>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {/* Same form doubles as "Add project" and "Edit project", based on editingId */}
      <Panel title={editingId ? "Edit project" : "Add project"}>
        <form onSubmit={save}>
          <div className="row">
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => change("description", event.target.value)}
            />
          </div>
          <div className="buttons">
            <button type="submit">{editingId ? "Save changes" : "Add project"}</button>
            {/* Cancel button only shows while editing, to bail back to "add" mode */}
            {editingId ? (
              <button
                type="button"
                className="plain"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel title="Current projects">
        {projects.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>{project.name}</td>
                    <td>{project.description || "-"}</td>
                    <td>
                      <div className="buttons">
                        <button type="button" className="link" onClick={() => startEdit(project)}>
                          Edit
                        </button>
                        <button type="button" className="link" onClick={() => remove(project._id)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">No projects yet.</p>
        )}
      </Panel>
    </div>
  );
}