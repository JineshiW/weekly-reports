const mongoose = require('mongoose');

// One row in a report's tasksCompleted list.
// _id: false since these are always accessed as part of the parent report,
// never fetched individually.
const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    plannedPercent: { type: Number, default: 0 },
    actualPercent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not started', 'in progress', 'done', 'blocked'],
      default: 'in progress',
    },
    hoursPlanned: { type: Number, default: 0 },
    hoursSpent: { type: Number, default: 0 },
    output: { type: String, default: '' },
  },
  { _id: false }
);

// Shared shape for blockers/achievements entries.
const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    isKey: { type: Boolean, default: false },
  },
  { _id: false }
);

// A single manager comment left when reviewing a report, tied to the version
// of the report it was left on.
const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    versionNumber: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// The field list below is fixed for the whole team so reports stay comparable
// on the manager dashboard. Members fill it in, they cannot extend it.
const reportSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    // Workflow state: draft -> submitted -> approved, or submitted -> needs
    // correction -> submitted again (see the controller for the transitions).
    status: {
      type: String,
      enum: ['draft', 'submitted', 'needs correction', 'approved'],
      default: 'draft',
      index: true,
    },
    tasksCompleted: [taskSchema],
    nextWeekTasks: [{ type: String }],
    blockers: [noteSchema],
    achievements: [noteSchema],
    hoursByType: {
      development: { type: Number, default: 0 },
      testing: { type: Number, default: 0 },
      meetings: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
    },
    notes: { type: String, default: '' },
    links: [{ type: String }],
    // Bumped each time the report is resubmitted; used to tag review comments
    // and to snapshot into ReportVersion.
    version: { type: Number, default: 1 },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewComments: [commentSchema],
  },
  { timestamps: true }
);

// One report per owner/week/project combination — prevents duplicate reports
// for the same week and project.
reportSchema.index({ owner: 1, weekStart: 1, project: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);