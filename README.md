# Weekly Report Generator & Team Dashboard

A small full stack app where team members write a weekly work report, submit it for review,
and managers approve it or send it back with a comment. Managers also get a dashboard that
rolls up the whole team for a chosen week.

Two independent parts:

- `server/` - Node.js + Express REST API on MongoDB (Mongoose), JWT auth
- `client/` - React 18 single page app built with Vite

Nothing here is tied to a hosting platform, so it runs the same on your machine as anywhere else.

## What it does

**Roles**

- Team member: creates, edits and submits their own reports
- Manager: sees every report, reviews them, manages projects and accounts

**Review cycle**

`Draft -> Submitted -> (Needs Correction -> Submitted) -> Approved`

When a manager requests changes they must leave a comment. The member sees that comment on
the report, edits the same report and resubmits it. Every submission is stored as a version,
so earlier content is never lost - the review page lists past versions with their timestamps
and shows which version each comment was written against.

Members can never touch someone else's report. Managers can change status and add comments
but cannot rewrite report content; the API rejects that.

**The report form is fixed for everyone**: week range, project, completed tasks table (name,
priority, planned vs actual %, status, time planned vs spent, deliverable), tasks planned for
next week, blockers (one can be flagged as the key issue), achievements (one can be flagged as
the key win), hours split by task type, and free notes or links.

## Pages

1. Login
2. Register
3. My reports - own history with week / status / project filters (managers also filter by member)
4. New / edit report - the fixed form
5. Report detail - read the report, resubmit, or review it as a manager
6. Team dashboard - metrics, charts, per member status, blockers and achievements side by side
7. Projects - add, edit, remove work categories
8. Team members - add accounts, switch roles, deactivate

## Running it locally

You need Node.js 18 or newer and a MongoDB you can reach (a local `mongod` or a free Atlas cluster).

### 1. API

```sh
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed              # optional demo data
npm run dev               # http://localhost:4000
```

`.env` values:

| Key           | Meaning                                        |
| ------------- | ---------------------------------------------- |
| `PORT`        | API port, defaults to 4000                     |
| `MONGODB_URI` | connection string, e.g. `mongodb://127.0.0.1:27017/weekly-reports` |
| `JWT_SECRET`  | any long random string                         |
| `CLIENT_URL`  | where the React app runs, for CORS             |

### 2. Web app

```sh
cd client
npm install
cp .env.example .env      # VITE_API_URL points at the API
npm run dev               # http://localhost:5173
```

### Demo logins (after `npm run seed`)

| Role    | Email             | Password      |
| ------- | ----------------- | ------------- |
| Manager | dilani@team.dev   | password123   |
| Member  | kavin@team.dev    | password123   |

The seed script also creates a few projects and several weeks of reports in mixed states, so
the dashboard has something to draw.

## Tests

```sh
cd server
npm test
```

The tests cover login, report isolation between members, the manager's permission limits, and
the full submit -> request changes -> resubmit -> approve cycle.

## Folder layout

```
server/
  src/
    config/        database connection and env reading
    models/        User, Project, Report, ReportVersion
    routes/        one router per resource
    controllers/   request handling
    services/      report workflow rules
    middleware/    auth, roles, validation, error handling
    utils/         week helpers
  tests/
client/
  src/
    api/           thin fetch wrappers per resource
    components/    shared UI pieces (panel, field, status tag, report view, shell)
    context/       auth session
    pages/         the eight views
    styles/        theme tokens and global styles
    utils/         week helpers
```

## Notes

- Passwords are hashed with bcrypt; the API returns a JWT that the client keeps and sends
  as a bearer token.
- Weeks always start on Monday, on both sides, so labels never drift.
- Deleting a project archives it instead of erasing it, so old reports still read correctly.
- The colour palette and font sizes live in `client/src/styles/theme.css` if you want to
  restyle anything.
