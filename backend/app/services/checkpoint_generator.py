from typing import Dict, List, Optional
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm import get_llm

llm = get_llm(temperature=0)

def clean_json(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r"```json", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()

def safe_json_load(text: str):
    try:
        return json.loads(text)
    except Exception as e:
        print("JSON Parse Error:", e)
        print("RAW OUTPUT:\n", text)
        return None

def generate_checkpoints(
    topic: str,
    current_level: str = "beginner",
    target_level: str = "intermediate",
    purpose: str = "general learning",
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> List[Dict]:
    tutor_personalities = {
        "chill_friend":    "You're laid-back and friendly.",
        "strict_mentor":   "You're disciplined and precise.",
        "supportive_buddy":"You're encouraging and positive.",
        "exam_mode":       "You're exam-focused and efficient.",
    }
    personality = tutor_personalities.get(tutor_mode, tutor_personalities["supportive_buddy"])

    rag_section = ""
    try:
        from app.services.rag_service import (
            build_rag_context,
            ensure_session_knowledge,
            is_rag_active,
        )
        if session_id:
            ensure_session_knowledge(
                session_id,
                topic,
                objectives=[f"Understand {topic}", f"Apply {topic}", f"Evaluate {topic}"],
                key_concepts=[topic],
            )
            if is_rag_active(session_id):
                retrieved = build_rag_context(
                    base_context="",
                    query=f"learning path for {topic}",
                    session_id=session_id,
                    topic=topic,
                    objectives=[f"Understand {topic}"],
                    key_concepts=[topic],
                    max_extra_chars=1500,
                )
                if retrieved.strip():
                    rag_section = (
                        "\n\nKNOWLEDGE CONTEXT (use to personalise checkpoints):\n"
                        + retrieved.replace("---\n**Agentic RAG — Retrieved Knowledge:**\n", "")
                    )
                    print(f"checkpoint_generator: Agentic RAG injected for session {session_id}")
    except Exception as e:
        print(f"checkpoint_generator RAG error (non-fatal): {e}")

    system_msg = SystemMessage(content=f"""
You are an expert curriculum designer.
{personality}
Return ONLY valid JSON array. No markdown. No explanation.
""")

    human_msg = HumanMessage(content=f"""
Create learning path for: {topic}

Current: {current_level}
Target: {target_level}
Purpose: {purpose}{rag_section}

Format:
[
  {{
    "id": 1,
    "topic": "...",
    "level": "beginner",
    "objectives": ["..."],
    "success_threshold": 0.7,
    "success_criteria": "...",
    "key_concepts": ["..."]
  }}
]
""")

    try:
        response = llm.invoke([system_msg, human_msg])
        raw = clean_json(response.content)
        data = safe_json_load(raw)

        if not data:
            raise Exception("Invalid JSON")
        if not isinstance(data, list):
            data = [data]

        for i, cp in enumerate(data, 1):
            cp["id"] = i
            cp.setdefault("level", current_level)
            cp.setdefault("success_threshold", 0.7)

        try:
            if session_id:
                from app.services.rag_service import _build_curriculum_store
                _build_curriculum_store(session_id, data)
        except Exception as e:
            print(f"checkpoint_generator curriculum store error (non-fatal): {e}")

        return data

    except Exception as e:
        print("generate_checkpoints error:", e)
        return create_default_checkpoints(topic, current_level)


def create_default_checkpoints(topic, level):
    return [
        {
            "id": 1,
            "topic": f"Basics of {topic}",
            "level": level,
            "objectives": [f"Understand {topic} fundamentals"],
            "success_threshold": 0.7,
            "success_criteria": "Explain basics",
            "key_concepts": ["basics"],
        }
    ]