# IntervueAI 🎙️🤖

An intelligent web application for practicing and mastering tech interviews with simulated AI interviewing, role customization, real-time response evaluation, and comprehensive scorecard analytics.

---

## 🚀 Day 1 Deliverables (Completed)

- [x] **Next.js & Modern TypeScript Foundation**: Built on Next.js 16 (App Router), React 19, and Tailwind CSS v4.
- [x] **Light-Themed Modern Landing Page (`/`)**:
  - Crisp, modern SaaS hero section with clear value propositions.
  - Interactive interview track previews (Frontend, Backend, System Architect, Behavioral).
  - 3-step walkthrough illustrating the interview workflow.
  - Quick action links into configuration and dashboard.
- [x] **Interactive Configuration Page (`/config`) with Full Form Validation**:
  - Candidate name validation (required, minimum length).
  - Target role selection (Frontend, Backend, Full Stack, System Architect, DevOps, AI/ML, EM, or Custom).
  - Seniority level (Junior, Mid, Senior, Lead).
  - Focus format (Technical, System Design, Behavioral, Mixed).
  - Difficulty selection (Standard, Challenging, Rigorous).
  - Dynamic skill tag chips with custom tag addition & removal (at least 1 required).
  - Question count selector (3, 5, or 7 questions).
  - 1-click test presets for instant auto-fill and testing.
- [x] **Mock AI Interview Stage (`/interview`)**:
  - AI Interviewer persona with contextual greetings and response acknowledgment.
  - Live elapsed timer and session progression tracker.
  - Expandable hints system for each question to guide response structure.
  - Comfortable candidate response studio with live word and character counters.
  - Input validation requiring meaningful answers before submission.
  - Instant scorecard generation and celebratory effects upon interview completion.
  - Full Q&A transcript review drawer.
- [x] **Candidate Analytics Dashboard (`/dashboard`)**:
  - High-level KPIs: Total interviews completed, average score, practice time logged, and top focus role.
  - Historical interview list with role badges, difficulty levels, and scores.
  - Detailed modal inspection showing questions, candidate answers, and evaluator feedback.
  - Record deletion and quick launcher for new practice sessions.
- [x] **Global Working Navigation**:
  - Unified responsive navbar with active link indicator, resume-session pill, and mobile drawer.
  - Cohesive footer with status badges.
- [x] **Local Execution & Production Build Verification**:
  - Fully verified with `npm run build` (0 TypeScript / ESLint errors).
  - Tested local execution via Next.js server on port 3000.

---

## 🔮 Coming Tomorrow (Day 2 Roadmap)

- **Google Gemini 2.0 / Flash Integration**: Live API streaming for dynamic LLM-generated questions and personalized critique.
- **Voice Mode**: Speech-to-text (Web Speech API) and audio playback for realistic conversational interviews.
- **Adaptive Questioning**: Follow-up questions dynamically tailored to the candidate's previous responses.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Confetti**: Canvas Confetti
- **State & Storage**: Client-side localStorage persistence with seed defaults

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
