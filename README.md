# Real-Time Collaborative Project Management Platform

A MERN stack senior developer assignment implementation focused on authentication, multi-tenant project access control, real-time task synchronization, and secure task attachments.

## Architecture Decisions

- **Separate apps**: `server` and `client` are independent npm projects so they can be installed, tested, and deployed separately.
- **Backend service layer**: Express controllers are thin. Business logic lives in services and query-focused helpers live in repositories.
- **RBAC at project boundary**: Every project/task/file route loads the user's project membership before reading or mutating project data.
- **JWT sessions with refresh rotation**: Short-lived access tokens are paired with persisted refresh token IDs, delivered through HTTP-only cookies, and revoked on refresh/logout.
- **Socket.io rooms**: Users join `project:<id>` rooms after socket JWT verification and membership checks. Task and attachment events only broadcast to that room.
- **Optimistic concurrency**: Tasks include a `version` field. Updates can pass the known version and receive a `409` if the task changed.
- **S3 attachments**: Attachments are stored in AWS S3 under a configurable prefix, for example `demo/`.
- **Caching**: In-memory TTL caching is used for project lists and task list queries. Mutation paths invalidate related prefixes.

## Tech Stack

- Backend: Node.js, Express, Socket.io, MongoDB, Mongoose, bcrypt, JWT, express-validator, Helmet, multer.
- Frontend: React, Vite, Redux with React Redux, React Router, React Hook Form, Socket.io client, Axios.

## Setup

Requirements: Node.js 18+, MongoDB running locally or MongoDB Atlas.

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`; frontend runs on `http://localhost:5173`.

## Environment Variables

Server:

- `PORT` - backend port.
- `CLIENT_ORIGIN` - frontend URL for CORS and Socket.io.
- `MONGO_URI` - MongoDB connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - long random secrets.
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` - token lifetimes.
- `BCRYPT_ROUNDS` - defaults to `12`.
- `MAX_FILE_SIZE_MB` - upload size limit.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_S3_PREFIX` - required S3 storage configuration. `AWS_S3_PREFIX=demo` stores files under the `demo/` folder in the bucket.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - optional SMTP settings. Without SMTP, reset/invite emails are logged in development.
- `MAILTRAP_TOKEN`, `MAILTRAP_SENDER_EMAIL`, `MAILTRAP_SENDER_NAME` - optional Mailtrap API email delivery. If `MAILTRAP_TOKEN` is set, Mailtrap is used before SMTP.
- `APP_URL` - frontend URL used in email links.

Client:

- `VITE_API_URL` - API base URL.
- `VITE_SOCKET_URL` - Socket.io server URL.

## API Overview

Authenticated browser requests use HTTP-only `accessToken` and `refreshToken` cookies. API clients can also send `Authorization: Bearer <accessToken>` for manual testing.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Example:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Projects

- `GET /api/projects?page=1&limit=20`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/invitations`
- `POST /api/projects/accept-invite`

### Tasks

- `GET /api/projects/:projectId/tasks?status=Todo&priority=Critical&search=auth`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/projects/:projectId/tasks/:taskId`
- `DELETE /api/projects/:projectId/tasks/:taskId`
- `PATCH /api/projects/:projectId/tasks/bulk`

Bulk example:

```json
{
  "operation": "status",
  "taskIds": ["..."],
  "value": "Completed"
}
```

### Attachments

- `POST /api/projects/:projectId/tasks/:taskId/attachments` with multipart field `files`.
- `GET /api/projects/:projectId/tasks/:taskId/attachments`
- `GET /api/projects/:projectId/tasks/attachments/:attachmentId/download`

## Real-Time Events

Client emits:

- `project:join` with `{ "projectId": "..." }`
- `project:leave`
- `task:editing`

Server emits:

- `task:created`
- `task:updated`
- `task:deleted`
- `task:bulkUpdated`
- `attachments:created`
- `presence:update`

## Deployment Guide

1. Create MongoDB Atlas database and set `MONGO_URI`.
2. Deploy `server` to Render or Railway with root directory `server`, build command `npm install`, start command `npm start`.
3. Deploy `client` to Vercel or Netlify with root directory `client`, build command `npm run build`, output directory `dist`.
4. Set `CLIENT_ORIGIN`, `APP_URL`, `VITE_API_URL`, and `VITE_SOCKET_URL` to deployed URLs.
5. Set AWS S3 environment variables on the server for attachment uploads and downloads.
6. Configure SMTP or a transactional email provider for password resets and invitations.

## Trade-Offs

- The UI is intentionally focused on core workflows rather than a full design system.
- Local file storage is used for fast reviewability; the storage boundary is isolated for cloud migration.
- In-memory caching is sufficient for the assignment but should become Redis in a multi-instance deployment.
- Background email jobs are not included; production should queue email and notification delivery.
