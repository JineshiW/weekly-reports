const { z } = require('zod');
const Project = require('../models/Project');
const Report = require('../models/Report');

// Validation schema for creating/updating a project.
const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(400).default(''),
  members: z.array(z.string()).default([]),
});

// Lists all non-archived projects, alphabetically, with member details populated.
async function list(req, res, next) {
  try {
    const projects = await Project.find({ archived: false })
      .sort({ name: 1 })
      .populate('members', 'name email');
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

// Creates a new project, rejecting duplicate names.
async function create(req, res, next) {
  try {
    const exists = await Project.findOne({ name: req.body.name });
    if (exists) return res.status(409).json({ message: 'That project name is taken' });
    const project = await Project.create(req.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

// Updates a project's fields (name, description, members).
async function update(req, res, next) {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

// Removes a project. If any reports still reference it, it's archived instead
// of hard-deleted, so those reports' history/links stay intact. Only projects
// with no report references are actually deleted.
async function remove(req, res, next) {
  try {
    const used = await Report.countDocuments({ project: req.params.id });
    if (used > 0) {
      // Reports still point at it, so archive instead of breaking their history.
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { archived: true },
        { new: true }
      );
      if (!project) return res.status(404).json({ message: 'Project not found' });
      return res.json({ message: 'Project archived because reports reference it' });
    }

    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, projectSchema };