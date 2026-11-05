# VisitFlow - Deployment and Operations Guide

This document describes the local setup, deployment configuration, environment variables, verification results and operational limitations of VisitFlow.

## 1. Deployment Overview

VisitFlow uses a monorepo containing a Next.js frontend and an Express backend.

The deployed architecture is:

| Component | Platform | URL |
|---|---|---|
| Source repository | GitHub | https://github.com/prerana1621/visitflow |
| Frontend | Vercel | https://visitflow-nu.vercel.app |
| Backend | Render | https://visitflow-api.onrender.com |
| Database | MongoDB Atlas | Database: `visitflow` |
| AI provider | Google Gemini | Gemini 3.1 Flash Lite |

The frontend communicates with the backend through a Next.js API rewrite. MongoDB credentials, JWT secrets and the Gemini API key remain server-side.

## 2. Prerequisites

- Node.js 20.9 or newer (Node.js 22 recommended).
- npm 10 or newer.
- MongoDB Atlas account or MongoDB 7.
- Google Gemini API key.
- GitHub account.
- Render account.
- Vercel account.

## 3. Repository Setup

Clone the repository:

```bash
git clone https://github.com/prerana1621/visitflow.git
cd visitflow
```

Install dependencies from the repository root:

```bash
npm install
```

The repository uses npm workspaces:

- `client`: Next.js frontend.
- `server`: Express backend.

## 4. Environment Configuration

### 4.1 Backend Environment

Copy the server example file.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
```

**macOS / Linux:**

```bash
cp server/.env.example server/.env
```

Configure the following variables in `server/.env`:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Application environment. Use `development` locally and `production` on Render. |
| `PORT` | Express port. Render supplies the production port automatically. |
| `MONGODB_URI` | MongoDB Atlas connection string. |
| `JWT_SECRET` | Random secret of at least 32 characters. |
| `JWT_EXPIRES_IN` | JWT session lifetime. |
| `GEMINI_API_KEY` | Server-side Gemini API key. |
| `GEMINI_MODEL` | Gemini model identifier. |
| `OTP_DEV_CODE` | Fixed OTP for the synthetic reviewer demo. |
| `ALLOW_DEMO_OTP` | Controls demo OTP authentication. |
| `REMINDER_TIMEZONE` | Timezone used by the reminder scheduler. |
| `CLIENT_ORIGIN` | Frontend origin permitted by backend CORS. |

Recommended local configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/visitflow
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=8h
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-lite
OTP_DEV_CODE=246810
ALLOW_DEMO_OTP=false
REMINDER_TIMEZONE=Asia/Kolkata
CLIENT_ORIGIN=http://localhost:3000
```

Generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Do not commit real secrets or environment files to GitHub.

### 4.2 Frontend Environment

Copy the client example file.

**Windows PowerShell:**

```powershell
Copy-Item client/.env.example client/.env.local
```

**macOS / Linux:**

```bash
cp client/.env.example client/.env.local
```

Configure:

```env
API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=VisitFlow
```

`API_BASE_URL` is used by `client/next.config.mjs` to configure the `/api/*` rewrite.

## 5. Database Configuration

VisitFlow uses MongoDB Atlas with Mongoose.

The configured database name is:

```text
visitflow
```

Set the complete Atlas connection string in the backend's `MONGODB_URI` environment variable.

The connection string must remain private. Do not place it in the frontend environment or commit it to the repository.

### Network access

MongoDB Atlas requires network access for the backend host.

During the current demonstration deployment, the Atlas IP access list uses:

```text
0.0.0.0/0
```

This permits connection attempts from any IP address, although database authentication is still required.

This is a broad network-access rule and is not recommended for production. Before production use, restrict access to trusted Render outbound IP ranges or use an appropriate private networking configuration. Retain local development access only where necessary.

Use a database user with the minimum privileges required by the application.

## 6. Seed the Demo Database

The repeatable seed command is:

```bash
npm run seed
```

It creates or updates:

- Demo buyer, sales and admin users.
- Two sample projects.
- Synthetic sample leads.
- Conversation history.
- Historical visit records.
- Future visit slots.

The script uses synthetic sample contact details and does not send real messages.

**Important:** The seed script modifies seeded records. Run it only against a database intended for the demonstration. Do not run it against an existing production customer database.

## 7. Local Execution

Start both applications from the repository root:

```bash
npm run dev
```

The local services are:

| Service | Address |
|---|---|
| Next.js frontend | http://localhost:3000 |
| Express backend | http://localhost:5000 |
| API health check | http://localhost:5000/api/health |

The backend health endpoint returns a JSON response containing:

- `status`
- `service`
- `timestamp`

Example:

```json
{
  "status": "ok",
  "service": "visitflow-api",
  "timestamp": "..."
}
```

## 8. Backend Deployment - Render

### 8.1 Service Configuration

The Express backend is deployed as a Render Web Service.

| Setting | Value |
|---|---|
| Repository | `prerana1621/visitflow` |
| Branch | `main` |
| Runtime | Node |
| Root Directory | Repository root |
| Build Command | `npm install` |
| Start Command | `npm run start --workspace=@visitflow/server` |
| Health Check Path | `/api/health` |

The backend listens on the port supplied by Render, falling back to port 5000 for local execution.

### 8.2 Render Environment Variables

Configure the following variables in the Render service's Environment section:

| Key | Value / Configuration |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Complete MongoDB Atlas connection string |
| `JWT_SECRET` | Newly generated, unique secret |
| `JWT_EXPIRES_IN` | `8h` |
| `GEMINI_API_KEY` | Valid Gemini API key |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |
| `OTP_DEV_CODE` | `246810` |
| `ALLOW_DEMO_OTP` | `true` for the isolated synthetic reviewer demo only |
| `REMINDER_TIMEZONE` | `Asia/Kolkata` |
| `CLIENT_ORIGIN` | `https://visitflow-nu.vercel.app` |

Do not add MongoDB credentials, Gemini keys or JWT secrets to the Vercel project.

Render provides the `PORT` environment variable automatically.

### 8.3 Health Verification

The deployed API health endpoint is:

https://visitflow-api.onrender.com/api/health

The endpoint was checked after deployment and returned the expected healthy service response.

## 9. Frontend Deployment - Vercel

### 9.1 Project Configuration

The Next.js frontend is deployed through Vercel using the GitHub repository.

| Setting | Value |
|---|---|
| Repository | `prerana1621/visitflow` |
| Branch | `main` |
| Framework | Next.js |
| Root Directory | `client` |
| Build Command | `next build` |
| Output Directory | Default Next.js output |

The repository uses npm workspaces and a root-level package lockfile. Vercel must be configured to include the required workspace files outside the client directory when using the `client` root.

### 9.2 Vercel Environment Variables

Add the following variables in Vercel:

| Key | Value |
|---|---|
| `API_BASE_URL` | `https://visitflow-api.onrender.com` |
| `NEXT_PUBLIC_APP_NAME` | `VisitFlow` |

Do not append `/api` to `API_BASE_URL`. The Next.js rewrite adds the API path automatically.

The deployed frontend URL is:

https://visitflow-nu.vercel.app

After changing environment variables in Vercel, trigger a new deployment so the build uses the updated values.

### 9.3 Frontend and Backend Connection

The Next.js configuration uses:

```javascript
const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';
```

It rewrites:

```text
/api/:path*
```

to:

```text
${API_BASE_URL}/api/:path*
```

The Render backend uses `CLIENT_ORIGIN` to permit the deployed frontend origin through CORS.

The frontend and backend should use HTTPS in the hosted environment.

## 10. Demo Authentication

The application uses synthetic demonstration accounts.

### Buyer

| Field | Value |
|---|---|
| Phone | `0000000001` |
| OTP | `246810` |

### Sales Executive

| Field | Value |
|---|---|
| Email | `sales@visitflow.demo` |
| Password | `Demo@123!` |

### Admin

| Field | Value |
|---|---|
| Email | `admin@visitflow.demo` |
| Password | `Demo@123!` |

The production demo OTP restriction permits the fixed demo code only for the synthetic reviewer buyer phone number:

```text
+910000000001
```

Other phone numbers are rejected when production demo OTP mode is enabled.

The demo OTP is intentionally simulated. No SMS provider is connected, and the demo code is not suitable for real customer authentication.

The sales and admin credentials are also shared synthetic demonstration credentials. They must not be reused in a real deployment or used to protect real customer information.

### Production authentication requirement

Before accepting real buyers:

- Integrate a verified OTP provider.
- Disable demo OTP mode using `ALLOW_DEMO_OTP=false`.
- Configure OTP expiry, attempt limits and abuse protection.
- Remove fixed demo-code disclosure.
- Verify buyer phone ownership.

With demo OTP disabled, the current OTP request endpoint deliberately returns HTTP 503 until a verified OTP provider is integrated.

## 11. Application Verification

The following local verification was completed before deployment.

### 11.1 Backend Automated Tests

Command:

```bash
npm test
```

Result:

```text
Test Files  4 passed (4)
Tests       13 passed (13)
```

### 11.2 Dependency Security Audit

Command:

```bash
npm audit
```

Result:

```text
found 0 vulnerabilities
```

### 11.3 Smoke Tests

Command:

```bash
npm run smoke
```

Result:

```text
VisitFlow dependency-free smoke checks passed (16 assertions).
```

### 11.4 Frontend Production Build

Command:

```bash
npm run build
```

Result:

- Next.js compilation successful.
- TypeScript checks successful.
- Page-data collection successful.
- Static page generation successful.
- Nine application routes generated.

### 11.5 Manual Functional Checks

The following workflows were manually verified during local testing:

- Buyer OTP login.
- AI-powered buyer conversation.
- Requirement extraction and human handoff behaviour.
- Site-visit booking.
- Concurrent booking protection.
- Buyer ownership validation.
- Booking cancellation.
- Slot capacity release after cancellation.
- Reminder idempotency.
- Reminder suppression for opted-out buyers.

The deployed backend health endpoint was also checked.

## 12. Operational Limitations

### 12.1 Reminder Scheduling

The reminder worker uses `node-cron` and runs inside the Express backend process.

This is appropriate for a single-instance demonstration deployment.

If the Render instance sleeps or becomes unavailable, scheduled reminders may be delayed or missed. A free hosting instance that sleeps after inactivity should not be treated as a reliable reminder-processing service.

A production deployment should use:

- An always-on worker or managed scheduler.
- A durable queue/outbox.
- Distributed locking.
- Retry and failure handling.
- Delivery callbacks and monitoring.

### 12.2 Communication Providers

WhatsApp and SMS delivery are simulated.

No real WhatsApp Business, SMS or external messaging provider is integrated.

### 12.3 Property Information

Project details are limited to the information supplied in the assignment brief.

Unverified amenities, addresses, RERA registration numbers, possession dates and exact unit quotations are not invented.

### 12.4 Booking Consistency

Booking capacity is protected through atomic slot updates and unique indexes, with compensating rollback when subsequent operations fail.

A multi-document MongoDB transaction or durable reservation-hold workflow may be considered for a larger production system.

## 13. Production Readiness Improvements

Before using VisitFlow with real customers, the following improvements are recommended:

1. Integrate a verified OTP provider and remove fixed demo authentication.
2. Integrate approved WhatsApp/SMS templates and delivery callbacks.
3. Verify project addresses, RERA registration information and property details.
4. Add distributed reminder scheduling and failure recovery.
5. Add audit logs for sensitive administrative and lead-management actions.
6. Implement retention, deletion and consent-evidence workflows.
7. Add application monitoring, alerting, backups and incident response.
8. Complete the applicable privacy and regulatory compliance reviews.
9. Review database network access and restrict it to trusted services.
10. Replace shared synthetic demo credentials before any real customer deployment.

## 14. Current Deployment Status

The VisitFlow source repository is published on GitHub, and both the frontend and backend have been deployed.

| Component | Current status |
|---|---|
| GitHub source repository | Published |
| Render backend | Deployed |
| Backend health endpoint | Verified |
| Vercel frontend | Deployed |
| MongoDB Atlas connection | Configured |
| Gemini integration | Configured |
| Backend automated tests | 13/13 passed locally |
| Security audit | 0 reported vulnerabilities |
| Smoke tests | 16/16 assertions passed |
| Frontend production build | Successful |

### Final Links

- GitHub: https://github.com/prerana1621/visitflow
- Frontend: https://visitflow-nu.vercel.app
- Backend: https://visitflow-api.onrender.com
- Health Check: https://visitflow-api.onrender.com/api/health

---

**VisitFlow - AI Lead Response & Site-Visit Booking Assistant**

Technical demonstration developed for the selected real-estate developer assignment brief.