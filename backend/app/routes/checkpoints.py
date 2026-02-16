from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import User, Checkpoint, QuizAttempt, WeakTopic, UserAnalytics
from app.schemas import QuizAnswer
from app.auth import get_current_user
from app.services import evaluator, feynman, question_generator

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
        
        for weak_area in result.get('weak_areas', []):
            existing_weak = db.query(WeakTopic).filter(
                WeakTopic.user_id == current_user.id,
                WeakTopic.topic == checkpoint.topic,
                WeakTopic.concept == weak_area[:100]
            ).first()
            
            if existing_weak:
                existing_weak.strength_score = min(1.0, existing_weak.strength_score + 0.1)
                existing_weak.last_practiced = datetime.utcnow()
    else:
        for weak_detail in result.get('weak_area_details', []):
            concept = weak_detail.get('concept', 'Unknown')[:100]
            
            existing_weak = db.query(WeakTopic).filter(
                WeakTopic.user_id == current_user.id,
                WeakTopic.topic == checkpoint.topic,
                WeakTopic.concept == concept
            ).first()
            
            if existing_weak:
                existing_weak.strength_score = max(0, existing_weak.strength_score - 0.1)
                existing_weak.last_practiced = datetime.utcnow()
            else:
                weak_topic = WeakTopic(
                    user_id=current_user.id,
                    topic=checkpoint.topic,
                    concept=concept,
                    strength_score=0.4  # Start with low strength
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

@router.post("/{checkpoint_id}/retry-quiz")
def generate_retry_quiz(checkpoint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    last_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.checkpoint_id == checkpoint.id
    ).order_by(QuizAttempt.attempted_at.desc()).first()
    
    weak_areas = []
    wrong_questions = []
    
    if last_attempt and last_attempt.questions_used:
        for i, question in enumerate(last_attempt.questions_used):
            if i < len(last_attempt.answers):
                user_answer = last_attempt.answers[i]
                correct_answer = question.get('correct_answer', '')
                
                if user_answer.strip().lower() != correct_answer.strip().lower():
                    weak_areas.append(question.get('tested_concept', 'Unknown'))
                    wrong_questions.append(question)
    
    db_weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id,
        WeakTopic.topic == checkpoint.topic
    ).order_by(WeakTopic.strength_score.asc()).limit(5).all()
    
    weak_areas.extend([wt.concept for wt in db_weak_topics])
    weak_areas = list(dict.fromkeys(weak_areas))[:5]  
    
    print(f"🔄 Generating retry quiz for checkpoint {checkpoint_id}")
    print(f"   Weak areas: {weak_areas}")
    print(f"   Wrong questions to include: {len(wrong_questions)}")
    
    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level
    }
    
    new_questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=checkpoint.context,
        level=checkpoint.level,
        tutor_mode=current_user.tutor_mode,
        weak_areas=weak_areas,
        attempt_number=checkpoint.attempts,
        session_id=checkpoint.session_id
    )
    
    retry_questions = []
    
    if wrong_questions:
        retry_questions.extend(wrong_questions[:2])
    
    remaining_needed = max(4 - len(retry_questions), 2)
    retry_questions.extend(new_questions[:remaining_needed])
    retry_questions = retry_questions[:5]
    
    print(f"✅ Generated retry quiz with {len(retry_questions)} questions")
    print(f"   - {min(2, len(wrong_questions))} previously wrong questions")
    print(f"   - {len(retry_questions) - min(2, len(wrong_questions))} new weak-area questions")
    
    checkpoint.questions_cache = retry_questions
    db.commit()
    
    return {
        "questions": retry_questions,
        "weak_areas": weak_areas,
        "retry_attempt": checkpoint.attempts + 1
    }