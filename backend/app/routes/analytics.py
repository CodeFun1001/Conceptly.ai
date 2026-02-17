from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, LearningSession, Checkpoint, QuizAttempt, UserAnalytics
from app.schemas import AnalyticsResponse, SessionResponse, CheckpointResponse
from app.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/", response_model=AnalyticsResponse)
def get_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    
    if not analytics:
        analytics = UserAnalytics(user_id=current_user.id)
        db.add(analytics)
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