from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import User, LearningSession, Checkpoint, UserAnalytics, UserNote
from app.schemas import SessionCreate, SessionResponse, CheckpointResponse
from app.auth import get_current_user
from app.services import checkpoint_generator, notes_generator, question_generator
from app.services.workflow import run_checkpoint_workflow

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=SessionResponse)
def create_session(session: SessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    new_session = LearningSession(
        user_id=current_user.id,
        topic=session.topic,
        user_notes=session.user_notes,
        status="in_progress"
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.total_sessions += 1
        db.commit()
    
    print(f"✓ Created new session: {new_session.topic} (ID: {new_session.id})")
    
    return new_session

@router.get("/", response_model=List[SessionResponse])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    sessions = db.query(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).order_by(LearningSession.created_at.desc()).all()
    
    return sessions

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@router.post("/{session_id}/checkpoints")
def generate_checkpoints_route(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    
    existing_checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).all()
    
    if existing_checkpoints:
        print(f"⚠️ Checkpoints already exist for session {session_id}, returning existing ones")
        return {
            "checkpoints": [
                {
                    "id": cp.id,
                    "topic": cp.topic,
                    "objectives": cp.objectives,
                    "key_concepts": cp.key_concepts,
                    "level": cp.level,
                    "success_threshold": 0.7
                }
                for cp in existing_checkpoints
            ]
        }
    
    print(f"📚 Generating checkpoints for session {session_id}: {session.topic}")
    print(f"👤 User tutor mode: {current_user.tutor_mode}")
    
    question_generator.clear_question_history(session_id)
    
    checkpoints = checkpoint_generator.generate_checkpoints(
        topic=session.topic,
        current_level="beginner",
        target_level="intermediate",
        purpose="general learning",
        tutor_mode=current_user.tutor_mode
    )
    
    print(f"✓ Generated {len(checkpoints)} checkpoint definitions")
    
    created_checkpoints = []
    for idx, cp_data in enumerate(checkpoints):
        checkpoint = Checkpoint(
            session_id=session.id,
            checkpoint_index=idx,
            topic=cp_data['topic'],
            objectives=cp_data['objectives'],
            key_concepts=cp_data.get('key_concepts', []),
            level=cp_data.get('level', 'intermediate'),
            status="pending",
            content_generated=False
        )
        db.add(checkpoint)
        created_checkpoints.append(checkpoint)
    
    db.commit()
    
    for cp in created_checkpoints:
        db.refresh(cp)
    
    print(f"✓ Saved {len(created_checkpoints)} checkpoints to database")
    
    return {"checkpoints": checkpoints}

@router.get("/{session_id}/checkpoints", response_model=List[CheckpointResponse])
def get_checkpoints(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).order_by(Checkpoint.checkpoint_index).all()
    
    return checkpoints

@router.get("/{session_id}/checkpoints/{checkpoint_id}/content")
def get_checkpoint_content(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id
    ).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    
    if checkpoint.content_generated and checkpoint.context and checkpoint.explanation:
        print(f"✓ Returning cached content for checkpoint {checkpoint_id}")
        return {
            "context": checkpoint.context,
            "explanation": checkpoint.explanation,
            "validation_score": checkpoint.validation_score
        }
    
    print(f"📝 Generating content for checkpoint {checkpoint_id}: {checkpoint.topic}")
    print(f"👤 Using tutor mode: {current_user.tutor_mode}")
    
    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level
    }
    
    result = run_checkpoint_workflow(
        checkpoint=checkpoint_data,
        tutor_mode=current_user.tutor_mode
    )
    
    checkpoint.context = result['context']
    checkpoint.explanation = result['explanation']
    checkpoint.validation_score = result['validation_score']
    checkpoint.content_generated = True
    
    db.commit()
    db.refresh(checkpoint)
    
    print(f"✓ Content generated and cached for checkpoint {checkpoint_id}")
    
    return {
        "context": result['context'],
        "explanation": result['explanation'],
        "validation_score": result['validation_score']
    }

@router.get("/{session_id}/checkpoints/{checkpoint_id}/questions")
def get_checkpoint_questions(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id
    ).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    if checkpoint.questions_cache:
        print(f"✓ Returning cached questions for checkpoint {checkpoint_id}")
        return {"questions": checkpoint.questions_cache}
    
    print(f"❓ Generating questions for checkpoint {checkpoint_id}: {checkpoint.topic}")
    print(f"👤 Using tutor mode: {current_user.tutor_mode}")
    
    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level
    }
    
    if not checkpoint.content_generated:
        result = run_checkpoint_workflow(
            checkpoint=checkpoint_data,
            tutor_mode=current_user.tutor_mode
        )
        
        checkpoint.context = result['context']
        checkpoint.explanation = result['explanation']
        checkpoint.validation_score = result['validation_score']
        checkpoint.questions_cache = result['questions']
        checkpoint.content_generated = True
        
        db.commit()
        db.refresh(checkpoint)
        
        print(f"✓ Full content generated for checkpoint {checkpoint_id}")
        
        return {"questions": result['questions']}
    
    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=checkpoint.context,
        level=checkpoint.level,
        tutor_mode=current_user.tutor_mode,
        session_id=session_id  
    )
    
    checkpoint.questions_cache = questions
    db.commit()
    
    print(f"✓ Questions generated and cached for checkpoint {checkpoint_id}")
    
    return {"questions": questions}

@router.post("/{session_id}/checkpoints/{checkpoint_id}/questions/retry")
def get_retry_questions(
    session_id: int,
    checkpoint_id: int,
    weak_areas: list = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate fresh questions focused on the user's weak areas after Feynman explanation."""
    from fastapi import Body
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id
    ).first()

    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level
    }

    attempt_number = checkpoint.attempts

    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=checkpoint.context or "",
        level=checkpoint.level,
        tutor_mode=current_user.tutor_mode,
        weak_areas=weak_areas or [],
        attempt_number=attempt_number,
        session_id=session_id
    )

    # Update the questions cache with the new targeted ones
    checkpoint.questions_cache = questions
    db.commit()

    print(f"✓ Retry questions generated for checkpoint {checkpoint_id}, weak areas: {weak_areas}")
    return {"questions": questions}



def complete_checkpoint(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id
    ).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    checkpoint.status = "completed"
    checkpoint.completed_at = datetime.utcnow()
    checkpoint.xp_earned = 2
    
    current_user.xp += 2
    
    if current_user.xp >= (current_user.level * 100):
        current_user.level += 1
        print(f"🎉 User leveled up to level {current_user.level}!")
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.total_checkpoints += 1

    db.commit()
    
    print(f"✓ Checkpoint {checkpoint_id} completed")
    
    return {
        "message": "Checkpoint completed", 
        "xp_earned": 2, 
        "new_level": current_user.level
    }

@router.post("/{session_id}/complete")
def complete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
      
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    all_completed = all(cp.status == 'completed' for cp in checkpoints)
    
    if not all_completed:
        pending_count = sum(1 for cp in checkpoints if cp.status != 'completed')
        raise HTTPException(
            status_code=400, 
            detail=f"Not all checkpoints completed. {pending_count} checkpoint(s) remaining."
        )
    
    checkpoint_xp = sum(cp.xp_earned for cp in checkpoints)
    bonus_xp = 20
    total_xp = checkpoint_xp + bonus_xp
    
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    session.xp_earned = total_xp
    
    current_user.xp += total_xp
    
    old_level = current_user.level
    while current_user.xp >= (current_user.level * 100):
        current_user.level += 1
    
    if current_user.level > old_level:
        print(f"🎉 User leveled up to level {current_user.level}!")
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.completed_sessions += 1
    
    db.commit()
    
    question_generator.clear_question_history(session_id)
    
    print(f"✓ Session {session_id} completed! Total XP: {total_xp}")
    
    return {
        "message": "🎉 Congratulations! Session completed!", 
        "checkpoint_xp": checkpoint_xp,
        "bonus_xp": bonus_xp,
        "total_xp_earned": total_xp, 
        "new_level": current_user.level,
        "level_up": current_user.level > old_level
    }

@router.get("/{session_id}/can-complete")
def can_complete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    completed_count = sum(1 for cp in checkpoints if cp.status == 'completed')
    total_count = len(checkpoints)
    all_completed = completed_count == total_count
    
    return {
        "can_complete": all_completed,
        "completed_count": completed_count,
        "total_count": total_count,
        "session_status": session.status
    }

@router.post("/{session_id}/notes/generate")
def generate_session_notes(session_id: int, notes_type: str = "comprehensive", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    
    checkpoint_data = [
        {
            "topic": cp.topic,
            "objectives": cp.objectives,
            "key_concepts": cp.key_concepts,
            "level": cp.level
        }
        for cp in checkpoints
    ]
    
    
    from app.models import WeakTopic
    weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).order_by(WeakTopic.strength_score.asc()).limit(5).all()
    weak_areas = [wt.concept for wt in weak_topics]
    
    
    if notes_type == "comprehensive":
        notes_content = notes_generator.generate_comprehensive_notes(
            session.topic,
            checkpoint_data,
            weak_areas
        )
    elif notes_type == "cheatsheet":
        notes_content = notes_generator.generate_cheat_sheet(
            session.topic,
            checkpoint_data
        )
    else:
        notes_content = notes_generator.generate_practice_questions(
            session.topic,
            checkpoint_data
        )
    
    
    note = UserNote(
        user_id=current_user.id,
        session_id=session.id,
        content=notes_content
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    print(f"✓ Generated {notes_type} notes for session {session_id}")
    
    return {"note": note, "content": notes_content}