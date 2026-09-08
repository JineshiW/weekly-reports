const Report = require('../models/Report');
const User = require('../models/User');
const Project = require('../models/Project');
const { startOfWeek, addWeeks, weekLabel } = require('../utils/weeks');

// Builds the full team-dashboard payload for a given week: headline metrics,
// per-member status, tasks by project, hours by type, an 8-week trend, and
// a recent-activity feed.
async function summary(req, res, next) {
  try {
    const week = startOfWeek(req.query.week || new Date());

    // Fetch everything the dashboard needs in parallel.
    const [members, projects, weekReports, needsCorrection] = await Promise.all([
      User.find({ active: true }).sort({ name: 1 }),
      Project.find({ archived: false }).sort({ name: 1 }),
      Report.find({ weekStart: week }).populate('owner', 'name role').populate('project', 'name'),
      // Global count, not scoped to this week — reflects the current backlog.
      Report.countDocuments({ status: 'needs correction' }),
    ]);

    // Managers aren't included in "team" compliance stats — only members submit reports.
    const teamMembers = members.filter((user) => user.role === 'member');
    const submittedCount = weekReports.filter((r) => r.status !== 'draft').length;
    const openBlockers = weekReports.reduce((sum, r) => sum + r.blockers.length, 0);

    // One row per active member: their report status this week (or "not
    // started" if they haven't created one), plus a link target if they have.
    const perMember = teamMembers.map((user) => {
      const own = weekReports.filter((r) => String(r.owner._id) === String(user._id));
      return {
        id: user._id,
        name: user.name,
        status: own.length ? own[0].status : 'not started',
        reportId: own.length ? own[0]._id : null,
      };
    });

    // Total completed-task count per project, for this week's reports.
    const byProject = projects.map((project) => ({
      name: project.name,
      tasks: weekReports
        .filter((r) => String(r.project?._id) === String(project._id))
        .reduce((sum, r) => sum + r.tasksCompleted.length, 0),
    }));

    // Sum hours across all of this week's reports, per hour type.
    const hoursByType = { development: 0, testing: 0, meetings: 0, documentation: 0 };
    weekReports.forEach((report) => {
      Object.keys(hoursByType).forEach((key) => {
        hoursByType[key] += report.hoursByType?.[key] || 0;
      });
    });

    // Eight week trend of completed tasks, oldest week first.
    const trendStart = addWeeks(week, -7);
    const trendReports = await Report.find({ weekStart: { $gte: trendStart, $lte: week } });
    const trend = [];
    for (let i = 7; i >= 0; i -= 1) {
      const target = weekLabel(addWeeks(week, -i));
      trend.push({
        week: target,
        // Re-filter the already-fetched trendReports in memory rather than
        // issuing 8 separate queries.
        tasks: trendReports
          .filter((r) => weekLabel(r.weekStart) === target)
          .reduce((sum, r) => sum + r.tasksCompleted.length, 0),
      });
    }

    // Most recently updated reports across all weeks, for the activity feed.
    const activity = await Report.find({})
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate('owner', 'name')
      .populate('project', 'name');

    res.json({
      week: weekLabel(week),
      metrics: {
        submittedThisWeek: submittedCount,
        teamSize: teamMembers.length,
        complianceRate: teamMembers.length
          ? Math.round((submittedCount / teamMembers.length) * 100)
          : 0,
        needsCorrection,
        openBlockers,
      },
      perMember,
      byProject,
      hoursByType,
      trend,
      activity: activity.map((r) => ({
        id: r._id,
        owner: r.owner?.name,
        project: r.project?.name,
        status: r.status,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// Side by side view of one section for a week, so blockers can be read in one go.
// Draft reports are excluded since they haven't actually been submitted yet.
async function section(req, res, next) {
  try {
    const week = startOfWeek(req.query.week || new Date());
    const field = req.query.field === 'achievements' ? 'achievements' : 'blockers';
    const reports = await Report.find({ weekStart: week, status: { $ne: 'draft' } })
      .populate('owner', 'name')
      .populate('project', 'name');

    res.json({
      week: weekLabel(week),
      field,
      rows: reports.map((r) => ({
        id: r._id,
        owner: r.owner?.name,
        project: r.project?.name,
        items: r[field],
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, section };