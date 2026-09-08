const mongoose = require('mongoose');

// One row per submission. Keeps the content the manager actually reviewed so a
// correction cycle does not overwrite history.
const reportVersionSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    versionNumber: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReportVersion', reportVersionSchema);
