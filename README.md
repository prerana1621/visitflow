# VisitFlow

VisitFlow is a focused real-estate lead-response and site-visit booking demo for the supplied Ahmedabad client brief.

## Product slice

- Buyer OTP demo sign-in, consent capture and project selection.
- Lead creation with Indian phone normalisation, project-scoped duplicate reuse and source tags.
- Gemini-backed, fact-sheet-grounded chat with structured requirement extraction and a server-side available-slot lookup action.
- Unknown-fact fallback and human handoff; the model cannot create a booking or send an external message.
- Capacity-aware atomic slot reservation, unique booking protection and concurrent-booking tests.
- Simulated 24-hour and 2-hour reminders with opt-out suppression and delivery logs.
- Sales inbox, lead detail, assignment, source analytics and admin fact-sheet / slot management.

## Quick start

See [`deployment.md`](./deployment.md) for the complete setup and demo credentials.

1. Start MongoDB with `docker compose up -d mongodb`.
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`.
3. Set a unique `JWT_SECRET` (at least 32 characters) in `server/.env`. Set `GEMINI_API_KEY` for live AI; without it, the assistant safely creates a human handoff instead of pretending AI is available.
4. Run `npm install` from the repository root.
5. Run `npm run seed` to load the demo records.
6. Run `npm run dev` and open `http://localhost:3000`.

## Verification

- `npm run smoke` runs dependency-free phone and AI-safety checks.
- `npm test` runs the server Vitest suite (including booking concurrency and reminder tests).
- `npm run build` builds the Next.js client.

## Demo boundaries

This repository uses synthetic sample contact values and simulated OTP / WhatsApp / SMS delivery. It does not connect to WhatsApp Business, property portals, telephony or a production calendar. The project fact sheet contains only details supplied by the brief. Missing RERA numbers, addresses, amenities and exact unit prices are not invented. Promotional messaging must remain disabled until a verified registration number and approved templates are configured.

The assignment TDD PDF and deployment guide are the two files in the submission ZIP. The full source project is separately packaged with its local Git history for publication to a public GitHub repository.
