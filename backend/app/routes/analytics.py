from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, LearningSession, Checkpoint, QuizAttempt, UserAnalytics
from app.schemas import AnalyticsResponse, SessionResponse, CheckpointResponse
from app.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

def calculate_streak(user_id: int, db: Session) -> tuple:
    
    sessions = db.query(LearningSession).filter(
        LearningSession.user_id == user_id,
        LearningSession.status == "completed"
    ).order_by(LearningSession.completed_at.desc()).all()
    
    if not sessions:
        return (0, 0)
    
    session_dates = list(set([s.completed_at.date() for s in sessions if s.completed_at]))
    session_dates.sort(reverse=True)
    
    if not session_dates:
        return (0, 0)
    
    current_streak = 0
    today = datetime.utcnow().date()
    
    if session_dates[0] == today or session_dates[0] == today - timedelta(days=1):
        current_streak = 1
        check_date = session_dates[0] - timedelta(days=1)
        
        for date in session_dates[1:]:
            if date == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
    
    longest_streak = 1
    temp_streak = 1
    
    for i in range(len(session_dates) - 1):
        if session_dates[i] - session_dates[i + 1] == timedelta(days=1):
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 1
    
    return (current_streak, longest_streak)

@router.get("/", response_model=AnalyticsResponse)
def get_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    
    if not analytics:
        analytics = UserAnalytics(user_id=current_user.id)
        db.add(analytics)
        db.commit()
        db.refresh(analytics)
    
    current_streak, longest_streak = calculate_streak(current_user.id, db)
    
    analytics.current_streak = current_streak
    analytics.longest_streak = max(analytics.longest_streak, longest_streak)
    analytics.last_study_date = datetime.utcnow()
    
    db.commit()
    db.refresh(analytics)
    
    return analytics

@router.get("/history", response_model=List[SessionResponse])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    sessions = db.query(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).order_by(LearningSession.created_at.desc()).all()
    
    return sessions

@router.get("/sessions/{session_id}/details")
def get_session_details(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        return {"error": "Session not found"}
    
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    
    checkpoint_details = []
    for cp in checkpoints:
        attempts = db.query(QuizAttempt).filter(QuizAttempt.checkpoint_id == cp.id).all()
        checkpoint_details.append({
            "checkpoint": cp,
            "attempts": len(attempts),
            "scores": [a.score for a in attempts]
        })
    
    return {
        "session": session,
        "checkpoints": checkpoint_details
    }

@router.get("/progress")
def get_progress_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    total_sessions = db.query(LearningSession).filter(LearningSession.user_id == current_user.id).count()
    completed_sessions = db.query(LearningSession).filter(
        LearningSession.user_id == current_user.id,
        LearningSession.status == "completed"
    ).count()
    
    total_checkpoints = db.query(Checkpoint).join(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).count()
    
    completed_checkpoints = db.query(Checkpoint).join(LearningSession).filter(
        LearningSession.user_id == current_user.id,
        Checkpoint.status == "completed"
    ).count()
    
    all_attempts = db.query(QuizAttempt).join(Checkpoint).join(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).all()
    
    avg_score = sum([a.score for a in all_attempts]) / len(all_attempts) if all_attempts else 0
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_checkpoints": total_checkpoints,
        "completed_checkpoints": completed_checkpoints,
        "avg_score": avg_score,
        "completion_rate": (completed_checkpoints / total_checkpoints * 100) if total_checkpoints > 0 else 0
    }