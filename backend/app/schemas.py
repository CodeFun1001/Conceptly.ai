from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    tutor_mode: str
    xp: int
    level: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class SessionCreate(BaseModel):
    topic: str
    user_notes: Optional[str] = ""

class SessionResponse(BaseModel):
    id: int
    topic: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    xp_earned: int
    
    class Config:
        from_attributes = True

class CheckpointData(BaseModel):
    id: int
    topic: str
    objectives: List[str]
    key_concepts: List[str]
    level: str
    success_threshold: float

class CheckpointResponse(BaseModel):
    id: int
    checkpoint_index: int
    topic: str
    objectives: List[Any]
    status: str
    understanding_score: Optional[float]
    attempts: int
    xp_earned: int
    
    class Config:
        from_attributes = True

class LearningState(BaseModel):
    topic: str
    checkpoints: List[Dict]
    current_checkpoint_index: int
    gathered_context: str = ""
    explanation: str = ""
    questions: List[Dict] = []
    understanding_score: float = 0.0
    weak_areas: List[str] = []
    feynman_explanation: str = ""

class QuizAnswer(BaseModel):
    answers: List[str]

class QuizResult(BaseModel):
    score: float
    correct_count: int
    total_questions: int
    detailed_results: List[Dict]
    passed: bool

class AnalyticsResponse(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_checkpoints: int
    avg_score: float
    current_streak: int
    longest_streak: int
    
    class Config:
        from_attributes = True

class BadgeResponse(BaseModel):
    id: int
    badge_name: str
    badge_type: str
    description: str
    earned_at: datetime
    
    class Config:
        from_attributes = True

class WeakTopicResponse(BaseModel):
    topic: str
    concept: str
    strength_score: float
    last_practiced: datetime
    
    class Config:
        from_attributes = True

class DailyChallengeResponse(BaseModel):
    id: int
    task: str
    bonus_xp: int
    completed: bool
    date: datetime
    
    class Config:
        from_attributes = True

class TutorModeUpdate(BaseModel):
    tutor_mode: str

class NoteCreate(BaseModel):
    session_id: int
    content: str

class NoteResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True