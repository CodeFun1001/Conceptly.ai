from typing import Dict, List
import re

try:
    from sentence_transformers import SentenceTransformer, util as st_util
    _ST = SentenceTransformer("all-MiniLM-L6-v2")
    _SEMANTIC = True
except Exception:
    _ST = None
    _SEMANTIC = False

def normalize_answer(text: str) -> str:
    if not text:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r"^[a-d][\)\.\:\s]+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _cosine_sim(a: str, b: str) -> float:
    if not _SEMANTIC or not _ST:
        return 0.0
    try:
        embs = _ST.encode([a, b], convert_to_tensor=True)
        return float(st_util.cos_sim(embs[0], embs[1]))
    except Exception:
        return 0.0


def _word_overlap(a: str, b: str) -> float:
    wa = set(a.split())
    wb = set(b.split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / max(len(wa), len(wb))


def _why_wrong(user_ans: str, correct_ans: str, all_options: List[str]) -> str:
    ua_w = set(normalize_answer(user_ans).split())
    ca_w = set(normalize_answer(correct_ans).split())
    common = ua_w & ca_w

    if len(common) >= 3:
        shared = ", ".join(list(common)[:4])
        return (
            f"Your answer shared key terms ({shared}) with the correct one — "
            f"easy to mix up. Focus on the specific role or relationship each "
            f"option describes."
        )

    for opt in all_options:
        if normalize_answer(opt) == normalize_answer(user_ans) and opt != correct_ans:
            return (
                f'"{opt[:70]}" describes a related but different concept. '
                f"Re-read the definitions carefully to spot the distinction."
            )

    return (
        "This is a common misconception. Focus on the exact definition "
        "rather than the general idea the option hints at."
    )


def _score_one(
    user_raw: str,
    correct_answer: str,
    all_options: List[str],
) -> tuple[int, str, str]:
    ua = normalize_answer(user_raw)
    ca = normalize_answer(correct_answer)

    if ua == ca:
        return 100, "exact", ""
    if ca and ua and (ca in ua or ua in ca):
        return 100, "substring", ""

    sim = _cosine_sim(ua, ca) if _SEMANTIC else _word_overlap(ua, ca)

    if sim >= 0.95:
        return 100, "semantic_exact", ""
    if sim >= 0.70:
        why = (
            f"Your answer was in the right area (similarity {sim:.0%}) but not "
            f"precise enough. The correct answer is: '{correct_answer[:80]}'"
        )
        return 50, "partial", why

    return 0, "wrong", _why_wrong(user_raw, correct_answer, all_options)

def evaluate_answers(questions: List[Dict], answers: List[str]) -> Dict:
    print(f"Evaluating {len(answers)} answers | semantic={'ON' if _SEMANTIC else 'word-overlap'}")

    total_score    = 0
    details        = []
    weak_areas     = []
    weak_area_details = []
    correct_count  = 0
    partial_count  = 0

    MAX_PER_Q = 100

    for i, q in enumerate(questions):
        user_raw       = answers[i] if i < len(answers) else ""
        correct_answer = q.get("correct_answer", "")
        all_options    = q.get("options", [])

        score, match_type, why = _score_one(user_raw, correct_answer, all_options)

        is_correct = score == MAX_PER_Q
        is_partial = score == 50

        total_score += score

        if is_correct:
            correct_count += 1
            print(f"  Q{i+1}: ✓ ({match_type})")
        elif is_partial:
            partial_count += 1
            print(f"  Q{i+1}: ~ partial")
        else:
            tested = q.get("tested_concept",
                           (q.get("key_points") or ["Unknown"])[0])
            weak_areas.append(tested)
            weak_area_details.append({
                "concept":        tested,
                "question":       q.get("question"),
                "user_answer":    user_raw,
                "correct_answer": correct_answer,
                "explanation":    q.get("explanation"),
                "why_wrong":      why,
            })
            print(f"  Q{i+1}: ✗ weak='{tested}'")

        base_exp = q.get("explanation", "")
        if not is_correct and why:
            full_exp = base_exp + f"\n\n💡 **Why your answer may have seemed right:** {why}"
        else:
            full_exp = base_exp

        details.append({
            "question":       q.get("question"),
            "user_answer":    user_raw,
            "correct_answer": correct_answer,
            "is_correct":     is_correct,
            "is_partial":     is_partial,
            "score":          score,
            "explanation":    full_exp,
            "why_wrong":      why,
            "tested_concept": q.get("tested_concept", "General"),
            "match_type":     match_type,
        })

    n   = len(questions)
    pct = (total_score / (n * MAX_PER_Q) * 100) if n else 0
    understanding_score = pct / 100

    weak_unique = list(dict.fromkeys(weak_areas))[:5]

    print(f"Result: {correct_count}✓ {partial_count}~ / {n}  → {pct:.1f}%")
    if weak_unique:
        print(f"Weak areas: {', '.join(weak_unique)}")

    return {
        "understanding_score": understanding_score,
        "correct_count":       correct_count,
        "total_questions":     n,
        "detailed_results":    details,
        "passed":              pct >= 70,
        "weak_areas":          weak_unique,
        "weak_area_details":   weak_area_details,
        "partial_count":       partial_count,
        "percentage":          round(pct, 1),
    }