# VisitFlow

**AI-Powered Real Estate Lead Response & Site-Visit Booking Assistant**

VisitFlow is a web application designed for a residential real-estate developer. It helps prospective buyers explore projects, communicate with an AI assistant, submit enquiries and book site visits. Sales executives can manage leads, review conversations and follow up with buyers through a centralised workspace.

The application was developed for **Problem 2: Real Estate Developer AI Lead-Response and Site-Visit Booking Assistant**.

## Live Application

| Component | URL |
|---|---|
| Frontend Application | https://visitflow-nu.vercel.app |
| Backend API | https://visitflow-api.onrender.com |
| API Health Check | https://visitflow-api.onrender.com/api/health |
| GitHub Repository | https://github.com/prerana1621/visitflow |

## Features

### Buyer Experience
- Demo OTP-based buyer authentication.
- Consent-based enquiry creation.
- Project selection and requirement collection.
- AI-powered conversations using Google Gemini.
- Support for English, Hindi and Gujarati.
- Structured extraction of property requirements.
- Human handoff when information is unavailable or requires verification.
- Live site-visit slot discovery.
- Site-visit booking and confirmation.
- Booking cancellation.

### AI Assistant
- Gemini-powered structured responses.
- Responses grounded in the approved project fact sheet.
- Requirement extraction, including configuration, budget and purchase timeline.
- Server-side validation of AI-generated responses.
- Availability lookup through an application-controlled action.
- Safe fallback when the AI provider is unavailable or a fact cannot be verified.
- Human escalation for uncertain or unsupported information.

### Sales Workspace
- Centralised lead inbox.
- Lead filtering and status management.
- Buyer information and conversation history.
- AI-generated lead summaries.
- Sales executive assignment and reassignment.
- Follow-up ownership and handoff management.

### Admin and Analytics
- Project fact-sheet management.
- Site-visit slot creation and deactivation.
- Lead-source analytics.
- Booking and visit metrics.
- Response-time indicators.

### Booking and Automation
- Capacity-aware slot reservation.
- Atomic booking-count updates.
- Duplicate booking protection.
- Concurrent-booking prevention.
- Booking cancellation and slot release.
- Simulated 24-hour and 2-hour reminders.
- Reminder idempotency and opt-out suppression.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19 |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| AI | Google Gemini API |
| Authentication | JWT, HTTP-only cookies, bcrypt |
| Validation | Zod, Mongoose |
| Testing | Vitest, Supertest, MongoDB Memory Server |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Version Control | Git, GitHub |

## System Architecture

```text
             BUYER / SALES / ADMIN
                       |
                       | HTTPS
                       v
              VERCEL - NEXT.JS
                 Frontend
                       |
                 /api rewrite
                       |
                       v
              RENDER - EXPRESS
                   Backend
                       |
          +------------+-------------+
          |            |             |
          v            v             v
       AUTH         LEADS        BOOKINGS
          |            |             |
          +------------+-------------+
                       |
                       v
                 MONGODB ATLAS
                       |
          +------------+-------------+
          |                          |
          v                          v
     GEMINI API                REMINDER WORKER
    AI responses               node-cron
    and extraction             Simulated logs
```

## Repository Structure

```text
visitflow/
|
|-- client/
|   |-- src/
|   |-- public/
|   |-- next.config.mjs
|   |-- package.json
|   |-- .env.example
|
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- seed/
|   |   |-- utils/
|   |   |-- server.js
|   |
|   |-- tests/
|   |-- package.json
|   |-- .env.example
|
|-- docs/
|   |-- Technical_Design_Document.docx
|
|-- docker-compose.yml
|-- deployment.md
|-- package.json
|-- package-lock.json
|-- README.md
```

## Local Setup

### Prerequisites

- Node.js 20.9 or newer (Node.js 22 recommended).
- npm 10 or newer.
- MongoDB 7 or MongoDB Atlas.
- Google Gemini API key for live AI responses.

### 1. Clone the repository

```bash
git clone https://github.com/prerana1621/visitflow.git
cd visitflow
```

### 2. Install dependencies

Run from the project root:

```bash
npm install
```

### 3. Configure environment variables

Copy the example files.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

**macOS / Linux:**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Configure the server environment variables in `server/.env`:

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

Configure `client/.env.local`:

```env
API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=VisitFlow
```

Never commit actual environment files, API keys, database credentials or JWT secrets.

### 4. Start MongoDB

Using Docker:

```bash
docker compose up -d mongodb
```

Alternatively, use an existing MongoDB Atlas connection string.

### 5. Seed demo data

Run from the repository root:

```bash
npm run seed
```

The seed script creates the synthetic demo users, sample projects, leads, conversation records and visit slots.

Run this only against a database intended for the demo. It updates seeded records.

### 6. Start the application

Run:

```bash
npm run dev
```

Open:

http://localhost:3000

The Next.js application proxies API requests to the Express backend running on port 5000.

## Demo Credentials

These credentials are intended exclusively for synthetic demonstration data.

### Buyer

| Field | Value |
|---|---|
| Phone | `0000000001` |
| Demo OTP | `246810` |

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

The OTP, SMS and WhatsApp delivery mechanisms are simulated. No real SMS or WhatsApp messages are sent.

These credentials must not be reused for real customer accounts.

## Testing and Verification

The application was locally tested before deployment.

### Backend Automated Tests

```bash
npm test
```

**Result: 13 tests passed across 4 test files.**

Coverage includes:

- Phone-number normalisation.
- AI response safety.
- Booking concurrency.
- Slot capacity validation.
- Consent restrictions.
- Reminder idempotency.
- Opt-out handling.

### Dependency Security Audit

```bash
npm audit
```

**Verified result: 0 reported vulnerabilities.**

### Smoke Tests

```bash
npm run smoke
```

**Result: 16 assertions passed.**

### Frontend Production Build

```bash
npm run build
```

The Next.js production build completed successfully, including TypeScript checks and static page generation.

### Manual Functional Verification

The following workflows were also tested:

- Buyer authentication.
- AI-powered conversations.
- Site-visit booking.
- Double-booking prevention.
- Buyer ownership protection.
- Booking cancellation.
- Slot release after cancellation.
- Reminder processing and opt-out protection.

The deployed backend health endpoint was also checked successfully.

## Demo Boundaries and Limitations

VisitFlow is a deployed demonstration, not a complete production CRM or property-management platform.

- OTP delivery is simulated.
- WhatsApp and SMS reminders are simulated as database logs.
- Project addresses, amenities, RERA information and exact unit prices are not fabricated.
- The Gemini integration requires a valid server-side API key.
- Reminder processing uses a single-process cron scheduler.
- Cost-per-visit cannot be calculated without source-wise advertising expenditure.
- The system uses synthetic buyer contact details.

## Production Improvements

Before accepting real customer data, the application requires:

- A verified OTP provider and authentication abuse controls.
- Approved WhatsApp/SMS templates and delivery callbacks.
- Verified property information and RERA registration details.
- A durable distributed reminder scheduler.
- Audit logging and retention/deletion workflows.
- Monitoring, backups and incident-response procedures.
- Appropriate privacy and regulatory compliance reviews.

See [deployment.md](./deployment.md) for deployment configuration and operational details.

---

**Project:** VisitFlow  
**Repository:** https://github.com/prerana1621/visitflow  
**Live Application:** https://visitflow-nu.vercel.app