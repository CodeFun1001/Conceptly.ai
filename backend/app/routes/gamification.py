from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, UserBadge, WeakTopic, DailyChallenge, UserNote
from app.schemas import BadgeResponse, WeakTopicResponse, DailyChallengeResponse, TutorModeUpdate, NoteCreate, NoteResponse, UserResponse
from app.auth import get_current_user
from app.services.agent_service import AgentService

router = APIRouter(prefix="/gamification", tags=["gamification"])

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user

@router.patch("/tutor-mode", response_model=UserResponse)
def update_tutor_mode(tutor_update: TutorModeUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    valid_modes = ["chill_friend", "strict_mentor", "supportive_buddy", "exam_mode"]
    if tutor_update.tutor_mode not in valid_modes:
        raise HTTPException(status_code=400, detail="Invalid tutor mode")
    
    current_user.tutor_mode = tutor_update.tutor_mode
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/badges", response_model=List[BadgeResponse])
def get_badges(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).order_by(UserBadge.earned_at.desc()).all()
    return badges

@router.post("/badges/check")
def check_and_award_badges(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    from app.models import LearningSession, Checkpoint
    
    newly_awarded = []
    
    existing_badges = {b.badge_name for b in db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()}
    
    sessions = db.query(LearningSession).filter(LearningSession.user_id == current_user.id).all()
    
    if len(sessions) >= 1 and "first_topic" not in existing_badges:
        badge = UserBadge(
            user_id=current_user.id,
            badge_name="first_topic",
            badge_type="milestone",
            description="Completed your first learning topic!"
        )
        db.add(badge)
        newly_awarded.append(badge)
    
    if len([s for s in sessions if s.status == "completed"]) >= 5 and "dedicated_learner" not in existing_badges:
        badge = UserBadge(
            user_id=current_user.id,
            badge_name="dedicated_learner",
            badge_type="milestone",
            description="Completed 5 learning sessions!"
        )
        db.add(badge)
        newly_awarded.append(badge)
    
    checkpoints = db.query(Checkpoint).join(LearningSession).filter(
        LearningSession.user_id == current_user.id,
        Checkpoint.understanding_score >= 0.9
    ).all()
    
    if len(checkpoints) >= 3 and "high_achiever" not in existing_badges:
        badge = UserBadge(
            user_id=current_user.id,
            badge_name="high_achiever",
            badge_type="performance",
            description="Scored 90%+ on 3 quizzes!"
        )
        db.add(badge)
        newly_awarded.append(badge)
    
    if current_user.level >= 5 and "level_5_master" not in existing_badges:
        badge = UserBadge(
            user_id=current_user.id,
            badge_name="level_5_master",
            badge_type="level",
            description="Reached Level 5!"
        )
        db.add(badge)
        newly_awarded.append(badge)
    
    db.commit()
    
    return {"newly_awarded": [{"badge_name": b.badge_name, "description": b.description} for b in newly_awarded]}

@router.get("/weak-topics", response_model=List[WeakTopicResponse])
def get_weak_topics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).order_by(WeakTopic.strength_score.asc()).limit(5).all()
    
    return weak_topics

@router.get("/daily-challenge", response_model=DailyChallengeResponse)
def get_daily_challenge(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    today = datetime.utcnow().date()
    
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.user_id == current_user.id,
        DailyChallenge.date >= today
    ).first()
    
    if not challenge:
        tasks = [
            "Complete 1 checkpoint today",
            "Score 80%+ on a quiz",
            "Review your weak topics",
            "Study for 30 minutes straight",
            "Try a new learning topic"
        ]
        
        import random
        task = random.choice(tasks)
        
        challenge = DailyChallenge(
            user_id=current_user.id,
            task=task,
            bonus_xp=20,
            completed=False
        )
        
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
    
    return challenge

@router.post("/daily-challenge/{challenge_id}/complete")
def complete_daily_challenge(challenge_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.id == challenge_id,
        DailyChallenge.user_id == current_user.id
    ).first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if challenge.completed:
        raise HTTPException(status_code=400, detail="Challenge already completed")
    
    challenge.completed = True
    current_user.xp += challenge.bonus_xp
    
    if current_user.xp >= (current_user.level * 100):
        current_user.level += 1
    
    db.commit()
    
    return {"message": "Challenge completed!", "xp_earned": challenge.bonus_xp, "new_level": current_user.level}

@router.post("/notes", response_model=NoteResponse)
def create_note(note: NoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    new_note = UserNote(
        user_id=current_user.id,
        session_id=note.session_id,
        content=note.content
    )
    
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return new_note

@router.get("/notes/{session_id}", response_model=List[NoteResponse])
def get_notes(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    notes = db.query(UserNote).filter(
        UserNote.user_id == current_user.id,
        UserNote.session_id == session_id
    ).order_by(UserNote.created_at.desc()).all()
    
    return notes

@router.post("/notes/{session_id}/generate")
def generate_smart_notes(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    from app.models import LearningSession, Checkpoint
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    
    checkpoint_data = [{"topic": cp.topic, "objectives": cp.objectives} for cp in checkpoints]
    
    weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).limit(5).all()
    
    weak_areas = [f"{wt.topic}: {wt.concept}" for wt in weak_topics]
    
    notes_content = AgentService.generate_smart_notes(session.topic, checkpoint_data, weak_areas)
    
    note = UserNote(
        user_id=current_user.id,
        session_id=session.id,
        content=notes_content
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return {"note": note, "content": notes_content}