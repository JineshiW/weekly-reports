import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Panel from "../components/Panel";
import StatusTag from "../components/StatusTag";
import TextField from "../components/TextField";
import { deleteDraft, fetchReports } from "../api/reports";
import { fetchProjects } from "../api/projects";
import { fetchUsers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { shortDate, weekRangeLabel } from "../utils/weeks";

const statusOptions = ["draft", "submitted", "needs correction", "approved"];

// Members see their own history here. Managers get the same table with an extra
// member filter, which doubles as the review queue.
export default function MyReportsPage() {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "", project: "", owner: "", week: "" });
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load filter options once on mount (and whenever isManager changes, e.g.
  // right after auth resolves). Projects are needed by everyone; the member
  // list is only needed for the manager's "team member" filter.
  useEffect(() => {
    fetchProjects()
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
    if (isManager) {
      fetchUsers()
        .then((res) => setPeople(res.users.filter((person) => person.active)))
        .catch(() => setPeople([]));
    }
  }, [isManager]);

  // Fetches a page of reports using the current filters.
  function load(page = 1) {
    setLoading(true);
    fetchReports({ ...filters, page, limit: 10 })
      .then(setData)
      .catch((problem) => setError(problem.message))
      .finally(() => setLoading(false));
  }

  // Reload from page 1 whenever any filter changes.
  // exhaustive-deps disabled since `load` is intentionally not a dependency
  // (it's recreated every render but doesn't need to retrigger this effect).
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Generic filter field updater.
  function change(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  // Deletes a draft report (member-only action) after a confirm prompt,
  // then reloads the current page so the table reflects the change.
  async function removeDraft(id) {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await deleteDraft(id);
      load(data.page);
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>{isManager ? "All reports" : "My weekly reports"}</h1>
        <p>{isManager ? "Open a submitted report to review it." : "Drafts and reports needing correction stay editable."}</p>
      </div>

      <Panel
        title="Filters"
        // Only members get a "New report" button here — managers don't create reports.
        action={!isManager && <button onClick={() => navigate("/reports/new")}>New report</button>}
      >
        <div className="row">
          <TextField
            label="Week starting"
            type="date"
            value={filters.week}
            onChange={(e) => change("week", e.target.value)}
          />
          <TextField
            label="Status"
            as="select"
            value={filters.status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </TextField>
          <TextField
            label="Project"
            as="select"
            value={filters.project}
            onChange={(e) => change("project", e.target.value)}
          >
            <option value="">All</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </TextField>
          {/* Team member filter is manager-only — this is what turns the
              table into a review queue for them. */}
          {isManager && (
            <TextField
              label="Team member"
              as="select"
              value={filters.owner}
              onChange={(e) => change("owner", e.target.value)}
            >
              <option value="">Everyone</option>
              {people.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name}
                </option>
              ))}
            </TextField>
          )}
        </div>
      </Panel>

      {error && <p className="error-text">{error}</p>}

      <Panel title={`Reports (${data.total || 0})`}>
        {loading ? (
          <p className="note">Loading...</p>
        ) : data.items.length === 0 ? (
          <p className="empty">Nothing to show yet.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  {/* Member column only makes sense when viewing everyone's reports */}
                  {isManager && <th>Member</th>}
                  <th>Project</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((report) => (
                  <tr key={report._id}>
                    <td>{weekRangeLabel(report.weekStart, report.weekEnd)}</td>
                    {isManager && <td>{report.owner?.name}</td>}
                    <td>{report.project?.name || "-"}</td>
                    <td>
                      <StatusTag status={report.status} />
                    </td>
                    <td>v{report.version}</td>
                    <td>{shortDate(report.updatedAt)}</td>
                    <td>
                      <div className="buttons">
                        <Link to={`/reports/${report._id}`}>Open</Link>
                        {/* Members can edit their own draft/needs-correction reports;
                            managers only ever view (no edit/delete). */}
                        {!isManager && ["draft", "needs correction"].includes(report.status) && (
                          <Link to={`/reports/${report._id}/edit`}>Edit</Link>
                        )}
                        {/* Delete is only offered for a member's own drafts */}
                        {!isManager && report.status === "draft" && (
                          <button className="link" onClick={() => removeDraft(report._id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Simple prev/next pagination — only shown when there's more than one page */}
        {data.pages > 1 && (
          <div className="buttons">
            <button className="plain" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>
              Previous
            </button>
            <span className="note">
              Page {data.page} of {data.pages}
            </span>
            <button
              className="plain"
              disabled={data.page >= data.pages}
              onClick={() => load(data.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </Panel>
    </>
  );
}