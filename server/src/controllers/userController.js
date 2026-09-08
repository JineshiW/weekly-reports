const { z } = require('zod');
const User = require('../models/User');
const Report = require('../models/Report');

// Validation schema for inviting a new user (manager-only action).
const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['member', 'manager']).default('member'),
  jobTitle: z.string().default(''),
});

// Validation schema for changing a user's role.
const roleSchema = z.object({ role: z.enum(['member', 'manager']) });

// Lists every user (active and inactive), alphabetically, as public-safe objects.
async function list(req, res, next) {
  try {
    const users = await User.find({}).sort({ name: 1 });
    res.json({ users: users.map((user) => user.toPublic()) });
  } catch (err) {
    next(err);
  }
}

// Creates a new account on behalf of a manager (as opposed to self-registration).
// Rejects duplicate emails and hashes the temporary password before storing it.
async function invite(req, res, next) {
  try {
    const taken = await User.findOne({ email: req.body.email });
    if (taken) return res.status(409).json({ message: 'That email is already registered' });

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      jobTitle: req.body.jobTitle,
      passwordHash: await User.hashPassword(req.body.password),
    });
    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// Switches a user's role between member and manager.
async function changeRole(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = req.body.role;
    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// Deactivates an account (soft delete — keeps their historical reports intact).
// A manager can't deactivate themselves, to avoid locking everyone out.
async function deactivate(req, res, next) {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot remove your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = false;
    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// Returns a single user's profile plus their full report history and some
// aggregate stats (counts by status, total hours logged across all reports).
async function profile(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const reports = await Report.find({ owner: user._id })
      .sort({ weekStart: -1 })
      .populate('project', 'name');

    const stats = {
      total: reports.length,
      approved: reports.filter((r) => r.status === 'approved').length,
      needsCorrection: reports.filter((r) => r.status === 'needs correction').length,
      submitted: reports.filter((r) => r.status === 'submitted').length,
      drafts: reports.filter((r) => r.status === 'draft').length,
      hoursLogged: reports.reduce(
        (sum, r) => sum + r.tasksCompleted.reduce((inner, t) => inner + (t.hoursSpent || 0), 0),
        0
      ),
    };

    res.json({ user: user.toPublic(), reports, stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, invite, changeRole, deactivate, profile, inviteSchema, roleSchema };