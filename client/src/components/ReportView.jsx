import Panel from "./Panel";
import { weekRangeLabel } from "../utils/weeks";

// Read only rendering of one report. Used on the member's detail page and on the
// manager's review page so both sides look at exactly the same layout.
export default function ReportView({ report }) {
  // Fall back to an empty object so Object.values/entries below never throw
  // if a report was saved before hoursByType existed.
  const hours = report.hoursByType || {};

  // Sum all hour values (by type) into a single total for the "Total" row.
  // (value || 0) guards against null/undefined entries.
  const totalHours = Object.values(hours).reduce((sum, value) => sum + (value || 0), 0);

  return (
    <>
      {/* Basic report metadata: which week and which project it belongs to */}
      <Panel title="Overview">
        <div className="grid-two">
          <div>
            <p className="note">Week</p>
            <p>{weekRangeLabel(report.weekStart, report.weekEnd)}</p>
          </div>
          <div>
            <p className="note">Project</p>
            <p>{report.project?.name || "-"}</p>
          </div>
        </div>
      </Panel>

      {/* Table of tasks the member reported as completed (or in progress) this week */}
      <Panel title="Tasks completed">
        {report.tasksCompleted?.length ? (
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
                </tr>
              </thead>
              <tbody>
                {report.tasksCompleted.map((task, index) => (
                  // index used as key since tasks don't have a stable id
                  <tr key={index}>
                    <td>{task.name}</td>
                    <td>{task.priority}</td>
                    <td>{task.plannedPercent}</td>
                    <td>{task.actualPercent}</td>
                    <td>{task.status}</td>
                    <td>{task.hoursPlanned}</td>
                    <td>{task.hoursSpent}</td>
                    <td>{task.output || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Empty state when there are no tasks at all
          <p className="empty">No tasks recorded.</p>
        )}
      </Panel>

      <div className="grid-two">
        {/* Simple bullet list of what's planned for the following week */}
        <Panel title="Planned for next week">
          {report.nextWeekTasks?.length ? (
            <ul className="list-plain">
              {report.nextWeekTasks.map((task, index) => (
                <li key={index}>{task}</li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing listed.</p>
          )}
        </Panel>

        {/* Breakdown of hours logged per type (e.g. dev, meetings, QA), plus a total row */}
        <Panel title="Hours by type">
          <table>
            <tbody>
              {Object.entries(hours).map(([type, value]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{value || 0}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{totalHours}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid-two">
        {/* Blockers and achievements share the same rendering logic via NoteList */}
        <Panel title="Blockers">
          <NoteList items={report.blockers} emptyText="No blockers reported." />
        </Panel>
        <Panel title="Achievements">
          <NoteList items={report.achievements} emptyText="No achievements listed." />
        </Panel>
      </div>

      {/* Free-text notes plus any reference links attached to the report */}
      <Panel title="Notes and links">
        <p>{report.notes || <span className="empty">No notes.</span>}</p>
        {report.links?.length > 0 && (
          <ul className="list-plain">
            {report.links.map((link, index) => (
              <li key={index}>
                <a href={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// Renders a bullet list of notes (used for both blockers and achievements).
// Each item can optionally be flagged as a "key" item, which shows a small badge.
function NoteList({ items, emptyText }) {
  if (!items?.length) return <p className="empty">{emptyText}</p>;
  return (
    <ul className="list-plain">
      {items.map((item, index) => (
        <li key={index}>
          {item.text}
          {item.isKey && <span className="key-mark">key item</span>}
        </li>
      ))}
    </ul>
  );
}