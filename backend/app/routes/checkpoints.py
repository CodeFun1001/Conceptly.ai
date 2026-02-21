from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import User, Checkpoint, QuizAttempt, WeakTopic, UserAnalytics
from app.schemas import QuizAnswer
from app.auth import get_current_user
from app.services import evaluator, feynman

router = APIRouter(prefix="/checkpoints", tags=["checkpoints"])

@router.post("/{checkpoint_id}/submit")
def submit_quiz(checkpoint_id: int, quiz_answer: QuizAnswer, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    if not checkpoint.questions_cache:
        raise HTTPException(status_code=400, detail="No questions available for this checkpoint")
    
    questions = checkpoint.questions_cache
    
    result = evaluator.evaluate_answers(questions, quiz_answer.answers)
    
    attempt_number = checkpoint.attempts + 1
    checkpoint.attempts = attempt_number
    
    quiz_attempt = QuizAttempt(
        checkpoint_id=checkpoint.id,
        attempt_number=attempt_number,
        score=result['understanding_score'],
        correct_count=result['correct_count'],
        total_questions=result['total_questions'],
        answers=quiz_answer.answers,
        questions_used=questions
    )
    
    db.add(quiz_attempt)
    
    xp_earned = 0
    
    if result['passed']:
        checkpoint.status = "completed"
        checkpoint.understanding_score = result['understanding_score']
        checkpoint.completed_at = datetime.utcnow()
        checkpoint.xp_earned = 2
        xp_earned = 2
        
        current_user.xp += 2
        
        if current_user.xp >= (current_user.level * 100):
            current_user.level += 1
    else:
        for weak_area in result.get('weak_areas', []):
            existing_weak = db.query(WeakTopic).filter(
                WeakTopic.user_id == current_user.id,
                WeakTopic.topic == checkpoint.topic,
                WeakTopic.concept == weak_area[:100]
            ).first()
            
            if existing_weak:
                existing_weak.strength_score = max(0, existing_weak.strength_score - 0.1)
                existing_weak.last_practiced = datetime.utcnow()
            else:
                weak_topic = WeakTopic(
                    user_id=current_user.id,
                    topic=checkpoint.topic,
                    concept=weak_area[:100],
                    strength_score=0.5
                )
                db.add(weak_topic)
    
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    if analytics:
        total = analytics.total_checkpoints if analytics.total_checkpoints > 0 else 0
        avg = analytics.avg_score
        new_avg = ((avg * total) + result['understanding_score']) / (total + 1) if total > 0 else result['understanding_score']
        analytics.avg_score = new_avg
        if result['passed']:
            analytics.total_checkpoints += 1
    
    db.commit()
    
    # Update streak on quiz activity
    from app.models import UserAnalytics as UA
    from datetime import timedelta
    _analytics = db.query(UA).filter(UA.user_id == current_user.id).first()
    if _analytics:
        _today = datetime.utcnow().date()
        _last = _analytics.last_study_date.date() if _analytics.last_study_date else None
        if _last != _today:
            _analytics.current_streak = (_analytics.current_streak + 1) if _last == _today - timedelta(days=1) else 1
            _analytics.longest_streak = max(_analytics.longest_streak, _analytics.current_streak)
            _analytics.last_study_date = datetime.utcnow()
            db.commit()
    
    return {
        "score": result['understanding_score'],
        "correct_count": result['correct_count'],
        "total_questions": result['total_questions'],
        "detailed_results": result['detailed_results'],
        "passed": result['passed'],
        "xp_earned": xp_earned,
        "weak_areas": result.get('weak_areas', [])
    }

@router.get("/{checkpoint_id}/feynman")
def get_feynman_explanation(checkpoint_id: int, attempt: int = 0, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id,
        WeakTopic.topic == checkpoint.topic
    ).order_by(WeakTopic.strength_score.asc()).limit(3).all()
    
    weak_areas = [wt.concept for wt in weak_topics] if weak_topics else checkpoint.objectives[:2]
    
    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level
    }
    
    explanation = feynman.apply_feynman_teaching(
        checkpoint_data,
        weak_areas,
        attempt,
        current_user.tutor_mode
    )
    
    return {"explanation": explanation, "weak_areas": weak_areas}