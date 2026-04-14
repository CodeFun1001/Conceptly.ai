# Conceptly.ai 🧠

**Your AI-Powered Mastery Learning Companion**

Conceptly is a full-stack adaptive learning platform that combines large language models, agentic RAG, and lightweight ML/DS algorithms to create a truly personalised study experience. It generates structured learning checkpoints for any topic, quizzes you at each stage, identifies where you struggle, re-teaches through the Feynman Technique, and adapts everything — questions, explanations, difficulty, pacing — to how you actually learn.

---
## ✨ Features

- Checkpoint-based structured learning workflow  
- Autonomous learning agent with guided progression  
- Semantic evaluation of answers (understanding > keywords)  
- Feynman pedagogy for adaptive re-teaching  
- RAG-based context retrieval using user notes (PDF/text)  
- Multi-agent architecture (teaching, evaluation, content, retrieval)  
- Dynamic quiz system with intelligent feedback  
- Weak topic tracking and reinforcement  
- Smart notes generation (summaries, cheat sheets, practice questions)  
- Gamification (XP, levels, streaks, badges)  
- Customizable checkpoints for personalized learning paths  
- Multi-API key handling for reliable AI responses  

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Core Features](#core-features)
  - [Adaptive Learning Workflow](#1-adaptive-learning-workflow)
  - [Agentic RAG System](#2-agentic-rag-system)
  - [Student Clustering — K-Means](#3-student-clustering--k-means)
  - [Performance Prediction — Logistic Regression](#4-performance-prediction--logistic-regression)
  - [Smart Recommendation Engine](#5-smart-recommendation-engine)
  - [Forgetting Curve — Exponential Decay](#6-forgetting-curve--exponential-decay)
  - [Concept Strength Tracker — Bayesian Scoring](#7-concept-strength-tracker--bayesian-scoring)
  - [Feynman Re-teaching](#8-feynman-re-teaching)
  - [Gamification System](#9-gamification-system)
  - [Profile & Personalisation](#10-profile--personalisation)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Most learning apps give everyone the same content. Conceptly does the opposite. It starts by understanding who you are — your profession, grade, learning goal, and tutor preference — then builds a curriculum specific to you. As you learn, four ML/DS systems run in the background, continuously updating a model of your knowledge and deciding what you should study next, how it should be explained, and when you need to revise before you forget.

The result is a platform that feels less like software and more like a personal tutor who remembers everything about you.

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| LLM Provider | Groq (Llama 3.3 70B) via LangChain |
| Workflow Orchestration | LangGraph |
| Vector Store | FAISS (with HuggingFace embeddings) |
| Embeddings | `all-MiniLM-L6-v2` via sentence-transformers |
| Authentication | JWT (access + refresh tokens, argon2 hashing) |
| Tracing | LangSmith |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Markdown Rendering | react-markdown + remark-gfm |
| Styling | CSS Variables (custom design system, light/dark) |
| Icons | Lucide React |

### ML / DS (Pure Python, no sklearn dependency)

| Feature | Algorithm |
|---|---|
| Student Clustering | K-Means (pure Python, k=3) |
| Performance Prediction | Logistic Regression (pure Python) |
| Concept Strength Scoring | Bayesian Estimation + Time Decay |
| Forgetting Curve | Ebbinghaus Exponential Decay |
| Recommendation Engine | Threshold Filtering + Weighted Heuristics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│   Dashboard · Session · CheckpointPlanner · Quiz · Analytics    │
│           Profile · Feynman · Completion · History              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                       FastAPI Backend                           │
│  /auth  /sessions  /checkpoints  /analytics  /gamification      │
│  /insights  (cluster · prediction · recommendations · revision) │
└──────┬────────────┬──────────────┬──────────────┬───────────────┘
       │            │              │              │
┌──────▼──────┐ ┌───▼───────┐ ┌────▼─────┐ ┌──────▼──────────────┐
│  LangGraph  │ │ Agentic   │ │PostgreSQL│ │  ML / DS Services   │
│  Workflow   │ │ RAG       │ │  + ORM   │ │                     │
│             │ │ (FAISS)   │ │          │ │ student_clustering  │
│ gather_ctx  │ │           │ │ Users    │ │ performance_pred    │
│ validate    │ │ notes     │ │ Sessions │ │ recommendation_eng  │
│ explain     │ │ knowledge │ │ Checkpts │ │ forgetting_curve    │
│ gen_qns     │ │ curriculum│ │ WeakTopics│ │ weakness_scorer    │
└──────┬──────┘ └───────────┘ └──────────┘ └─────────────────────┘
       │
┌──────▼──────┐
│  Groq LLM   │
│ Llama 3.3   │
│   70B       │
│  Multi-key  │
│  rotation   │
└─────────────┘
```

### LangGraph Checkpoint Workflow

Every time a checkpoint is loaded, a four-node LangGraph workflow runs:

```
gather_context → validate_context → explain → generate_questions
                      ↑                 │
                      └── (retry if     │
                           score < 85)  │
                                        ▼
                                    END (cached)
```

All four nodes call the Agentic RAG system, which retrieves relevant chunks from three vector stores: the user's uploaded notes, a seed knowledge document generated by the LLM, and a curriculum store built from the session's checkpoints.

---

## Core Features

### 1. Adaptive Learning Workflow

**Files:** `checkpoint_generator.py`, `context_gatherer.py`, `explainer.py`, `question_generator.py`, `workflow.py`

When a user starts a session, Conceptly generates a structured learning path using the LLM, then processes each checkpoint through a LangGraph workflow that:

- Gathers comprehensive educational content tailored to the user's tutor mode and profile
- Validates content quality with a second LLM call (minimum score 85/100)
- Generates a personalised explanation using the Feynman approach
- Creates 4–7 unique MCQ questions, ensuring each tests a different concept and none repeat across attempts

**Question uniqueness** is enforced through MD5 signature hashing and semantic similarity checks (cosine similarity via sentence-transformers). Questions are re-generated with a new random seed on each retry, and previously tested concepts are tracked and excluded.

**Evaluation** uses semantic matching (cosine similarity ≥ 0.95 = correct, ≥ 0.65 = partial credit at 50%), with word-overlap fallback when sentence-transformers are unavailable. Partial credit means a student who almost got it right gets acknowledged and guided, not penalised.

**Checkpoint generation** retries up to 3 times before falling back to a deterministic 4-checkpoint structure built from the topic name, ensuring the system never fails to produce a learning path even for unusual or very specific topics.

---

### 2. Agentic RAG System

**Files:** `rag_service.py`

The RAG system is always active — it does not require the user to upload notes. It maintains three FAISS vector stores per session:

| Store | Content | When built |
|---|---|---|
| `notes` | User-uploaded notes (PDF, TXT, MD) | On upload |
| `knowledge` | LLM-generated reference document (1000–1500 words) | First content request |
| `curriculum` | Structured checkpoint topics/objectives/concepts | After checkpoint generation |

The `ReasoningAgent` class implements a two-iteration retrieval loop:

1. Decomposes the query into 3 sub-queries using the LLM
2. Searches all three stores in parallel across all sub-queries
3. Runs a coverage validator — if objectives are not covered, generates targeted follow-up queries
4. Assembles the final context, prioritising uploaded notes over generated knowledge

When FAISS is unavailable (e.g. no GPU/limited environment), the system falls back to keyword-overlap search with no change to the API surface.

RAG augmentation is injected at every stage: checkpoint generation, context gathering, explanation generation, question generation, Feynman re-teaching, and notes generation.

---

### 3. Student Clustering — K-Means

**File:** `student_clustering.py`

Groups students into three learning type profiles using a lightweight pure-Python K-Means implementation with fixed centroids (no sklearn required).

**Features used:**
- `avg_score` — normalised quiz performance
- `avg_attempts` — inverted (fewer attempts = higher score)
- `streak` — normalised to 30 days
- `weak_ratio` — proportion of concepts below strength threshold

**Clusters:**

| ID | Label | Characteristics | Adaptive Behaviour |
|---|---|---|---|
| 0 | Fast Learner ⚡ | High score, few attempts, consistent | Harder questions, higher Feynman threshold |
| 1 | Rising Star 🌟 | Moderate score, growing | Standard settings |
| 2 | Persistent Hero 💪 | Lower scores, keeps trying | Easier warm-up questions, earlier Feynman |

The cluster is displayed on the Dashboard hero card and the Profile page, with personalised tips. It feeds into the recommendation engine to tune motivational messaging.

---

### 4. Performance Prediction — Logistic Regression

**File:** `performance_predictor.py`

Predicts the probability that a student will find the next checkpoint challenging, using a four-feature logistic regression implemented in pure Python.

**Features:**
```
z = -2.5·avg_recent_score + 2.8·weak_ratio - 1.2·streak_norm + 1.6·attempt_rate + 0.3
risk = sigmoid(z)
```

**Risk bands:**

| Risk | Message Style |
|---|---|
| < 30% | "You're well prepared!" |
| 30–55% | "A quick warm-up will pay off!" |
| > 55% | "A little prep = big wins!" |

Crucially, all messages are positive coaching nudges — never warnings or discouragement. High risk means more preparation is suggested, never "you're probably going to fail." The prediction shows inline on the Session page before the student starts a checkpoint.

---

### 5. Smart Recommendation Engine

**File:** `recommendation_engine.py`

Produces personalised "what to study next" recommendations using concept strength scores.

**Scoring formula per weak concept:**
```
priority = urgency × 0.55 + recency × 0.25 + recent_fail_bump × 0.20
```
Where `urgency = 1 - strength`, `recency = min(days_since / 14, 1)`, and `recent_fail_bump = 0.25` if the concept was tested within 3 days.

**Additional features:**
- Prerequisite hints from a curated static map (e.g. "recursion → base case, call stack, functions")
- Next-topic hint: if weak concepts overlap with the upcoming checkpoint topic, a targeted prep message is shown
- Cluster-aware motivational cards: Fast Learners get "bulletproof your edge cases", Persistent Heroes get "every revisit is one step closer"

---

### 6. Forgetting Curve — Exponential Decay

**File:** `forgetting_curve.py`

Models memory retention using the Ebbinghaus formula, personalised per concept:

```
retention(t) = e^(−t / stability)

stability = MIN_STABILITY + strength × (MAX_STABILITY − MIN_STABILITY) + log(attempts) × 0.8
```

`MIN_STABILITY = 1.5 days`, `MAX_STABILITY = 21 days`. Stronger mastery means slower forgetting. More practice attempts increase stability (spaced-repetition effect).

**Urgency bands:**

| Retention | Label | Colour |
|---|---|---|
| < 40% | Review now! | 🔴 |
| 40–65% | Soon | 🟡 |
| > 65% | Solid | 🟢 |

A "Reviewed ✓" button on the revision queue calls `/insights/revision-review`, which applies a spaced-repetition boost by treating the voluntary review as a correct answer in the Bayesian scorer.

The revision queue appears in the Analytics → AI Insights tab and as an inline banner on the Dashboard and Session pages when urgent concepts are detected.

---

### 7. Concept Strength Tracker — Bayesian Scoring

**File:** `weakness_scorer.py`

Tracks per-concept mastery using Bayesian estimation with time decay.

**Bayesian prior:**
```
strength = (correct + 1) / (total + 2)
```
This avoids both overconfidence (100% from one correct answer) and underconfidence (0% from one wrong answer), giving a smooth probability estimate from the first attempt.

**Time decay:**
```
decayed_strength = strength × (0.95 ^ days_since_last_practice)
```
Minimum strength is clamped at 0.05 so concepts never become completely "forgotten" in the model.

After every quiz submission, `batch_update_from_quiz` updates every tested concept simultaneously. Concepts above 0.75 are flagged as strong, below 0.50 as weak. The Concept Strength Bar in the Quiz results screen shows all updated concepts with colour-coded bars (green/amber/red) and attempt counts.

---

### 8. Feynman Re-teaching

**Files:** `feynman.py`, `Feynman.jsx`

Each checkpoint in Conceptly follows a strict mastery-based progression rule. After attempting a quiz, the system evaluates the score out of 100. If the score is **greater than or equal to 70%**, the checkpoint is marked as passed and the learner progresses to the next stage. If the score is **below 70%**, progression is blocked and the system automatically triggers a Feynman-based re-teaching loop.

When a student fails a checkpoint, they are offered a simplified re-explanation using the Feynman Technique: explain it as simply as possible, identify the gaps, and rebuild understanding from first principles.

Each retry uses a different teaching approach, cycling through:
1. Everyday analogies and real-world examples  
2. Step-by-step breakdown with visual descriptions  
3. Storytelling and narrative explanation  
4. Question-answer format with guided reasoning  
5. Comparison with familiar concepts and metaphors  

The `weakness_scorer` supplies the top 3 weakest concepts for that checkpoint's topic, which are used as the focus of the re-explanation. After reading the Feynman explanation, the student can retry with a new set of questions specifically targeting their weak areas.

This loop continues until the learner achieves mastery, ensuring that progression is based on true understanding rather than completion.

---

### 9. Gamification System

**Files:** `gamification.py`, `BadgePopup.jsx`, `CheckpointStepper.jsx`

**XP System:**
- 2 XP per completed checkpoint
- 20 XP bonus for completing a full session
- Variable XP for daily challenges (10–60 XP)
- Level-up at `level × 100 XP`

**24 Badges** across 9 categories: milestones, performance, streaks, checkpoints, levels, resilience, challenges, efficiency, and XP. Badges are checked after every quiz submission and session completion. New badges appear as animated toast popups with tier colouring (bronze/silver/gold/platinum).

**Daily Challenges** are randomly selected from a pool of 20 tasks, avoiding repetition within the last 7 days. Completing a challenge grants XP and may unlock challenge-specific badges.

**CheckpointStepper** renders a Duolingo-style zigzag learning path with animated connections, XP pop overlays, pulsing active node, and locked/unlocked state management.

**Learning Streaks** are tracked daily and update on profile access, challenge completion, or quiz submission.

---

### 10. Profile & Personalisation

**Files:** `Profile.jsx`, `gamification.py` (`PATCH /gamification/profile`)

Users can configure their full profile, which feeds directly into LLM prompts across the entire system:

| Field | How it's used |
|---|---|
| `profession` | Tutor adjusts examples to the user's field |
| `grade` | Shown for students; adjusts explanation complexity |
| `bio` | Context for personalised curriculum design |
| `learning_goal` | Included in checkpoint generation prompt as `purpose` |
| `tutor_mode` | Controls personality of every LLM call |
| `avatar_emoji` | Displayed across Dashboard and Profile |

The profile's `learning_goal` and `profession` are combined into a `user_context` string that is injected into the checkpoint generation purpose field, so a postgraduate researcher studying quantum mechanics gets a very different learning path than a Grade 10 student studying the same topic.

---

## Project Structure

```
conceptly/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py              # JWT register/login
│   │   │   ├── sessions.py          # Session + checkpoint CRUD
│   │   │   ├── checkpoints.py       # Quiz submit, Feynman, concept strengths
│   │   │   ├── analytics.py         # Progress and history
│   │   │   ├── gamification.py      # Profile, badges, challenges, notes
│   │   │   └── insights.py          # All 4 ML/DS feature endpoints
│   │   ├── services/
│   │   │   ├── checkpoint_generator.py   # LLM-based curriculum design
│   │   │   ├── context_gatherer.py       # Educational content generation
│   │   │   ├── explainer.py              # Personalised explanations
│   │   │   ├── question_generator.py     # Unique MCQ generation
│   │   │   ├── evaluator.py              # Semantic answer evaluation
│   │   │   ├── feynman.py                # Feynman re-teaching
│   │   │   ├── notes_generator.py        # Study notes/cheatsheet/practice Qs
│   │   │   ├── rag_service.py            # Agentic RAG with FAISS
│   │   │   ├── weakness_scorer.py        # Bayesian concept strength
│   │   │   ├── student_clustering.py     # K-Means learning type classifier
│   │   │   ├── performance_predictor.py  # Logistic regression risk model
│   │   │   ├── recommendation_engine.py  # Heuristic study recommender
│   │   │   └── forgetting_curve.py       # Ebbinghaus exponential decay
│   │   ├── workflow.py              # LangGraph 4-node pipeline
│   │   ├── llm.py                   # Multi-key Groq LLM with rotation
│   │   ├── models.py                # SQLAlchemy ORM models
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── auth.py                  # JWT helpers + password hashing
│   │   └── main.py                  # FastAPI app + CORS + router registration
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Marketing/auth landing page
│   │   │   ├── Login.jsx            # Auth form
│   │   │   ├── Register.jsx         # Registration with validation
│   │   │   ├── Dashboard.jsx        # Home with cluster badge + insights
│   │   │   ├── Session.jsx          # Checkpoint learning view
│   │   │   ├── CheckpointPlanner.jsx # Edit/add/delete checkpoints before learning
│   │   │   ├── Quiz.jsx             # MCQ quiz with concept strength results
│   │   │   ├── Feynman.jsx          # Simplified re-explanation page
│   │   │   ├── Completion.jsx       # Session complete with notes download
│   │   │   ├── Analytics.jsx        # Stats, badges, AI Insights tab
│   │   │   ├── History.jsx          # Session history with notes download
│   │   │   └── Profile.jsx          # Full profile + learning type insights
│   │   ├── components/
│   │   │   ├── CheckpointStepper.jsx    # Zigzag Duolingo-style path
│   │   │   ├── InsightsDashboard.jsx    # All 4 ML features in one view
│   │   │   ├── ConceptStrengthBar.jsx   # Post-quiz strength scorecard
│   │   │   ├── BadgePopup.jsx           # Animated badge toast
│   │   │   ├── BadgeCard.jsx            # Badge display card
│   │   │   ├── CheckpointEditor.jsx     # Inline checkpoint edit form
│   │   │   ├── NotesUpload.jsx          # RAG notes upload modal
│   │   │   ├── TopicWizard.jsx          # Multi-step session creation wizard
│   │   │   ├── Navbar.jsx               # Top nav with theme toggle
│   │   │   ├── Sidebar.jsx              # Navigation sidebar
│   │   │   ├── SessionCard.jsx          # Session list item
│   │   │   └── Progressbar.jsx          # XP/progress bar
│   │   ├── context/
│   │   │   └── Authcontext.jsx      # Auth provider + user state
│   │   ├── services/
│   │   │   └── api.js               # Full Axios client with all endpoints
│   │   ├── styles/
│   │   │   └── main.css             # Design system (CSS variables, dark mode)
│   │   └── App.jsx                  # Router + route definitions
```

---

## API Reference

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get access + refresh tokens |

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/` | Create new learning session |
| `GET` | `/sessions/` | List all user sessions |
| `GET` | `/sessions/{id}` | Get session details |
| `POST` | `/sessions/{id}/checkpoints` | Generate checkpoint path (with 3-retry fallback) |
| `GET` | `/sessions/{id}/checkpoints` | List checkpoints |
| `POST` | `/sessions/{id}/checkpoints/add` | Add a manual checkpoint |
| `DELETE` | `/sessions/{id}/checkpoints/{cp_id}` | Delete a checkpoint |
| `POST` | `/sessions/{id}/checkpoints/bulk-update` | Bulk update checkpoints |
| `PUT` | `/sessions/{id}/checkpoints/{cp_id}` | Update single checkpoint |
| `GET` | `/sessions/{id}/checkpoints/{cp_id}/content` | Get/generate content (cached) |
| `GET` | `/sessions/{id}/checkpoints/{cp_id}/questions` | Get/generate questions (cached) |
| `POST` | `/sessions/{id}/checkpoints/{cp_id}/questions/retry` | Retry questions targeting weak areas |
| `POST` | `/sessions/{id}/complete` | Complete session and award XP |
| `GET` | `/sessions/{id}/can-complete` | Check if all checkpoints are done |
| `POST` | `/sessions/{id}/notes/generate` | Generate comprehensive notes, cheatsheet, or practice Qs |

### Checkpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/checkpoints/{id}/submit` | Submit quiz answers, evaluate, update strengths |
| `GET` | `/checkpoints/{id}/feynman` | Get Feynman re-explanation |
| `GET` | `/checkpoints/{id}/concept-strengths` | Get Bayesian concept strength scores |

### Insights (ML / DS)

| Method | Path | Description |
|---|---|---|
| `GET` | `/insights/cluster` | K-Means learning type classification |
| `GET` | `/insights/prediction` | Next-checkpoint risk prediction |
| `GET` | `/insights/recommendations` | Personalised study recommendations |
| `GET` | `/insights/revision-queue` | Forgetting-curve revision queue |
| `POST` | `/insights/revision-review` | Log voluntary review (strength boost) |
| `GET` | `/insights/dashboard` | All 4 features in a single call |

### Gamification

| Method | Path | Description |
|---|---|---|
| `GET` | `/gamification/profile` | Get full user profile |
| `PATCH` | `/gamification/profile` | Update profile (name, profession, grade, bio, goal, avatar, tutor mode) |
| `PATCH` | `/gamification/tutor-mode` | Quick tutor mode switch |
| `GET` | `/gamification/badges` | Earned badges |
| `GET` | `/gamification/badge-definitions` | All 24 badge definitions |
| `POST` | `/gamification/badges/check` | Check and award new badges |
| `GET` | `/gamification/weak-topics` | Top 5 weak concept areas |
| `GET` | `/gamification/daily-challenge` | Today's challenge |
| `POST` | `/gamification/daily-challenge/{id}/complete` | Complete a challenge |
| `POST` | `/gamification/notes/{session_id}/generate` | Generate AI study notes |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/` | Aggregate user analytics |
| `GET` | `/analytics/history` | Session history list |
| `GET` | `/analytics/sessions/{id}/details` | Per-session checkpoint details |
| `GET` | `/analytics/progress` | Completion rates and score distribution |

---

## Database Schema

```
users
  id, email, password_hash, name, tutor_mode, xp, level, created_at
  profession, grade, bio, learning_goal, avatar_emoji

learning_sessions
  id, user_id, topic, user_notes, status, xp_earned, created_at, completed_at

checkpoints
  id, session_id, checkpoint_index, topic, objectives (JSON), key_concepts (JSON)
  level, status, understanding_score, attempts, xp_earned
  context (Text), explanation (Text), questions_cache (JSON)
  content_generated, validation_score, completed_at

quiz_attempts
  id, checkpoint_id, attempt_number, score, correct_count, total_questions
  answers (JSON), questions_used (JSON), attempted_at

user_analytics
  id, user_id, total_sessions, completed_sessions, total_checkpoints
  avg_score, current_streak, longest_streak, last_study_date

weak_topics
  id, user_id, topic, concept, strength_score
  correct_attempts, total_attempts, last_practiced

user_badges
  id, user_id, badge_name, badge_type, description, earned_at

daily_challenges
  id, user_id, task, bonus_xp, completed, date

user_notes
  id, user_id, session_id, content, created_at
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- A Groq API key (free tier available at console.groq.com)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourname/conceptly.git
cd conceptly/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary
pip install langchain langchain-groq langgraph langsmith
pip install langchain-community faiss-cpu sentence-transformers
pip install python-jose passlib[argon2] pdfplumber python-dotenv
pip install pydantic[email]

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd conceptly/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend `.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/conceptly

# JWT
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Groq LLM (add up to 4 keys for rate-limit rotation)
GROQ_API_KEY=gsk_...
GROQ_API_KEY2=gsk_...
GROQ_API_KEY3=gsk_...
GROQ_API_KEY4=gsk_...

# LangSmith (optional — for tracing)
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=conceptly

# Deployment
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env.local`

```env
VITE_API_URL=http://localhost:8000
```

---

## Deployment

### Backend (Render / Railway / Fly.io)

1. Set all environment variables in your hosting dashboard
2. Set `DATABASE_URL` to your hosted PostgreSQL connection string
3. Set `FRONTEND_URL` to your deployed frontend URL
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

The database tables are created automatically on startup via `init_db()`.

### Frontend (Vercel / Netlify)

1. Set `VITE_API_URL` to your deployed backend URL
2. Build command: `npm run build`
3. Output directory: `dist`

### Multi-Key Rate Limit Handling

The `MultiKeyLLM` class in `llm.py` automatically rotates through up to 4 Groq API keys when a rate limit (429) is hit. This allows sustained use on free-tier keys during development without any manual intervention.

---

## Key Design Decisions

**Why Groq + Llama instead of OpenAI?**
Groq's inference speed (typically under 2 seconds for Llama 3.3 70B) makes the typing animation in the Session view feel like genuine real-time generation rather than a loader. The free tier is also generous enough to fully develop and demo the product.

**Why pure-Python ML instead of sklearn?**
The four ML algorithms (K-Means, Logistic Regression, Bayesian scoring, Exponential decay) are all implemented without any external ML library. This keeps the dependency footprint small, makes the code fully readable without ML expertise, and means the algorithms run instantly without model loading overhead. The weights and centroids are hand-tuned rather than trained, which is appropriate for the signal volumes at this stage.

**Why FAISS over a managed vector DB?**
FAISS runs entirely in-process with no additional infrastructure. Since each session's RAG store is ephemeral (cleared when the session completes) and sized in the hundreds of chunks, FAISS is faster and simpler than any managed alternative. When FAISS is unavailable, keyword overlap search provides a graceful fallback with no API changes.

**Why LangGraph for the workflow?**
LangGraph makes the conditional retry logic (re-gather context if quality score < 85) explicit and traceable. LangSmith integration means every workflow run is visible with full input/output at each node, which is invaluable for prompt debugging.

---

*Built with ❤️ — Conceptly makes every learner feel understood.*
