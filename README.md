# RL_academy

Richmond Live Academy LMS — a Next.js app for super admins, mentors and students, backed by Firebase Auth and Firestore.

## Features

- **Super admin:** dashboard with academy stats; create/edit/delete courses; create accounts (student, mentor, super admin) and assign them to courses — individually or by pasting emails; suspend accounts, reset passwords; site-wide announcements.
- **Mentors:** dashboard (upcoming sessions, work to grade, recent submissions); per course: sessions with start/end times, scheduled visibility and Zoom/Google Meet links; session resources (slides, documents, videos, links); assignments with deadlines, marks and late-submission rules; submission review and grading with feedback; gradebook with CSV export; course announcements; participant list; attendance report with filters (**demo data** until attendance tracking is built).
- **Students:** dashboard (to-do, upcoming sessions, recent grades); course pages with sessions, resources and join links; submit assignments as Drive/other links; grades and feedback; announcements and an in-app notification bell.
- **Everyone:** profile page (name, phone, bio), password change, sign out / sign out everywhere, WhatsApp contact button.

## Setup

1. In the Firebase console, enable **Authentication → Email/Password** and create a **Firestore** database.
2. Copy `.env.example` to `.env.local` and fill in the web app config and a service account key.
3. `npm run deploy-rules` — publishes `firestore.rules` (denies all direct browser access; the API uses firebase-admin).
4. `npm run seed-courses` — creates the four academy courses (safe to re-run).
5. `npm run create-admin -- you@example.com 'a-strong-password' "Your Name"` — creates or updates a super admin.

## Adding users

- **Users → Add user** for one person, or **Users → Bulk import** to paste/upload a CSV (`name,email,role,courses`, courses as codes like `WEB;VED`). The review step flags invalid rows, duplicates within the list and emails that already have an account; those are skipped, never overwritten.
- **Students sign up themselves** at `/signup` with their email and a password (linked from the sign-in page). They start with no courses — filter **Users** by “No courses yet” and assign them, or add them on a course by email.
- **Mentors sign up with an invite link.** In **Mentor invites**, create a link, pick the courses they'll mentor and send it to them. Each link works once and makes the account a mentor of those courses; revoke unused links from the same page.
- Accounts an admin creates directly (Add user / Bulk import) get a generated temporary password to share privately (bulk import gives a CSV). They must choose their own password on first sign-in.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## How it fits together

- The browser signs in with Firebase Auth and sends its ID token to the Next.js API routes in `app/api/**`.
- Each route verifies the token (with revocation checks, so suspensions apply immediately), loads `users/{uid}`, and checks the role and course membership before reading or writing Firestore.
- Notifications are derived from activity (announcements, new assignments, grades, submissions, sessions starting soon) and compared with each user's `lastSeenNotificationsAt`; the bell polls every minute.
- Collections: `users`, `courses`, `enrollments`, `sessions`, `resources`, `assignments`, `submissions`, `announcements`.

## Layout

- `app/login` — sign-in page
- `app/(portal)` — signed-in area: sidebar layout, dashboard, courses (`/courses/[id]/…` tabs), announcements, notifications, profile, `admin/users`, `admin/announcements`
- `app/api` — route handlers
- `components/` — shell (sidebar, top bar), auth, UI kit, shared forms
- `lib/` — client API, hooks, time helpers, types; `lib/server/` — firebase-admin, auth guards, validation, queries
- `scripts/` — `create-admin`, `seed-courses`, `deploy-rules`
