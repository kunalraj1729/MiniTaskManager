# Mini Task Management System

Next.js (App Router, TypeScript, Tailwind) frontend + FastAPI backend with SQLAlchemy persistence
(SQLite locally, PostgreSQL in production via `DATABASE_URL`).

Users sign up / sign in with email and password and manage their own private task list.
Tasks are stored in the database, so they survive page refreshes and server restarts, and the
sign-in is remembered across refreshes until the user signs out or the token expires (7 days by default).

## Run locally

```powershell
# Backend  -> http://localhost:8000  (docs at /docs)
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
.\.venv\Scripts\uvicorn app.main:app --reload

# Frontend -> http://localhost:3000
cd frontend
npm install
npm run dev
```

Tests: `cd backend; .\.venv\Scripts\python -m pytest`

## API

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | `{name, email, password}` → 201 `{access_token, token_type, user}`; 409 if the email is taken |
| POST | `/api/auth/login` | `{email, password}` → 200 `{access_token, token_type, user}`; 401 on bad credentials |
| GET | `/api/auth/me` | Current user (requires token) |

- Passwords are hashed with Argon2id (`pwdlib`) and never returned.
- Emails are trimmed and lower-cased, so sign-in and the duplicate check ignore case.
- Name: 2–100 chars. Password: 8–128 chars.
- Tokens are HS256 JWTs (`PyJWT`). Send them as `Authorization: Bearer <token>`.
- The frontend keeps the token in `localStorage`, so a refresh doesn't sign the user out. Sign-out discards the token.
- Any 401 response clears the token and returns the user to the sign-in page.

### Tasks (all require `Authorization: Bearer <token>`)

Every task belongs to the signed-in user. Another user's task id returns 404, just like a missing one.

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks?search=&status=&priority=` | List the user's tasks, newest first. Filters combine. |
| POST | `/api/tasks` | Create (always `Pending`) → 201 |
| GET | `/api/tasks/{id}` | Fetch one → 404 if missing |
| PUT | `/api/tasks/{id}` | Edit title, description, priority, due_date (`created_at` unchanged) |
| PATCH | `/api/tasks/{id}/complete` | Pending → Completed (409 if already completed) |
| DELETE | `/api/tasks/{id}` | Delete → 204 |

Validation errors return `422` with `{"detail": "Validation failed", "errors": [{"field", "message"}]}`;
other errors return `{"detail": "..."}`. Title is trimmed and must be 3–100 chars, priority is
`Low|Medium|High`, status `Pending|Completed`, `due_date` an ISO date.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | backend | SQLite file `backend/tasks.db` | Database connection |
| `JWT_SECRET` | backend | random per start | Token signing key. **Set it in production.** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | `10080` (7 days) | Token lifetime |
| `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` | backend | `http://localhost:3000` | Allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` | Backend base URL |

## Deployment

Everything deploys to [Render](https://render.com) from one Blueprint:

1. Push this repo to GitHub.
2. Render → New → Blueprint → select the repo. `render.yaml` creates the API (with a generated `JWT_SECRET`),
   the Next.js frontend and a Postgres DB, all on the free plan.
3. If the API URL isn't `https://kunalraj-minitaskmanager-api.onrender.com` (name already taken), set the frontend's
   `NEXT_PUBLIC_API_URL` to the real API URL and redeploy the frontend.

The frontend URL (`kunalraj-minitaskmanager`) is your deployment link. Free instances sleep when idle, so the first load can be slow.

Live link: _add after deploying_
