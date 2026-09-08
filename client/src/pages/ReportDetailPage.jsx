import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Panel from "../components/Panel";
import ReportView from "../components/ReportView";
import StatusTag from "../components/StatusTag";
import { fetchReport, fetchVersions, reviewReport, submitReport } from "../api/reports";
import { useAuth } from "../context/AuthContext";
import { weekRangeLabel } from "../utils/weeks";

// One report on screen. Members read their own report and resubmit it, managers
// approve it or send it back with a comment.
export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [report, setReport] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [message, setMessage] = useState(""); // manager's review comment
  const [error, setError] = useState("");

  // Fetches the current report by id.
  function load() {
    fetchReport(id)
      .then((res) => setReport(res.report))
      .catch((problem) => setError(problem.message));
  }

  // Load the report and its version history whenever the id in the URL changes.
  useEffect(() => {
    load();
    fetchVersions(id)
      .then((res) => setVersions(res.versions))
      .catch(() => setVersions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Manager action: approve or request changes. A comment is required when
  // requesting changes, since the member needs to know what to fix.
  async function review(action) {
    if (action === "request changes" && !message.trim()) {
      setError("Add a comment before sending the report back.");
      return;
    }
    try {
      const res = await reviewReport(id, { action, message });
      setReport(res.report);
      setMessage("");
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Member action: resubmit a report that was sent back for correction.
  async function resubmit() {
    try {
      const res = await submitReport(id);
      setReport(res.report);
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Show a loading/error state until the report has loaded.
  if (!report) {
    return <div className="page">{error ? <p className="error-text">{error}</p> : <p>Loading…</p>}</div>;
  }

  // Whether the current user owns this report (handles both populated and
  // unpopulated owner references).
  const isOwner = String(report.owner?._id || report.owner) === String(user?.id || user?._id);
  // Owner can edit only while it's still a draft or was sent back for correction.
  const canEdit = isOwner && (report.status === "draft" || report.status === "needs correction");
  const comments = report.reviewComments || [];
  const latest = comments[comments.length - 1];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{report.owner?.name || "My report"}</h1>
          <p>{weekRangeLabel(report.weekStart, report.weekEnd)}</p>
        </div>
        <div className="buttons">
          <StatusTag status={report.status} />
          {canEdit ? (
            <button type="button" onClick={() => navigate(`/reports/${report._id}/edit`)}>
              Edit
            </button>
          ) : null}
          {/* Resubmit only makes sense once corrections have been made */}
          {canEdit && report.status === "needs correction" ? (
            <button type="button" onClick={resubmit}>
              Resubmit
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {/* Surface the manager's most recent feedback prominently when the
          report needs correction */}
      {report.status === "needs correction" && latest ? (
        <div className="warning-box">
          <strong>Changes requested:</strong> {latest.message}
        </div>
      ) : null}

      <ReportView report={report} />

      <Panel
        title="Review comments"
        action={
          <button type="button" className="link" onClick={() => setShowVersions(!showVersions)}>
            {showVersions ? "Hide versions" : `Past versions (${versions.length})`}
          </button>
        }
      >
        {comments.length ? (
          <ul className="list-plain">
            {comments.map((comment, index) => (
              <li key={index}>
                <p className="note">
                  Version {comment.versionNumber} · {new Date(comment.createdAt).toLocaleString()}
                </p>
                <p>{comment.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No comments yet.</p>
        )}

        {/* Collapsed by default; toggled via the panel's action button above */}
        {showVersions ? (
          <ul className="list-plain">
            {versions.length ? (
              versions.map((version) => (
                <li key={version._id}>
                  <p className="note">
                    Version {version.versionNumber} · submitted{" "}
                    {new Date(version.submittedAt).toLocaleString()}
                  </p>
                  <p>
                    {(version.snapshot?.tasksCompleted || []).length} tasks ·{" "}
                    {(version.snapshot?.blockers || []).length} blockers
                  </p>
                </li>
              ))
            ) : (
              <li className="empty">No earlier versions.</li>
            )}
          </ul>
        ) : null}
      </Panel>

      {/* Manager decision panel only shows for managers, and only while the
          report is actually awaiting review */}
      {isManager && report.status === "submitted" ? (
        <Panel title="Manager decision">
          <label className="field">
            <span>Comment (needed when requesting changes)</span>
            <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <div className="buttons">
            <button type="button" onClick={() => review("approve")}>
              Approve
            </button>
            <button type="button" className="plain" onClick={() => review("request changes")}>
              Request changes
            </button>
          </div>
        </Panel>
      ) : null}

      <div className="buttons">
        <button type="button" className="plain" onClick={() => navigate("/reports")}>
          Back to reports
        </button>
      </div>
    </div>
  );
}