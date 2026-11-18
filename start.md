# IntervueAI - Project Running Guide (`start.md`)

Welcome to **IntervueAI**, an AI-powered technical recruitment and voice interview screening platform built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Google Gemini 3.8 Flash, and Supabase PostgreSQL.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:

| Dependency | Minimum Version | Verified Version | Notes |
|:---|:---|:---|:---|
| **Node.js** | `>= 20.0.0` | `v24.8.0` | Required for native Web Streams and Web Crypto |
| **npm** | `>= 10.0.0` | `11.2.0` | Standard package manager |
| **Chromium Browser** | Chrome 120+ / Edge 120+ | Chrome 130+ | Required for Web Speech API (SpeechRecognition & SpeechSynthesis) |
| **Microphone** | Standard Audio Device | Any functional mic | Required for candidate voice assessment testing |

---

## 2. Environment Configuration (`.env.local`)

Verify or create `.env.local` in the project root directory (`D:\projects\IntervueAI\.env.local`):

```ini
# ==============================================================================
# Supabase Configuration
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://tzmiipvvdavfkifwprhk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_publishable_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_publishable_key

SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key
SUPABASE_SECRET_KEY=your_supabase_service_role_secret_key

# ==============================================================================
# Google Gemini AI SDK
# ==============================================================================
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-3.8-flash

# Optional: Recruiter Admin Approvals
ADMIN_APPROVE_SECRET=intervue-admin-secret-2026
```

---

## 3. Project Running Commands

### 3.1. Install Dependencies
```bash
npm install
```

### 3.2. Run Local Development Server
Starts the Next.js Turbopack development server on `http://localhost:3000`:
```bash
npm run dev
```

### 3.3. Build for Production
Compiles TypeScript, performs type validation, and builds optimized static and dynamic server routes:
```bash
npm run build
```

### 3.4. Start Production Server
Runs the compiled Next.js production build locally on port 3000:
```bash
npm start
```

### 3.5. Lint Codebase
Runs ESLint across all TypeScript source files:
```bash
npm run lint
```

---

## 4. Test Suite Execution Commands

The project includes full end-to-end automated QA, integration, security, and unit tests:

| Command | Suite Description |
|:---|:---|
| `npm test` | **Runs all 8 test suites** (Invitation lifecycle, Supabase backend, Recruiter auth, Security hardening, Phase 8 remediation, Phase 10 product features, Gemini AI mock, and Voice engine) |
| `npm run test:demo` | **Full End-to-End Demo Journey** (Demo account login, session check, AI plan, assessment creation, candidate portal, voice evaluation, report review) |
| `npm run test:auth` | Recruiter authentication, role guards, admin approval & session management |
| `npm run test:supabase` | Supabase schema migrations, token hashing (SHA-256), RLS policies |
| `npm run test:invitation` | Interview invitation link generation, token entropy, expiry, candidate progression |
| `npm run test:security` | Security hardening, payload size validation, anti-tampering, rate-limiting |
| `npm run test:phase8` | AI evaluation error shielding, candidate confidentiality, evaluation retries |
| `npm run test:phase10` | Recruiter token regeneration, revocation, deletion & multi-tenant isolation |
| `npm run test:voice` | Voice engine, Web Speech API (STT/TTS), silence detection & state machine |
| `npm run test:gemini-mock` | Gemini structured interview planning, adaptive turn handling, evaluation mock |
| `npm run test:gemini-live` | Live connection test to Google Gemini API |
| `npm run test:smoke` | Fast HTTP smoke test for critical API route responses |

---

## 5. Browser CLI Automation (`browser-use`)

You can test and inspect any feature of the website directly via the browser CLI:

1. **Launch Chrome with Remote Debugging:**
   ```powershell
   Start-Process "chrome.exe" -ArgumentList @("--remote-debugging-port=9222", "--user-data-dir=$env:TEMP\chrome_dev_user", "--no-first-run", "--no-default-browser-check", "--headless=new", "about:blank")
   ```

2. **Run Browser CLI Commands:**
   ```powershell
   $env:BU_CDP_URL="http://127.0.0.1:9222"
   @"
   new_tab('http://localhost:3000')
   print(page_info())
   "@ | browser-use
   ```

---

## 6. Key Application Portals & URLs

| Portal / Feature | URL Route | Description |
|:---|:---|:---|
| **Landing Page** | `http://localhost:3000/` | Public homepage with product overview and quick CTAs |
| **Recruiter Login** | `http://localhost:3000/login` | Recruiter email/password sign-in |
| **Recruiter Sign Up** | `http://localhost:3000/signup` | Recruiter access request with admin approval workflow |
| **Password Reset** | `http://localhost:3000/forgot-password` | Password recovery workflow |
| **Recruiter Dashboard** | `http://localhost:3000/dashboard` | Main metrics overview, pipeline activity & navigation |
| **Interviews Directory** | `http://localhost:3000/dashboard?tab=interviews` | All interview links, copy link, token regeneration, revoke, delete |
| **Create Interview** | `http://localhost:3000/config` | Gemini AI interview generation & unique link creation |
| **Candidate Directory** | `http://localhost:3000/dashboard?tab=candidates` | Candidate profiles, submission status, and test details |
| **Evaluation Reports** | `http://localhost:3000/dashboard?tab=reports` | Confidential AI candidate scoring with 6-competency breakdown |
| **Recruiter Settings** | `http://localhost:3000/dashboard?tab=settings` | Workspace, company details, and AI model configurations |
| **Candidate Portal** | `http://localhost:3000/interview/[token]` | Interactive voice-only assessment room with real-time speech AI |

---

## 7. Demo Account Credentials

Use the following provisioned and pre-approved credentials to log in and test:

| Field | Value |
|:---|:---|
| **Portal URL** | [http://localhost:3000/login](http://localhost:3000/login) |
| **Email** | `demo@intervue.ai` |
| **Password** | `DemoUser2026!` |
| **Role** | Recruiter |
| **Status** | Approved (`is_approved: true`) |

> [!TIP]
> You can also run `npm run test:demo` at any time to verify the full demo account journey through automated E2E tests.
