CREATE DATABASE conceptly;

\c conceptly;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    tutor_mode VARCHAR(50) DEFAULT 'supportive_buddy',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    topic VARCHAR(255) NOT NULL,
    user_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress',
    xp_earned INTEGER DEFAULT 0
);

CREATE TABLE checkpoints (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES learning_sessions(id),
    checkpoint_index INTEGER,
    topic VARCHAR(255),
    objectives JSON,
    key_concepts JSON,
    level VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    understanding_score FLOAT,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    xp_earned INTEGER DEFAULT 0
);

CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    checkpoint_id INTEGER REFERENCES checkpoints(id),
    attempt_number INTEGER,
    score FLOAT,
    correct_count INTEGER,
    total_questions INTEGER,
    answers JSON,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    avg_score FLOAT DEFAULT 0.0,
    total_time_minutes INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    badge_name VARCHAR(100),
    badge_type VARCHAR(50),
    description TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weak_topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    topic VARCHAR(255),
    concept VARCHAR(255),
    strength_score FLOAT,
    last_practiced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    task TEXT,
    bonus_xp INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id INTEGER REFERENCES learning_sessions(id),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON learning_sessions(user_id);
CREATE INDEX idx_checkpoints_session ON checkpoints(session_id);
CREATE INDEX idx_quiz_attempts_checkpoint ON quiz_attempts(checkpoint_id);
CREATE INDEX idx_badges_user ON user_badges(user_id);
CREATE INDEX idx_weak_topics_user ON weak_topics(user_id);
CREATE INDEX idx_challenges_user ON daily_challenges(user_id);
CREATE INDEX idx_notes_user ON user_notes(user_id);

ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS content_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS questions_cache JSON;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS validation_score FLOAT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS questions_used JSON;