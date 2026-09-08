import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Panel from "../components/Panel";
import StatusTag from "../components/StatusTag";
import TextField from "../components/TextField";
import { fetchSection, fetchSummary } from "../api/dashboard";
import { currentWeekValue, mondayOf, toInputDate } from "../utils/weeks";

const chartColor = "#5b7c99";

// Manager overview for one week: headline numbers, a few charts and the
// blockers / achievements read across the team.
export default function TeamDashboardPage() {
  const navigate = useNavigate();
  const [week, setWeek] = useState(currentWeekValue());
  const [data, setData] = useState(null);
  // Toggles between "blockers" and "achievements" for the shared panel below;
  // rows start empty until the effect below loads them for the current field.
  const [section, setSection] = useState({ field: "blockers", rows: [] });
  const [error, setError] = useState("");

  // Reload the whole dashboard summary whenever the selected week changes.
  useEffect(() => {
    fetchSummary(week)
      .then(setData)
      .catch((problem) => setError(problem.message));
  }, [week]);

  // Reload the blockers/achievements section whenever the week or the
  // selected field (blockers vs achievements) changes.
  useEffect(() => {
    fetchSection(week, section.field)
      .then((res) => setSection({ field: res.field, rows: res.rows }))
      .catch(() => setSection((current) => ({ ...current, rows: [] })));
  }, [week, section.field]);

  const metrics = data?.metrics;
  const hours = data?.hoursByType || {};
  // Reshape the hoursByType object into an array of {type, hours} for the bar chart.
  const hoursRows = Object.keys(hours).map((key) => ({ type: key, hours: hours[key] }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Team dashboard</h1>
          <p>Everything submitted for the selected week.</p>
        </div>
        <TextField
          label="Week starting"
          type="date"
          value={week}
          // Snap whatever date is picked to that week's Monday, so the
          // dashboard always aligns with report week boundaries.
          onChange={(event) => setWeek(toInputDate(mondayOf(event.target.value)))}
        />
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {/* Headline numbers row — each falls back to "-" until data has loaded */}
      <div className="grid-metrics">
        <div className="metric">
          <p className="label">Submitted this week</p>
          <p className="value">{metrics ? `${metrics.submittedThisWeek}/${metrics.teamSize}` : "-"}</p>
        </div>
        <div className="metric">
          <p className="label">Compliance</p>
          <p className="value">{metrics ? `${metrics.complianceRate}%` : "-"}</p>
        </div>
        <div className="metric">
          <p className="label">Needs correction</p>
          <p className="value">{metrics ? metrics.needsCorrection : "-"}</p>
        </div>
        <div className="metric">
          <p className="label">Open blockers</p>
          <p className="value">{metrics ? metrics.openBlockers : "-"}</p>
        </div>
      </div>

      <div className="grid-two">
        {/* Trend of completed tasks over recent weeks */}
        <Panel title="Completed tasks per week">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="tasks" stroke={chartColor} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {/* Task counts broken down by project for the selected week */}
        <Panel title="Tasks by project">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.byProject || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="tasks" fill={chartColor} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid-two">
        {/* Total hours logged per task type, derived from hoursRows above */}
        <Panel title="Hours by task type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hoursRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="hours" fill={chartColor} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Per-member status list, with a link into their report when one exists */}
        <Panel title="Status by member">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.perMember || []).map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>
                      <StatusTag status={person.status} />
                    </td>
                    <td>
                      {/* Only show "Open" if this person actually has a report yet */}
                      {person.reportId ? (
                        <button
                          type="button"
                          className="link"
                          onClick={() => navigate(`/reports/${person.reportId}`)}
                        >
                          Open
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Toggleable panel: shows either blockers or achievements across the
          whole team for the selected week, grouped by owner/project */}
      <Panel
        title={section.field === "blockers" ? "Blockers across the team" : "Achievements across the team"}
        action={
          <button
            type="button"
            className="link"
            onClick={() =>
              setSection({
                field: section.field === "blockers" ? "achievements" : "blockers",
                rows: [],
              })
            }
          >
            Show {section.field === "blockers" ? "achievements" : "blockers"}
          </button>
        }
      >
        {section.rows.length ? (
          <div className="grid-two">
            {section.rows.map((row) => (
              <div key={row.id}>
                <p className="note">
                  {row.owner} · {row.project}
                </p>
                <ul className="list-plain">
                  {row.items.length ? (
                    row.items.map((item, index) => (
                      <li key={index}>
                        {item.isKey ? <span className="key-mark">key</span> : null} {item.text}
                      </li>
                    ))
                  ) : (
                    <li className="empty">Nothing listed.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">Nothing submitted for this week yet.</p>
        )}
      </Panel>

      {/* Flat feed of recent report activity, each linking to its report */}
      <Panel title="Recent activity">
        <ul className="list-plain">
          {(data?.activity || []).map((item) => (
            <li key={item.id}>
              <button type="button" className="link" onClick={() => navigate(`/reports/${item.id}`)}>
                {item.owner} · {item.project} · {item.status}
              </button>
              <span className="note"> {new Date(item.updatedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}