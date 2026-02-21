from typing import Dict, List
import json
import re
import hashlib
from fractions import Fraction
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.4,
    api_key=os.getenv("GROQ_API_KEY")
)

_question_history = {}

def normalize_value(text):
    text = str(text).strip()
    try:
        if '/' in text:
            return str(Fraction(text))
    except:
        pass
    try:
        num = float(text)
        if num.is_integer():
            return str(int(num))
        return str(num)
    except:
        pass
    return text.lower()

def deduplicate_options(options):
    seen = set()
    unique = []
    for opt in options:
        normalized = normalize_value(opt)
        if normalized not in seen:
            seen.add(normalized)
            unique.append(opt)
    return unique

def validate_single_correct(options, correct_answer):
    correct_norm = normalize_value(correct_answer)
    matches = 0
    matched_option = None
    for opt in options:
        if normalize_value(opt) == correct_norm:
            matches += 1
            matched_option = opt
    if matches == 1:
        return True, matched_option
    return False, None

def get_question_signature(checkpoint_id: int, question_text: str) -> str:
    
    combined = f"{checkpoint_id}_{question_text.lower().strip()}"
    return hashlib.md5(combined.encode()).hexdigest()

def is_question_unique(checkpoint_id: int, question_text: str, session_id: int = None) -> bool:
    global _question_history
    
    key = f"{session_id}_{checkpoint_id}" if session_id else str(checkpoint_id)
    
    if key not in _question_history:
        _question_history[key] = set()
    
    signature = get_question_signature(checkpoint_id, question_text)
    
    if signature in _question_history[key]:
        return False
    
    _question_history[key].add(signature)
    return True

def clear_question_history(session_id: int = None):
    global _question_history
    if session_id:
        
        keys_to_remove = [k for k in _question_history.keys() if k.startswith(f"{session_id}_")]
        for key in keys_to_remove:
            del _question_history[key]
    else:
        
        _question_history.clear()

def generate_questions(
    checkpoint: Dict,
    context: str,
    level: str = "intermediate",
    tutor_mode: str = "supportive_buddy",
    weak_areas: List[str] = None,
    attempt_number: int = 0,
    session_id: int = None
) -> List[Dict]:
    """
    Generate unique assessment questions for a checkpoint
    
    Args:
        checkpoint: Checkpoint data
        context: Learning content/context
        level: Difficulty level
        tutor_mode: Teaching personality
        weak_areas: Areas to focus on
        attempt_number: Retry attempt number
        session_id: Session ID for better question tracking
    """
    
    checkpoint_id = checkpoint.get('id', 0)
    
    print(f"📝 Generating questions for checkpoint {checkpoint_id}")
    print(f"   Tutor mode: {tutor_mode}")
    print(f"   Attempt: {attempt_number}")
    if weak_areas:
        print(f"   Focusing on weak areas: {weak_areas}")
    
    key_concepts_count = len(checkpoint.get('key_concepts', []))
    objectives_count = len(checkpoint.get('objectives', []))
    complexity_score = key_concepts_count + objectives_count

    if complexity_score >= 10:
        num_questions = 6
    elif complexity_score >= 6:
        num_questions = 5
    else:
        num_questions = 4 
        
    if attempt_number > 0 and weak_areas:
        num_questions = min(num_questions + 1, 6)
    
    
    tutor_personalities = {
        "chill_friend": "Create approachable, conversational questions with friendly tone.",
        "strict_mentor": "Design precise, academically rigorous questions with formal language.",
        "supportive_buddy": "Craft encouraging questions with helpful context and positive framing.",
        "exam_mode": "Generate exam-style questions with standard academic format."
    }
    
    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )
    
    
    weak_focus_instruction = ""
    if weak_areas and attempt_number > 0:
        weak_text = "\n".join(f"  - {area}" for area in weak_areas)
        weak_focus_instruction = f"""
PRIORITY FOCUS: Create {num_questions - 1} questions specifically targeting these weak areas:
{weak_text}

Each question should:
- Test a DIFFERENT aspect of the weak areas
- Use varied question styles (conceptual, application, comparison)
- Help identify gaps in understanding"""
    
    
    uniqueness_seed = hashlib.md5(
        f"{checkpoint_id}_{tutor_mode}_{attempt_number}_{session_id}".encode()
    ).hexdigest()[:8]
    
    system_msg = SystemMessage(content=f"""You are an expert assessment designer for {level} level learning.

{personality}

CRITICAL REQUIREMENTS:
1. Questions MUST be answerable from the provided content
2. Each question must test a DIFFERENT concept/objective
3. NO similar or repetitive questions
4. Exactly 4 unique options per question
5. ONLY ONE correct answer per question
6. correct_answer must be the EXACT FULL TEXT from options array
7. NO letters (A/B/C/D) as correct_answer
8. ALL 4 options must be plausible and specific to the topic — NEVER use generic placeholders like "Unrelated Concept A", "Alternative concept B", etc. Each wrong option should be a realistic-sounding but incorrect statement about the topic that a student might mistake for correct.

{weak_focus_instruction}

Return ONLY a valid JSON array with NO markdown, NO code blocks, NO explanation:

[
  {{
    "question": "Clear, specific question text?",
    "options": ["Full option 1 text", "Full option 2 text", "Full option 3 text", "Full option 4 text"],
    "correct_answer": "Exact full text of the correct option",
    "explanation": "Clear explanation of why this answer is correct",
    "difficulty": "{level}",
    "tested_concept": "Specific concept this question tests"
  }}
]

Uniqueness ID: {uniqueness_seed}""")
    
    objectives_text = "\n".join(
        f"  {i+1}. {obj}" 
        for i, obj in enumerate(checkpoint.get('objectives', []))
    )
    
    key_concepts = checkpoint.get('key_concepts', [])
    concepts_text = ", ".join(key_concepts) if key_concepts else "Core concepts"
    
    taught_summary = context[:2000]
    
    human_msg = HumanMessage(content=f"""Generate {num_questions} UNIQUE assessment questions.

TOPIC: {checkpoint.get('topic')}
LEVEL: {level}
TUTOR MODE: {tutor_mode}

LEARNING OBJECTIVES:
{objectives_text}

KEY CONCEPTS TO TEST: {concepts_text}

TAUGHT CONTENT:
{taught_summary}

{weak_focus_instruction}

CRITICAL REMINDERS:
✓ Test what was actually taught in the content above
✓ Each question tests a DIFFERENT concept from objectives
✓ correct_answer = EXACT FULL TEXT from options (not A/B/C/D)
✓ NO duplicate or similar questions
✓ ALL 4 options must be specific, plausible statements about the topic — no generic placeholders like "Unrelated concept A" or "Alternative concept B". Each wrong option should sound like something a student might believe is correct but isn't.

Return valid JSON array only.""")
    
    try:
        response = llm.invoke([system_msg, human_msg])
        raw = response.content
        
        
        if isinstance(raw, list):
            raw = " ".join(str(x) for x in raw)
        
        
        content = str(raw).strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        content = content.strip()
        
        
        questions = json.loads(content)
        
        if not isinstance(questions, list):
            questions = [questions]
        
        validated = []
        concepts_used = set()
        
        for q in questions[:num_questions + 2]:  
            question_text = q.get("question", "").strip()
            
            
            if not is_question_unique(checkpoint_id, question_text, session_id):
                print(f"   ⏭️  Skipping duplicate: {question_text[:50]}...")
                continue
            
            
            tested_concept = q.get("tested_concept", "").strip()
            if tested_concept in concepts_used:
                print(f"   ⏭️  Skipping repeated concept: {tested_concept}")
                continue
            
            options = q.get("options", [])
            
            if len(options) < 4:
                print(f"   ⚠️  Skipping question with < 4 options")
                continue
            
            
            options = options[:4]
            unique_options = deduplicate_options(options)
            
            if len(unique_options) < 4:
                print(f"   ⚠️  Skipping question with duplicate options")
                continue
            
            options = unique_options[:4]
            correct = q.get("correct_answer", "").strip()
            
            
            if correct.strip().upper() in ['A', 'B', 'C', 'D']:
                letter_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
                idx = letter_map.get(correct.strip().upper(), 0)
                if idx < len(options):
                    correct = options[idx]
                else:
                    correct = options[0]
            
            
            is_valid, matched = validate_single_correct(options, correct)
            
            if not is_valid:
                print(f"   ⚠️  Correcting ambiguous correct answer")
                matched = options[0]
            
            
            validated_q = {
                "type": "mcq",
                "question": question_text,
                "options": options,
                "correct_answer": matched,
                "explanation": q.get("explanation", "This is the correct answer based on the learning content."),
                "difficulty": level,
                "key_points": [tested_concept if tested_concept else question_text[:50]],
                "tested_concept": tested_concept if tested_concept else "General understanding"
            }
            
            validated.append(validated_q)
            concepts_used.add(tested_concept)
            
            
            if len(validated) >= num_questions:
                break
        
        if len(validated) >= num_questions:
            print(f"✓ Successfully generated {len(validated)} unique questions")
            return validated[:num_questions]
        else:
            print(f"⚠️  Warning: Only generated {len(validated)} questions, needed {num_questions}")
            
            while len(validated) < num_questions:
                validated.extend(create_default_mcq(
                    checkpoint.get('topic', 'Learning'), 
                    num_questions - len(validated), 
                    level,
                    weak_areas
                ))
            return validated[:num_questions]
    
    except Exception as e:
        print(f"❌ Question generation error: {e}")
        import traceback
        traceback.print_exc()
        return create_default_mcq(
            checkpoint.get('topic', 'Learning'), 
            num_questions, 
            level,
            weak_areas
        )

def create_default_mcq(topic: str, num: int, level: str = "intermediate", weak_areas: List[str] = None):
    print(f"📝 Creating {num} fallback questions for {topic}")
    
    # Generate meaningful-sounding distractors rather than placeholder labels
    def make_distractors(correct_concept: str, topic_name: str):
        return [
            f"A misapplication of {topic_name} principles",
            f"An outdated approach to {topic_name}",
            f"A common misconception about {topic_name}"
        ]
    
    if weak_areas and len(weak_areas) > 0:
        return [{
            "type": "mcq",
            "question": f"Which statement best describes {weak_areas[i % len(weak_areas)]}?",
            "options": [
                f"The correct understanding of {weak_areas[i % len(weak_areas)]}",
            ] + make_distractors(weak_areas[i % len(weak_areas)], topic),
            "correct_answer": f"The correct understanding of {weak_areas[i % len(weak_areas)]}",
            "explanation": "This directly addresses the core concept of the weak area.",
            "difficulty": level,
            "key_points": [weak_areas[i % len(weak_areas)]],
            "tested_concept": weak_areas[i % len(weak_areas)]
        } for i in range(num)]
    
    return [{
        "type": "mcq",
        "question": f"Which statement best describes a fundamental principle of {topic}?",
        "options": [
            f"The core principle of {topic}",
        ] + make_distractors(topic, topic),
        "correct_answer": f"The core principle of {topic}",
        "explanation": "This represents the fundamental understanding of the topic.",
        "difficulty": level,
        "key_points": ["Fundamentals"],
        "tested_concept": "Core understanding"
    } for _ in range(num)]