import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Panel from "../components/Panel";
import TextField from "../components/TextField";
import { createReport, fetchReport, submitReport, updateReport } from "../api/reports";
import { fetchProjects } from "../api/projects";
import { currentWeekValue, toInputDate } from "../utils/weeks";

const hourTypes = ["development", "testing", "meetings", "documentation"];

// Blank task row used both for the initial form and when "Add task" is clicked.
function emptyTask() {
  return {
    name: "",
    priority: "medium",
    plannedPercent: 0,
    actualPercent: 0,
    status: "in progress",
    hoursPlanned: 0,
    hoursSpent: 0,
    output: "",
  };
}

// Blank form state for a brand new report.
function emptyForm() {
  return {
    project: "",
    weekStart: currentWeekValue(),
    tasksCompleted: [emptyTask()],
    nextWeekTasks: [""],
    blockers: [{ text: "", isKey: false }],
    achievements: [{ text: "", isKey: false }],
    hoursByType: { development: 0, testing: 0, meetings: 0, documentation: 0 },
    notes: "",
    links: [""],
  };
}

// One form handles both a brand new draft and editing an existing draft or a
// report the manager sent back. The field list is fixed for everyone.
export default function ReportEditorPage() {
  const { id } = useParams(); // present when editing, absent when creating
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [managerNote, setManagerNote] = useState(""); // shown when report was sent back
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the project dropdown options once on mount.
  useEffect(() => {
    fetchProjects()
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, []);

  // When editing an existing report, fetch it and populate the form.
  // Falls back to a single blank row for any list that came back empty, so
  // the "Add line"/table UI always has at least one row to work with.
  useEffect(() => {
    if (!id) return;
    fetchReport(id)
      .then(({ report }) => {
        setForm({
          project: report.project?._id || "",
          weekStart: toInputDate(report.weekStart),
          tasksCompleted: report.tasksCompleted.length ? report.tasksCompleted : [emptyTask()],
          nextWeekTasks: report.nextWeekTasks.length ? report.nextWeekTasks : [""],
          blockers: report.blockers.length ? report.blockers : [{ text: "", isKey: false }],
          achievements: report.achievements.length
            ? report.achievements
            : [{ text: "", isKey: false }],
          // Merge in defaults first in case the saved report predates one of the hour types.
          hoursByType: { ...emptyForm().hoursByType, ...report.hoursByType },
          notes: report.notes || "",
          links: report.links.length ? report.links : [""],
        });
        // If the report was bounced back, surface the manager's latest comment as a banner.
        const last = report.reviewComments?.[report.reviewComments.length - 1];
        if (report.status === "needs correction" && last) setManagerNote(last.message);
      })
      .catch((problem) => setError(problem.message));
  }, [id]);

  // Top-level field setter (project, weekStart, notes, hoursByType, etc.)
  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Updates a single field on a single task row within tasksCompleted.
  function setTask(index, field, value) {
    setForm((current) => {
      const tasks = current.tasksCompleted.map((task, position) =>
        position === index ? { ...task, [field]: value } : task,
      );
      return { ...current, tasksCompleted: tasks };
    });
  }

  // Updates a single field on a row within blockers/achievements.
  // Special case: only one row can be marked "isKey" at a time, so checking
  // isKey on one row unsets it on every other row.
  function setNote(field, index, key, value) {
    setForm((current) => {
      const rows = current[field].map((row, position) => {
        if (position !== index) return key === "isKey" && value ? { ...row, isKey: false } : row;
        return { ...row, [key]: value };
      });
      return { ...current, [field]: rows };
    });
  }

  // Updates a single entry in a plain string-array field (nextWeekTasks, links).
  function setListValue(field, index, value) {
    setForm((current) => {
      const rows = current[field].map((row, position) => (position === index ? value : row));
      return { ...current, [field]: rows };
    });
  }

  // Appends a new (blank) row to any of the repeatable list fields.
  function addRow(field, blank) {
    setForm((current) => ({ ...current, [field]: [...current[field], blank] }));
  }

  // Removes a row by index from any of the repeatable list fields.
  function removeRow(field, index) {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((_, position) => position !== index),
    }));
  }

  // Trims the empty rows people leave behind and forces numbers to be numbers.
  function buildPayload() {
    return {
      project: form.project,
      weekStart: form.weekStart,
      tasksCompleted: form.tasksCompleted
        // Drop any task row where the name was never filled in.
        .filter((task) => task.name.trim())
        .map((task) => ({
          name: task.name.trim(),
          priority: task.priority,
          status: task.status,
          plannedPercent: Number(task.plannedPercent) || 0,
          actualPercent: Number(task.actualPercent) || 0,
          hoursPlanned: Number(task.hoursPlanned) || 0,
          hoursSpent: Number(task.hoursSpent) || 0,
          output: task.output || "",
        })),
      nextWeekTasks: form.nextWeekTasks.map((row) => row.trim()).filter(Boolean),
      blockers: form.blockers
        .filter((row) => row.text.trim())
        .map((row) => ({ text: row.text.trim(), isKey: !!row.isKey })),
      achievements: form.achievements
        .filter((row) => row.text.trim())
        .map((row) => ({ text: row.text.trim(), isKey: !!row.isKey })),
      // Always send all four hour types, defaulting missing/invalid values to 0.
      hoursByType: hourTypes.reduce(
        (all, type) => ({ ...all, [type]: Number(form.hoursByType[type]) || 0 }),
        {},
      ),
      notes: form.notes,
      links: form.links.map((row) => row.trim()).filter(Boolean),
    };
  }

  // Saves the form as either a create or update, optionally submitting it for
  // review immediately afterward, then navigates to the report's detail page.
  async function save(thenSubmit) {
    setError("");
    setBusy(true);
    try {
      const payload = buildPayload();
      const saved = id
        ? await updateReport(id, payload)
        : await createReport(payload);
      const reportId = saved.report._id;
      if (thenSubmit) await submitReport(reportId);
      navigate(`/reports/${reportId}`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>{id ? "Edit weekly report" : "New weekly report"}</h1>
        <p>Save as a draft while you work, then submit it for review.</p>
      </div>

      {/* Only shown when this report was previously sent back for correction */}
      {managerNote && (
        <div className="warning-box">
          <strong>Manager asked for changes:</strong> {managerNote}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      <Panel title="Week and project">
        <div className="row">
          <TextField
            label="Week starting (Monday)"
            type="date"
            value={form.weekStart}
            onChange={(e) => set("weekStart", e.target.value)}
          />
          <TextField
            label="Project or category"
            as="select"
            value={form.project}
            onChange={(e) => set("project", e.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </TextField>
        </div>
      </Panel>

      {/* Editable table of tasks — mirrors the read-only table in ReportView */}
      <Panel
        title="Tasks completed"
        action={
          <button className="plain" onClick={() => addRow("tasksCompleted", emptyTask())}>
            Add task
          </button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>Planned %</th>
                <th>Actual %</th>
                <th>Status</th>
                <th>Hours planned</th>
                <th>Hours spent</th>
                <th>Output</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {form.tasksCompleted.map((task, index) => (
                <tr key={index}>
                  <td>
                    <input
                      value={task.name}
                      onChange={(e) => setTask(index, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={task.priority}
                      onChange={(e) => setTask(index, "priority", e.target.value)}
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={task.plannedPercent}
                      onChange={(e) => setTask(index, "plannedPercent", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={task.actualPercent}
                      onChange={(e) => setTask(index, "actualPercent", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={task.status}
                      onChange={(e) => setTask(index, "status", e.target.value)}
                    >
                      <option value="not started">not started</option>
                      <option value="in progress">in progress</option>
                      <option value="done">done</option>
                      <option value="blocked">blocked</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={task.hoursPlanned}
                      onChange={(e) => setTask(index, "hoursPlanned", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={task.hoursSpent}
                      onChange={(e) => setTask(index, "hoursSpent", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={task.output}
                      onChange={(e) => setTask(index, "output", e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="link" onClick={() => removeRow("tasksCompleted", index)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-two">
        {/* Free-form list of next week's planned tasks */}
        <Panel
          title="Planned for next week"
          action={
            <button className="plain" onClick={() => addRow("nextWeekTasks", "")}>
              Add line
            </button>
          }
        >
          {form.nextWeekTasks.map((task, index) => (
            <div className="row" key={index}>
              <TextField
                value={task}
                onChange={(e) => setListValue("nextWeekTasks", index, e.target.value)}
              />
              <button className="link" onClick={() => removeRow("nextWeekTasks", index)}>
                Remove
              </button>
            </div>
          ))}
        </Panel>

        {/* Fixed set of hour-type inputs, one per entry in hourTypes */}
        <Panel title="Hours worked by type">
          {hourTypes.map((type) => (
            <TextField
              key={type}
              label={type}
              type="number"
              min="0"
              value={form.hoursByType[type]}
              onChange={(e) =>
                set("hoursByType", { ...form.hoursByType, [type]: e.target.value })
              }
            />
          ))}
        </Panel>
      </div>

      {/* Blockers and achievements share the same editable-list UI via NoteEditor */}
      <div className="grid-two">
        <NoteEditor
          title="Blockers and challenges"
          field="blockers"
          rows={form.blockers}
          keyLabel="Key issue of the week"
          onChange={setNote}
          onAdd={() => addRow("blockers", { text: "", isKey: false })}
          onRemove={removeRow}
        />
        <NoteEditor
          title="Achievements and highlights"
          field="achievements"
          rows={form.achievements}
          keyLabel="Key achievement of the week"
          onChange={setNote}
          onAdd={() => addRow("achievements", { text: "", isKey: false })}
          onRemove={removeRow}
        />
      </div>

      <Panel
        title="Notes and links"
        action={
          <button className="plain" onClick={() => addRow("links", "")}>
            Add link
          </button>
        }
      >
        <TextField
          label="Notes"
          as="textarea"
          rows={4}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
        {form.links.map((link, index) => (
          <div className="row" key={index}>
            <TextField
              value={link}
              placeholder="https://"
              onChange={(e) => setListValue("links", index, e.target.value)}
            />
            <button className="link" onClick={() => removeRow("links", index)}>
              Remove
            </button>
          </div>
        ))}
      </Panel>

      <div className="buttons">
        <button className="plain" disabled={busy} onClick={() => save(false)}>
          Save draft
        </button>
        <button disabled={busy} onClick={() => save(true)}>
          Save and submit for review
        </button>
      </div>
    </>
  );
}

// Shared editable-list widget for blockers/achievements: a text row plus a
// "key item" checkbox per row, with add/remove controls.
function NoteEditor({ title, field, rows, keyLabel, onChange, onAdd, onRemove }) {
  return (
    <Panel
      title={title}
      action={
        <button className="plain" onClick={onAdd}>
          Add line
        </button>
      }
    >
      {rows.map((row, index) => (
        <div key={index}>
          <div className="row">
            <TextField
              value={row.text}
              onChange={(e) => onChange(field, index, "text", e.target.value)}
            />
            <button className="link" onClick={() => onRemove(field, index)}>
              Remove
            </button>
          </div>
          <label className="note">
            <input
              type="checkbox"
              checked={!!row.isKey}
              onChange={(e) => onChange(field, index, "isKey", e.target.checked)}
            />{" "}
            {keyLabel}
          </label>
        </div>
      ))}
    </Panel>
  );
}