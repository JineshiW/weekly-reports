const { z } = require('zod');
const Report = require('../models/Report');
const ReportVersion = require('../models/ReportVersion');
const reportService = require('../services/reportService');

// One task row within a report's tasksCompleted list.
const taskSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  plannedPercent: z.number().min(0).max(100).default(0),
  actualPercent: z.number().min(0).max(100).default(0),
  status: z.enum(['not started', 'in progress', 'done', 'blocked']).default('in progress'),
  hoursPlanned: z.number().min(0).default(0),
  hoursSpent: z.number().min(0).default(0),
  output: z.string().default(''),
});

// Shared shape for blockers/achievements entries.
const noteSchema = z.object({ text: z.string().min(1), isKey: z.boolean().default(false) });

// Full report payload validation, used on both create and update.
const reportSchema = z.object({
  project: z.string().min(1),
  weekStart: z.string().min(1),
  tasksCompleted: z.array(taskSchema).default([]),
  nextWeekTasks: z.array(z.string().min(1)).default([]),
  blockers: z.array(noteSchema).default([]),
  achievements: z.array(noteSchema).default([]),
  hoursByType: z
    .object({
      development: z.number().min(0).default(0),
      testing: z.number().min(0).default(0),
      meetings: z.number().min(0).default(0),
      documentation: z.number().min(0).default(0),
    })
    .default({}),
  notes: z.string().default(''),
  links: z.array(z.string()).default([]),
});

// Manager's review decision payload.
const reviewSchema = z.object({
  action: z.enum(['approve', 'request changes']),
  message: z.string().max(2000).optional(),
});

// A user can read a report if they're a manager, or if they own it.
function canRead(user, report) {
  return user.role === 'manager' || String(report.owner._id || report.owner) === String(user._id);
}

// Fetches a report by id with the fields needed for display (owner, project,
// and review comment authors), throwing a 404-style error if it doesn't exist.
async function loadReport(id) {
  const report = await Report.findById(id)
    .populate('owner', 'name email role jobTitle')
    .populate('project', 'name')
    .populate('reviewComments.author', 'name');
  if (!report) {
    const err = new Error('Report not found');
    err.status = 404;
    throw err;
  }
  return report;
}

// Lists reports matching the query filters. Members are always restricted to
// their own reports, overriding any owner filter they might try to pass.
async function list(req, res, next) {
  try {
    const query = { ...req.query };
    // Members are locked to their own rows regardless of what they ask for.
    if (req.user.role !== 'manager') query.owner = req.user._id.toString();
    res.json(await reportService.listReports(query));
  } catch (err) {
    next(err);
  }
}

// Fetches a single report, enforcing that only the owner or a manager can view it.
async function getOne(req, res, next) {
  try {
    const report = await loadReport(req.params.id);
    if (!canRead(req.user, report)) return res.status(403).json({ message: 'Not your report' });
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

// Creates a new report owned by the current user.
async function create(req, res, next) {
  try {
    const report = await reportService.createReport(req.user._id, req.body);
    res.status(201).json({ report: await loadReport(report._id) });
  } catch (err) {
    next(err);
  }
}

// Updates a report's content. Only the owner can edit — not even a manager,
// since managers review rather than write report content.
async function update(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (String(report.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the report owner can edit content' });
    }
    await reportService.updateReport(report, req.body);
    res.json({ report: await loadReport(report._id) });
  } catch (err) {
    next(err);
  }
}

// Submits a report for review. Owner-only, same reasoning as update.
async function submit(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (String(report.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the report owner can submit' });
    }
    await reportService.submitReport(report);
    res.json({ report: await loadReport(report._id) });
  } catch (err) {
    next(err);
  }
}

// Applies a manager's review decision (approve / request changes) to a report.
// Ownership/role checks for who is allowed to review live in reportService.
async function review(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    await reportService.reviewReport(report, req.user, req.body.action, req.body.message);
    res.json({ report: await loadReport(report._id) });
  } catch (err) {
    next(err);
  }
}

// Deletes a draft report. Only the owner can delete, and only while it's
// still a draft — once submitted, history needs to be preserved.
async function removeDraft(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (String(report.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not your report' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ message: 'Only drafts can be deleted' });
    }
    await report.deleteOne();
    res.json({ message: 'Draft deleted' });
  } catch (err) {
    next(err);
  }
}

// Lists a report's past submitted versions, newest first. Same read
// permission as getOne (owner or manager).
async function versions(req, res, next) {
  try {
    const report = await loadReport(req.params.id);
    if (!canRead(req.user, report)) return res.status(403).json({ message: 'Not your report' });
    const rows = await ReportVersion.find({ report: report._id }).sort({ versionNumber: -1 });
    res.json({ versions: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  submit,
  review,
  removeDraft,
  versions,
  reportSchema,
  reviewSchema,
};