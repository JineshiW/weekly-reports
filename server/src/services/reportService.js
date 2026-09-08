const Report = require('../models/Report');
const ReportVersion = require('../models/ReportVersion');
const { startOfWeek, endOfWeek } = require('../utils/weeks');

// Statuses in which a member is still allowed to change report content.
const EDITABLE_STATUSES = ['draft', 'needs correction'];

// Builds an Error with an HTTP status attached, for controllers' error handlers to use.
function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Only these keys are copied from the request. Keeps the report shape fixed.
// weekEnd is always derived from weekStart rather than trusted from the client.
function pickContent(body) {
  return {
    project: body.project,
    weekStart: startOfWeek(body.weekStart),
    weekEnd: endOfWeek(body.weekStart),
    tasksCompleted: body.tasksCompleted || [],
    nextWeekTasks: body.nextWeekTasks || [],
    blockers: body.blockers || [],
    achievements: body.achievements || [],
    hoursByType: body.hoursByType || {},
    notes: body.notes || '',
    links: body.links || [],
  };
}

// Creates a new draft report for a user, enforcing the one-report-per-
// owner/project/week uniqueness rule (also backed by the DB index).
async function createReport(userId, body) {
  const content = pickContent(body);
  const clash = await Report.findOne({
    owner: userId,
    project: content.project,
    weekStart: content.weekStart,
  });
  if (clash) throw fail(409, 'A report already exists for this project and week');

  return Report.create({ ...content, owner: userId, status: 'draft' });
}

// Overwrites a report's content. Only allowed while it's still editable
// (draft or needs correction) — submitted/approved reports are locked.
async function updateReport(report, body) {
  if (!EDITABLE_STATUSES.includes(report.status)) {
    throw fail(400, `A report in "${report.status}" state cannot be edited`);
  }
  Object.assign(report, pickContent(body));
  await report.save();
  return report;
}

// Submits a report for manager review. Snapshots the current content into
// ReportVersion first, so the state at submission time is preserved even if
// the report gets edited again later (e.g. after being sent back).
async function submitReport(report) {
  if (!EDITABLE_STATUSES.includes(report.status)) {
    throw fail(400, 'Only drafts or reports needing correction can be submitted');
  }
  if (report.tasksCompleted.length === 0) {
    throw fail(400, 'Add at least one completed task before submitting');
  }

  const snapshot = report.toObject();
  delete snapshot._id;

  await ReportVersion.create({
    report: report._id,
    versionNumber: report.version,
    snapshot,
  });

  report.status = 'submitted';
  report.submittedAt = new Date();
  await report.save();
  return report;
}

// Applies a manager's decision to a submitted report.
// Approving optionally allows a comment (e.g. praise/notes) without changing
// the version. Requesting changes requires a comment, moves the report back
// to "needs correction", and bumps the version so the next submission is
// tracked as a new attempt.
async function reviewReport(report, manager, action, message) {
  if (report.status !== 'submitted') {
    throw fail(400, 'Only submitted reports can be reviewed');
  }

  report.reviewedBy = manager._id;
  report.reviewedAt = new Date();

  if (action === 'approve') {
    report.status = 'approved';
    if (message) {
      report.reviewComments.push({
        author: manager._id,
        message,
        versionNumber: report.version,
      });
    }
  } else {
    if (!message) throw fail(400, 'A comment is required when requesting changes');
    report.status = 'needs correction';
    report.reviewComments.push({
      author: manager._id,
      message,
      versionNumber: report.version,
    });
    report.version += 1;
  }

  await report.save();
  return report;
}

// Translates query params into a Mongo filter for report listing: exact
// matches on owner/project/status, plus either a single week or a date range.
function buildFilter(query) {
  const filter = {};
  if (query.owner) filter.owner = query.owner;
  if (query.project) filter.project = query.project;
  if (query.status) filter.status = query.status;
  if (query.week) {
    filter.weekStart = startOfWeek(query.week);
  } else if (query.from || query.to) {
    filter.weekStart = {};
    if (query.from) filter.weekStart.$gte = startOfWeek(query.from);
    if (query.to) filter.weekStart.$lte = startOfWeek(query.to);
  }
  return filter;
}

// Paginated report listing, newest week/update first. Page size is clamped
// to a sane range (1-50) regardless of what the client requests.
async function listReports(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  const filter = buildFilter(query);

  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ weekStart: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('owner', 'name email role')
      .populate('project', 'name'),
    Report.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

module.exports = {
  createReport,
  updateReport,
  submitReport,
  reviewReport,
  listReports,
  buildFilter,
  EDITABLE_STATUSES,
};