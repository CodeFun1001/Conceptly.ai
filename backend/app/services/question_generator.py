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

llm_strict = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.1,
    api_key=os.getenv("GROQ_API_KEY")
)

_question_history: Dict[str, set] = {}
_question_text_history: Dict[str, List[str]] = {}


def normalize_value(text):
    text = str(text).strip()
    try:
        if '/' in text:
            return str(Fraction(text))
    except Exception:
        pass
    try:
        num = float(text)
        return str(int(num)) if num.is_integer() else str(num)
    except Exception:
        pass
    return text.lower()


def deduplicate_options(options):
    seen, unique = set(), []
    for opt in options:
        n = normalize_value(opt)
        if n not in seen:
            seen.add(n)
            unique.append(opt)
    return unique


def validate_single_correct(options, correct_answer):
    correct_norm = normalize_value(correct_answer)
    matches, matched = 0, None
    for opt in options:
        if normalize_value(opt) == correct_norm:
            matches += 1
            matched = opt
    return (True, matched) if matches == 1 else (False, None)


def _contains_placeholder(text: str) -> bool:
    bad_patterns = [
        r'unrelated concept [a-z]',
        r'alternative concept [a-z]',
        r'option [a-z]$',
        r'^[a-z]\)?\s*$',
        r'concept [a-z]$',
        r'incorrect option',
        r'wrong answer [a-z]',
        r'distractor [a-z]',
        r'^core principle of .+$',
        r'^the correct understanding of',
        r'^a misapplication of',
        r'^an outdated approach to',
        r'^a common misconception about',
    ]
    lower = text.lower().strip()
    for pat in bad_patterns:
        if re.search(pat, lower):
            return True
    return False


def _questions_are_similar(q1: str, q2: str, threshold: float = 0.6) -> bool:
    """Check if two question texts are too similar using word overlap."""
    words1 = set(re.sub(r'[^a-z0-9\s]', '', q1.lower()).split())
    words2 = set(re.sub(r'[^a-z0-9\s]', '', q2.lower()).split())
    # Remove very common words
    stopwords = {'what', 'is', 'the', 'a', 'an', 'of', 'in', 'to', 'and', 'or',
                 'are', 'which', 'how', 'does', 'do', 'can', 'that', 'this',
                 'for', 'with', 'it', 'be', 'by', 'on', 'at'}
    words1 -= stopwords
    words2 -= stopwords
    if not words1 or not words2:
        return False
    overlap = len(words1 & words2) / min(len(words1), len(words2))
    return overlap >= threshold


def get_question_signature(checkpoint_id: int, question_text: str) -> str:
    combined = f"{checkpoint_id}_{question_text.lower().strip()}"
    return hashlib.md5(combined.encode()).hexdigest()


def is_question_unique(checkpoint_id: int, question_text: str, session_id: int = None) -> bool:
    global _question_history, _question_text_history
    key = f"{session_id}_{checkpoint_id}" if session_id else str(checkpoint_id)

    if key not in _question_history:
        _question_history[key] = set()
    if key not in _question_text_history:
        _question_text_history[key] = []

    sig = get_question_signature(checkpoint_id, question_text)
    if sig in _question_history[key]:
        return False

    for past_q in _question_text_history[key]:
        if _questions_are_similar(question_text, past_q):
            print(f"   ⏭️  Similar question detected, skipping")
            return False

    _question_history[key].add(sig)
    _question_text_history[key].append(question_text)
    return True


def clear_question_history(session_id: int = None):
    global _question_history, _question_text_history
    if session_id:
        keys = [k for k in list(_question_history.keys()) if k.startswith(f"{session_id}_")]
        for k in keys:
            _question_history.pop(k, None)
            _question_text_history.pop(k, None)
    else:
        _question_history.clear()
        _question_text_history.clear()


def _call_llm_for_questions(
    checkpoint: Dict,
    context: str,
    num_questions: int,
    level: str,
    tutor_mode: str,
    weak_areas: List[str],
    attempt_number: int,
    uniqueness_seed: str,
    used_concepts: set,
    use_strict: bool = False,
) -> List[Dict]:

    topic = checkpoint.get('topic', 'the topic')
    objectives_text = "\n".join(
        f"  {i+1}. {obj}" for i, obj in enumerate(checkpoint.get('objectives', []))
    )
    key_concepts = checkpoint.get('key_concepts', [])
    concepts_text = ", ".join(key_concepts) if key_concepts else topic

    weak_focus = ""
    if weak_areas and attempt_number > 0:
        wt = "\n".join(f"  - {a}" for a in weak_areas)
        weak_focus = (
            f"\nPRIORITY FOCUS — student struggled with:\n{wt}\n"
            "Create most questions to directly test and clarify these areas.\n"
        )

    already_used = ""
    if used_concepts:
        already_used = f"\nALREADY TESTED CONCEPTS (do NOT repeat these): {', '.join(used_concepts)}\n"

    tutor_personalities = {
        "chill_friend": "Use a casual, approachable tone.",
        "strict_mentor": "Be academically rigorous and precise.",
        "supportive_buddy": "Use an encouraging, warm tone.",
        "exam_mode": "Use formal exam-style wording.",
    }
    personality = tutor_personalities.get(tutor_mode, tutor_personalities["supportive_buddy"])

    system_content = f"""You are an expert quiz designer. {personality}

ABSOLUTE RULES — violating any disqualifies the entire response:
1. Return ONLY a raw JSON array. No markdown, no ```json, no explanation.
2. Every question must be directly answerable from the TAUGHT CONTENT below.
3. Each question tests a DIFFERENT concept — no two questions on the same idea.
4. Every question has EXACTLY 4 options.
5. ONLY ONE option is correct.
6. "correct_answer" must be the EXACT full text of one of the options — never a letter.
7. ALL 4 options MUST be specific, factually grounded statements about "{topic}".
   FORBIDDEN option styles (instant fail):
     - "Unrelated concept A/B/C"
     - "Alternative concept A/B/C"
     - "Option A/B/C/D"
     - "Core principle of X" (too vague)
     - "The correct understanding of X"
     - "A misapplication of X"
     - Any option shorter than 6 words that is not a number/formula
8. Wrong options must sound plausible — they should be common misconceptions or
   related-but-incorrect facts about "{topic}" that a student might genuinely confuse.
9. Every question must be UNIQUE and not similar to any previously asked questions.

Uniqueness seed: {uniqueness_seed}"""

    human_content = f"""Generate {num_questions} quiz questions for: {topic}
Level: {level}

LEARNING OBJECTIVES:
{objectives_text}

KEY CONCEPTS: {concepts_text}

TAUGHT CONTENT (base all questions on this):
{context[:3000]}
{weak_focus}{already_used}

Output format:
[
  {{
    "question": "Specific factual question about {topic}?",
    "options": [
      "Specific plausible statement A about {topic}",
      "Specific plausible statement B about {topic}",
      "Specific plausible statement C about {topic}",
      "Specific plausible statement D about {topic}"
    ],
    "correct_answer": "Exact text of the correct option",
    "explanation": "Why this is correct, referencing the topic",
    "difficulty": "{level}",
    "tested_concept": "Name of concept tested"
  }}
]

REMEMBER: Wrong options must be realistic misconceptions about {topic}, NOT generic labels.
IMPORTANT: Each question must test a completely different concept from the others."""

    model = llm_strict if use_strict else llm
    response = model.invoke([
        SystemMessage(content=system_content),
        HumanMessage(content=human_content),
    ])

    raw = str(response.content).strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    raw = raw.strip()

    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        parsed = [parsed]
    return parsed


def _validate_question(q: dict, checkpoint_id: int, session_id: int, concepts_used: set) -> dict | None:
    question_text = q.get("question", "").strip()
    if not question_text or len(question_text) < 10:
        return None

    if not is_question_unique(checkpoint_id, question_text, session_id):
        print(f"   ⏭️  Duplicate question skipped")
        return None

    tested_concept = q.get("tested_concept", "").strip()
    if tested_concept and tested_concept in concepts_used:
        print(f"   ⏭️  Repeated concept skipped: {tested_concept}")
        return None

    options = q.get("options", [])[:4]
    if len(options) < 4:
        return None

    unique_options = deduplicate_options(options)
    if len(unique_options) < 4:
        return None

    for opt in unique_options:
        if _contains_placeholder(opt):
            print(f"   ❌ Placeholder option detected: '{opt}' — rejecting question")
            return None

    correct = q.get("correct_answer", "").strip()

    if correct.upper() in ['A', 'B', 'C', 'D']:
        idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}[correct.upper()]
        correct = unique_options[idx] if idx < len(unique_options) else unique_options[0]

    is_valid, matched = validate_single_correct(unique_options, correct)
    if not is_valid:
        for opt in unique_options:
            if correct.lower() in opt.lower() or opt.lower() in correct.lower():
                matched = opt
                break
        if not matched:
            matched = unique_options[0]

    return {
        "type": "mcq",
        "question": question_text,
        "options": unique_options,
        "correct_answer": matched,
        "explanation": q.get("explanation", f"This is the correct answer about {q.get('tested_concept', 'the topic')}."),
        "difficulty": q.get("difficulty", "intermediate"),
        "key_points": [tested_concept or question_text[:50]],
        "tested_concept": tested_concept or "General understanding",
    }


def generate_questions(
    checkpoint: Dict,
    context: str,
    level: str = "intermediate",
    tutor_mode: str = "supportive_buddy",
    weak_areas: List[str] = None,
    attempt_number: int = 0,
    session_id: int = None,
) -> List[Dict]:

    checkpoint_id = checkpoint.get('id', 0)
    topic = checkpoint.get('topic', 'the topic')

    print(f"📝 Generating questions — checkpoint {checkpoint_id}: {topic}")
    print(f"   Mode: {tutor_mode} | Level: {level} | Attempt: {attempt_number}")
    if weak_areas:
        print(f"   Weak areas: {weak_areas}")

    kc = len(checkpoint.get('key_concepts', []))
    ob = len(checkpoint.get('objectives', []))
    complexity = kc + ob

    if complexity >= 12:
        num_questions = 7
    elif complexity >= 8:
        num_questions = 6
    elif complexity >= 5:
        num_questions = 5
    else:
        num_questions = 4

    if attempt_number > 0 and weak_areas:
        num_questions = min(num_questions + 1, 7)

    uniqueness_seed = hashlib.md5(
        f"{checkpoint_id}_{tutor_mode}_{attempt_number}_{session_id}_{os.urandom(4).hex()}".encode()
    ).hexdigest()[:8]

    validated = []
    concepts_used = set()

    for attempt_llm in range(2):
        use_strict = attempt_llm == 1
        if attempt_llm == 1 and len(validated) >= num_questions:
            break
        if attempt_llm == 1:
            print(f"   🔄 Retrying with strict LLM (got {len(validated)}/{num_questions})")

        try:
            raw_questions = _call_llm_for_questions(
                checkpoint=checkpoint,
                context=context,
                num_questions=num_questions + 2,
                level=level,
                tutor_mode=tutor_mode,
                weak_areas=weak_areas or [],
                attempt_number=attempt_number,
                uniqueness_seed=uniqueness_seed + ("_r" if use_strict else ""),
                used_concepts=concepts_used,
                use_strict=use_strict,
            )

            for q in raw_questions:
                if len(validated) >= num_questions:
                    break
                vq = _validate_question(q, checkpoint_id, session_id, concepts_used)
                if vq:
                    validated.append(vq)
                    concepts_used.add(vq["tested_concept"])

        except Exception as e:
            print(f"   ❌ LLM call {attempt_llm + 1} failed: {e}")
            import traceback; traceback.print_exc()

    if len(validated) >= num_questions:
        print(f"✓ Generated {len(validated)} valid questions")
        return validated[:num_questions]

    shortage = num_questions - len(validated)
    print(f"   ⚠️  Still short {shortage} questions — using targeted fallback LLM call")
    fallback_qs = _llm_fallback(topic, context, shortage, level, concepts_used)
    validated.extend(fallback_qs)

    print(f"✓ Final question count: {len(validated[:num_questions])}")
    return validated[:num_questions]


def _llm_fallback(topic: str, context: str, num: int, level: str, concepts_used: set) -> List[Dict]:
    try:
        snippet = context[:2000] if context else f"The topic is {topic}."
        already_used = f"Do NOT test these concepts (already covered): {', '.join(concepts_used)}" if concepts_used else ""
        prompt = f"""Write {num} multiple-choice questions about "{topic}" based on this text:

{snippet}

{already_used}

Rules:
- Each question must have exactly 4 options
- Only one option is correct
- All 4 options must be full sentences about {topic}
- Wrong options must be realistic misconceptions, NOT labels like "Option A" or "Unrelated concept"
- Each question must test a DIFFERENT concept
- Return only JSON array

[{{"question": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "...", "tested_concept": "..."}}]"""

        response = llm_strict.invoke([HumanMessage(content=prompt)])
        raw = str(response.content).strip()
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'^```\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        parsed = json.loads(raw.strip())
        if not isinstance(parsed, list):
            parsed = [parsed]

        result = []
        for q in parsed:
            options = q.get("options", [])[:4]
            if len(options) < 4:
                continue
            bad = any(_contains_placeholder(o) for o in options)
            if bad:
                continue
            tested_concept = q.get("tested_concept", topic)
            if tested_concept in concepts_used:
                continue
            correct = q.get("correct_answer", options[0])
            _, matched = validate_single_correct(options, correct)
            result.append({
                "type": "mcq",
                "question": q.get("question", f"What is an important aspect of {topic}?"),
                "options": options,
                "correct_answer": matched or options[0],
                "explanation": q.get("explanation", f"This relates to a key concept of {topic}."),
                "difficulty": level,
                "key_points": [tested_concept],
                "tested_concept": tested_concept,
            })
            concepts_used.add(tested_concept)
            if len(result) >= num:
                break

        if result:
            return result

    except Exception as e:
        print(f"   ❌ Fallback LLM also failed: {e}")

    return []