from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    tutor_mode = Column(String, default="supportive_buddy")
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("LearningSession", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")
    analytics = relationship("UserAnalytics", back_populates="user", uselist=False)
    weak_topics = relationship("WeakTopic", back_populates="user")
    challenges = relationship("DailyChallenge", back_populates="user")
    notes = relationship("UserNote", back_populates="user")

class LearningSession(Base):
    __tablename__ = "learning_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String, nullable=False)
    user_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String, default="in_progress")
    xp_earned = Column(Integer, default=0)
    
    user = relationship("User", back_populates="sessions")
    checkpoints = relationship("Checkpoint", back_populates="session")

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("learning_sessions.id"))
    checkpoint_index = Column(Integer)
    topic = Column(String)
    objectives = Column(JSON)
    key_concepts = Column(JSON)
    level = Column(String)
    status = Column(String, default="pending")
    understanding_score = Column(Float)
    attempts = Column(Integer, default=0)
    completed_at = Column(DateTime)
    xp_earned = Column(Integer, default=0)
    
    context = Column(Text)
    explanation = Column(Text)
    content_generated = Column(Boolean, default=False)
    questions_cache = Column(JSON)
    validation_score = Column(Float)
    
    session = relationship("LearningSession", back_populates="checkpoints")
    quiz_attempts = relationship("QuizAttempt", back_populates="checkpoint")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey("checkpoints.id"))
    attempt_number = Column(Integer)
    score = Column(Float)
    correct_count = Column(Integer)
    total_questions = Column(Integer)
    answers = Column(JSON)
    questions_used = Column(JSON)
    attempted_at = Column(DateTime, default=datetime.utcnow)
    
    checkpoint = relationship("Checkpoint", back_populates="quiz_attempts")

class UserAnalytics(Base):
    __tablename__ = "user_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    total_sessions = Column(Integer, default=0)
    completed_sessions = Column(Integer, default=0)
    total_checkpoints = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)
    total_time_minutes = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_study_date = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="analytics")

class UserBadge(Base):
    __tablename__ = "user_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_name = Column(String)
    badge_type = Column(String)
    description = Column(String)
    earned_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="badges")

class WeakTopic(Base):
    __tablename__ = "weak_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    concept = Column(String)
    strength_score = Column(Float)
    last_practiced = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="weak_topics")

class DailyChallenge(Base):
    __tablename__ = "daily_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task = Column(String)
    bonus_xp = Column(Integer)
    completed = Column(Boolean, default=False)
    date = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="challenges")

class UserNote(Base):
    __tablename__ = "user_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(Integer, ForeignKey("learning_sessions.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notes")