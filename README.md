# TalentAI - AI-Powered Interview SaaS Platform

TalentAI is a production-ready, multi-tenant AI Interview Platform. It allows companies to create interview templates, schedule candidates, record webcam audio and video answers, evaluate coding/technical answers automatically using AI, parse resumes, detect plagiarism, and manage pipelines inside an ATS Kanban board.

---

## Technical Architecture

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Frontend**: React + TypeScript + Tailwind CSS (Vite development bundle)
- **Database**: SQLite (configured for zero-setup local testing) / PostgreSQL compatible
- **Billing**: Stripe (pre-configured Stripe checkout webhook & local simulation)
- **AI Engine**: Gemini AI (configured with a modular local simulator fallback)

---

## Getting Started

### 1. Prerequisite Installations
Ensure that you have **Node.js** (v18+) installed.

### 2. Running the Backend Server
1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Start the Hot-Reloading server:
   ```bash
   npm run dev
   ```
   *The server runs on **http://localhost:5000**.*

### 3. Running the Frontend App
1. Open a new terminal window and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   *The app runs on **http://localhost:3000**.*

---

## Demo Credentials & Flow Testing
To help you inspect all dashboard graphs, pipelines, and resume parser components instantly, the database has been seeded with mock accounts.

### Recruiter & Workspace Portal
- **Dashboard Link**: http://localhost:3000/
- **Sign In Credentials**:
  - **Company Admin**: `admin@talentai.com` / Password: `password123`
  - **HR Recruiter**: `recruiter@talentai.com` / Password: `password123`
  *Alternatively, utilize the **"Fast Demo Access"** buttons on the Sign In page to bypass credentials input!*

### Candidate Assessment Flow (Plagiarism & Recording Sandbox)
- **Invitation Link**: http://localhost:3000/session/david-beckham-active-token-8888
  *This link represents an active screening invitation sent to David Beckham. It will request camera/mic access, initialize the countdown timer, monitor browser focus limits, and evaluate editor submissions.*

---

## Production Configurations

### Switching database to PostgreSQL
Prisma handles database mapping dynamically. To transition from the development SQLite instance (`dev.db`) to production PostgreSQL:
1. Open `backend/prisma/schema.prisma` and edit the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Open `backend/.env` and update `DATABASE_URL` with your PostgreSQL server connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/talentai_db?schema=public"
   ```
3. Run the migrations to initialize your database structure:
   ```bash
   npx prisma migrate dev
   ```

### Enabling Real AI Evaluations
To replace the mock simulated evaluations with active AI analysis:
1. Open `backend/.env` and insert your Gemini API Key:
   ```env
   GEMINI_API_KEY="your-actual-api-key-here"
   ```
2. The system will automatically detect the key upon boot, instantiate the Gemini SDK, and start routing evaluations and resume summaries through `gemini-2.5-flash`.

### Enabling Stripe Billing
1. Insert your API keys in `backend/.env`:
   ```env
   STRIPE_SECRET_KEY="sk_test_..."
   ```
2. Once the key is configured, the system redirects checkout requests to live Stripe-hosted checkout pages.
