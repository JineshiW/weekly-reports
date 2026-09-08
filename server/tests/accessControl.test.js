const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const app = require('../src/app');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Report = require('../src/models/Report');

let memoryServer;
// Shared fixtures (tokens/ids) set up once in test.before and reused across tests.
const state = {};

// Spins up an in-memory Mongo instance and seeds one manager, two members,
// one project, and one draft report owned by memberOne.
test.before(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());

  const passwordHash = await User.hashPassword('password123');
  const [manager, memberOne, memberTwo] = await User.create([
    { name: 'Manager', email: 'manager@test.dev', role: 'manager', passwordHash },
    { name: 'Member One', email: 'one@test.dev', role: 'member', passwordHash },
    { name: 'Member Two', email: 'two@test.dev', role: 'member', passwordHash },
  ]);

  const project = await Project.create({ name: 'Test Project' });

  const report = await Report.create({
    owner: memberOne._id,
    project: project._id,
    weekStart: new Date('2026-08-31T00:00:00.000Z'),
    weekEnd: new Date('2026-09-06T23:59:59.999Z'),
    status: 'draft',
    tasksCompleted: [{ name: 'Task', hoursSpent: 4 }],
  });

  // Logs in as a given user and returns their auth token, for use in
  // subsequent requests' Authorization headers.
  async function tokenFor(email) {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    return res.body.token;
  }

  state.managerToken = await tokenFor(manager.email);
  state.memberOneToken = await tokenFor(memberOne.email);
  state.memberTwoToken = await tokenFor(memberTwo.email);
  state.reportId = report._id.toString();
  state.projectId = project._id.toString();
});

// Tear down the database and stop the in-memory server after all tests run.
test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await memoryServer.stop();
});

test('anonymous requests are rejected', async () => {
  const res = await request(app).get('/api/reports');
  assert.equal(res.status, 401);
});

test('a member cannot read another member report', async () => {
  const res = await request(app)
    .get(`/api/reports/${state.reportId}`)
    .set('Authorization', `Bearer ${state.memberTwoToken}`);
  assert.equal(res.status, 403);
});

test('report list is scoped to the signed in member', async () => {
  // memberTwo owns no reports, so their list should come back empty even
  // though a report exists for memberOne.
  const res = await request(app)
    .get('/api/reports')
    .set('Authorization', `Bearer ${state.memberTwoToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 0);
});

test('a manager can read any report', async () => {
  const res = await request(app)
    .get(`/api/reports/${state.reportId}`)
    .set('Authorization', `Bearer ${state.managerToken}`);
  assert.equal(res.status, 200);
});

test('members are blocked from the review endpoint', async () => {
  const res = await request(app)
    .post(`/api/reports/${state.reportId}/review`)
    .set('Authorization', `Bearer ${state.memberOneToken}`)
    .send({ action: 'approve' });
  assert.equal(res.status, 403);
});

test('members are blocked from user management', async () => {
  const res = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${state.memberOneToken}`);
  assert.equal(res.status, 403);
});

test('managers cannot rewrite report content', async () => {
  // Even though managers can review, editing content is owner-only —
  // confirms that restriction from the controller.
  const res = await request(app)
    .put(`/api/reports/${state.reportId}`)
    .set('Authorization', `Bearer ${state.managerToken}`)
    .send({
      project: state.projectId,
      weekStart: '2026-08-31',
      tasksCompleted: [{ name: 'Edited by manager' }],
    });
  assert.equal(res.status, 403);
});

// End-to-end walk through the whole report lifecycle: submit -> sent back for
// correction -> resubmitted -> approved, checking status at each step and
// confirming both submissions were recorded as separate versions.
test('full review cycle moves through every status', async () => {
  const submit = await request(app)
    .post(`/api/reports/${state.reportId}/submit`)
    .set('Authorization', `Bearer ${state.memberOneToken}`);
  assert.equal(submit.body.report.status, 'submitted');

  const sendBack = await request(app)
    .post(`/api/reports/${state.reportId}/review`)
    .set('Authorization', `Bearer ${state.managerToken}`)
    .send({ action: 'request changes', message: 'Add the hours breakdown please' });
  assert.equal(sendBack.body.report.status, 'needs correction');

  const resubmit = await request(app)
    .post(`/api/reports/${state.reportId}/submit`)
    .set('Authorization', `Bearer ${state.memberOneToken}`);
  assert.equal(resubmit.body.report.status, 'submitted');

  const approve = await request(app)
    .post(`/api/reports/${state.reportId}/review`)
    .set('Authorization', `Bearer ${state.managerToken}`)
    .send({ action: 'approve' });
  assert.equal(approve.body.report.status, 'approved');

  const versions = await request(app)
    .get(`/api/reports/${state.reportId}/versions`)
    .set('Authorization', `Bearer ${state.managerToken}`);
  assert.equal(versions.body.versions.length, 2);
});