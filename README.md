# IntervueAI 🎙️🤖

An AI-powered recruitment interview platform for engineering managers and hiring teams to configure technical interviews, generate unique time-limited invitation links, and automate first-round candidate screenings with structured evaluation reporting.

---

## 🏛️ Platform Architecture

The platform separates the user experience into two distinct environments:

### 1. Recruiter Dashboard (`/dashboard`, `/config`, `/`)
- **Pipeline Analytics**: Real-time KPI counters tracking total interviews created, active links, pending sessions, completed reports, and expired links.
- **Create Interview Form (`/config`)**:
  - **A. Job Details**: Job title, description, required technical skill tags, required experience, and seniority level.
  - **B. Interview Configuration**: Focus type (Technical, HR, Behavioural, Mixed), difficulty (Beginner, Intermediate, Advanced), question count (supports up to 10+ questions), expected duration, and interview language.
  - **C. Link Configuration**: Time-limited expiration window (24 hours / 48 hours / 7 days).
- **Link Management**: Generates secure unique tokens (`inv-...`), full invitation URLs (`http://localhost:3000/interview/[token]`), 1-click clipboard copy, and link revocation controls.
- **Confidential Recruiter Reports**: Displays candidate name, email, job role, interview date, duration, status, and comprehensive evaluation notes (technical competency rating, communication clarity, strengths, areas to probe in live round, and hiring recommendation).

### 2. Candidate Interview Interface (`/interview/[token]`)
- **Token Validation**: Automatically verifies token validity, expiration, revocation, and prior completion before access.
- **Introduction & Zero-Friction Onboarding**: Displays role context and instructions, collects candidate full name and email (no candidate registration, account creation, or login required).
- **Simulated AI Interviewer**: Displays tailored questions sequentially with category tags and response guidelines.
- **Distraction-Free Answer Studio**: Comfortable response textarea with live word & character counters and elapsed timer.
- **Receipt Submission**: Candidates receive confirmation of successful submission without exposing confidential recruiter evaluations.

---

## 🧭 Navigation Structure

- **Overview** (`/`)
- **Interviews** (`/dashboard?tab=interviews`)
- **Create Interview** (`/config`)
- **Candidates** (`/dashboard?tab=candidates`)
- **Reports** (`/dashboard?tab=reports`)
- **Settings** (`/dashboard?tab=settings`)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Storage**: Client-side storage layer (`localStorage` with pre-seeded data for Day 1 prototyping, structured for Day 2 Supabase PostgreSQL migration)

---

## 🏁 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm run start
```
