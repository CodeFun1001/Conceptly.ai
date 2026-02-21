from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, UserBadge, WeakTopic, DailyChallenge, UserNote, LearningSession, Checkpoint, UserAnalytics
from app.schemas import BadgeResponse, WeakTopicResponse, DailyChallengeResponse, TutorModeUpdate, NoteCreate, NoteResponse, UserResponse
from app.auth import get_current_user
from app.services import notes_generator
import random

router = APIRouter(prefix="/gamification", tags=["gamification"])

BADGE_DEFINITIONS = {
    
    "first_step":        {"badge_type": "milestone",   "icon": "🚀", "description": "Completed your very first learning session!", "tier": "bronze"},
    "knowledge_seeker":  {"badge_type": "milestone",   "icon": "📖", "description": "Completed 5 learning sessions.",              "tier": "silver"},
    "learning_machine":  {"badge_type": "milestone",   "icon": "🤖", "description": "Completed 10 learning sessions.",             "tier": "gold"},
    "unstoppable":       {"badge_type": "milestone",   "icon": "⚡", "description": "Completed 25 learning sessions.",             "tier": "platinum"},
    
    "sharp_mind":        {"badge_type": "performance", "icon": "🎯", "description": "Scored 90%+ on your first quiz.",             "tier": "bronze"},
    "ace_student":       {"badge_type": "performance", "icon": "🏆", "description": "Scored 90%+ on 5 quizzes.",                  "tier": "silver"},
    "perfect_score":     {"badge_type": "performance", "icon": "💯", "description": "Achieved 100% on a quiz.",                   "tier": "gold"},
    "flawless":          {"badge_type": "performance", "icon": "✨", "description": "Scored 100% on 3 different quizzes.",        "tier": "platinum"},
    
    "consistent":        {"badge_type": "streak",      "icon": "🔥", "description": "Maintained a 3-day learning streak.",        "tier": "bronze"},
    "week_warrior":      {"badge_type": "streak",      "icon": "📅", "description": "Maintained a 7-day streak.",                 "tier": "silver"},
    "month_legend":      {"badge_type": "streak",      "icon": "🌟", "description": "Maintained a 30-day streak.",                "tier": "gold"},
    
    "checkpoint_pro":    {"badge_type": "checkpoint",  "icon": "✅", "description": "Completed 10 checkpoints.",                  "tier": "bronze"},
    "checkpoint_master": {"badge_type": "checkpoint",  "icon": "🎖️","description": "Completed 50 checkpoints.",                  "tier": "silver"},
    
    "level_5":           {"badge_type": "level",       "icon": "⭐", "description": "Reached Level 5!",                          "tier": "bronze"},
    "level_10":          {"badge_type": "level",       "icon": "🌠", "description": "Reached Level 10!",                         "tier": "silver"},
    "level_20":          {"badge_type": "level",       "icon": "👑", "description": "Reached Level 20!",                         "tier": "gold"},
    
    "comeback_kid":      {"badge_type": "resilience",  "icon": "💪", "description": "Failed a quiz then passed it on retry!",    "tier": "bronze"},
    "feynman_fan":       {"badge_type": "resilience",  "icon": "💡", "description": "Used the Feynman explanation 5 times.",     "tier": "silver"},
    
    "challenger":        {"badge_type": "challenge",   "icon": "🎮", "description": "Completed 5 daily challenges.",             "tier": "bronze"},
    "challenge_champion":{"badge_type": "challenge",   "icon": "🥇", "description": "Completed 20 daily challenges.",            "tier": "gold"},
    
    "speed_learner":     {"badge_type": "efficiency",  "icon": "💨", "description": "Completed a session with all checkpoints on the first attempt.", "tier": "silver"},
    
    "xp_100":            {"badge_type": "xp",          "icon": "💎", "description": "Earned 100 total XP.",                      "tier": "bronze"},
    "xp_500":            {"badge_type": "xp",          "icon": "💜", "description": "Earned 500 total XP.",                      "tier": "silver"},
    "xp_1000":           {"badge_type": "xp",          "icon": "🔮", "description": "Earned 1000 total XP.",                     "tier": "gold"},
}

DAILY_CHALLENGES = [
    {"task": "Complete 1 full checkpoint today",                                "bonus_xp": 20},
    {"task": "Score 80% or higher on a quiz",                                   "bonus_xp": 25},
    {"task": "Score 100% on any quiz — perfect run!",                           "bonus_xp": 50},
    {"task": "Complete a learning session from start to finish",                 "bonus_xp": 40},
    {"task": "Complete 3 checkpoints in a single day",                          "bonus_xp": 60},
    {"task": "Use the Feynman explanation on a tough topic",                     "bonus_xp": 15},
    {"task": "Retry a failed quiz and pass it",                                  "bonus_xp": 30},
    {"task": "Start a brand new learning topic today",                           "bonus_xp": 20},
    {"task": "Review your weak topics in the Analytics page",                    "bonus_xp": 10},
    {"task": "Complete a quiz without skipping any questions",                   "bonus_xp": 15},
    {"task": "Finish a session and download your study notes",                   "bonus_xp": 20},
    {"task": "Earn at least 10 XP today",                                        "bonus_xp": 15},
    {"task": "Pass a quiz on your very first attempt",                           "bonus_xp": 25},
    {"task": "Achieve a checkpoint score above 90%",                             "bonus_xp": 30},
    {"task": "Maintain your streak — complete any study activity today!",        "bonus_xp": 10},
    {"task": "Complete an intermediate or advanced-level checkpoint",             "bonus_xp": 35},
    {"task": "Complete 2 different sessions today",                              "bonus_xp": 45},
    {"task": "Explore a topic you have never studied before",                    "bonus_xp": 20},
    {"task": "Answer 10 quiz questions correctly across any quizzes",            "bonus_xp": 25},
    {"task": "Reach a new personal best quiz score on any checkpoint",           "bonus_xp": 30},
]


def update_streak(user: User, db: Session):
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == user.id).first()
    if not analytics:
        analytics = UserAnalytics(user_id=user.id)
        db.add(analytics)
        db.flush()

    today = datetime.utcnow().date()
    last_study = analytics.last_study_date.date() if analytics.last_study_date else None

    if last_study == today:
        return

    if last_study == today - timedelta(days=1):
        analytics.current_streak += 1
    else:
        analytics.current_streak = 1

    analytics.longest_streak = max(analytics.longest_streak, analytics.current_streak)
    analytics.last_study_date = datetime.utcnow()
    db.commit()


def award_badge(user_id: int, badge_name: str, existing_badges: set, db: Session):
    if badge_name in existing_badges or badge_name not in BADGE_DEFINITIONS:
        return None
    defn = BADGE_DEFINITIONS[badge_name]
    badge = UserBadge(
        user_id=user_id,
        badge_name=badge_name,
        badge_type=defn["badge_type"],
        description=f'{defn["icon"]} {defn["description"]}',
    )
    db.add(badge)
    existing_badges.add(badge_name)
    return {"badge_name": badge_name, "description": badge.description, "tier": defn["tier"]}

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_streak(current_user, db)
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


@router.get("/badge-definitions")
def get_badge_definitions():
    return BADGE_DEFINITIONS


@router.post("/badges/check")
def check_and_award_badges(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    newly_awarded = []
    existing_badges = {b.badge_name for b in db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()}

    sessions = db.query(LearningSession).filter(LearningSession.user_id == current_user.id).all()
    completed_sessions = [s for s in sessions if s.status == "completed"]

    checkpoints_all = db.query(Checkpoint).join(LearningSession).filter(LearningSession.user_id == current_user.id).all()
    completed_checkpoints = [cp for cp in checkpoints_all if cp.status == "completed"]

    from app.models import QuizAttempt
    all_quiz_attempts = db.query(QuizAttempt).join(Checkpoint).join(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).all()

    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == current_user.id).first()
    completed_challenges = db.query(DailyChallenge).filter(
        DailyChallenge.user_id == current_user.id,
        DailyChallenge.completed == True
    ).count()

    def add(name):
        b = award_badge(current_user.id, name, existing_badges, db)
        if b:
            newly_awarded.append(b)

    if len(completed_sessions) >= 1:  add("first_step")
    if len(completed_sessions) >= 5:  add("knowledge_seeker")
    if len(completed_sessions) >= 10: add("learning_machine")
    if len(completed_sessions) >= 25: add("unstoppable")

    high_scores = [a for a in all_quiz_attempts if a.score >= 0.9]
    perfect_scores = [a for a in all_quiz_attempts if a.score >= 1.0]
    if high_scores:              add("sharp_mind")
    if len(high_scores) >= 5:   add("ace_student")
    if perfect_scores:           add("perfect_score")
    if len(perfect_scores) >= 3: add("flawless")

    streak = analytics.current_streak if analytics else 0
    if streak >= 3:  add("consistent")
    if streak >= 7:  add("week_warrior")
    if streak >= 30: add("month_legend")

    if len(completed_checkpoints) >= 10: add("checkpoint_pro")
    if len(completed_checkpoints) >= 50: add("checkpoint_master")

    if current_user.level >= 5:  add("level_5")
    if current_user.level >= 10: add("level_10")
    if current_user.level >= 20: add("level_20")

    cp_attempts_map = {}
    for a in all_quiz_attempts:
        cp_attempts_map.setdefault(a.checkpoint_id, []).append(a)
    comeback = any(
        any(a.score < 0.7 for a in attempts) and any(a.score >= 0.7 for a in attempts)
        for attempts in cp_attempts_map.values()
    )
    if comeback: add("comeback_kid")

    if completed_challenges >= 5:  add("challenger")
    if completed_challenges >= 20: add("challenge_champion")

    for s in completed_sessions:
        cps = db.query(Checkpoint).filter(Checkpoint.session_id == s.id).all()
        if cps and all(cp.attempts == 1 for cp in cps):
            add("speed_learner")
            break

    if current_user.xp >= 100:  add("xp_100")
    if current_user.xp >= 500:  add("xp_500")
    if current_user.xp >= 1000: add("xp_1000")

    db.commit()
    return {"newly_awarded": newly_awarded}


@router.get("/weak-topics", response_model=List[WeakTopicResponse])
def get_weak_topics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_weak = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).order_by(WeakTopic.last_practiced.desc()).all()

    seen = set()
    unique_weak = []
    for wt in all_weak:
        key = (wt.topic.strip().lower(), wt.concept.strip().lower())
        if key not in seen:
            seen.add(key)
            unique_weak.append(wt)

    unique_weak.sort(key=lambda w: w.strength_score)
    return unique_weak[:5]


@router.get("/daily-challenge", response_model=DailyChallengeResponse)
def get_daily_challenge(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    today_start = datetime(today.year, today.month, today.day)

    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.user_id == current_user.id,
        DailyChallenge.date >= today_start
    ).first()

    if not challenge:
        recent_tasks = {
            c.task for c in db.query(DailyChallenge).filter(
                DailyChallenge.user_id == current_user.id,
                DailyChallenge.date >= datetime.utcnow() - timedelta(days=7)
            ).all()
        }
        available = [c for c in DAILY_CHALLENGES if c["task"] not in recent_tasks]
        if not available:
            available = DAILY_CHALLENGES

        chosen = random.choice(available)
        challenge = DailyChallenge(
            user_id=current_user.id,
            task=chosen["task"],
            bonus_xp=chosen["bonus_xp"],
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

    update_streak(current_user, db)
    db.commit()

    completed_count = db.query(DailyChallenge).filter(
        DailyChallenge.user_id == current_user.id,
        DailyChallenge.completed == True
    ).count()
    existing_badges = {b.badge_name for b in db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()}
    new_badges = []
    if completed_count >= 5:
        b = award_badge(current_user.id, "challenger", existing_badges, db)
        if b: new_badges.append(b)
    if completed_count >= 20:
        b = award_badge(current_user.id, "challenge_champion", existing_badges, db)
        if b: new_badges.append(b)
    db.commit()

    return {"message": "Challenge completed!", "xp_earned": challenge.bonus_xp, "new_level": current_user.level, "new_badges": new_badges}


@router.post("/notes", response_model=NoteResponse)
def create_note(note: NoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_note = UserNote(user_id=current_user.id, session_id=note.session_id, content=note.content)
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
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(Checkpoint.session_id == session.id).all()
    checkpoint_data = [{"topic": cp.topic, "objectives": cp.objectives} for cp in checkpoints]
    weak_topics = db.query(WeakTopic).filter(WeakTopic.user_id == current_user.id).limit(5).all()
    weak_areas = [f"{wt.topic}: {wt.concept}" for wt in weak_topics]

    notes_content = notes_generator.generate_comprehensive_notes(session.topic, checkpoint_data, weak_areas)
    note = UserNote(user_id=current_user.id, session_id=session.id, content=notes_content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"note": note, "content": notes_content}