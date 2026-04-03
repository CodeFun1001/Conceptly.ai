from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, LearningSession, Checkpoint, UserAnalytics, UserNote
from app.schemas import SessionCreate, SessionResponse, CheckpointResponse
from app.auth import get_current_user
from app.services import checkpoint_generator, notes_generator, question_generator
from app.services.workflow import run_checkpoint_workflow

router = APIRouter(prefix="/sessions", tags=["sessions"])

def _init_rag_for_session(session: LearningSession) -> None:
    try:
        from app.services.rag_service import initialise_session_rag
        initialise_session_rag(session.id, session.user_notes)
    except Exception as e:
        print(f"RAG init error (non-fatal): {e}")

@router.post("/", response_model=SessionResponse)
def create_session(session: SessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_session = LearningSession(
        user_id=current_user.id, topic=session.topic,
        user_notes=session.user_notes, status="in_progress",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.total_sessions += 1
        db.commit()

    _init_rag_for_session(new_session)
    print(f"✓ Created session: {new_session.topic} (ID: {new_session.id})")
    return new_session

@router.get("/", response_model=List[SessionResponse])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).order_by(LearningSession.created_at.desc()).all()

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _init_rag_for_session(session)
    return session

@router.post("/{session_id}/checkpoints")
def generate_checkpoints_route(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    if existing:
        print(f"Returning cached checkpoints for session {session_id}")
        return {
            "checkpoints": [
                {"id": cp.id, "topic": cp.topic, "objectives": cp.objectives,
                 "key_concepts": cp.key_concepts, "level": cp.level, "success_threshold": 0.7}
                for cp in existing
            ]
        }

    print(f"Generating checkpoints | session={session_id} topic='{session.topic}'")
    _init_rag_for_session(session)
    question_generator.clear_question_history(session_id)

    checkpoints = checkpoint_generator.generate_checkpoints(
        topic=session.topic, current_level="beginner", target_level="intermediate",
        purpose="general learning", tutor_mode=current_user.tutor_mode, session_id=session_id,
    )

    created = []
    for idx, cp_data in enumerate(checkpoints):
        cp = Checkpoint(
            session_id=session.id, checkpoint_index=idx,
            topic=cp_data["topic"], objectives=cp_data["objectives"],
            key_concepts=cp_data.get("key_concepts", []),
            level=cp_data.get("level", "intermediate"),
            status="pending", content_generated=False,
        )
        db.add(cp)
        created.append(cp)

    db.commit()
    for cp in created:
        db.refresh(cp)
    print(f"✓ Saved {len(created)} checkpoints")
    return {"checkpoints": checkpoints}

@router.get("/{session_id}/checkpoints", response_model=List[CheckpointResponse])
def get_checkpoints(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).order_by(Checkpoint.checkpoint_index).all()


@router.get("/{session_id}/checkpoints/{checkpoint_id}/content")
def get_checkpoint_content(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id, Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    if checkpoint.content_generated and checkpoint.context and checkpoint.explanation:
        print(f"✓ Cached content for checkpoint {checkpoint_id}")
        return {
            "context": checkpoint.context,
            "explanation": checkpoint.explanation,
            "validation_score": checkpoint.validation_score,
        }

    print(f"Generating content | cp={checkpoint_id} '{checkpoint.topic}'")
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if session:
        _init_rag_for_session(session)

    checkpoint_data = {
        "id": checkpoint.id, "topic": checkpoint.topic,
        "objectives": checkpoint.objectives, "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }

    result = run_checkpoint_workflow(
        checkpoint=checkpoint_data, tutor_mode=current_user.tutor_mode, session_id=session_id,
    )

    checkpoint.context          = result["context"]
    checkpoint.explanation      = result["explanation"]
    checkpoint.validation_score = result["validation_score"]
    checkpoint.content_generated = True
    # KEY FIX: save questions from workflow so /questions endpoint hits cache
    if result.get("questions"):
        checkpoint.questions_cache = result["questions"]

    db.commit()
    db.refresh(checkpoint)
    print(f"✓ Content cached for checkpoint {checkpoint_id}")
    return {
        "context": result["context"],
        "explanation": result["explanation"],
        "validation_score": result["validation_score"],
    }

@router.get("/{session_id}/checkpoints/{checkpoint_id}/questions")
def get_checkpoint_questions(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id, Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    # KEY FIX: strict cache check — never regenerate if cached
    if checkpoint.questions_cache:
        print(f"✓ Cached questions for checkpoint {checkpoint_id}")
        return {"questions": checkpoint.questions_cache}

    print(f"Generating questions | cp={checkpoint_id}")
    session = db.query(LearningSession).filter(LearningSession.id == session_id).first()
    if session:
        _init_rag_for_session(session)

    checkpoint_data = {
        "id": checkpoint.id, "topic": checkpoint.topic,
        "objectives": checkpoint.objectives, "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }

    if not checkpoint.content_generated:
        result = run_checkpoint_workflow(
            checkpoint=checkpoint_data, tutor_mode=current_user.tutor_mode, session_id=session_id,
        )
        checkpoint.context          = result["context"]
        checkpoint.explanation      = result["explanation"]
        checkpoint.validation_score = result["validation_score"]
        checkpoint.questions_cache  = result["questions"]
        checkpoint.content_generated = True
        db.commit()
        db.refresh(checkpoint)
        print(f"✓ Full workflow done | cp={checkpoint_id}")
        return {"questions": result["questions"]}

    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data, context=checkpoint.context,
        level=checkpoint.level, tutor_mode=current_user.tutor_mode, session_id=session_id,
    )
    checkpoint.questions_cache = questions
    db.commit()
    print(f"✓ Questions cached | cp={checkpoint_id}")
    return {"questions": questions}


@router.post("/{session_id}/checkpoints/{checkpoint_id}/questions/retry")
def get_retry_questions(
    session_id: int, checkpoint_id: int, weak_areas: list = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id, Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    checkpoint_data = {
        "id": checkpoint.id, "topic": checkpoint.topic,
        "objectives": checkpoint.objectives, "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }
    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data, context=checkpoint.context or "",
        level=checkpoint.level, tutor_mode=current_user.tutor_mode,
        weak_areas=weak_areas or [], attempt_number=checkpoint.attempts,
        session_id=session_id,
    )
    checkpoint.questions_cache = questions
    db.commit()
    print(f"✓ Retry questions | cp={checkpoint_id} weak={weak_areas}")
    return {"questions": questions}


def complete_checkpoint(session_id: int, checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id, Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    checkpoint.status = "completed"
    checkpoint.completed_at = datetime.utcnow()
    checkpoint.xp_earned = 2
    current_user.xp += 2
    if current_user.xp >= (current_user.level * 100):
        current_user.level += 1
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.total_checkpoints += 1
    db.commit()
    return {"message": "Checkpoint completed", "xp_earned": 2, "new_level": current_user.level}

@router.post("/{session_id}/complete")
def complete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    if not all(cp.status == "completed" for cp in checkpoints):
        pending = sum(1 for cp in checkpoints if cp.status != "completed")
        raise HTTPException(status_code=400, detail=f"Not all checkpoints completed. {pending} remaining.")

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

    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        analytics.completed_sessions += 1
    db.commit()

    question_generator.clear_question_history(session_id)
    try:
        from app.services.rag_service import clear_session_embeddings
        clear_session_embeddings(session_id)
    except Exception:
        pass

    return {
        "message": "🎉 Congratulations! Session completed!",
        "checkpoint_xp": checkpoint_xp, "bonus_xp": bonus_xp,
        "total_xp_earned": total_xp, "new_level": current_user.level,
        "level_up": current_user.level > old_level,
    }

@router.get("/{session_id}/can-complete")
def can_complete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    completed_count = sum(1 for cp in checkpoints if cp.status == "completed")
    return {
        "can_complete": completed_count == len(checkpoints),
        "completed_count": completed_count,
        "total_count": len(checkpoints),
        "session_status": session.status,
    }

@router.post("/{session_id}/notes/generate")
def generate_session_notes(session_id: int, notes_type: str = "comprehensive", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    checkpoint_data = [
        {"topic": cp.topic, "objectives": cp.objectives, "key_concepts": cp.key_concepts, "level": cp.level}
        for cp in checkpoints
    ]
    from app.models import WeakTopic
    weak_topics = db.query(WeakTopic).filter(WeakTopic.user_id == current_user.id).order_by(WeakTopic.strength_score.asc()).limit(5).all()
    weak_areas = [wt.concept for wt in weak_topics]

    if notes_type == "comprehensive":
        notes_content = notes_generator.generate_comprehensive_notes(session.topic, checkpoint_data, weak_areas, session_id=session_id)
    elif notes_type == "cheatsheet":
        notes_content = notes_generator.generate_cheat_sheet(session.topic, checkpoint_data, session_id=session_id)
    else:
        notes_content = notes_generator.generate_practice_questions(session.topic, checkpoint_data, session_id=session_id)

    note = UserNote(user_id=current_user.id, session_id=session.id, content=notes_content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"note": note, "content": notes_content}

@router.post("/{session_id}/notes/upload")
async def upload_session_notes(
    session_id: int, notes_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    extracted_text = ""
    if notes_text and notes_text.strip():
        extracted_text = notes_text.strip()
    elif file:
        raw_bytes = await file.read()
        content_type = file.content_type or ""
        if "pdf" in content_type or (file.filename or "").lower().endswith(".pdf"):
            try:
                import io, pdfplumber
                with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
                    extracted_text = "\n\n".join(p.extract_text() for p in pdf.pages if p.extract_text())
            except ImportError:
                extracted_text = raw_bytes.decode("utf-8", errors="ignore")
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"PDF error: {e}")
        else:
            extracted_text = raw_bytes.decode("utf-8", errors="ignore").strip()

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No notes content found.")

    session.user_notes = (session.user_notes + "\n\n---\n\n" + extracted_text) if session.user_notes else extracted_text
    db.commit()

    note_record = UserNote(user_id=current_user.id, session_id=session.id, content=extracted_text[:10000])
    db.add(note_record)
    db.commit()

    rag_active, rag_error = False, None
    try:
        from app.services.rag_service import store_embeddings, clear_session_embeddings
        clear_session_embeddings(session_id)
        rag_active = store_embeddings(session_id, session.user_notes)
    except Exception as e:
        rag_error = str(e)

    return {"message": "Notes uploaded successfully", "characters": len(extracted_text),
            "rag_active": rag_active, "rag_error": rag_error, "note_id": note_record.id}

from pydantic import BaseModel
from typing import List as PList

class CheckpointUpdate(BaseModel):
    topic: Optional[str] = None
    objectives: Optional[PList[str]] = None
    key_concepts: Optional[PList[str]] = None

@router.put("/{session_id}/checkpoints/{checkpoint_id}")
def update_checkpoint(session_id: int, checkpoint_id: int, update: CheckpointUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id, LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id, Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    if checkpoint.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot edit a completed checkpoint.")

    changed = False
    if update.topic and update.topic.strip():
        checkpoint.topic = update.topic.strip(); changed = True
    if update.objectives is not None:
        checkpoint.objectives = [o.strip() for o in update.objectives if o.strip()]; changed = True
    if update.key_concepts is not None:
        checkpoint.key_concepts = [k.strip() for k in update.key_concepts if k.strip()]; changed = True

    if not changed:
        return {"message": "No changes applied.", "checkpoint_id": checkpoint_id}

    checkpoint.content_generated = False
    checkpoint.context = None
    checkpoint.explanation = None
    checkpoint.questions_cache = None
    checkpoint.validation_score = None
    db.commit()
    db.refresh(checkpoint)

    return {
        "message": "Checkpoint updated successfully.",
        "checkpoint_id": checkpoint_id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "content_invalidated": True,
    }