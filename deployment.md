# VisitFlow - local setup and deployment

## Prerequisites

- Node.js 20.9 or newer (Node.js 22 is recommended).
- npm 10 or newer.
- Docker Desktop, or a MongoDB 7 instance / MongoDB Atlas database.
- A Gemini API key for live AI chat. The application fails safely to a human-handoff message when the key is absent; it does not pretend the LLM is running.

## 1. Publish the prepared source repository

The source is prepared as a local Git repository with its development commits preserved. Create an **empty public repository** on GitHub named `visitflow` (do not initialise it with a README, licence or `.gitignore`), then run this from the project folder:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/visitflow.git
git push -u origin main
```

Replace `<YOUR_GITHUB_USERNAME>` with your GitHub username. After pushing, replace the repository placeholder in this guide and in the TDD with the real public URL. Keep the repository public through the review period.

The root package uses npm workspaces for `client` and `server`.

## 2. Start MongoDB

For a local Docker database:

```bash
docker compose up -d mongodb
```

This starts MongoDB at `mongodb://127.0.0.1:27017/visitflow`.

## 3. Configure environment variables

Copy the example files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

Set the server values in `server/.env`:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` locally; `production` on the hosted API |
| `PORT` | Express port; defaults to `5000` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Random secret of at least 32 characters; generate a unique value |
| `JWT_EXPIRES_IN` | Session lifetime; defaults to `8h` |
| `GEMINI_API_KEY` | Gemini API key; keep this server-side only |
| `GEMINI_MODEL` | Gemini model identifier; default `gemini-3.8-flash` |
| `OTP_DEV_CODE` | Fixed OTP used only by the synthetic demo |
| `ALLOW_DEMO_OTP` | Must remain `false` by default; set `true` only for an isolated, synthetic-data reviewer deployment |
| `REMINDER_TIMEZONE` | Reminder scheduler timezone; default `Asia/Kolkata` |
| `CLIENT_ORIGIN` | Frontend origin permitted by backend CORS |

Set the client values in `client/.env.local`:

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Express API base URL used by the Next.js rewrite; local value is `http://localhost:5000` |
| `NEXT_PUBLIC_APP_NAME` | Display name; defaults to `VisitFlow` |

Never commit `.env`, `.env.local`, API keys, JWT secrets, database credentials or real buyer data.

## 4. Seed the demo database

Run from the repository root:

```bash
npm run seed
```

The seed script is repeatable and creates the two sample projects, the three sample leads from the brief, conversation history, two historical visit records, future bookable slots and demo users. It does not send messages to real numbers.

The sample phone values are synthetic placeholders and must never be used for real calls or messaging.

## 5. Run locally

In one terminal, from the repository root:

```bash
npm run dev
```

Open `http://localhost:3000`. The Next.js app proxies `/api/*` to the Express service on port `5000`.

Useful checks:

```bash
curl http://localhost:5000/api/health
npm test
npm run build
```

## 6. Demo sign-in

**Buyer (mock OTP)**

- Mobile: `0000000001`
- Demo OTP: `246810`
- Sign-in flow: choose **I'm exploring**, request the demo OTP, then verify it.

**Sales executive**

- Email: `sales@visitflow.demo`
- Password: `Demo@123!`

**Sales head / admin**

- Email: `admin@visitflow.demo`
- Password: `Demo@123!`

The buyer number and all seeded contact details are deliberately synthetic. OTP generation is simulated and no SMS is sent. A production deployment must integrate a verified OTP provider before accepting real buyer data. For an isolated reviewer environment only, `ALLOW_DEMO_OTP=true` allows the demo code to be used while `NODE_ENV=production`; do not enable this setting for a real customer deployment.

## 7. Main demo walkthrough

1. Sign in as the buyer and start a new enquiry. Tick the consent checkbox.
2. Ask a question using one of the three supported languages.
3. Ask to arrange a site visit. With a Gemini API key configured, the model returns a structured action and the backend checks the live free-slot collection. Without a key, the assistant explicitly hands the enquiry to a person.
4. Choose a displayed slot. The API checks capacity again and atomically reserves the slot; refreshing stale availability cannot create a double booking.
5. Sign in as the sales executive. Review the lead, the stored conversation and the AI summary; change status or reassign it.
6. Sign in as the admin to edit the fact sheet or create more visit slots.
7. Check the sales dashboard for source and visit metrics. Cost per visit remains unavailable until source-wise ad spend is configured.

## 8. Production deployment outline

### Database

Create a MongoDB Atlas database and configure network access for the backend host. Use a least-privilege database user and a TLS connection string in `MONGODB_URI`.

### Backend

Deploy `server` as a persistent Node.js web service (for example, Render or an equivalent host). Use:

- Build/install command: `npm install`
- Start command: `npm run start --workspace=@visitflow/server`
- Root directory: repository root
- Environment variables: all server variables listed above

The reminder scheduler runs inside the API process. Keep at least one API instance running continuously; scale-out deployments need a distributed scheduler/lock so multiple instances do not process the same reminders. Current reminder writes have a unique `(visit, type)` index to prevent duplicate log creation.

### Frontend

Deploy `client` to Vercel or another Next.js host. Set the project root to `client` only if the platform is configured to install from the monorepo root; otherwise use the root workspace and the Next.js build command. Set `API_BASE_URL` to the deployed Express API URL at build time so the Next.js rewrite can proxy `/api/*` on the same origin. Confirm cookies are forwarded through the rewrite and use HTTPS.

### Production gates before real users

- Integrate OTP delivery and abuse controls; do not use the fixed demo OTP.
- Integrate approved WhatsApp/SMS templates and provider delivery callbacks; current messages are simulated only.
- Add verified RERA registration numbers and verified project addresses before enabling promotional content or map pins.
- Complete a DPDP review, retention/deletion policy, consent evidence, processor contracts and incident-response procedures.
- Add audit history for fact-sheet changes, role changes and lead access; current access control is role-based but not a full compliance audit log.
- Add a distributed scheduler/lock for multiple backend instances, and monitoring for failed reminders and AI-provider errors.
- Have the sales head review AI responses and false handoff flags. AI summaries are assistive, not authoritative.

## 9. Current deployment status

The project source and local Git history are prepared. Publication and hosting are not complete yet: push the repository using Section 1, then replace `<PUBLIC_GITHUB_REPOSITORY_URL>` in this file and the TDD with the real public URL. Deploy the frontend and API using Section 8 and add the live URL after verifying the deployed demo. Do not represent a local URL as a public demo link.
