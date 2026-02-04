from typing import Dict, List
import re

def normalize_answer(text):
    if not text:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text

def evaluate_answers(
    questions: List[Dict],
    answers: List[str]
) -> Dict:
    
    print(f"Evaluating {len(answers)} answers against {len(questions)} questions")
    
    correct = 0
    details = []
    scores = []
    weak_areas = []
    weak_area_details = []
    
    for i, q in enumerate(questions):
        user = answers[i] if i < len(answers) else ""
        
        ca = normalize_answer(q.get("correct_answer"))
        ua = normalize_answer(user)
        
        ok = (ca == ua)
        
        score = 100 if ok else 0
        
        if ok:
            correct += 1
            print(f"Question {i+1}: Correct")
        else:
            tested_concept = q.get('tested_concept', q.get('key_points', ['Unknown'])[0])
            weak_areas.append(tested_concept)
            
            weak_area_details.append({
                'concept': tested_concept,
                'question': q.get('question'),
                'user_answer': user,
                'correct_answer': q.get('correct_answer'),
                'explanation': q.get('explanation')
            })
            
            print(f"Question {i+1}: Incorrect - Weak in {tested_concept}")
        
        scores.append(score)
        
        details.append({
            "question": q.get("question"),
            "user_answer": user,
            "correct_answer": q.get("correct_answer"),
            "is_correct": ok,
            "explanation": q.get("explanation"),
            "score": score,
            "tested_concept": q.get("tested_concept", "General")
        })
    
    avg = sum(scores) / len(scores) if scores else 0
    
    weak_areas_unique = list(dict.fromkeys(weak_areas))[:5]
    
    print(f"Results: {correct}/{len(questions)} correct ({avg:.1f}%)")
    if weak_areas_unique:
        print(f"Weak areas identified: {', '.join(weak_areas_unique)}")
    
    return {
        "understanding_score": avg / 100,
        "correct_count": correct,
        "total_questions": len(questions),
        "detailed_results": details,
        "passed": avg >= 70,
        "weak_areas": weak_areas_unique,
        "weak_area_details": weak_area_details
    }